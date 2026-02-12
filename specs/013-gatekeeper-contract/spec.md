# Feature Specification: GateKeeper Membership Contract

**Feature Branch**: `013-gatekeeper-contract`  
**Created**: 2026-02-12  
**Status**: Draft  
**Input**: User description: "I want to improve my smart contracts. Specifically, I want to improve the interface between the Forum smart contract, and the user registry system. Today, the Forum smart contract has a 'nationality' member which helps define which accounts are members of the forum. Instead, I want to encapsulate the membership check into a dedicated smart contract (gate keeper). This new smart contract should bridge the gap between the Forum and the OurVoiceRegistry. It should have at least a function isMember(address) -> bool. The gate keeper contract may be initialized with the various membership conditions. The Forum contract must then have a member 'gate keeper' which is an instance of the gate keeper contract. All code must be thoroughly tested with solidity tests."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Forum Membership via GateKeeper (Priority: P1)

A forum deployer creates a new Forum that delegates all membership decisions to a dedicated GateKeeper contract instead of performing nationality checks internally. When a registered user attempts to post a statement or adjust support, the Forum asks the GateKeeper whether the user's address qualifies as a member. The GateKeeper checks the user's registration in the OurVoiceRegistry and evaluates the configured membership conditions (e.g., nationality). The user experience is unchanged — members can participate, non-members are rejected — but the responsibility for determining membership now lives in a separate, composable contract.

**Why this priority**: This is the core value of the feature. Without the GateKeeper mediating membership, no other improvements are possible. This story delivers the fundamental architectural separation between forum logic and membership logic.

**Independent Test**: Can be fully tested by deploying a GateKeeper with a nationality condition, connecting it to a Forum, registering users with various nationalities, and verifying that only qualifying users can post statements and adjust support.

**Acceptance Scenarios**:

1. **Given** a GateKeeper configured with nationality "US" and connected to a Forum, **When** a registered user with nationality "US" attempts to add a statement, **Then** the statement is accepted.
2. **Given** a GateKeeper configured with nationality "US" and connected to a Forum, **When** a registered user with nationality "FR" attempts to add a statement, **Then** the action is rejected.
3. **Given** a GateKeeper configured with no nationality condition (open forum) and connected to a Forum, **When** any registered user attempts to add a statement, **Then** the statement is accepted regardless of nationality.
4. **Given** a GateKeeper connected to a Forum, **When** an unregistered address attempts to add a statement, **Then** the action is rejected.

---

### User Story 2 - GateKeeper as Standalone Membership Oracle (Priority: P2)

A developer or another contract queries the GateKeeper directly (without going through the Forum) to determine whether a given address satisfies the membership conditions. This enables reuse of the GateKeeper across multiple forums or other contracts that need to gate functionality by the same membership criteria.

**Why this priority**: Enabling the GateKeeper to be queried independently establishes it as a reusable building block. This is secondary to the core Forum integration but unlocks composability.

**Independent Test**: Can be tested by deploying a GateKeeper, registering users, and calling `isMember(address)` directly to verify correct results for qualifying and non-qualifying addresses.

**Acceptance Scenarios**:

1. **Given** a GateKeeper configured with nationality "US", **When** `isMember` is called with the address of a "US"-registered user, **Then** it returns true.
2. **Given** a GateKeeper configured with nationality "US", **When** `isMember` is called with the address of a "FR"-registered user, **Then** it returns false.
3. **Given** a GateKeeper configured with nationality "US", **When** `isMember` is called with an unregistered address, **Then** it returns false.

---

### User Story 3 - Comprehensive Test Coverage for GateKeeper (Priority: P3)

A development team runs the full test suite and confirms that the GateKeeper contract — and the refactored Forum contract — have thorough test coverage. Tests cover unit behavior of the GateKeeper, integration between Forum and GateKeeper, edge cases (empty nationality, unregistered users), and backward-compatible behavior ensuring existing Forum functionality is preserved.

**Why this priority**: The project constitution mandates thorough smart contract testing as non-negotiable. This story ensures compliance with that principle and prevents regressions.

**Independent Test**: Can be validated by running the full Solidity test suite and confirming all tests pass, including new GateKeeper-specific tests and updated Forum tests.

**Acceptance Scenarios**:

1. **Given** the complete test suite, **When** all tests are executed, **Then** every test passes.
2. **Given** the GateKeeper test file, **When** tests cover the membership check for registered/unregistered users and various nationality conditions, **Then** all expected outcomes are verified.
3. **Given** the Forum test file, **When** existing Forum tests are updated to use the GateKeeper, **Then** all previously passing tests continue to pass with the new architecture.

---

### Edge Cases

- What happens when the GateKeeper's registry reference points to a registry that has no registrations? Membership checks should return false for all addresses.
- What happens when a user is registered in the registry but did not disclose a nationality, and the GateKeeper requires a specific nationality? The membership check should return false.
- What happens when the GateKeeper is configured with an empty nationality (open membership)? Any registered user should be considered a member.
- What happens when an address calls a Forum function that requires membership, but the Forum's GateKeeper has not been set or points to the zero address? The call should revert with a clear error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST include a new GateKeeper contract that encapsulates membership logic, separate from the Forum contract.
- **FR-002**: The GateKeeper contract MUST expose a `isMember(address) -> bool` function that determines whether a given address qualifies as a forum member.
- **FR-003**: The GateKeeper contract MUST accept membership conditions at initialization time (e.g., a required nationality).
- **FR-004**: The GateKeeper contract MUST reference the OurVoiceRegistry to look up user registration and profile data when evaluating membership.
- **FR-005**: The GateKeeper MUST return false for any address that is not registered in the OurVoiceRegistry, regardless of other conditions.
- **FR-006**: When the GateKeeper is initialized with no nationality condition (empty string), it MUST consider any registered user as a member.
- **FR-007**: When the GateKeeper is initialized with a specific nationality, it MUST only consider registered users whose nationality matches as members.
- **FR-008**: The Forum contract MUST be refactored to hold a reference to a GateKeeper contract instead of storing nationality directly.
- **FR-009**: The Forum contract MUST delegate all membership checks to the GateKeeper's `isMember` function.
- **FR-010**: The Forum contract's constructor MUST accept a GateKeeper instance instead of a nationality string.
- **FR-011**: The Forum contract's `onlyMembers` modifier MUST use the GateKeeper to determine membership.
- **FR-012**: The Forum contract MUST remove the `nationality` state variable and the `isMember()` function that currently performs nationality checks internally.
- **FR-013**: All existing Forum behavior (statement creation, support adjustment, ranking, balance management) MUST remain functionally identical after the refactor.
- **FR-014**: All new and modified contracts MUST have comprehensive Solidity tests covering unit, integration, and edge-case scenarios.
- **FR-015**: The GateKeeper contract MUST be defined behind an interface or abstract contract to allow for alternative GateKeeper implementations in the future.

### Key Entities

- **GateKeeper**: A standalone contract responsible for determining whether a given address qualifies as a member of a forum. It holds a reference to the OurVoiceRegistry and is initialized with membership conditions (e.g., required nationality). It exposes a `isMember(address) -> bool` function.
- **Forum (modified)**: The existing forum contract, refactored to delegate membership checks to a GateKeeper instance. It no longer stores nationality or performs membership logic internally.
- **OurVoiceRegistry (unchanged)**: The existing registry that tracks verified user identities and registrations. The GateKeeper reads from it but does not modify it.

## Assumptions

- The GateKeeper will initially support nationality as the only membership condition, matching the current Forum behavior. Additional condition types (e.g., minimum registration age, multi-condition gates) are out of scope for this feature but the design should not preclude them.
- The GateKeeper interface should be simple enough that alternative implementations can be created in the future without modifying the Forum contract.
- Deployment scripts and frontend contract references will need to be updated to create and wire the GateKeeper, but those changes are considered part of the implementation, not part of this specification.
- The refactored Forum should pass all existing tests (adapted to use the new GateKeeper) to confirm backward compatibility.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Forum contract no longer contains any membership-determination logic — all membership checks are delegated to the GateKeeper.
- **SC-002**: 100% of existing Forum test scenarios continue to pass after the refactoring, with tests updated to use the GateKeeper.
- **SC-003**: The GateKeeper contract has dedicated tests covering at least: registered member with matching nationality, registered user with non-matching nationality, unregistered address, and open-membership (no nationality) configuration.
- **SC-004**: The GateKeeper can be reused by multiple Forum instances or other contracts without modification.
- **SC-005**: The full test suite executes with zero failures and covers all functional requirements listed above.
