// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

import {DecayUtils} from "./DecayUtils.sol";

contract DecayUtilsTest is Test {
    function test_approxDecayHalvingEvery42Steps() external pure {
        int _initialValue = 1000000000000; // 1 trillion

        assertEq(
            DecayUtils.approxDecayHalvingEvery42Steps(_initialValue, 0),
            _initialValue,
            "0 steps should return initial value"
        );
        assertEq(
            DecayUtils.approxDecayHalvingEvery42Steps(_initialValue, 42),
            _initialValue / 2,
            "42 steps should halve initial value"
        );
        assertEq(
            DecayUtils.approxDecayHalvingEvery42Steps(_initialValue, 84),
            _initialValue / 4,
            "84 steps should quarter initial value"
        );
        assertEq(
            DecayUtils.approxDecayHalvingEvery42Steps(_initialValue, 42 * 39),
            1,
            "39 halvings should bring 1e12 to 1"
        );
        assertEq(
            DecayUtils.approxDecayHalvingEvery42Steps(_initialValue, 42 * 40),
            0,
            "40 halvings should bring 1e12 to 0"
        );

        int _last = _initialValue;
        for (uint i = 1; i <= 42; i++) {
            int _decayedValue = DecayUtils.approxDecayHalvingEvery42Steps(
                _initialValue,
                i
            );
            assertLt(
                _decayedValue,
                _last,
                "decayed value should not increase over steps"
            );
            if (_last >= 10000) {
                assertEq(
                    (_decayedValue * 1000) / _last,
                    983,
                    "value should decay at approx 1.7% per step"
                );
            }
            _last = _decayedValue;
        }
    }

    function test_approxDecayHalvingEvery42StepsNegative(
        uint64 _initialValue
    ) external pure {
        int _value = int(uint256(_initialValue));
        int _negativeValue = -_value;

        int _decayedValue = DecayUtils.approxDecayHalvingEvery42Steps(
            _value,
            1
        );
        int _decayedNegativeValue = DecayUtils.approxDecayHalvingEvery42Steps(
            _negativeValue,
            1
        );
        assertEq(
            _decayedValue,
            -_decayedNegativeValue,
            "decay of negative value should be negative of decay of positive value"
        );
        assertGe(
            _decayedNegativeValue,
            _negativeValue,
            "negative value should decay towards zero"
        );
    }
}
