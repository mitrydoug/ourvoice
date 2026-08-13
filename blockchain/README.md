# Symvolia Blockchain

This package contains the Symvolia smart contracts, Hardhat configuration,
deployment scripts, and Solidity tests.

## Common Commands

Run Solidity tests:

```bash
npm run test:solidity
```

Compile contracts:

```bash
npx hardhat compile
```

Compile with the production optimizer profile:

```bash
npx hardhat compile --build-profile production
```

## Local Deployments

Local development workflows are normally launched from the repository root with
`make local-dev`, `make local-mocked`, `make local-forked`,
`make local-stress-test`, or `make base-sepolia`.

For direct local contract work:

```bash
make deploy
```

This deploys the local dev-registry topology to a local Hardhat network and
regenerates `deployments/localhost.json` plus frontend/backend runtime artifacts.

## Base Sepolia Break-Glass Deployment

Base Sepolia is the public test network used for development deployments. Normal
`make base-sepolia` usage reads the committed `deployments/base_sepolia.json` and
does not redeploy contracts.

To deliberately wipe and redeploy the Base Sepolia app contracts, run from the
repository root:

```bash
CONFIRM_BASE_SEPOLIA_REDEPLOY=I_UNDERSTAND_THIS_WIPES_BASE_SEPOLIA_STATE make base-sepolia-break-glass
```

This is intentionally verbose because redeploying the registry or forums wipes
their on-chain state for the app.

## Base Mainnet Production

Production targets Base Mainnet. Automatic production contract work should use
forum reconciliation only: deploy new forums that are missing from
`deployments/base.json` while preserving the existing registry and existing forum
addresses.

The initial Base Mainnet registry deployment is a migration-level operation and
must be run manually with explicit review. Before that can happen,
`ignition/parameters/base.json` must contain the approved production verifier,
scope, domain, and `devMode` values.

## Reconcile Missing Forums

After an initial deployment artifact exists, deploy only missing forums with:

```bash
DEPLOYMENT_PROFILE=base-sepolia npx hardhat run scripts/reconcile-forums.ts --network base_sepolia
DEPLOYMENT_PROFILE=base npx hardhat run scripts/reconcile-forums.ts --network base
```

The reconciliation script verifies existing registry/forum bytecode, refuses
forum removals, and preserves all known deployed addresses.