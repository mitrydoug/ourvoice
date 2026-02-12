# Data Model: GateKeeper Membership Contract

**Feature**: 013-gatekeeper-contract  
**Date**: 2026-02-12

## Entities

### IGateKeeper (Interface)

A pure interface that defines the membership oracle contract. Any contract implementing this interface can serve as a membership gate for a Forum.

| Attribute | Type | Description                        |
| --------- | ---- | ---------------------------------- |
| *(none)*  | —    | Interfaces have no state variables |

| Function   | Visibility | Mutability | Parameters        | Returns | Description                                                   |
| ---------- | ---------- | ---------- | ----------------- | ------- | ------------------------------------------------------------- |
| `isMember` | external   | view       | `address account` | `bool`  | Returns true if the given address qualifies as a forum member |

### NationalityGateKeeper (Concrete Implementation)

A GateKeeper implementation that checks membership based on nationality. It reads from the OurVoiceRegistry to determine if an address is registered and matches the required nationality.

| Attribute     | Type                | Mutability             | Description                                                              |
| ------------- | ------------------- | ---------------------- | ------------------------------------------------------------------------ |
| `registry`    | `AOurVoiceRegistry` | immutable              | Reference to the OurVoiceRegistry for user lookups                       |
| `nationality` | `string`            | set once (constructor) | Required nationality for membership, or empty string for open membership |

| Function   | Visibility | Mutability | Parameters        | Returns | Description                                                                                                       |
| ---------- | ---------- | ---------- | ----------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| `isMember` | external   | view       | `address account` | `bool`  | Returns true if account is registered in the registry and (nationality is empty OR account's nationality matches) |

**Validation Rules**:
- If `account` is not registered in the registry → return `false`
- If `nationality` is empty string → return `true` (open membership, any registered user qualifies)
- If `nationality` is non-empty → return `true` only if the user's registered nationality matches

**State Transitions**: None. The GateKeeper is a read-only contract — it queries the registry but never modifies state.

### Forum (Modified)

The existing Forum contract, with membership logic removed and replaced by a GateKeeper reference.

| Changed Attribute  | Type                | Change              | Description                                                                        |
| ------------------ | ------------------- | ------------------- | ---------------------------------------------------------------------------------- |
| `gateKeeper`       | `IGateKeeper`       | **NEW** (immutable) | Reference to the GateKeeper contract for membership checks                         |
| `nationality`      | `string`            | **REMOVED**         | Previously stored the Forum's nationality condition                                |
| `ourVoiceRegistry` | `AOurVoiceRegistry` | **REMOVED**         | Previously used directly for registration lookups; now accessed through GateKeeper |

| Changed Function         | Change       | Description                                                                                                                              |
| ------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor`            | **MODIFIED** | Accepts `IGateKeeper _gateKeeper, uint _maxRankedStatements` instead of `AOurVoiceRegistry, string, uint`                                |
| `isMember()`             | **REMOVED**  | Membership logic moved to GateKeeper                                                                                                     |
| `onlyMembers` modifier   | **MODIFIED** | Now calls `gateKeeper.isMember(msg.sender)` instead of internal `isMember()`                                                             |
| `_getCurrentUserBalance` | **MODIFIED** | Must resolve registry access through GateKeeper's registry or accept that the user balance initialization timestamp comes from elsewhere |

**Note on `_getCurrentUserBalance`**: The current implementation accesses `ourVoiceRegistry.getUserRegistration(msg.sender).registrationTimestamp` to compute starting balance timing. With `ourVoiceRegistry` removed from Forum, this needs resolution. Options:
1. The Forum keeps a reference to the registry (but this partially defeats the purpose of the refactor)
2. The GateKeeper exposes a `getRegistry()` function so the Forum can access it
3. The Forum uses `block.timestamp` for first balance initialization instead of registration timestamp

**Recommended**: Option 2 — add `registry()` accessor to `NationalityGateKeeper` (it's already `public` since `registry` is a public state variable). The Forum accesses `gateKeeper.registry()` for the one case where it needs registration data. Alternatively, the GateKeeper interface could be extended with a `getRegistrationTimestamp(address)` function, but this over-specializes the interface.

## Relationships

```
┌─────────────────┐         ┌──────────────────────────┐
│   IGateKeeper   │◄────────│  NationalityGateKeeper   │
│   (interface)   │  impl.  │  - registry (immutable)  │
│                 │         │  - nationality (string)  │
│  + isMember()   │         │  + isMember()            │
└────────┬────────┘         └────────────┬─────────────┘
         │ depends on                    │ reads from
         │                               ▼
┌────────┴────────┐         ┌──────────────────────────┐
│     Forum       │         │   AOurVoiceRegistry      │
│  - gateKeeper   │         │  - userIdFromAddress     │
│    (immutable)  │         │  - userRegistrations     │
│                 │         │  + isRegistered()        │
│  + onlyMembers  │         │  + getUserRegistration() │
│  + addStatement │         │  + getUserIdentifier()   │
│  + adjustSupport│         └──────────────────────────┘
└─────────────────┘
```

## Impact on Existing Entities

| Entity                 | Impact        | Details                                          |
| ---------------------- | ------------- | ------------------------------------------------ |
| `AOurVoiceRegistry`    | **UNCHANGED** | No modifications needed                          |
| `MockOurVoiceRegistry` | **UNCHANGED** | Used in tests for both GateKeeper and Forum      |
| `OurVoiceRegistry`     | **UNCHANGED** | Production registry unchanged                    |
| `Constants.sol`        | **UNCHANGED** | No new constants needed                          |
| `StringUtils.sol`      | **UNCHANGED** | Used by NationalityGateKeeper (moved from Forum) |
| `DecayUtils.sol`       | **UNCHANGED** | Used by Forum for support decay                  |
