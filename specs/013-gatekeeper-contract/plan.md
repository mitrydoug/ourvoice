# Implementation Plan: GateKeeper Membership Contract

**Branch**: `013-gatekeeper-contract` | **Date**: 2026-02-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/013-gatekeeper-contract/spec.md`

## Summary

Extract forum membership logic (nationality check + registry lookup) from the Forum contract into a dedicated GateKeeper contract. The GateKeeper is defined behind an interface (`IGateKeeper`) so the Forum depends only on the abstraction. A concrete `NationalityGateKeeper` implementation bridges Forum ↔ OurVoiceRegistry, accepting a nationality condition at construction time. The Forum's constructor changes from `(registry, nationality, maxRanked)` to `(gateKeeper, maxRanked)`, and its `isMember()` / `onlyMembers` delegate to `gateKeeper.isMember(msg.sender)`. All existing Forum tests are updated to deploy through the GateKeeper; new dedicated GateKeeper tests are added. Deployment scripts and frontend ABI are updated accordingly.

## Technical Context

**Language/Version**: Solidity 0.8.28
**Primary Dependencies**: Hardhat 3.x, forge-std (Foundry test framework v1.11.0), @nomicfoundation/hardhat-toolbox-viem
**Storage**: On-chain state (EVM storage slots) — no external databases
**Testing**: Foundry/forge-std (`Test`, `vm` cheatcodes), run via `npx hardhat test`
**Target Platform**: EVM-compatible chains (Sepolia, local EDR)
**Project Type**: Monorepo — `blockchain/` module contains all smart contracts
**Performance Goals**: N/A (contract calls are bounded by EVM gas limits)
**Constraints**: Smart contracts are immutable once deployed; interface must be stable
**Scale/Scope**: 3 new files (interface, implementation, tests), 2 modified files (Forum.sol, Forum.t.sol), 2 modified deployment scripts, 1 modified frontend file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle                                       | Status   | Notes                                                                                                               |
| ----------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| I. Decentralization-First                       | **PASS** | GateKeeper is a smart contract; no centralized dependency added. Frontend remains static.                           |
| II. Smart Contract Correctness (NON-NEGOTIABLE) | **PASS** | Spec requires comprehensive tests: unit, integration, edge cases. Implementation plan includes dedicated test file. |
| III. Code Quality Standards                     | **PASS** | Solidity formatting via prettier-plugin-solidity. NatSpec documentation required.                                   |
| IV. Progressive Decentralization                | **N/A**  | No user-facing wallet or onboarding changes.                                                                        |
| V. Humanity Verification                        | **PASS** | GateKeeper reads from OurVoiceRegistry which enforces humanity verification. No bypass introduced.                  |
| VI. Open Source Commitment                      | **PASS** | All new code is Apache-2.0 licensed. No proprietary dependencies.                                                   |

**Gate result: PASS** — No violations. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/013-gatekeeper-contract/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (Solidity interface definitions)
│   └── IGateKeeper.sol  # Interface contract definition
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
blockchain/
├── contracts/
│   ├── IGateKeeper.sol              # NEW — interface with isMember(address) -> bool
│   ├── NationalityGateKeeper.sol    # NEW — concrete implementation (nationality check)
│   ├── NationalityGateKeeper.t.sol  # NEW — dedicated GateKeeper tests
│   ├── Forum.sol                    # MODIFIED — replace nationality + isMember with gateKeeper reference
│   ├── Forum.t.sol                  # MODIFIED — update setUp to deploy via GateKeeper
│   ├── MockOurVoiceRegistry.sol     # UNCHANGED
│   ├── IOurVoiceRegistry.sol        # UNCHANGED
│   └── ...                          # Other existing contracts unchanged
├── ignition/modules/
│   ├── ForumMockedRegistry.ts       # MODIFIED — deploy GateKeeper, pass to Forum
│   └── ForumForkedRegistry.ts       # MODIFIED — deploy GateKeeper, pass to Forum
frontend/
└── src/
    └── contracts.ts                 # MODIFIED — updated ABI (constructor signature changes)
```

**Structure Decision**: The feature adds new contract files alongside existing ones in `blockchain/contracts/`. This follows the established flat structure where all contracts, interfaces, and test files coexist in the same directory. No new directories needed within the source tree.

## Complexity Tracking

No constitution violations — this section is intentionally empty.

## Constitution Re-Check (Post-Design)

*Re-evaluated after Phase 1 design completion.*

| Principle                                       | Status   | Post-Design Notes                                                                                                     |
| ----------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| I. Decentralization-First                       | **PASS** | `immutable` GateKeeper reference eliminates admin key risk. No centralized dependency added.                          |
| II. Smart Contract Correctness (NON-NEGOTIABLE) | **PASS** | Design includes `NationalityGateKeeper.t.sol` + updated `Forum.t.sol`. Covers unit, integration, edge cases per spec. |
| III. Code Quality Standards                     | **PASS** | NatSpec documentation on `IGateKeeper` interface. Formatting via prettier-plugin-solidity.                            |
| IV. Progressive Decentralization                | **N/A**  | No user-facing wallet or onboarding changes.                                                                          |
| V. Humanity Verification                        | **PASS** | `NationalityGateKeeper.isMember()` checks `isRegistered()` first — no bypass of humanity verification.                |
| VI. Open Source Commitment                      | **PASS** | All new code Apache-2.0. No new dependencies added.                                                                   |

**Post-design gate: PASS** — No violations introduced by the design.
