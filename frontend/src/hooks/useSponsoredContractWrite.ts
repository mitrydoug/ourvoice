import { useCallback, useMemo } from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useAccount, useWriteContract } from "wagmi";
import { encodeFunctionData, type Abi, type Address, type Hex } from "viem";
import {
  alchemyGasPolicyId,
  isGasSponsorshipEnabled,
  targetChain,
} from "@/wagmiConfig";

type ContractWriteRequest = {
  address: Address;
  abi: Abi | readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  gas?: bigint;
};

const isAddress = (value: string | undefined): value is Address =>
  Boolean(value?.startsWith("0x"));

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

      return await smartWalletClient.sendTransaction({
        to: request.address,
        data: encodeFunctionData({
          abi: request.abi,
          functionName: request.functionName,
          args: request.args,
        }),
        gas: request.gas,
      });
    },
    [getClientForChain, writeContractAsync],
  );

  return { writeContractAsync: writeContract };
};
