import { useCallback, useMemo } from "react";
import type { SendTransactionModalUIOptions } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useAccount, useWriteContract } from "wagmi";
import { encodeFunctionData, type Abi, type Address, type Hex } from "viem";
import {
  alchemyGasPolicyId,
  isGasSponsorshipEnabled,
  targetChain,
} from "@/wagmiConfig";

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

const SPONSORED_NETWORK_FEE_ESTIMATE: SponsoredNetworkFeeEstimate = {
  kind: "sponsored",
  label: "Sponsored by Symvolia",
};

const SELF_FUNDED_NETWORK_FEE_ESTIMATE: SponsoredNetworkFeeEstimate = {
  kind: "self-funded",
  label: "Paid by your smart wallet if it has gas",
};

const SPONSORSHIP_UNAVAILABLE_NETWORK_FEE_ESTIMATE: SponsoredNetworkFeeEstimate =
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

const sponsoredTransactionUiOptions = (
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

const isAddress = (value: string | undefined): value is Address =>
  Boolean(value?.startsWith("0x"));

const contractWriteData = (request: ContractWriteRequest) =>
  encodeFunctionData({
    abi: request.abi,
    functionName: request.functionName,
    args: request.args,
  });

const smartWalletCalls = (request: ContractWriteRequest) => [
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

const isSponsoredUserOperation = (userOperation: Record<string, unknown>) =>
  (isNonZeroUserOperationValue(userOperation.maxFeePerGas) === false &&
    isNonZeroUserOperationValue(userOperation.maxPriorityFeePerGas) ===
      false) ||
  hasPaymasterFields(userOperation);

export const useParticipantAddress = () => {
  const { address } = useAccount();
  const { client } = useSmartWallets();
  const smartWalletAddress = client?.account?.address;
  const participantAddress = isGasSponsorshipEnabled
    ? smartWalletAddress
    : address;

  return useMemo(
    () => ({
      address: isAddress(participantAddress) ? participantAddress : undefined,
      isSmartWalletMode: isGasSponsorshipEnabled,
      isSmartWalletLoading: Boolean(
        isGasSponsorshipEnabled && address && !smartWalletAddress,
      ),
      ownerAddress: address,
      smartWalletAddress,
    }),
    [address, participantAddress, smartWalletAddress],
  );
};

export const useSponsoredContractWrite = () => {
  const { writeContractAsync } = useWriteContract();
  const { getClientForChain } = useSmartWallets();

  const previewNetworkFee = useCallback(
    async (
      request: ContractWriteRequest,
    ): Promise<SponsoredNetworkFeeEstimate> => {
      if (!isGasSponsorshipEnabled) {
        return SELF_FUNDED_NETWORK_FEE_ESTIMATE;
      }

      if (!alchemyGasPolicyId) {
        return {
          ...SPONSORSHIP_UNAVAILABLE_NETWORK_FEE_ESTIMATE,
          reason:
            "Gas sponsorship is enabled, but no Alchemy policy is configured.",
        };
      }

      const smartWalletClient = await getClientForChain({ id: targetChain.id });
      if (!smartWalletClient) {
        return {
          ...SPONSORSHIP_UNAVAILABLE_NETWORK_FEE_ESTIMATE,
          reason: "Smart wallet client is not ready.",
        };
      }

      try {
        const userOperation = (await smartWalletClient.prepareUserOperation({
          calls: smartWalletCalls(request),
        })) as Record<string, unknown>;

        return isSponsoredUserOperation(userOperation)
          ? SPONSORED_NETWORK_FEE_ESTIMATE
          : {
              ...SELF_FUNDED_NETWORK_FEE_ESTIMATE,
              reason:
                "The paymaster did not sponsor this operation. The app will keep using your smart wallet so your participant identity stays the same.",
            };
      } catch (error) {
        return {
          ...SPONSORSHIP_UNAVAILABLE_NETWORK_FEE_ESTIMATE,
          reason:
            error instanceof Error
              ? error.message
              : "The paymaster rejected this transaction.",
        };
      }
    },
    [getClientForChain],
  );

  const writeContract = useCallback(
    async (request: ContractWriteRequest): Promise<Hex> => {
      if (!isGasSponsorshipEnabled) {
        return await writeContractAsync(request);
      }

      if (!alchemyGasPolicyId) {
        throw new Error(
          "Gas sponsorship is enabled, but VITE_ALCHEMY_GAS_POLICY_ID is not set.",
        );
      }

      const smartWalletClient = await getClientForChain({ id: targetChain.id });
      if (!smartWalletClient) {
        throw new Error(
          "Smart wallet client is not ready. Check Privy smart wallet configuration for the active chain.",
        );
      }

      return await smartWalletClient.sendTransaction(
        {
          to: request.address,
          value: 0n,
          data: contractWriteData(request),
          gas: request.gas,
        },
        {
          uiOptions: {
            ...sponsoredTransactionUiOptions(
              request.functionName,
              request.uiOptions,
            ),
            showWalletUIs: request.uiOptions?.showWalletUIs,
          },
        },
      );
    },
    [getClientForChain, writeContractAsync],
  );

  return { writeContractAsync: writeContract, previewNetworkFee };
};
