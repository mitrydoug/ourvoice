/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** User-facing Symvolia app version string derived from the repo VERSION file. */
  readonly VITE_APP_VERSION?: string;

  /**
   * Which SymvoliaRegistry ABI to use at build time.
   *   - `"mocked"` (default) — `MockSymvoliaRegistry`, accepts a plain string
   *   - `"production"` — `SymvoliaRegistry`, requires `ProofVerificationParams`
   */
  readonly VITE_REGISTRY_MODE: "mocked" | "production";

  /**
   * Which network address file to load from `src/contracts/networks/`.
   */
  readonly VITE_NETWORK: string;

  /** Local backend RPC relay URL for the selected VITE_NETWORK. */
  readonly VITE_RPC_URL?: string;

  /** WalletConnect projectId. Get a free one at https://cloud.walletconnect.com */
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;

  /** Privy app ID for embedded wallet and external wallet login. */
  readonly VITE_PRIVY_APP_ID?: string;

  /** Optional Privy app client ID, when configured in the Privy dashboard. */
  readonly VITE_PRIVY_APP_CLIENT_ID?: string;

  /** Enables Privy smart-wallet sponsored transactions when set to "true". */
  readonly VITE_ENABLE_GAS_SPONSORSHIP?: string;

  /** Alchemy Gas Manager policy ID used by Privy smart wallets. */
  readonly VITE_ALCHEMY_GAS_POLICY_ID?: string;

  /** Base URL for the search API. Defaults to http://localhost:8000 for local dev. */
  readonly VITE_SEARCH_URL?: string;

  /**
   * How often (in seconds) the frontend polls the chain for a new block
   * number and refreshes contract data. Defaults to `60`.
   * Set to a lower value (e.g. `4`) for local development if fast feedback
   * is useful.
   */
  readonly VITE_BLOCK_POLLING_INTERVAL_SECONDS?: string;

  /** Maximum search/similar-statement results to fetch. Defaults to 20. */
  readonly VITE_SEARCH_RESULTS_LIMIT?: string;

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
