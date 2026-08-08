"""Gas sponsorship policy routes for Alchemy Gas Manager webhooks."""

import logging
import os
from typing import Any

from eth_utils import function_signature_to_4byte_selector
from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)

INSPECT_APPROVE_ENV = "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE"

DEFAULT_REGISTRY_SIGNATURES_BY_MODE = {
    "mocked": ["register(string)"],
    "production": [
        "registerSponsored((bytes32,(bytes32,bytes,bytes32[]),bytes,(uint256,string,string,bool)))"
    ],
}


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


def _sponsorship_decision(user_operation: dict[str, Any]) -> tuple[bool, str]:
    if not _env_flag(INSPECT_APPROVE_ENV, default=False):
        return False, f"{INSPECT_APPROVE_ENV} is not enabled"

    registry_address = _normalize_address(os.getenv("REGISTRY_ADDRESS"))
    forum_addresses = _parse_address_set(os.getenv("FORUM_CONTRACT_ADDRESSES"))
    if registry_address is None and not forum_addresses:
        return False, "deployment addresses are not configured"

    decoded_execute = _decode_execute_call(user_operation.get("callData"))
    if decoded_execute is None:
        return False, "callData is not smart-account execute(address,uint256,bytes)"

    target, value, inner_data = decoded_execute
    if value != 0:
        return False, "native value transfers are not sponsored"
    if len(inner_data) < 4:
        return False, "inner callData is missing a function selector"

    target = target.lower()
    inner_selector = inner_data[:4].hex()

    if target == registry_address:
        function_name = _registry_selectors().get(inner_selector)
        if function_name is None:
            return False, f"registry selector 0x{inner_selector} is not sponsored"
        return True, f"registry.{function_name}"

    if target in forum_addresses:
        if inner_selector == FORUM_SUBMIT_SPONSORED_SELECTOR:
            return True, "forum.submitSponsored(NewStatement[],SupportAdjustment[])"
        return False, f"forum selector 0x{inner_selector} is not sponsored"

    return False, f"target {target} is not a sponsored contract"


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
        approved, reason = _sponsorship_decision(user_operation)
        logger.info(
            "Alchemy gas policy decision: approved=%s reason=%s sender=%s",
            approved,
            reason,
            user_operation.get("sender"),
        )
        return GasSponsorshipDecision(approved=approved)
