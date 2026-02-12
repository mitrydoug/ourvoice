# Tasks: GateKeeper Membership Contract

**Input**: Design documents from `/specs/013-gatekeeper-contract/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED per FR-014 and the project constitution (Principle II: Smart Contract Correctness).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Smart contracts**: `blockchain/contracts/`
- **Tests**: `blockchain/contracts/*.t.sol` (Foundry convention, co-located)
- **Deployment scripts**: `blockchain/ignition/modules/`
- **Frontend ABI**: `frontend/src/contracts.ts`

---

## Phase 1: Setup

**Purpose**: Create the new contract files and interface that all subsequent work depends on.

- [ ] T001 Create `IGateKeeper` interface with `isMember(address) → bool` in `blockchain/contracts/IGateKeeper.sol` (copy from `specs/013-gatekeeper-contract/contracts/IGateKeeper.sol` and verify NatSpec documentation)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the concrete `NationalityGateKeeper` contract — all user stories depend on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Create `NationalityGateKeeper` contract implementing `IGateKeeper` in `blockchain/contracts/NationalityGateKeeper.sol`. Constructor accepts `AOurVoiceRegistry _registry` (stored as `immutable`) and `string memory _nationality` (stored as public state variable). The `isMember(address account)` function must: (1) return false if `account` is not registered in the registry via `registry.isRegistered(account)`, (2) return true if `nationality` is empty (open membership), (3) otherwise return true only if `registry.getUserRegistration(account).nationality` matches `nationality` via `StringUtils.equals`. Include SPDX license header (Apache-2.0), pragma solidity ^0.8.28, NatSpec comments on all public functions, and imports for `IOurVoiceRegistry.sol`, `IGateKeeper.sol`, and `StringUtils.sol`.

**Checkpoint**: `NationalityGateKeeper` compiles. Run `cd blockchain && npx hardhat compile` to verify.

---

## Phase 3: User Story 1 — Forum Membership via GateKeeper (Priority: P1) 🎯 MVP

**Goal**: Refactor the Forum contract to delegate all membership checks to a GateKeeper, and update all tests to use the new architecture.

**Independent Test**: Deploy a `NationalityGateKeeper` with nationality "US", connect it to a Forum, register users with various nationalities, and verify only "US" users can post statements and adjust support. Also verify open-membership (empty nationality) forums work.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before the Forum refactor is complete**

- [ ] T003 [P] [US1] Write Forum+GateKeeper integration tests in `blockchain/contracts/Forum.t.sol`: Update the `ForumHarness` constructor to accept `IGateKeeper _gateKeeper, uint _maxRankedStatements` (matching the new Forum constructor). Update `setUp()` to deploy `MockOurVoiceRegistry`, then `NationalityGateKeeper(mockRegistry, "")`, then `ForumHarness(gateKeeper, 0)`. Update the `registeredMember` modifier accordingly. All existing tests must be preservable — do NOT delete any existing test functions, only modify the setup/harness to use the GateKeeper. Add new test functions: `testMembershipWithNationalityGateKeeper()` that creates a nationality-restricted forum (e.g., "US"), registers users with "US" and "FR" nationalities from different addresses (use `vm.prank`), and asserts the US user can add a statement while the FR user is rejected. Add `testMembershipOpenForum()` that creates an open-membership GateKeeper (""), registers users with any nationality, and asserts they can all participate.

### Implementation for User Story 1

- [ ] T004 [US1] Refactor `Forum.sol` in `blockchain/contracts/Forum.sol`: (1) Add `import "./IGateKeeper.sol";` (2) Replace `AOurVoiceRegistry public ourVoiceRegistry;` with `IGateKeeper public immutable gateKeeper;` (3) Change constructor signature from `(AOurVoiceRegistry _ourVoiceRegistry, string memory _nationality, uint _maxRankedStatements)` to `(IGateKeeper _gateKeeper, uint _maxRankedStatements)`. Set `gateKeeper = _gateKeeper;` in constructor body. (4) Remove the `nationality` state variable. (5) Remove the `isMember()` public function entirely. (6) Update `onlyMembers` modifier to `require(gateKeeper.isMember(msg.sender), "Only members can perform this action");`. (7) For functions that still need registry access (`getUserBalance`, `getUserStatementSupport`, `_getCurrentUserBalance`, `adjustSupport`): cast `address(gateKeeper)` to `NationalityGateKeeper` to access `.registry()`, OR import `NationalityGateKeeper` and use `NationalityGateKeeper(address(gateKeeper)).registry()`. A cleaner approach: add a local helper `_getRegistry()` that returns `AOurVoiceRegistry` by reading `NationalityGateKeeper(address(gateKeeper)).registry()`, and replace all `ourVoiceRegistry` usages with `_getRegistry()`. (8) Remove the `import "./StringUtils.sol";` if no longer directly used by Forum (StringUtils is used by NationalityGateKeeper instead). Keep `import "./IOurVoiceRegistry.sol";` since Forum still uses `Registration` struct and `AOurVoiceRegistry` type. (9) Remove `import "./StringUtils.sol";` only if Forum no longer calls `StringUtils` directly — verify first.

- [ ] T005 [US1] Verify compilation and run tests: `cd blockchain && npx hardhat compile && npx hardhat test`. All tests from T003 and all pre-existing Forum tests must pass. Fix any compilation errors or test failures before proceeding.

**Checkpoint**: Forum delegates membership to GateKeeper. All existing tests pass. Nationality-restricted and open-membership forums both work. Run `npx hardhat test` to verify.

---

## Phase 4: User Story 2 — GateKeeper as Standalone Membership Oracle (Priority: P2)

**Goal**: Verify and test that the GateKeeper can be queried directly (without a Forum) as a reusable membership oracle.

**Independent Test**: Deploy a `NationalityGateKeeper`, register users, and call `isMember(address)` directly to verify correct results.

### Tests for User Story 2 ⚠️

- [ ] T006 [P] [US2] Create dedicated GateKeeper tests in `blockchain/contracts/NationalityGateKeeper.t.sol`. Import `{Test}` from `forge-std/Test.sol`, `{NationalityGateKeeper}` from `./NationalityGateKeeper.sol`, `{MockOurVoiceRegistry}` from `./MockOurVoiceRegistry.sol`, `{AOurVoiceRegistry}` from `./IOurVoiceRegistry.sol`. Create `NationalityGateKeeperTest is Test` with `setUp()` deploying `MockOurVoiceRegistry` and a `NationalityGateKeeper(mockRegistry, "US")`. Test functions: (1) `testIsMemberRegisteredMatchingNationality` — register a user with nationality "US" and assert `gateKeeper.isMember(address)` returns true. (2) `testIsMemberRegisteredNonMatchingNationality` — register a user with "FR" and assert `isMember` returns false. (3) `testIsMemberUnregisteredAddress` — assert `isMember` returns false for a never-registered address. (4) `testIsMemberOpenMembership` — deploy a second GateKeeper with nationality "" and assert any registered user returns true. (5) `testIsMemberRegisteredNoNationalityDisclosed` — register a user with "" nationality, assert `isMember` returns false when GateKeeper requires "US". (6) `testIsMemberEmptyRegistry` — deploy a fresh registry with no registrations, create a GateKeeper pointing to it, assert `isMember` returns false for any address.

### Implementation for User Story 2

No additional implementation needed — `NationalityGateKeeper` was already created in T002 and is inherently queryable as a standalone contract. The tests in T006 verify this capability.

- [ ] T007 [US2] Run GateKeeper tests: `cd blockchain && npx hardhat test`. All T006 tests must pass. Fix any failures.

**Checkpoint**: GateKeeper is independently queryable and fully tested. Run `npx hardhat test` to confirm.

---

## Phase 5: User Story 3 — Comprehensive Test Coverage (Priority: P3)

**Goal**: Ensure complete test coverage across all contracts, covering edge cases and integration scenarios per the constitution's non-negotiable testing requirement.

**Independent Test**: Run the full test suite and confirm zero failures.

### Tests for User Story 3 ⚠️

- [ ] T008 [P] [US3] Add edge-case tests to `blockchain/contracts/NationalityGateKeeper.t.sol`: (1) `testMultipleGateKeepersShareRegistry` — deploy two GateKeepers with different nationalities ("US" and "FR") sharing the same registry, register users, and verify each GateKeeper correctly gates its own nationality. (2) `testGateKeeperWithMultipleAddressesSameUser` — register a user (with nationality "US") from two different addresses, assert `isMember` returns true for both addresses. (3) Verify GateKeeper constructor stores correct values: assert `gateKeeper.registry()` returns the expected registry address, assert `gateKeeper.nationality()` returns the expected string.

- [ ] T009 [P] [US3] Add integration edge-case tests to `blockchain/contracts/Forum.t.sol`: (1) `testUnregisteredUserCannotAddStatement` — with a GateKeeper-based Forum, verify an unregistered address gets reverted when calling `addStatement`. (2) `testUnregisteredUserCannotAdjustSupport` — similarly for `adjustSupport`. (3) `testNationalityRestrictedForumRejectsWrongNationality` — create a Forum with nationality "US" GateKeeper, register a "FR" user, verify `addStatement` reverts. (4) `testForumWithOpenGateKeeperAcceptsAllRegistered` — create a Forum with open GateKeeper, register users with various nationalities, verify all can participate.

### Implementation for User Story 3

- [ ] T010 [US3] Run complete test suite: `cd blockchain && npx hardhat test`. All tests (DecayUtils, Forum, NationalityGateKeeper) must pass with zero failures. Fix any issues.

**Checkpoint**: Full test suite passes. All user stories are verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Update deployment scripts, frontend ABI, formatting, and documentation.

- [ ] T011 [P] Update `blockchain/ignition/modules/ForumMockedRegistry.ts`: For each forum, deploy a `NationalityGateKeeper` with the appropriate nationality (e.g., `m.contract("NationalityGateKeeper", [mockedZKRegistry, forum == "global" ? "" : forum], { id: \`GateKeeper_\${forum}\` })`), then pass the GateKeeper (instead of registry + nationality) to the `Forum` constructor: `m.contract("Forum", [gateKeeper, 0], { ... })`.

- [ ] T012 [P] Update `blockchain/ignition/modules/ForumForkedRegistry.ts`: Same pattern as T011 — deploy `NationalityGateKeeper` for each forum, then pass to `Forum` constructor.

- [ ] T013 [P] Update `frontend/src/contracts.ts`: Regenerate or manually update `FORUM_ABI` to reflect the new Forum constructor signature (`IGateKeeper _gateKeeper, uint _maxRankedStatements` instead of `AOurVoiceRegistry, string, uint`). Also add `gateKeeper()` to the ABI (public immutable generates a getter). Remove `nationality()` and `isMember()` from the ABI. Remove `ourVoiceRegistry()` from the ABI.

- [ ] T014 Run Solidity formatting: `cd blockchain && npm run format` to ensure all new and modified `.sol` files conform to prettier-plugin-solidity formatting.

- [ ] T015 Run final full validation: `cd blockchain && npx hardhat compile && npx hardhat test`. Confirm zero compilation errors and zero test failures.

- [ ] T016 Run quickstart.md validation: Follow the steps in `specs/013-gatekeeper-contract/quickstart.md` to verify the deployment and test instructions are accurate and work end-to-end.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 (T002) — core refactor
- **User Story 2 (Phase 4)**: Depends on Phase 2 (T002) — can run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Phase 3 (T004/T005) and Phase 4 (T006/T007) — edge-case tests need both contracts refactored
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (Phase 2). Can start after T002.
- **User Story 2 (P2)**: Depends on Foundational (Phase 2). Can start after T002. **Can run in parallel with US1** — only touches `NationalityGateKeeper.t.sol` (different file from Forum changes).
- **User Story 3 (P3)**: Depends on US1 (T005) and US2 (T007) being complete — edge-case tests span both contracts.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (US1: T003 before T004)
- Implementation before verification (T004 before T005)
- Story complete before moving to next priority (unless parallelizing US1 + US2)

### Parallel Opportunities

- **T003 and T006** can run in parallel (different test files, both after T002)
- **T008 and T009** can run in parallel (different test files)
- **T011, T012, T013** can all run in parallel (different files)
- **US1 and US2** can be worked on simultaneously by different developers

---

## Parallel Example: User Stories 1 + 2

```text
# After T002 (NationalityGateKeeper) is complete, launch in parallel:

Developer A (US1):                          Developer B (US2):
  T003 — Forum+GateKeeper tests              T006 — GateKeeper standalone tests
  T004 — Refactor Forum.sol                  T007 — Run GateKeeper tests  
  T005 — Verify compilation + tests

# After both complete → Phase 5 (US3) for edge cases
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: T001 (IGateKeeper interface)
2. Complete Phase 2: T002 (NationalityGateKeeper)
3. Complete Phase 3: T003 → T004 → T005 (Forum refactor + tests)
4. **STOP and VALIDATE**: Run `npx hardhat test` — all tests pass
5. Forum now delegates membership to GateKeeper ✓

### Incremental Delivery

1. T001 → T002 → Foundation ready
2. T003 → T004 → T005 → Forum refactored (MVP!) ✓
3. T006 → T007 → GateKeeper independently tested ✓
4. T008 → T009 → T010 → Full edge-case coverage ✓
5. T011 → T012 → T013 → T014 → T015 → T016 → Polish complete ✓

---

## Notes

- Total tasks: **16**
- Tasks per user story: US1=3, US2=2, US3=3, Setup=1, Foundation=1, Polish=6
- Parallel opportunities: 5 groups of parallelizable tasks identified
- The Forum still needs registry access for `getUserIdentifier()` and `getUserRegistration()` (balance + support operations). Per data-model.md, it accesses registry through `NationalityGateKeeper(address(gateKeeper)).registry()`.
- All [P] tasks touch different files and have no mutual dependencies
- Commit after each completed phase checkpoint
