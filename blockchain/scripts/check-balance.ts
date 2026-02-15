/**
 * Pre-deploy balance check for the Sepolia deployer account.
 *
 * Reads SEPOLIA_RPC_URL and SEPOLIA_DEPLOYER_PRIVATE_KEY from the environment,
 * derives the deployer address, checks its ETH balance, and exits with an error
 * if the balance is below a minimum threshold.
 *
 * Usage: npx tsx scripts/check-balance.ts
 */

import { createPublicClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const MIN_BALANCE_WEI = BigInt("10000000000000000"); // 0.01 ETH

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY;

  if (!rpcUrl) {
    console.error("❌ SEPOLIA_RPC_URL is not set.");
    process.exit(1);
  }
  if (!privateKey) {
    console.error("❌ SEPOLIA_DEPLOYER_PRIVATE_KEY is not set.");
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const balance = await client.getBalance({ address: account.address });
  const balanceEth = formatEther(balance);

  console.log(`Deployer address: ${account.address}`);
  console.log(`Balance: ${balanceEth} ETH`);

  if (balance < MIN_BALANCE_WEI) {
    console.error(
      `\n❌ Insufficient funds: ${balanceEth} ETH is below the minimum ` +
      `threshold of ${formatEther(MIN_BALANCE_WEI)} ETH.\n` +
      `Please fund the deployer wallet before running the deployment.`,
    );
    process.exit(1);
  }

  console.log("✅ Balance is sufficient for deployment.");
}

main().catch((err) => {
  console.error("❌ Failed to check balance:", err.message);
  process.exit(1);
});
