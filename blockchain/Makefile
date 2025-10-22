
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
	