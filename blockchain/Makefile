
.PHONY: clean
clean:
	rm -rf ignition/deployments/chain-31337
	npx hardhat clean

.PHONY: compile
compile:
	npx hardhat compile

# --- Local development deployments ---

.PHONY: deploy
deploy: clean compile
	npx hardhat run scripts/deploy.ts

.PHONY: deploy-mocked
deploy-mocked: deploy

.PHONY: deploy-local-fork
deploy-local-fork: compile
	npx hardhat run scripts/deploy.ts --network local_sepolia_fork

# --- Testnet deployments ---

.PHONY: deploy-sepolia
deploy-sepolia: compile
	npx hardhat run scripts/deploy.ts --network sepolia