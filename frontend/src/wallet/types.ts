import type { SendTransactionModalUIOptions } from "@privy-io/react-auth";
import type { Abi, Address } from "viem";

/**
 * The kind of wallet the user currently has active. The rest of the app should
 * not need to branch on this — it is used internally by the wallet module to
 * decide identity and gas-sponsorship behaviour.
 *
 * - `none`      — no wallet connected.
 * - `external`  — a self-custodied wallet (MetaMask, Coinbase Wallet, etc.).
 * - `embedded`  — a Privy embedded EOA with no smart wallet available.
 * - `smart`     — a Privy smart wallet (sponsored) backed by the embedded EOA.
 */
export type WalletKind = "none" | "external" | "embedded" | "smart";

export type SponsoredNetworkFeeEstimate = {
  kind: "sponsored" | "self-funded" | "unavailable";
  label: string;
  reason?: string;
};

export type ContractWriteRequest = {
  address: Address;
  abi: Abi | readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  gas?: bigint;
  uiOptions?: SendTransactionModalUIOptions;
};
