#!/usr/bin/env node
// Re-extract contract ABIs from Hardhat artifacts into the frontend and backend.
// Run after changing contract interfaces: `node scripts/extract-abis.mjs`
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const readAbi = (artifactRelPath) =>
  JSON.parse(readFileSync(path.join(repoRoot, artifactRelPath), "utf8")).abi;

const tsModule = (artifactRelPath, abi) =>
  `// Auto-extracted from ${artifactRelPath}\n` +
  `// Do not edit manually -- re-extract from Hardhat artifacts when contracts change.\n\n` +
  `export default ${JSON.stringify(abi, null, 2)} as const;\n`;

const FORUM_ARTIFACT = "blockchain/artifacts/contracts/Forum.sol/Forum.json";
const REGISTRY_ARTIFACT =
  "blockchain/artifacts/contracts/SymvoliaRegistry.sol/SymvoliaRegistry.json";

const forumAbi = readAbi(FORUM_ARTIFACT);
const registryAbi = readAbi(REGISTRY_ARTIFACT);

writeFileSync(
  path.join(repoRoot, "frontend/src/contracts/abis/Forum.ts"),
  tsModule(FORUM_ARTIFACT, forumAbi),
);
writeFileSync(
  path.join(repoRoot, "frontend/src/contracts/abis/SymvoliaRegistry.ts"),
  tsModule(REGISTRY_ARTIFACT, registryAbi),
);
writeFileSync(
  path.join(repoRoot, "backend/src/symvolia/ForumABI.json"),
  JSON.stringify({ abi: forumAbi }, null, 2) + "\n",
);

console.log("Extracted Forum.ts, SymvoliaRegistry.ts, ForumABI.json");
