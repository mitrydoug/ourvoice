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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
