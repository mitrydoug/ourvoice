import os
import unittest
from unittest.mock import patch

from eth_abi import encode
from eth_utils import function_signature_to_4byte_selector
from fastapi import FastAPI
from fastapi.testclient import TestClient

from symvolia.gas_sponsorship.api import create_api


REGISTRY_ADDRESS = "0x00000000000000000000000000000000000000aa"


def _selector(signature: str) -> bytes:
    return function_signature_to_4byte_selector(signature)


def _execute_call_data(target: str, inner_call_data: bytes) -> str:
    return "0x" + (
        _selector("execute(address,uint256,bytes)")
        + encode(["address", "uint256", "bytes"], [target, 0, inner_call_data])
    ).hex()


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


if __name__ == "__main__":
    unittest.main()
