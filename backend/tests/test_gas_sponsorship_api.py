import os
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

from eth_abi import encode
from eth_utils import function_signature_to_4byte_selector
from fastapi import FastAPI
from fastapi.testclient import TestClient

from symvolia.gas_sponsorship import identity
from symvolia.gas_sponsorship.api import create_api
from symvolia.gas_sponsorship.rate_limiter import LeakyBucketRateLimiter


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


class LeakyBucketRateLimiterTests(unittest.TestCase):
    def _limiter(self, **kwargs) -> LeakyBucketRateLimiter:
        directory = tempfile.mkdtemp()
        db_path = os.path.join(directory, "sponsorship.db")
        return LeakyBucketRateLimiter(db_path, **kwargs)

    def test_consume_within_capacity_then_rejects(self) -> None:
        limiter = self._limiter(capacity_units=10, leak_units_per_day=0)

        first = limiter.try_consume("user", 4, now=1000)
        second = limiter.try_consume("user", 4, now=1000)
        third = limiter.try_consume("user", 4, now=1000)

        self.assertTrue(first.allowed)
        self.assertTrue(second.allowed)
        self.assertFalse(third.allowed)  # 8 + 4 = 12 > 10
        self.assertEqual(second.usage_after, 8.0)
        # A rejected consume does not add its weight.
        self.assertEqual(third.usage_after, 8.0)

    def test_leak_recovers_budget_over_time(self) -> None:
        # 86400 units/day == 1 unit/second.
        limiter = self._limiter(capacity_units=10, leak_units_per_day=86_400)

        self.assertTrue(limiter.try_consume("user", 6, now=1000).allowed)
        self.assertFalse(limiter.try_consume("user", 6, now=1000).allowed)
        # Five seconds later, 5 units have leaked (6 -> 1), so 1 + 6 = 7 <= 10.
        recovered = limiter.try_consume("user", 6, now=1005)
        self.assertTrue(recovered.allowed)
        self.assertAlmostEqual(recovered.usage_after, 7.0, places=6)

    def test_idempotency_key_replays_without_double_charging(self) -> None:
        limiter = self._limiter(capacity_units=10, leak_units_per_day=0)

        first = limiter.try_consume("user", 5, idempotency_key="op-1", now=1000)
        replay = limiter.try_consume("user", 5, idempotency_key="op-1", now=1000)

        self.assertTrue(first.allowed)
        self.assertTrue(replay.allowed)
        self.assertFalse(replay.replayed is False)
        self.assertEqual(replay.usage_after, 5.0)  # not 10

        # A distinct op charges again.
        distinct = limiter.try_consume("user", 5, idempotency_key="op-2", now=1000)
        self.assertTrue(distinct.allowed)
        self.assertEqual(distinct.usage_after, 10.0)


class GasSponsorshipMeteringTests(unittest.TestCase):
    def setUp(self) -> None:
        app = FastAPI()
        create_api(app)
        self.client = TestClient(app)
        directory = tempfile.mkdtemp()
        self.db_path = os.path.join(directory, "sponsorship.db")
        self.sender = "0x0000000000000000000000000000000000000abc"

    def _payload(self, call_data: str, nonce: str, *, gas: int = 200_000) -> dict:
        # Split the gas across three limit fields so the summation path is
        # exercised; unset fields (paymaster*) default to zero.
        call_gas = gas // 2
        verification_gas = gas // 4
        pre_verification_gas = gas - call_gas - verification_gas
        return {
            "policyId": "policy-test",
            "chainId": "84532",
            "userOperation": {
                "sender": self.sender,
                "nonce": nonce,
                "callData": call_data,
                "callGasLimit": hex(call_gas),
                "verificationGasLimit": hex(verification_gas),
                "preVerificationGas": hex(pre_verification_gas),
            },
        }

    def test_mocked_registration_meters_by_reproduced_user_id(self) -> None:
        # capacity 800000 gas, 200000 gas/op => four succeed, the fifth is
        # rejected, all keyed by the same reproduced mock user id (no RPC).
        call_data = _execute_call_data(
            REGISTRY_ADDRESS,
            _selector("register(string)") + encode(["string"], ["USA"]),
        )
        env = {
            "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE": "true",
            "REGISTRY_ADDRESS": REGISTRY_ADDRESS,
            "REGISTRY_MODE": "mocked",
            "GAS_SPONSORSHIP_RATE_LIMIT_DB": self.db_path,
            "GAS_SPONSORSHIP_RATE_LIMIT_CAPACITY_GAS": "800000",
            "GAS_SPONSORSHIP_RATE_LIMIT_LEAK_GAS_PER_DAY": "0",
        }
        with patch.dict(os.environ, env, clear=True):
            results = [
                self.client.post(
                    "/alchemy/gas-policy/inspect",
                    json=self._payload(call_data, hex(nonce)),
                ).json()["approved"]
                for nonce in range(5)
            ]

        self.assertEqual(results, [True, True, True, True, False])

    def test_repeated_user_operation_is_not_double_charged(self) -> None:
        call_data = _execute_call_data(
            REGISTRY_ADDRESS,
            _selector("register(string)") + encode(["string"], ["USA"]),
        )
        env = {
            "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE": "true",
            "REGISTRY_ADDRESS": REGISTRY_ADDRESS,
            "REGISTRY_MODE": "mocked",
            "GAS_SPONSORSHIP_RATE_LIMIT_DB": self.db_path,
            "GAS_SPONSORSHIP_RATE_LIMIT_CAPACITY_GAS": "800000",
            "GAS_SPONSORSHIP_RATE_LIMIT_LEAK_GAS_PER_DAY": "0",
        }
        with patch.dict(os.environ, env, clear=True):
            # Same nonce five times: only the first consumes budget (200000 gas),
            # so distinct later ops still fit under the 800000-gas capacity.
            for _ in range(5):
                same = self.client.post(
                    "/alchemy/gas-policy/inspect",
                    json=self._payload(call_data, "0x1"),
                )
                self.assertTrue(same.json()["approved"])

            distinct = [
                self.client.post(
                    "/alchemy/gas-policy/inspect",
                    json=self._payload(call_data, hex(nonce)),
                ).json()["approved"]
                for nonce in range(10, 14)
            ]

        # 200000 (deduped) + 200000*3 = 800000 fits; the fourth distinct op does not.
        self.assertEqual(distinct, [True, True, True, False])

    def test_forum_submit_metered_and_approved(self) -> None:
        call_data = _execute_call_data(
            FORUM_ADDRESS,
            _submit_sponsored_call_data([("hello", 1)], [(0, 1, 0)]),
        )
        env = {
            "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE": "true",
            "REGISTRY_ADDRESS": REGISTRY_ADDRESS,
            "FORUM_CONTRACT_ADDRESSES": FORUM_ADDRESS,
            "REGISTRY_MODE": "production",
            "GAS_SPONSORSHIP_RATE_LIMIT_DB": self.db_path,
            "GAS_SPONSORSHIP_RPC_URL": "http://rpc.invalid",
        }
        resolver = AsyncMock(return_value="0x" + "11" * 32)
        with patch.dict(os.environ, env, clear=True), patch.object(
            identity, "resolve_forum_user_id", resolver
        ):
            response = self.client.post(
                "/alchemy/gas-policy/inspect",
                json=self._payload(call_data, "0x1"),
            )

        self.assertEqual(response.json(), {"approved": True})
        resolver.assert_awaited_once()

    def test_forum_submit_rejected_when_over_capacity(self) -> None:
        call_data = _execute_call_data(
            FORUM_ADDRESS,
            _submit_sponsored_call_data([("hello", 1)], [(0, 1, 0)]),
        )
        env = {
            "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE": "true",
            "REGISTRY_ADDRESS": REGISTRY_ADDRESS,
            "FORUM_CONTRACT_ADDRESSES": FORUM_ADDRESS,
            "REGISTRY_MODE": "production",
            "GAS_SPONSORSHIP_RATE_LIMIT_DB": self.db_path,
            "GAS_SPONSORSHIP_RPC_URL": "http://rpc.invalid",
            "GAS_SPONSORSHIP_RATE_LIMIT_CAPACITY_GAS": "100000",
        }
        resolver = AsyncMock(return_value="0x" + "22" * 32)
        with patch.dict(os.environ, env, clear=True), patch.object(
            identity, "resolve_forum_user_id", resolver
        ):
            # gas cost 200000 > capacity 100000.
            response = self.client.post(
                "/alchemy/gas-policy/inspect",
                json=self._payload(call_data, "0x1"),
            )

        self.assertEqual(response.json(), {"approved": False})

    def test_forum_submit_rejected_when_gas_fields_missing(self) -> None:
        call_data = _execute_call_data(
            FORUM_ADDRESS,
            _submit_sponsored_call_data([("hello", 1)], []),
        )
        env = {
            "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE": "true",
            "REGISTRY_ADDRESS": REGISTRY_ADDRESS,
            "FORUM_CONTRACT_ADDRESSES": FORUM_ADDRESS,
            "REGISTRY_MODE": "production",
            "GAS_SPONSORSHIP_RATE_LIMIT_DB": self.db_path,
            "GAS_SPONSORSHIP_RPC_URL": "http://rpc.invalid",
        }
        resolver = AsyncMock(return_value="0x" + "33" * 32)
        payload = {
            "policyId": "policy-test",
            "chainId": "84532",
            "userOperation": {
                "sender": self.sender,
                "nonce": "0x1",
                "callData": call_data,
            },
        }
        with patch.dict(os.environ, env, clear=True), patch.object(
            identity, "resolve_forum_user_id", resolver
        ):
            response = self.client.post(
                "/alchemy/gas-policy/inspect", json=payload
            )

        # No gas-limit fields => nothing to meter => fail closed (self-fund).
        self.assertEqual(response.json(), {"approved": False})

    def test_forum_submit_rejected_when_user_id_unresolvable(self) -> None:
        call_data = _execute_call_data(
            FORUM_ADDRESS,
            _submit_sponsored_call_data([("hello", 1)], []),
        )
        env = {
            "ALCHEMY_GAS_SPONSORSHIP_INSPECT_APPROVE": "true",
            "REGISTRY_ADDRESS": REGISTRY_ADDRESS,
            "FORUM_CONTRACT_ADDRESSES": FORUM_ADDRESS,
            "REGISTRY_MODE": "production",
            "GAS_SPONSORSHIP_RATE_LIMIT_DB": self.db_path,
            "GAS_SPONSORSHIP_RPC_URL": "http://rpc.invalid",
        }
        resolver = AsyncMock(return_value=None)
        with patch.dict(os.environ, env, clear=True), patch.object(
            identity, "resolve_forum_user_id", resolver
        ):
            response = self.client.post(
                "/alchemy/gas-policy/inspect",
                json=self._payload(call_data, "0x1"),
            )

        # Fail closed: an unresolvable id means we decline (user self-funds).
        self.assertEqual(response.json(), {"approved": False})


if __name__ == "__main__":
    unittest.main()
