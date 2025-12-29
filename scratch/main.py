import math

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


def approx_decay(value: int, minutes: int):

    nums = [153, 1219, 6889, 63]
    den_pows = [31, 15, 13, 6]
    periods = [1045, 209, 11, 1]

    # Expand to powers of numerators
    nums, den_pows, periods = zip(*[
        (num ** (2 ** j), den_pow * (2 ** j), period * (2 ** j)) 
        for i, (num, den_pow, period) in enumerate(zip(nums, den_pows, periods))
        for j in reversed(range(int(math.log2(periods[max(0, i-1)]/period))+1))
    ])

    ticks = minutes // 240
    right_shifts = 0

    for num, den_pow, period in zip(nums, den_pows, periods):
        while ticks >= period:
            value *= num
            right_shifts += den_pow
            ticks -= period
            print(f" x {num} (>> {den_pow}); right_shifts: {right_shifts};")
            if right_shifts >= math.log2(value):
                return 0
            elif math.log2(value) > 100:
                shift = min(30, right_shifts)
                value >>= shift
                right_shifts -= shift
                print(f"   >> {shift}; right_shifts: {right_shifts};")
    value >>= right_shifts
    return value


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


if __name__ == "__main__":
    find_small_gaps()
