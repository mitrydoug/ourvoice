"""Gas sponsorship policy routes for Alchemy Gas Manager webhooks."""

import asyncio
import hashlib
import logging
import os
from dataclasses import dataclass
from typing import Any

from eth_utils import function_signature_to_4byte_selector
from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field

from symvolia.gas_sponsorship import identity
from symvolia.gas_sponsorship.rate_limiter import (
    DEFAULT_CAPACITY_GAS,
    DEFAULT_LEAK_GAS_PER_DAY,
    LeakyBucketRateLimiter,
)

logger = logging.getLogger(__name__)

INSPECT_APPROVE_ENV = "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE"

# Off-chain leaky-bucket rate limiter configuration. The limiter is optional:
# when RATE_LIMIT_DB_ENV is unset the webhook stays a pure selector allow-list.
# The bucket is denominated in GAS: each sponsored userOperation costs the sum of
# its gas limits, so a human's budget tracks the compute we actually sponsor.
RATE_LIMIT_DB_ENV = "GAS_SPONSORSHIP_RATE_LIMIT_DB"
RATE_LIMIT_CAPACITY_ENV = "GAS_SPONSORSHIP_RATE_LIMIT_CAPACITY_GAS"
RATE_LIMIT_LEAK_ENV = "GAS_SPONSORSHIP_RATE_LIMIT_LEAK_GAS_PER_DAY"
# RPC used to resolve a userOperation's zkPassport id (getUserIdentifier / verify).
# Falls back to the indexer RPC when unset.
RATE_LIMIT_RPC_URL_ENV = "GAS_SPONSORSHIP_RPC_URL"
VERIFIER_ADDRESS_ENV = "ZKPASSPORT_VERIFIER_ADDRESS"

# ERC-4337 userOperation gas-limit fields summed into a single "gas cost" weight.
# These are upper bounds (limits and fee caps), so metering on them is a
# conservative over-estimate of settled cost; the leaky bucket's leak self-heals
# any over-count. Paymaster fields only appear on EntryPoint v0.7 operations.
GAS_LIMIT_FIELDS = (
    "callGasLimit",
    "verificationGasLimit",
    "preVerificationGas",
    "paymasterVerificationGasLimit",
    "paymasterPostOpGasLimit",
)

DEFAULT_REGISTRY_SIGNATURES_BY_MODE = {
    "mocked": ["register(string)"],
    "production": [
        "registerSponsored((bytes32,(bytes32,bytes,bytes32[]),bytes,(uint256,string,string,bool)))"
    ],
}

# Selector for the proof-based registration variant, so the metering layer knows
# to recover the human's id from the proof (rather than from the sender address).
_PRODUCTION_REGISTER_SELECTOR = function_signature_to_4byte_selector(
    "registerSponsored((bytes32,(bytes32,bytes,bytes32[]),bytes,(uint256,string,string,bool)))"
).hex()


def _selector(signature: str) -> str:
    return function_signature_to_4byte_selector(signature).hex()


SMART_ACCOUNT_EXECUTE_SELECTOR = _selector("execute(address,uint256,bytes)")

# The only Forum entrypoint eligible for gas sponsorship. It meters every action
# against the caller's per-human rate-limit budget on-chain; the unmetered
# `submit`/`addStatement`/`adjustSupport` paths are strictly self-funded.
FORUM_SUBMIT_SPONSORED_SIGNATURE = (
    "submitSponsored((string,int256)[],(uint256,int256,uint8)[])"
)
FORUM_SUBMIT_SPONSORED_SELECTOR = _selector(FORUM_SUBMIT_SPONSORED_SIGNATURE)


def _env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None or not value.strip():
        return default
    try:
        return float(value.strip())
    except ValueError:
        logger.warning("Invalid float for %s=%r; using default %s", name, value, default)
        return default


def _summarize_hex(value: Any, prefix_chars: int = 18) -> dict[str, object] | None:
    if not isinstance(value, str) or not value.startswith("0x"):
        return None
    hex_chars = max(len(value) - 2, 0)
    return {
        "prefix": value[:prefix_chars],
        "hex_chars": hex_chars,
        "bytes": hex_chars // 2,
    }


def _normalize_address(value: str | None) -> str | None:
    if not isinstance(value, str):
        return None
    stripped_value = value.strip().lower()
    if len(stripped_value) == 42 and stripped_value.startswith("0x"):
        return stripped_value
    return None


def _parse_address_set(value: str | None) -> set[str]:
    if not value:
        return set()
    addresses: set[str] = set()
    for candidate in value.replace(",", " ").split():
        normalized_address = _normalize_address(candidate)
        if normalized_address:
            addresses.add(normalized_address)
    return addresses


def _parse_signature_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [signature.strip() for signature in value.split(";") if signature.strip()]


def _registry_selectors() -> dict[str, str]:
    signatures = _parse_signature_list(os.getenv("GAS_SPONSORSHIP_REGISTRY_SIGNATURES"))
    if not signatures:
        registry_mode = os.getenv("REGISTRY_MODE", "production")
        signatures = DEFAULT_REGISTRY_SIGNATURES_BY_MODE.get(registry_mode, [])
    return {_selector(signature): signature for signature in signatures}


def _hex_to_bytes(value: Any) -> bytes | None:
    if not isinstance(value, str) or not value.startswith("0x"):
        return None
    try:
        return bytes.fromhex(value[2:])
    except ValueError:
        return None


def _read_word(data: bytes, offset: int) -> bytes | None:
    if offset < 0 or offset + 32 > len(data):
        return None
    return data[offset : offset + 32]


def _read_uint256(data: bytes, offset: int) -> int | None:
    word = _read_word(data, offset)
    if word is None:
        return None
    return int.from_bytes(word, byteorder="big")


def _read_address(data: bytes, offset: int) -> str | None:
    word = _read_word(data, offset)
    if word is None:
        return None
    return "0x" + word[-20:].hex()


def _decode_dynamic_bytes(data: bytes, base_offset: int, relative_offset: int) -> bytes | None:
    length_offset = base_offset + relative_offset
    value_length = _read_uint256(data, length_offset)
    if value_length is None:
        return None
    value_offset = length_offset + 32
    value_end = value_offset + value_length
    if value_end > len(data):
        return None
    return data[value_offset:value_end]


def _decode_execute_call(call_data: Any) -> tuple[str, int, bytes] | None:
    data = _hex_to_bytes(call_data)
    if data is None or len(data) < 4 + 32 * 3:
        return None
    if data[:4].hex() != SMART_ACCOUNT_EXECUTE_SELECTOR:
        return None

    args_offset = 4
    target = _read_address(data, args_offset)
    value = _read_uint256(data, args_offset + 32)
    inner_data_offset = _read_uint256(data, args_offset + 64)
    if target is None or value is None or inner_data_offset is None:
        return None

    inner_data = _decode_dynamic_bytes(data, args_offset, inner_data_offset)
    if inner_data is None:
        return None
    return target, value, inner_data


@dataclass(frozen=True)
class MeteredAction:
    """A sponsored action to charge against a human's leaky-bucket budget.

    ``kind`` selects how the zkPassport id is recovered:
    ``"forum"`` (registry.getUserIdentifier(sender)),
    ``"registration_proof"`` (verify(...) eth_call) or
    ``"registration_mocked"`` (keccak256(abi.encode(sender))).

    The charged weight is the userOperation's gas cost, computed at metering time
    from its gas-limit fields, so it is not carried on the action itself.
    """

    kind: str
    sender: str
    inner_data: bytes


def _parse_uint(value: Any) -> int:
    """Parse a userOperation numeric field (hex string, int, or decimal string)."""
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return value if value > 0 else 0
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return 0
        try:
            parsed = int(text, 16) if text.lower().startswith("0x") else int(text)
        except ValueError:
            return 0
        return parsed if parsed > 0 else 0
    return 0


def _gas_weight(user_operation: dict[str, Any]) -> float | None:
    """Total gas the sponsored userOperation may consume, summed across limits.

    Returns ``None`` when no gas-limit fields are present (e.g. an early
    estimation call), so the caller can fail closed rather than charge zero.
    """
    total = sum(_parse_uint(user_operation.get(field)) for field in GAS_LIMIT_FIELDS)
    return float(total) if total > 0 else None


def _sponsorship_decision(
    user_operation: dict[str, Any],
) -> tuple[bool, str, MeteredAction | None]:
    if not _env_flag(INSPECT_APPROVE_ENV, default=False):
        return False, f"{INSPECT_APPROVE_ENV} is not enabled", None

    registry_address = _normalize_address(os.getenv("REGISTRY_ADDRESS"))
    forum_addresses = _parse_address_set(os.getenv("FORUM_CONTRACT_ADDRESSES"))
    if registry_address is None and not forum_addresses:
        return False, "deployment addresses are not configured", None

    decoded_execute = _decode_execute_call(user_operation.get("callData"))
    if decoded_execute is None:
        return (
            False,
            "callData is not smart-account execute(address,uint256,bytes)",
            None,
        )

    target, value, inner_data = decoded_execute
    if value != 0:
        return False, "native value transfers are not sponsored", None
    if len(inner_data) < 4:
        return False, "inner callData is missing a function selector", None

    target = target.lower()
    inner_selector = inner_data[:4].hex()
    sender = _normalize_address(user_operation.get("sender")) or ""

    if target == registry_address:
        function_name = _registry_selectors().get(inner_selector)
        if function_name is None:
            return False, f"registry selector 0x{inner_selector} is not sponsored", None
        if inner_selector == _PRODUCTION_REGISTER_SELECTOR:
            kind = "registration_proof"
        else:
            # Mocked register(string) or a custom-configured signature we can
            # approve but not attribute via a proof; meter by sender-derived id.
            kind = "registration_mocked"
        return True, f"registry.{function_name}", MeteredAction(kind, sender, inner_data)

    if target in forum_addresses:
        if inner_selector == FORUM_SUBMIT_SPONSORED_SELECTOR:
            return (
                True,
                "forum.submitSponsored(NewStatement[],SupportAdjustment[])",
                MeteredAction("forum", sender, inner_data),
            )
        return False, f"forum selector 0x{inner_selector} is not sponsored", None

    return False, f"target {target} is not a sponsored contract", None


# Cache one limiter instance per database path so the schema is created once.
_rate_limiters: dict[str, LeakyBucketRateLimiter] = {}


def _get_rate_limiter() -> LeakyBucketRateLimiter | None:
    """Return the configured limiter, or ``None`` when metering is disabled."""
    db_path = (os.getenv(RATE_LIMIT_DB_ENV) or "").strip()
    if not db_path:
        return None
    limiter = _rate_limiters.get(db_path)
    if limiter is None:
        limiter = LeakyBucketRateLimiter(
            db_path,
            capacity_units=_env_float(RATE_LIMIT_CAPACITY_ENV, DEFAULT_CAPACITY_GAS),
            leak_units_per_day=_env_float(
                RATE_LIMIT_LEAK_ENV, DEFAULT_LEAK_GAS_PER_DAY
            ),
        )
        _rate_limiters[db_path] = limiter
    return limiter


def _rate_limit_rpc_url() -> str | None:
    return (
        os.getenv(RATE_LIMIT_RPC_URL_ENV) or os.getenv("INDEXER_RPC_URL") or ""
    ).strip() or None


async def _resolve_user_id(action: MeteredAction) -> str | None:
    """Recover the zkPassport id for *action*, or ``None`` if it cannot be met."""
    if not action.sender:
        return None

    if action.kind == "registration_mocked":
        # No proof and not yet registered: reproduce the mock registry's id
        # locally so it matches the id forum actions will later meter against.
        return identity.mock_registration_user_id(action.sender)

    rpc_url = _rate_limit_rpc_url()
    if rpc_url is None:
        logger.warning(
            "Rate limiting enabled but no RPC URL configured; cannot meter %s",
            action.kind,
        )
        return None

    if action.kind == "forum":
        registry_address = _normalize_address(os.getenv("REGISTRY_ADDRESS"))
        if registry_address is None:
            return None
        return await identity.resolve_forum_user_id(
            rpc_url, registry_address, action.sender
        )

    if action.kind == "registration_proof":
        verifier_address = _normalize_address(os.getenv(VERIFIER_ADDRESS_ENV))
        if verifier_address is None:
            logger.warning(
                "%s is not set; cannot meter production registration",
                VERIFIER_ADDRESS_ENV,
            )
            return None
        return await identity.resolve_registration_user_id(
            rpc_url, verifier_address, action.inner_data, action.sender
        )

    return None


def _idempotency_key(user_operation: dict[str, Any]) -> str:
    """Stable digest identifying one userOperation across webhook retries."""
    sender = str(user_operation.get("sender", ""))
    nonce = str(user_operation.get("nonce", ""))
    call_data = str(user_operation.get("callData", ""))
    return hashlib.sha256(f"{sender}|{nonce}|{call_data}".encode()).hexdigest()


async def _apply_rate_limit(
    user_operation: dict[str, Any], action: MeteredAction, reason: str
) -> tuple[bool, str]:
    """Meter an approved action by its gas cost; returns the final decision.

    Both failure paths below return without calling ``try_consume``, so a
    degenerate call (missing gas fields or an unresolvable id) is not cached and
    a later well-formed retry of the same userOperation can still be sponsored.
    """
    limiter = _get_rate_limiter()
    if limiter is None:
        return True, reason

    weight = _gas_weight(user_operation)
    if weight is None:
        return False, f"{reason}: userOperation is missing gas-limit fields"

    user_id = await _resolve_user_id(action)
    if user_id is None:
        return False, f"{reason}: could not resolve zkPassport id for metering"

    decision = await asyncio.to_thread(
        limiter.try_consume,
        user_id,
        weight,
        idempotency_key=_idempotency_key(user_operation),
    )
    if not decision.allowed:
        return False, f"{reason}: gas budget exceeded (gas={weight:.0f})"
    return (
        True,
        f"{reason}: metered gas={weight:.0f} "
        f"usage={decision.usage_after:.0f}/{decision.capacity:.0f}"
        + (" (replayed)" if decision.replayed else ""),
    )


class GasSponsorshipInspectRequest(BaseModel):
    """Loose Alchemy webhook payload shape used while integration is being mapped."""

    model_config = ConfigDict(extra="allow")

    userOperation: dict[str, Any] = Field(default_factory=dict)
    policyId: str | None = None
    chainId: str | int | None = None
    webhookData: Any | None = None


class GasSponsorshipDecision(BaseModel):
    approved: bool


def create_api(app: FastAPI) -> None:
    """Register gas sponsorship routes on *app*."""

    @app.post("/alchemy/gas-policy/inspect")
    async def inspect_alchemy_gas_policy(
        request: GasSponsorshipInspectRequest,
    ) -> GasSponsorshipDecision:
        """Temporarily inspect Alchemy Gas Manager webhook payloads.

        This endpoint is intentionally not the final policy implementation. It
        exists so Base Sepolia test requests can reveal the exact UserOperation
        and callData shape that the real sponsorship policy must decode.
        """
        user_operation = request.userOperation
        call_data = user_operation.get("callData")
        paymaster_and_data = user_operation.get("paymasterAndData")
        logger.info(
            "Alchemy gas policy inspect request: policy_id=%s chain_id=%s "
            "sender=%s user_operation_keys=%s call_data=%s paymaster_and_data=%s "
            "webhook_data_type=%s",
            request.policyId,
            request.chainId,
            user_operation.get("sender"),
            sorted(user_operation.keys()),
            _summarize_hex(call_data),
            _summarize_hex(paymaster_and_data),
            (
                type(request.webhookData).__name__
                if request.webhookData is not None
                else None
            ),
        )
        approved, reason, action = _sponsorship_decision(user_operation)
        if approved and action is not None:
            approved, reason = await _apply_rate_limit(user_operation, action, reason)
        logger.info(
            "Alchemy gas policy decision: approved=%s reason=%s sender=%s",
            approved,
            reason,
            user_operation.get("sender"),
        )
        return GasSponsorshipDecision(approved=approved)
