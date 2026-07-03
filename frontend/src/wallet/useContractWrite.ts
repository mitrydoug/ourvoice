import { useCallback } from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useWriteContract } from "wagmi";
import type { Hex } from "viem";
import { alchemyGasPolicyId, targetChain } from "@/wagmiConfig";
import { useActiveWallet } from "./useActiveWallet";
import {
  SELF_FUNDED_NETWORK_FEE_ESTIMATE,
  SPONSORED_NETWORK_FEE_ESTIMATE,
  SPONSORSHIP_UNAVAILABLE_NETWORK_FEE_ESTIMATE,
  contractWriteData,
  isSponsoredUserOperation,
  smartWalletCalls,
  sponsoredTransactionUiOptions,
} from "./sponsoredWrite";
import type {
  ContractWriteRequest,
  SponsoredNetworkFeeEstimate,
} from "./types";

/**
 * Wallet-kind-agnostic contract write API. Callers hand it a contract write and
 * it routes transparently: sponsored (via the Privy smart wallet) when the
 * active wallet is a smart wallet, otherwise self-funded (via wagmi). The only
 * consumer that needs to distinguish the two is the confirmation dialog, which
 * reads `previewNetworkFee`'s `kind`.
 */
export const useContractWrite = () => {
  const { writeContractAsync } = useWriteContract();
  const { getClientForChain } = useSmartWallets();
  const { isSponsored } = useActiveWallet();

  const previewNetworkFee = useCallback(
    async (
      request: ContractWriteRequest,
    ): Promise<SponsoredNetworkFeeEstimate> => {
      if (!isSponsored) {
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
    [isSponsored, getClientForChain],
  );

  const writeContract = useCallback(
    async (request: ContractWriteRequest): Promise<Hex> => {
      if (!isSponsored) {
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
    [isSponsored, getClientForChain, writeContractAsync],
  );

  return { writeContract, previewNetworkFee };
};
