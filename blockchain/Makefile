
.PHONY: clean
clean:
	rm -rf ignition/deployments/chain-31337
	npx hardhat clean

.PHONY: deploy-only
deploy-only:
	npx hardhat run scripts/deploy.ts --network localhost

.PHONY: compile
compile:
	npx hardhat compile

.PHONY: deploy
deploy: clean compile deploy-only

.PHONY: deploy-fork
deploy-fork: export DEPLOY_MODE = "fork"
deploy-fork: clean compile deploy-only

.PHONY: deploy-mock
deploy-fork: export DEPLOY_MODE = "mock"
deploy-fork: clean compile deploy-only