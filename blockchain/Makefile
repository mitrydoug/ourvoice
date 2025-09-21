
.PHONY: clean
clean:
	rm -r ignition/deployments

.PHONY: copy-deployment-files
copy-deployment-files:
	cp ignition/deployments/chain-31337/artifacts/ForumModule#Forum.json ../frontend/src/deployment/Forum.json
	cp ignition/deployments/chain-31337/deployed_addresses.json ../frontend/src/deployment/deployed_addresses.json

.PHONY: deploy-only
deploy-only:
	npx hardhat ignition deploy ignition/modules/Forum.ts --network localhost

.PHONY: deploy
deploy: clean deploy-only copy-deployment-files
	