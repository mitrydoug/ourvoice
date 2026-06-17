import os
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from ourvoice.gas_sponsorship.api import create_api


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
        {"ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE": "true"},
        clear=True,
    )
    def test_inspect_endpoint_can_be_enabled_for_spike(self) -> None:
        response = self.client.post("/alchemy/gas-policy/inspect", json=self.payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"approved": True})


if __name__ == "__main__":
    unittest.main()
