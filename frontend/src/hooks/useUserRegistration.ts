import { useReadContract } from "wagmi";
import { useParticipantAddress } from "./useSponsoredContractWrite";
import {
  isDevMode,
  mockRegistryContractConfig,
  registryContractConfig,
} from "../contracts";

// Both registry variants (production & mock) share the same read interface.
// Use the production ABI for reads — it's a superset of the mock ABI — paired
// with whichever address is active.
const registryReadConfig = {
  address: isDevMode
    ? mockRegistryContractConfig.address
    : registryContractConfig.address,
  abi: registryContractConfig.abi,
} as const;

interface Registration {
  uniqueIdentifier: `0x${string}`;
  nationality: string;
  registeredAddresses: readonly `0x${string}`[];
  registrationTimestamp: bigint;
}

export interface UserRegistration {
  /** Whether the user is registered in the SymvoliaRegistry (any forum). */
  isRegistered: boolean;
  /** True while the registration query is still in-flight. */
  isLoading: boolean;
  /**
   * The user's nationality from their registration.
   * - `null` when not registered
   * - `""` when registered without disclosing nationality
   * - An ISO 3166-1 alpha-3 code (e.g. "USA", "CAN") otherwise
   */
  nationality: string | null;
}

/**
 * Reads the user's global registration state from the SymvoliaRegistry.
 *
 * This is distinct from `isUserVerified` in `useUserVotes`, which checks
 * forum-specific membership via `Forum.isMember()`. A user can be registered
 * (verified their identity) but not be a member of the currently-selected
 * forum if nationality requirements don't match.
 */
export function useUserRegistration(): UserRegistration {
  const { address, isSmartWalletLoading } = useParticipantAddress();

  const { data: isRegistered, isLoading: isRegisteredLoading } =
    useReadContract({
      ...registryReadConfig,
      functionName: "isRegistered",
      args: address ? [address] : undefined,
      query: { enabled: !!address },
    });

  const { data: registration, isLoading: isRegistrationLoading } =
    useReadContract({
      ...registryReadConfig,
      functionName: "getUserRegistration",
      args: address ? [address] : undefined,
      query: { enabled: !!address && isRegistered === true },
    });

  if (!isRegistered) {
    return {
      isRegistered: false,
      isLoading: isSmartWalletLoading || (!!address && isRegisteredLoading),
      nationality: null,
    };
  }

  const reg = registration as Registration | undefined;
  return {
    isRegistered: true,
    isLoading: isRegistrationLoading || !reg,
    nationality: reg?.nationality ?? null,
  };
}
