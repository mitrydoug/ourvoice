/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Which OurVoiceRegistry ABI to use at build time.
   *   - `"mocked"` (default) — `MockOurVoiceRegistry`, accepts a plain string
   *   - `"production"` — `OurVoiceRegistry`, requires `ProofVerificationParams`
   */
  readonly VITE_REGISTRY_MODE: "mocked" | "production";

  /**
   * Which network address file to load from `src/contracts/networks/`.
   * Defaults to `"localhost"` for local development.
   */
  readonly VITE_NETWORK: string;

  /** Sepolia RPC endpoint URL. Falls back to https://rpc.sepolia.org if unset. */
  readonly VITE_SEPOLIA_RPC_URL?: string;

  /** WalletConnect projectId. Get a free one at https://cloud.walletconnect.com */
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;

  /** Base URL for the search API. Defaults to http://localhost:8000 for local dev. */
  readonly VITE_SEARCH_URL?: string;

  /**
   * Duration of one chart period in seconds. The support chart shows 7
   * periods plus a live "Now" data point.
   *
   * Defaults to `86400` (1 day) for production.  Set to `360` (6 min)
   * when testing with 60-second step durations (6 steps per period).
   */
  readonly VITE_CHART_PERIOD_SECONDS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
