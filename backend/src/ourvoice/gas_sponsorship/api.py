"""Gas sponsorship policy routes for Alchemy Gas Manager webhooks."""

import logging
import os
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)

INSPECT_APPROVE_ENV = "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE"


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
        return GasSponsorshipDecision(
            approved=_env_flag(INSPECT_APPROVE_ENV, default=False)
        )
