"""Resolve the zkPassport unique identifier for a sponsored user operation.

The sponsorship webhook only sees the userOperation (sender smart-wallet address
and callData), never the zkPassport ``userId`` directly. To meter a human's
budget we recover that id per action:

* **Forum actions** — the sender is already registered, so
  ``registry.getUserIdentifier(sender)`` returns their id via ``eth_call``.
* **Production registration** — the id is not on chain yet; it is embedded in the
  proof. ``registerSponsored((...))`` and ``verify((...))`` take the identical
  ProofVerificationParams tuple, so we swap the 4-byte selector and ``eth_call``
  the verifier to read back ``uniqueIdentifier``. ``verify`` is state-mutating,
  but ``eth_call`` simulates it without persisting side effects, so this is a
  safe read that never consumes the proof's on-chain nullifier.
* **Mocked registration** — ``MockSymvoliaRegistry`` derives the id as
  ``keccak256(abi.encode(sender))``, which we reproduce locally with no RPC.
"""

from __future__ import annotations

import logging

from eth_abi import encode
from eth_utils import function_signature_to_4byte_selector, keccak
from web3 import AsyncHTTPProvider, AsyncWeb3

logger = logging.getLogger(__name__)

_GET_USER_IDENTIFIER_SELECTOR = function_signature_to_4byte_selector(
    "getUserIdentifier(address)"
)

# ProofVerificationParams tuple shared by registerSponsored(...) and verify(...).
_PROOF_PARAMS_TUPLE = (
    "(bytes32,(bytes32,bytes,bytes32[]),bytes,(uint256,string,string,bool))"
)
_VERIFY_SELECTOR = function_signature_to_4byte_selector(f"verify({_PROOF_PARAMS_TUPLE})")

# Reuse one AsyncWeb3 client per RPC URL rather than reconnecting per request.
_clients: dict[str, AsyncWeb3] = {}


def _client(rpc_url: str) -> AsyncWeb3:
    client = _clients.get(rpc_url)
    if client is None:
        client = AsyncWeb3(AsyncHTTPProvider(rpc_url))
        _clients[rpc_url] = client
    return client


def mock_registration_user_id(sender: str) -> str:
    """Reproduce ``MockSymvoliaRegistry``'s ``keccak256(abi.encode(sender))``."""
    checksum_sender = AsyncWeb3.to_checksum_address(sender)
    return "0x" + keccak(encode(["address"], [checksum_sender])).hex()


async def resolve_forum_user_id(
    rpc_url: str, registry_address: str, sender: str
) -> str | None:
    """Return the sender's zkPassport id via ``registry.getUserIdentifier``.

    Returns ``None`` when the sender is not registered or the call fails, so the
    caller can fail closed (decline sponsorship; the user self-funds instead).
    """
    call_data = _GET_USER_IDENTIFIER_SELECTOR + encode(["address"], [sender])
    try:
        result = await _client(rpc_url).eth.call(
            {
                "to": AsyncWeb3.to_checksum_address(registry_address),
                "data": AsyncWeb3.to_hex(call_data),
            }
        )
    except Exception as error:  # noqa: BLE001 — any RPC/revert => cannot meter
        logger.warning("getUserIdentifier(%s) failed: %s", sender, error)
        return None
    if len(result) < 32:
        return None
    return "0x" + bytes(result[:32]).hex()


async def resolve_registration_user_id(
    rpc_url: str,
    verifier_address: str,
    register_inner_calldata: bytes,
    sender: str,
) -> str | None:
    """Recover a registration's zkPassport id by ``eth_call``-ing ``verify``.

    *register_inner_calldata* is the ``registerSponsored((...))`` calldata; its
    argument encoding is identical to ``verify((...))`` so only the selector is
    swapped. Returns ``None`` when the proof does not verify or the call fails.
    """
    verify_calldata = _VERIFY_SELECTOR + register_inner_calldata[4:]
    try:
        result = await _client(rpc_url).eth.call(
            {
                "to": AsyncWeb3.to_checksum_address(verifier_address),
                "from": AsyncWeb3.to_checksum_address(sender),
                "data": AsyncWeb3.to_hex(verify_calldata),
            }
        )
    except Exception as error:  # noqa: BLE001 — any RPC/revert => cannot meter
        logger.warning("verify() eth_call for registration failed: %s", error)
        return None
    # verify returns (bool verified, bytes32 uniqueIdentifier, address helper):
    # three static words, so uniqueIdentifier is the second 32-byte word.
    if len(result) < 64:
        return None
    verified = int.from_bytes(bytes(result[:32]), "big") != 0
    if not verified:
        return None
    return "0x" + bytes(result[32:64]).hex()
