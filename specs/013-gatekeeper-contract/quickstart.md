# Quickstart: GateKeeper Membership Contract

**Feature**: 013-gatekeeper-contract  
**Branch**: `013-gatekeeper-contract`

## Prerequisites

- Node.js (managed via devcontainer)
- Blockchain dev dependencies installed: `cd blockchain && npm install`

## What Changed

This feature introduces a **GateKeeper** contract that encapsulates forum membership logic, previously embedded in the Forum contract. The Forum now delegates all membership checks to an external GateKeeper via the `IGateKeeper` interface.

### New Files

| File                                               | Purpose                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `blockchain/contracts/IGateKeeper.sol`             | Interface: `isMember(address) → bool`                            |
| `blockchain/contracts/NationalityGateKeeper.sol`   | Concrete implementation: checks nationality via OurVoiceRegistry |
| `blockchain/contracts/NationalityGateKeeper.t.sol` | Dedicated tests for the GateKeeper                               |

### Modified Files

| File                                                 | Change                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `blockchain/contracts/Forum.sol`                     | Removed `nationality`, `isMember()`, `ourVoiceRegistry`; added `gateKeeper` (immutable); `onlyMembers` delegates to GateKeeper |
| `blockchain/contracts/Forum.t.sol`                   | Updated `setUp` to deploy via GateKeeper; updated harness constructor                                                          |
| `blockchain/ignition/modules/ForumMockedRegistry.ts` | Deploys `NationalityGateKeeper`, passes to Forum                                                                               |
| `blockchain/ignition/modules/ForumForkedRegistry.ts` | Deploys `NationalityGateKeeper`, passes to Forum                                                                               |
| `frontend/src/contracts.ts`                          | Updated ABI to reflect new Forum constructor signature                                                                         |

## Running Tests

```bash
cd blockchain
npx hardhat test
```

All tests (existing + new) should pass. The test suite covers:
- GateKeeper unit tests (registered/unregistered, matching/non-matching nationality, open membership)
- Forum integration tests (statement creation, support adjustment via GateKeeper-gated membership)
- Edge cases (empty registry, undisclosed nationality with nationality requirement)

## Deployment (Local Dev)

```bash
cd blockchain
npx hardhat ignition deploy ignition/modules/ForumMockedRegistry.ts
```

The deployment script now:
1. Deploys `MockOurVoiceRegistry`
2. Deploys `NationalityGateKeeper` for each forum (e.g., `NationalityGateKeeper("us")` and `NationalityGateKeeper("")`)
3. Deploys `Forum` with the GateKeeper reference
4. Registers mock users and adds mock statements

## Architecture Overview

```
Forum ──(immutable ref)──► IGateKeeper (interface)
                                │
                     NationalityGateKeeper (impl)
                                │
                        AOurVoiceRegistry (reads from)
```

The Forum no longer knows about nationality or the registry directly. It only asks: "Is this address a member?" All membership logic lives in the GateKeeper.
