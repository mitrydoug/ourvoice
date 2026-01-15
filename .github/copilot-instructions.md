This repository defines a distributed application (DApp) with a typescript+react frontend and a smart contract-based backend. There is no traditional backend server; instead, all business logic is handled by smart contracts deployed on the blockchain. Backend services exist to support text-search and indexing of blockchain data.

## Project Structure

The project is organized into three main directories:
- `frontend/`: Contains the React application code
  - `src/`: Main source code for the frontend
  - `public/`: Static assets for the frontend
- `blockchain/`: Contains smart contract code and deployment scripts
  - `contracts/`: Solidity smart contracts
  - `scripts/`: Hardhat scripts for deployment and testing
  - `ignition/`: Hardhat ignition modules
- `backend/`:
  - `src/`: Source code for backend services supporting blockchain data indexing and search

Npm is used in both for managing dependencies and defining scripts. `frontend` involves typical React development, while `blockchain` focuses on smart contract development using Solidity.

## Frontend Development

Npm scripts to know:
- run `npm format` to format code using Prettier
- run `npm lint` to check for linting errors using ESLint

### Coding Standards
- Follow React and TypeScript best practices
  - Use functional components and React hooks
- Ensure code is properly typed
- `npm format` and `npm lint` should pass before committing changes

### Web Development Guidelines
- Use Material-UI for UI components

## Backend Development

Only work on `blockchain/` files when specifically assigned. Use Hardhat for smart contract development.

## General Guidelines
1. Follow Typescript/React best practices and idiomatic patterns
2. Maintain existing code structure and organization
3. Use dependency injection patterns where appropriate
4. Document public APIs and complex logic. Suggest changes to documentation where appropriate.
