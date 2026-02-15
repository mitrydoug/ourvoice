import type { IgnitionModuleBuilder } from "@nomicfoundation/ignition-core";
import type {
  ContractFuture,
  NamedArtifactContractDeploymentFuture,
} from "@nomicfoundation/ignition-core";

/**
 * Shared helper that deploys the DecayUtils library and a set of Forum
 * contracts, each linked to the library and pointing at the given registry.
 *
 * @param m          - The Ignition module builder.
 * @param registry   - A Future resolving to the OurVoiceRegistry (or mock) contract.
 * @param forumNames - The list of forum identifiers to deploy (e.g. ["global", "us"]).
 *                     "global" is special-cased to pass an empty nationality string.
 * @returns The DecayUtils library Future and a record mapping each forum name
 *          to its deployed Forum contract Future.
 */
export function deployForums(
  m: IgnitionModuleBuilder,
  registry: ContractFuture<string>,
  forumNames: string[],
): {
  decayUtils: NamedArtifactContractDeploymentFuture<"DecayUtils">;
  forums: Record<string, NamedArtifactContractDeploymentFuture<"Forum">>;
} {
  const decayUtils = m.contract("DecayUtils");

  const forums = Object.fromEntries(
    forumNames.map((forum) => [
      forum,
      m.contract(
        "Forum",
        [registry, forum === "global" ? "" : forum, 0],
        { id: `Forum_${forum}`, libraries: { DecayUtils: decayUtils } },
      ),
    ]),
  );

  return { decayUtils, forums };
}
