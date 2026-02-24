import type { IgnitionModuleBuilder } from "@nomicfoundation/ignition-core";
import type {
  ContractFuture,
  NamedArtifactContractDeploymentFuture,
} from "@nomicfoundation/ignition-core";

/**
 * Shared helper that deploys a set of Forum contracts pointing at the given registry.
 *
 * @param m                    - The Ignition module builder.
 * @param registry             - A Future resolving to the OurVoiceRegistry (or mock) contract.
 * @param forumNames           - The list of forum identifiers to deploy (e.g. ["global", "USA"]).
 *                               "global" is special-cased to pass an empty nationality string.
 * @param stepDurationSeconds  - The duration (in seconds) of a single decay/credit step.
 * @returns A record mapping each forum name to its deployed Forum contract Future.
 */
export function deployForums(
  m: IgnitionModuleBuilder,
  registry: ContractFuture<string>,
  forumNames: string[],
  stepDurationSeconds: number,
): {
  forums: Record<string, NamedArtifactContractDeploymentFuture<"Forum">>;
} {
  const forums = Object.fromEntries(
    forumNames.map((forum) => [
      forum,
      m.contract(
        "Forum",
        [registry, forum === "global" ? "" : forum, 0, stepDurationSeconds],
        { id: `Forum_${forum}` },
      ),
    ]),
  );

  return { forums };
}
