import math
from collections import defaultdict

MINS_IN_WEEK = 60 * 24 * 7


def find_small_gaps():

    N = 1024

    parts = list(range(int(0.8 * N), N))

    close_parts = []

    for i in range(1, MINS_IN_WEEK // 2):
        ex = 0.5 ** (i / MINS_IN_WEEK)
        close_part = min(parts, key=lambda t: abs(t / N - ex))
        close_parts.append((abs(close_part / N - ex), i, close_part))

    close_parts.sort()

    for diff, i, part in close_parts[:100]:
        print(f"Minute: {i:4d}, Tick: {part:4d}/{N}, Diff: {diff:.10f}")


def to_binary_str(x: float, places: int = 100) -> str:
    bstr = ""
    y = int(x * 2**places)
    while y > 0:
        bstr = str(y & 1) + bstr
        y >>= 1

    bstr = bstr[:-places] + "." + bstr[-places:]

    return bstr


UINT_BITS=256


def approx_decay(n: int, steps: int) -> int:

    while steps >= 42:
        n >>= 1
        steps -= 42
        if n == 0:
            return 0
        
    mults = [
        0b1111101111001111010011010110010100100110001010011111001001001010, # 011000111100010110111111011100000001, # x^1
        0b1111011110110000001010011010001010011001110011111111100111100000, # 000100100111110110001000101101101010, # x^2
        0b1110111110100101011010011001000100001011001010000100111010110001, # 100111010111001111110001100100111110, # x^4
        0b1110000001010110010001011111111000010011010101011111001000111001, # 110010011010011011001010000000010000, # x^8
        0b1100010010010111000101111000111110111011101011100101100000111010, # 100101000100110100001101110000001101, # x^16
        0b1001011011110111101101010100000011100101000111011000001100110010, # 010100100110101000110011101011101011, # x^32
    ]
    shifts = [64]*len(mults)

    to_shift = 0

    for i, (mult, shift) in reversed(list(enumerate(zip(mults, shifts)))):
        if steps >= 2 ** i:
            # print(f"Applying x^{2**i} multiplier")
            if n.bit_length() + mult.bit_length() > UINT_BITS:
                _shift = (n.bit_length() + mult.bit_length() - UINT_BITS)
                # print(f"{n.bit_length()} + {mult.bit_length()} > {UINT_BITS}. Shifting down by {_shift} bits to avoid overflow")
                n >>= _shift
                to_shift -= _shift
            # print(f"{n.bit_length()} + {mult.bit_length()} <= {UINT_BITS}")
            n = (n * mult)
            # print(n)
            if (n.bit_length() > UINT_BITS):
                raise OverflowError(f"Result bit length {n.bit_length()} exceeds {UINT_BITS}")
            steps -= 2 ** i
            to_shift += shift
            if n == 0:
                return 0
        
    return ((n >> (to_shift-1)) + 1) >> 1


def decay_exact(minutes):
    return (0.5) ** (minutes / MINS_IN_WEEK)


def show_decay_comparison():

    minute_options = range(0, MINS_IN_WEEK + 1, 15)
    approx, mults, multns = zip(*(approx_decay(m) for m in minute_options))
    exact = [decay_exact(m) for m in minute_options]
    diffs = [abs(a - e) for a, e in zip(approx, exact)]
    for m, a, e, d in zip(minute_options, approx, exact, diffs):
        print(f"Minutes: {m:4d}, Approx: {a:.10f}, Exact: {e:.10f}, Diff: {d:.10f}")

    max_mult, max_multn = max(zip(mults, multns), key=lambda x: x[0])
    print(
        f"\nMax Multiplier: {max_mult} ({math.log2(max_mult)} bits) with {max_multn} multiplications"
    )


def find_decay_mismatches(N: int = int(1e12)):

    mismatches = {}
    
    for d0 in range(1, 42):
        m = approx_decay(N, d0)
        for d1 in range(1, 42-d0):
            n_approx = approx_decay(N, d0+d1)
            m_approx = approx_decay(m, d1)
            if n_approx != m_approx:
                diff = n_approx - m_approx
                if d0 in mismatches:
                    assert diff == mismatches[d0], f"Different mismatch for d0={d0}: {diff} vs {mismatches[d0]}"
                else:
                    mismatches[d0] = diff
                if abs(n_approx - m_approx) > 1:
                    print(f"Mismatch for N={N}, d0={d0}, m={m}, d1={d1}: n_approx={n_approx}, m_approx={m_approx}, diff={n_approx - m_approx}")


if __name__ == "__main__":
    find_small_gaps()


"""
0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
x = (1/2)**(1/42)

x^1 
0.111110111100111101001101011001010010011000101001111100100100101001100011110001011011111101110000000100110011111010010001001101..._2
0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
0.1111101111001111010011010110010100100110001010011111001001001010011000111100010110111111011100000001


x^2
0.111101111011000000101001101000101001100111001111111110011110000000010010011111011000100010110110101000101111000110101110010111..._2
0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

x^4
0.11101111101001010110100110010001000010110010100001001110101100011001110101110011111100011001001111101000100101111000111010101..._2
0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

x^8
0.111000000101011001000101111111100001001101010101111100100011100111001001101001101100101000000001000000011011000110110000010001..._2
0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

x^16
0.110001001001011100010111100011111011101110101110010110000011101010010100010011010000110111000000110111110000000101110101110011..._2
0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

x^32
0.10010110111101111011010101000000111001010001110110000011001100100101001001101010001100111010111010111000010000011101001111011..._2
0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

"""