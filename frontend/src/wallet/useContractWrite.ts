import { useCallback } from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { usePublicClient, useWriteContract } from "wagmi";
import type { Hex } from "viem";
import { alchemyGasPolicyId, targetChain } from "@/wagmiConfig";
import { useActiveWallet } from "./useActiveWallet";
import { fetchEthUsdPrice } from "./ethUsdPrice";
import {
  SELF_FUNDED_NETWORK_FEE_ESTIMATE,
  SPONSORED_NETWORK_FEE_ESTIMATE,
  SPONSORSHIP_UNAVAILABLE_NETWORK_FEE_ESTIMATE,
  classifySponsorshipWarning,
  contractWriteData,
  formatUsdFee,
  isPaymasterError,
  isSponsoredUserOperation,
  selfFundedLabel,
  selfFundedWriteRequest,
  smartWalletCalls,
  sponsoredTransactionUiOptions,
  unsponsoredUserOperationRequest,
  userOperationFeeWei,
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
  const publicClient = usePublicClient();

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

      // Builds a self-funded estimate through the smart wallet (identity stays
      // the same). Prices an unsponsored user operation when one isn't already
      // available, degrading to a label without a dollar figure if it cannot be
      // prepared or priced.
      const buildSelfFundedEstimate = async (
        userOperation: Record<string, unknown> | undefined,
        extra: Pick<SponsoredNetworkFeeEstimate, "reason" | "warning">,
      ): Promise<SponsoredNetworkFeeEstimate> => {
        let operation = userOperation;
        if (!operation) {
          try {
            operation = (await smartWalletClient.prepareUserOperation(
              unsponsoredUserOperationRequest(request) as unknown as Parameters<
                typeof smartWalletClient.prepareUserOperation
              >[0],
            )) as Record<string, unknown>;
          } catch {
            operation = undefined;
          }
        }

        const feeWei = operation ? userOperationFeeWei(operation) : undefined;
        const ethUsdPrice = publicClient
          ? await fetchEthUsdPrice(publicClient)
          : undefined;
        const feeUsd =
          feeWei !== undefined && ethUsdPrice !== undefined
            ? formatUsdFee(feeWei, ethUsdPrice)
            : "";

        return {
          kind: "self-funded",
          label: selfFundedLabel(feeUsd),
          ...extra,
        };
      };

      try {
        const userOperation = (await smartWalletClient.prepareUserOperation({
          calls: smartWalletCalls(request),
        })) as Record<string, unknown>;

        if (isSponsoredUserOperation(userOperation)) {
          return SPONSORED_NETWORK_FEE_ESTIMATE;
        }

        // Prepared successfully but the paymaster declined to sponsor: the
        // smart wallet will pay, so price the operation we already have.
        return await buildSelfFundedEstimate(userOperation, {
          reason:
            "The paymaster did not sponsor this operation. The app will keep using your smart wallet so your participant identity stays the same.",
        });
      } catch (error) {
        // The paymaster errored (e.g. policy limits exhausted). Fall back to a
        // self-funded flow and surface the reason as a warning.
        return await buildSelfFundedEstimate(undefined, {
          warning: classifySponsorshipWarning(error),
        });
      }
    },
    [isSponsored, getClientForChain, publicClient],
  );

  const writeContract = useCallback(
    async (request: ContractWriteRequest): Promise<Hex> => {
      if (!isSponsored) {
        // External / embedded EOA wallets always pay their own gas, so call the
        // unmetered self-funded function rather than the sponsored entrypoint.
        return await writeContractAsync(selfFundedWriteRequest(request));
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

      const uiOptions = {
        ...sponsoredTransactionUiOptions(
          request.functionName,
          request.uiOptions,
        ),
        showWalletUIs: request.uiOptions?.showWalletUIs,
      };

      // Privy's wrapped `sendTransaction` always applies the smart wallet's
      // configured paymaster and ignores a per-call `paymaster: false`. A
      // self-funded send therefore has to go through the underlying bundler
      // client's `sendUserOperation` (which honours `paymaster: false`) and
      // then resolve the transaction hash from the user-operation receipt.
      const sendSelfFunded = async (): Promise<Hex> => {
        const userOpHash = await smartWalletClient.sendUserOperation(
          unsponsoredUserOperationRequest(request) as unknown as Parameters<
            typeof smartWalletClient.sendUserOperation
          >[0],
        );
        const { receipt } = await smartWalletClient.waitForUserOperationReceipt(
          {
            hash: userOpHash,
          },
        );
        return receipt.transactionHash;
      };

      if (request.selfFunded) {
        // The fee preview already priced this as self-funded, so skip the
        // doomed sponsored attempt and pay from the smart wallet directly.
        return await sendSelfFunded();
      }

      try {
        return await smartWalletClient.sendTransaction(
          {
            to: request.address,
            value: 0n,
            data: contractWriteData(request),
            gas: request.gas,
          },
          { uiOptions },
        );
      } catch (error) {
        if (!isPaymasterError(error)) {
          throw error;
        }

        // Sponsorship failed (webhook declined, policy limits, etc.). Retry
        // self-funded through the same smart wallet so the participant identity
        // is unchanged; the smart wallet pays its own gas.
        return await sendSelfFunded();
      }
    },
    [isSponsored, getClientForChain, writeContractAsync],
  );

  return { writeContract, previewNetworkFee };
};
