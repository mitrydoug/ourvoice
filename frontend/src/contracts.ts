import { abi } from './deployment/Forum.json'
import deployedAddresses from './deployment/deployed_addresses.json'


export const forumContractConfig = {
  address: deployedAddresses["ForumModule#Forum"],
  abi,
} as const;