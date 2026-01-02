// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

library DecayUtils {

    uint public constant UINT_BITS = 256;
    uint public constant HALF_LIFE_STEPS = 42;
    uint public constant STEP_DURATION_SECONDS = 4 hours;
    uint public constant DECAY_MULTIPLIER_BITS = 64;
    uint public constant DECAY_MULTIPLIER_1_STEP = 0xFBCF4D652629F24A;
    uint public constant DECAY_MULTIPLIER_2_STEPS = 0xF7B029A299CFF9E0;
    uint public constant DECAY_MULTIPLIER_4_STEPS = 0xEFA569910B284EB1;
    uint public constant DECAY_MULTIPLIER_8_STEPS = 0xE05645FE1355F239;
    uint public constant DECAY_MULTIPLIER_16_STEPS = 0xC497178FBBAE583A;
    uint public constant DECAY_MULTIPLIER_32_STEPS = 0x96F7B540E51D8332;

    function approxDecayHalvingEvery42Steps(int startValue, uint steps) internal pure returns (int) {

        if (startValue == 0) {
            return 0;
        }

        bool sign = startValue > 0;
        uint value = sign ? uint(startValue) : uint(-startValue); 

        uint _halvings = steps / HALF_LIFE_STEPS;
        value >>= _halvings;
        steps = steps % HALF_LIFE_STEPS;
        if (value == 0 || steps == 0) {
            return sign ? int(value) : -int(value);
        }

        uint toShift = 0;
        uint bitsUpperBound = 40;

        if (steps >= 32) {
            if (bitsUpperBound + DECAY_MULTIPLIER_BITS > UINT_BITS) {
                uint _shift = bitsUpperBound + DECAY_MULTIPLIER_BITS - UINT_BITS;
                value >>= _shift;
                bitsUpperBound -= _shift;
                toShift -= _shift;
            }
            value = value * DECAY_MULTIPLIER_32_STEPS;
            bitsUpperBound += DECAY_MULTIPLIER_BITS;
            toShift += DECAY_MULTIPLIER_BITS;
            steps -= 32;
        }

        if (steps >= 16) {
            if (bitsUpperBound + DECAY_MULTIPLIER_BITS > UINT_BITS) {
                uint _shift = bitsUpperBound + DECAY_MULTIPLIER_BITS - UINT_BITS;
                value >>= _shift;
                bitsUpperBound -= _shift;
                toShift -= _shift;
            }
            value *= DECAY_MULTIPLIER_16_STEPS;
            bitsUpperBound += DECAY_MULTIPLIER_BITS;
            toShift += DECAY_MULTIPLIER_BITS;
            steps -= 16;
        }

        if (steps >= 8) {
            if (bitsUpperBound + DECAY_MULTIPLIER_BITS > UINT_BITS) {
                uint _shift = bitsUpperBound + DECAY_MULTIPLIER_BITS - UINT_BITS;
                value >>= _shift;
                bitsUpperBound -= _shift;
                toShift -= _shift;
            }
            value *= DECAY_MULTIPLIER_8_STEPS;
            bitsUpperBound += DECAY_MULTIPLIER_BITS;
            toShift += DECAY_MULTIPLIER_BITS;
            steps -= 8;
        }

        if (steps >= 4) {
            if (bitsUpperBound + DECAY_MULTIPLIER_BITS > UINT_BITS) {
                uint _shift = bitsUpperBound + DECAY_MULTIPLIER_BITS - UINT_BITS;
                value >>= _shift;
                bitsUpperBound -= _shift;
                toShift -= _shift;
            }
            value *= DECAY_MULTIPLIER_4_STEPS;
            bitsUpperBound += DECAY_MULTIPLIER_BITS;
            toShift += DECAY_MULTIPLIER_BITS;
            steps -= 4;
        }

        if (steps >= 2) {
            if (bitsUpperBound + DECAY_MULTIPLIER_BITS > UINT_BITS) {
                uint _shift = bitsUpperBound + DECAY_MULTIPLIER_BITS - UINT_BITS;
                value >>= _shift;
                bitsUpperBound -= _shift;
                toShift -= _shift;
            }
            value *= DECAY_MULTIPLIER_2_STEPS;
            bitsUpperBound += DECAY_MULTIPLIER_BITS;
            toShift += DECAY_MULTIPLIER_BITS;
            steps -= 2;
        }

        if (steps >= 1) {
            if (bitsUpperBound + DECAY_MULTIPLIER_BITS > UINT_BITS) {
                uint _shift = bitsUpperBound + DECAY_MULTIPLIER_BITS - UINT_BITS;
                value >>= _shift;
                bitsUpperBound -= _shift;
                toShift -= _shift;
            }
            value *= DECAY_MULTIPLIER_1_STEP;
            bitsUpperBound += DECAY_MULTIPLIER_BITS;
            toShift += DECAY_MULTIPLIER_BITS;
            steps -= 1;
        }

        if (toShift > 0) {
            value = ((value >> (toShift - 1)) + 1) >> 1;
        }
        return sign ? int(value) : -int(value);
    }

    function ellapsedStepsBetweenTimestamps(uint fromTimestamp, uint toTimestamp) public pure returns (uint) {
        require(fromTimestamp <= toTimestamp, "fromTimestamp must be <= toTimestamp");
        return (toTimestamp / STEP_DURATION_SECONDS) - (fromTimestamp / STEP_DURATION_SECONDS);
    }

    function decayValue(int startValue, uint fromTimestamp, uint toTimestamp) external pure returns (int) {
        
        uint elapsedSteps = ellapsedStepsBetweenTimestamps(fromTimestamp, toTimestamp);

        if (startValue == 0 || elapsedSteps == 0) {
            return startValue;
        }
        
        return approxDecayHalvingEvery42Steps(startValue, elapsedSteps);
    }

    

}