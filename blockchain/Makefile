
.PHONY: clean
clean:
	rm -r ignition/deployments/chain-31337
	npx hardhat clean

.PHONY: copy-deployment-files
copy-deployment-files:
	cp ignition/deployments/chain-31337/artifacts/ForumModule#Forum.json ../frontend/src/deployment/Forum.json
	cp ignition/deployments/chain-31337/deployed_addresses.json ../frontend/src/deployment/deployed_addresses.json

.PHONY: deploy-only
deploy-only:
	npx hardhat run scripts/deploy.ts --network localhost

.PHONY: compile
compile:
	npx hardhat compile

.PHONY: deploy
deploy: clean compile deploy-only copy-deployment-files
	