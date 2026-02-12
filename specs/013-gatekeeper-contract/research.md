# Research: GateKeeper Membership Contract

**Feature**: 013-gatekeeper-contract  
**Date**: 2026-02-12

## Decision 1: Interface vs Abstract Contract for GateKeeper

**Decision**: Use a Solidity `interface` (`IGateKeeper`), not an `abstract contract`.

**Rationale**:
- The GateKeeper's public API is a single function: `isMember(address) → bool`. There is no shared state or partial logic that all implementations must inherit.
- An interface provides maximum composability — any contract can implement `IGateKeeper` without being forced into an inheritance chain. This matters because the spec explicitly says the design should not preclude future condition types (age-based gates, multi-condition gates, allowlist gates, etc.).
- No bytecode overhead: interfaces produce no deployed bytecode; the Forum only needs the 4-byte selector for the external call.
- Matches existing codebase conventions: `AOurVoiceRegistry` is an `abstract contract` because it needs shared state (mappings, `_registerHelper`). The GateKeeper has no such shared state — each implementation owns its own logic.

**Alternatives considered**:
- `abstract contract AGateKeeper` with a shared `registry` state variable and constructor. Rejected because it constrains future implementations that might not need a registry reference (e.g., a Merkle-proof gate, an allowlist gate, or an always-open gate).

## Decision 2: Naming Conventions

**Decision**: `IGateKeeper` (I-prefix for interface), `NationalityGateKeeper` for the concrete implementation.

**Rationale**:
- `I` prefix for interfaces is the dominant Solidity convention (OpenZeppelin: `IERC20`, `IERC721`; this repo: `IZKPassportVerifier`).
- `A` prefix for abstract contracts is already established in this repo (`AOurVoiceRegistry`).
- Concrete implementation named descriptively by its condition type: `NationalityGateKeeper`.

**Alternatives considered**:
- No prefix (`GateKeeper` as both interface name and concept). Rejected because it's ambiguous and breaks the repo's established convention.

## Decision 3: Immutability of GateKeeper Reference in Forum

**Decision**: Use `immutable` for the Forum's GateKeeper reference.

```solidity
IGateKeeper public immutable gateKeeper;
```

**Rationale**:
- **Constitution alignment**: Decentralization-First mandates avoiding centralization vectors. A mutable reference requires an admin function, which is a centralization risk. The deployment pattern is: deploy new GateKeeper → deploy new Forum pointing to it.
- **Gas savings**: Reading an `immutable` variable costs ~3 gas (inlined into bytecode) vs. ~2,100 gas for a cold `SLOAD`. Since `isMember` is called on every `onlyMembers` modifier invocation, this saves gas on every membership-gated operation.
- **Precedent**: The existing `maxRankedStatements` field in Forum.sol is already `immutable`.

**Alternatives considered**:
- Mutable with an `updateGateKeeper(IGateKeeper)` admin function. Rejected because: (a) deploying a new Forum is cheap and follows the immutable-contract philosophy, (b) the spec doesn't require runtime reconfiguration, (c) it avoids introducing owner/admin roles.

## Decision 4: Gas Impact of Cross-Contract View Calls

**Decision**: The additional gas overhead is negligible and acceptable.

**Analysis**:
- Current `Forum.isMember()` already makes two cross-contract calls (`isRegistered` + `getUserRegistration`). Moving this logic to the GateKeeper adds one additional `STATICCALL` hop.
- Additional cost: ~100 gas (warm) / ~2,600 gas (cold) for the extra hop to the GateKeeper.
- Total `isMember` cost through GateKeeper: ~2,600–5,000 gas (warm), ~7,500–10,000 gas (cold).
- This is negligible relative to `SSTORE` operations (20,000 gas each) in state-changing transactions like `addStatement`.
- Off-chain reads (`eth_call`) are free regardless.

**Alternatives considered**: None — the gas impact is inherently low.

## Decision 5: Design Pattern

**Decision**: Domain-specific variant of OpenZeppelin's `AccessManaged` pattern.

**Rationale**:
- OpenZeppelin 5.x uses `AccessManaged` — a contract that delegates authorization to an external `AccessManager`. The GateKeeper is a simplified, purpose-built version of this same pattern.
- Key advantage over `AccessControl` (role-based): less attack surface, simpler to audit, tailored to the single "is this address a member?" question.
- Aligns with token-gated access patterns (e.g., `IERC721.balanceOf(addr) > 0`) where an external contract view call determines access.

**Alternatives considered**:
- OpenZeppelin's `AccessControl` with `hasRole(MEMBER_ROLE, addr)`. Rejected as over-engineered for a single membership check.
- `Ownable`. Rejected as too simple (single-address, not membership-based).

## Decision 6: Forum's `isMember()` Public Function

**Decision**: Remove the `isMember()` public function from Forum. The canonical way to check membership is via `gateKeeper.isMember(address)`.

**Rationale**:
- FR-012 requires removing the `isMember()` function and `nationality` state variable from Forum.
- External callers (frontend, other contracts) can call `forum.gateKeeper()` to get the GateKeeper address, then call `isMember(address)` on it. Or they can call the GateKeeper directly.
- This enforces separation of concerns: the Forum is not a membership oracle.

**Alternatives considered**:
- Keep a `isMember()` convenience wrapper on Forum that delegates to the GateKeeper. This has some convenience value but contradicts FR-012 and blurs the separation. Rejected.

## Decision 7: NationalityGateKeeper Registry Reference

**Decision**: Store the registry reference as `immutable` on `NationalityGateKeeper`.

```solidity
AOurVoiceRegistry public immutable registry;
```

**Rationale**:
- Same reasoning as Forum's GateKeeper reference: immutable is cheaper, aligns with decentralization, no admin key needed.
- The GateKeeper is paired with a specific registry at deployment time. If the registry changes, a new GateKeeper is deployed.

## Decision 8: Nationality Storage on GateKeeper

**Decision**: Store nationality as a regular `string public` state variable (set once in constructor, never updated).

**Rationale**:
- Solidity does not support `immutable` for dynamically-sized types like `string`. So `nationality` must be a storage variable.
- It is set in the constructor and never modified, making it effectively immutable by convention.
- Reading it costs ~2,100 gas (cold SLOAD) but this only happens during `isMember` calls, which are already dominated by cross-contract call costs.
