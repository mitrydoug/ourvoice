import type { SendTransactionModalUIOptions } from "@privy-io/react-auth";
import { encodeFunctionData, type Address } from "viem";
import type {
  ContractWriteRequest,
  SponsoredNetworkFeeEstimate,
} from "./types";

/**
 * Pure, React-free helpers for building and inspecting contract writes and
 * their sponsored-transaction UI. Kept separate from the hooks so the wallet
 * module's transaction logic can be reasoned about (and tested) in isolation.
 */

export const SPONSORED_NETWORK_FEE_ESTIMATE: SponsoredNetworkFeeEstimate = {
  kind: "sponsored",
  label: "Sponsored by Symvolia",
};

export const SELF_FUNDED_NETWORK_FEE_ESTIMATE: SponsoredNetworkFeeEstimate = {
  kind: "self-funded",
  label: "Paid from your connected wallet",
};

export const SPONSORSHIP_UNAVAILABLE_NETWORK_FEE_ESTIMATE: SponsoredNetworkFeeEstimate =
  {
    kind: "unavailable",
    label: "Sponsorship unavailable",
  };

const DEFAULT_SPONSORED_TRANSACTION_UI_OPTIONS: SendTransactionModalUIOptions =
  {
    description:
      "This publishes an update to Symvolia. The app sponsors the network fee, and this transaction does not transfer funds.",
    buttonText: "Continue",
    transactionInfo: {
      title: "What happens",
      action: "Publish update",
      contractInfo: {
        name: "Symvolia",
      },
    },
    successHeader: "Update submitted",
    successDescription: "Your update is now being confirmed on-chain.",
    isCancellable: true,
  };

const SPONSORED_TRANSACTION_UI_OPTIONS_BY_FUNCTION_NAME: Record<
  string,
  SendTransactionModalUIOptions
> = {
  register: {
    description:
      "This completes your Symvolia registration. The app sponsors the network fee, and this transaction does not transfer funds.",
    buttonText: "Complete registration",
    transactionInfo: {
      title: "",
      action: "Register identity",
      contractInfo: {
        name: "Symvolia Registry",
      },
    },
    successHeader: "Registration submitted",
    successDescription: "Your registration is now being confirmed on-chain.",
    isCancellable: true,
  },
  multicall: {
    description:
      "This publishes your staged statements and support changes. The app sponsors the network fee, and this transaction does not transfer funds.",
    buttonText: "Lock It In",
    transactionInfo: {
      title: "Lock In Your Changes",
      action: "Publish changes",
      contractInfo: {
        name: "Symvolia Forum",
      },
    },
    successHeader: "Changes submitted",
    successDescription: "Your changes are now being confirmed on-chain.",
    isCancellable: true,
  },
};

export const sponsoredTransactionUiOptions = (
  functionName: string,
  overrideOptions: SendTransactionModalUIOptions | undefined,
): SendTransactionModalUIOptions => {
  const defaultOptions =
    SPONSORED_TRANSACTION_UI_OPTIONS_BY_FUNCTION_NAME[functionName] ??
    DEFAULT_SPONSORED_TRANSACTION_UI_OPTIONS;

  return {
    ...defaultOptions,
    ...overrideOptions,
    transactionInfo: {
      ...defaultOptions.transactionInfo,
      ...overrideOptions?.transactionInfo,
      contractInfo: {
        ...defaultOptions.transactionInfo?.contractInfo,
        ...overrideOptions?.transactionInfo?.contractInfo,
      },
    },
  };
};

export const isAddress = (value: string | undefined): value is Address =>
  Boolean(value?.startsWith("0x"));

export const contractWriteData = (request: ContractWriteRequest) =>
  encodeFunctionData({
    abi: request.abi,
    functionName: request.functionName,
    args: request.args,
  });

export const smartWalletCalls = (request: ContractWriteRequest) => [
  {
    to: request.address,
    value: 0n,
    data: contractWriteData(request),
  },
];

const isNonZeroUserOperationValue = (value: unknown): boolean => {
  if (typeof value === "bigint") return value > 0n;
  if (typeof value === "number") return value > 0;
  if (typeof value !== "string") return false;

  if (value === "" || value === "0x") return false;

  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
};

const hasPaymasterFields = (userOperation: Record<string, unknown>) =>
  isNonZeroUserOperationValue(userOperation.paymasterAndData) ||
  isNonZeroUserOperationValue(userOperation.paymasterData) ||
  isAddress(userOperation.paymaster as string | undefined);

export const isSponsoredUserOperation = (
  userOperation: Record<string, unknown>,
) =>
  (isNonZeroUserOperationValue(userOperation.maxFeePerGas) === false &&
    isNonZeroUserOperationValue(userOperation.maxPriorityFeePerGas) ===
      false) ||
  hasPaymasterFields(userOperation);
