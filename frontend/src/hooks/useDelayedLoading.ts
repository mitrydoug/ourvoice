import { useEffect, useRef, useState } from "react";

interface DelayedLoadingOptions {
  /** Grace period (ms) before showing the loading indicator. @default 250 */
  delay?: number;
  /** Minimum time (ms) the indicator stays visible once shown. @default 500 */
  minShow?: number;
}

/**
 * Delays a loading indicator so it only appears after a grace period and,
 * once visible, stays for a minimum duration to avoid flicker.
 *
 * - If loading completes within `delay` ms, the indicator is never shown.
 * - If loading exceeds `delay` ms, the indicator appears and stays visible
 *   for at least `minShow` ms even if loading finishes sooner.
 */
const useDelayedLoading = (
  isLoading: boolean,
  { delay = 250, minShow = 500 }: DelayedLoadingOptions = {},
): boolean => {
  const [showLoading, setShowLoading] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Start grace-period timer
      const timer = setTimeout(() => {
        shownAtRef.current = Date.now();
        setShowLoading(true);
      }, delay);
      return () => clearTimeout(timer);
    }

    // Loading just finished
    if (shownAtRef.current !== null) {
      // Indicator is visible — keep it shown for at least minShow ms
      const elapsed = Date.now() - shownAtRef.current;
      const remaining = minShow - elapsed;

      if (remaining > 0) {
        const timer = setTimeout(() => {
          setShowLoading(false);
          shownAtRef.current = null;
        }, remaining);
        return () => clearTimeout(timer);
      }

      // Already shown long enough
      setShowLoading(false);
      shownAtRef.current = null;
    }
  }, [isLoading, delay, minShow]);

  return showLoading;
};

export default useDelayedLoading;
