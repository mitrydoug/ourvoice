
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
deploy-forked: export DEPLOY_MODE = "fork"
deploy-forked: clean compile deploy-only

.PHONY: deploy-mock
deploy-mocked: export DEPLOY_MODE = "mock"
deploy-mocked: clean compile deploy-only