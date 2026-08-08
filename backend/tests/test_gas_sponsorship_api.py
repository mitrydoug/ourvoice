import os
import unittest
from unittest.mock import patch

from eth_abi import encode
from eth_utils import function_signature_to_4byte_selector
from fastapi import FastAPI
from fastapi.testclient import TestClient

from symvolia.gas_sponsorship.api import create_api


REGISTRY_ADDRESS = "0x00000000000000000000000000000000000000aa"
FORUM_ADDRESS = "0x00000000000000000000000000000000000000bb"

REGISTER_PRODUCTION_SIGNATURE = (
    "registerSponsored((bytes32,(bytes32,bytes,bytes32[]),bytes,(uint256,string,string,bool)))"
)
SUBMIT_SPONSORED_SIGNATURE = (
    "submitSponsored((string,int256)[],(uint256,int256,uint8)[])"
)


def _selector(signature: str) -> bytes:
    return function_signature_to_4byte_selector(signature)


def _execute_call_data(target: str, inner_call_data: bytes) -> str:
    return "0x" + (
        _selector("execute(address,uint256,bytes)")
        + encode(["address", "uint256", "bytes"], [target, 0, inner_call_data])
    ).hex()


def _submit_sponsored_call_data(
    statements: list[tuple[str, int]],
    adjustments: list[tuple[int, int, int]],
) -> bytes:
    return _selector(SUBMIT_SPONSORED_SIGNATURE) + encode(
        ["(string,int256)[]", "(uint256,int256,uint8)[]"],
        [statements, adjustments],
    )


class GasSponsorshipApiTests(unittest.TestCase):
    def setUp(self) -> None:
        app = FastAPI()
        create_api(app)
        self.client = TestClient(app)
        self.payload = {
            "policyId": "policy-test",
            "chainId": "84532",
            "userOperation": {
                "sender": "0x0000000000000000000000000000000000000001",
                "callData": "0x12345678abcdef",
            },
            "webhookData": {"source": "test"},
        }

    @patch.dict(os.environ, {}, clear=True)
    def test_inspect_endpoint_fails_closed_by_default(self) -> None:
        response = self.client.post("/alchemy/gas-policy/inspect", json=self.payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"approved": False})

    @patch.dict(
        os.environ,
        {
            "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE": "true",
            "REGISTRY_ADDRESS": REGISTRY_ADDRESS,
            "REGISTRY_MODE": "mocked",
        },
        clear=True,
    )
    def test_inspect_endpoint_can_be_enabled_for_spike(self) -> None:
        self.payload["userOperation"]["callData"] = _execute_call_data(
            REGISTRY_ADDRESS,
            _selector("register(string)") + encode(["string"], ["USA"]),
        )

        response = self.client.post("/alchemy/gas-policy/inspect", json=self.payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"approved": True})

    @patch.dict(
        os.environ,
        {
            "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE": "true",
            "REGISTRY_ADDRESS": REGISTRY_ADDRESS,
            "FORUM_CONTRACT_ADDRESSES": FORUM_ADDRESS,
            "REGISTRY_MODE": "production",
        },
        clear=True,
    )
    def test_forum_submit_sponsored_is_sponsored(self) -> None:
        self.payload["userOperation"]["callData"] = _execute_call_data(
            FORUM_ADDRESS,
            _submit_sponsored_call_data([("hello", 1)], [(0, 1, 0)]),
        )

        response = self.client.post("/alchemy/gas-policy/inspect", json=self.payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"approved": True})

    @patch.dict(
        os.environ,
        {
            "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE": "true",
            "REGISTRY_ADDRESS": REGISTRY_ADDRESS,
            "FORUM_CONTRACT_ADDRESSES": FORUM_ADDRESS,
            "REGISTRY_MODE": "production",
        },
        clear=True,
    )
    def test_unmetered_forum_submit_is_not_sponsored(self) -> None:
        # The self-funded `submit` path must never be gas-sponsored, otherwise
        # it would bypass the on-chain rate limiter that `submitSponsored`
        # enforces.
        self.payload["userOperation"]["callData"] = _execute_call_data(
            FORUM_ADDRESS,
            _selector("submit((string,int256)[],(uint256,int256,uint8)[])")
            + encode(
                ["(string,int256)[]", "(uint256,int256,uint8)[]"],
                [[("hello", 1)], []],
            ),
        )

        response = self.client.post("/alchemy/gas-policy/inspect", json=self.payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"approved": False})

    @patch.dict(
        os.environ,
        {
            "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE": "true",
            "REGISTRY_ADDRESS": REGISTRY_ADDRESS,
            "REGISTRY_MODE": "production",
        },
        clear=True,
    )
    def test_production_register_sponsored_selector_is_sponsored(self) -> None:
        # The webhook approves by selector; the four-byte selector is what
        # matters, so an empty argument body is sufficient to exercise routing.
        self.payload["userOperation"]["callData"] = _execute_call_data(
            REGISTRY_ADDRESS,
            _selector(REGISTER_PRODUCTION_SIGNATURE),
        )

        response = self.client.post("/alchemy/gas-policy/inspect", json=self.payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"approved": True})

    @patch.dict(
        os.environ,
        {
            "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE": "true",
            "REGISTRY_ADDRESS": REGISTRY_ADDRESS,
            "REGISTRY_MODE": "production",
        },
        clear=True,
    )
    def test_production_unmetered_register_is_not_sponsored(self) -> None:
        self.payload["userOperation"]["callData"] = _execute_call_data(
            REGISTRY_ADDRESS,
            _selector(
                "register((bytes32,(bytes32,bytes,bytes32[]),bytes,(uint256,string,string,bool)))"
            ),
        )

        response = self.client.post("/alchemy/gas-policy/inspect", json=self.payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"approved": False})


if __name__ == "__main__":
    unittest.main()
