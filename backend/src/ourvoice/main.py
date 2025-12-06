import argparse
import asyncio
from web3 import AsyncWeb3, WebSocketProvider
from eth_abi.abi import decode


async def subscribe_to_transfer_events(forum_contract_address: str, ethereum_node_url: str) -> None:
    async with AsyncWeb3(WebSocketProvider(ethereum_node_url)) as w3:
        user_vote_event_topic = w3.keccak(text="UserVote(bytes32,string,int256)")
        filter_params = {
            "address": forum_contract_address,
            "topics": [user_vote_event_topic],
        }
        subscription_id = await w3.eth.subscribe("logs", filter_params)
        print(f"Subscribing to transfer events for WETH at {subscription_id}")

        async for payload in w3.socket.process_subscriptions():
            result = payload["result"]

            # for i in [0, 1, 2, 3]:
            print(result)


            """
            from_addr = decode(["bytes32"], result["topics"][1])[0]
            to_addr = decode(["address"], result["topics"][2])[0]
            amount = decode(["uint256"], result["data"])[0]
            print(f"{w3.from_wei(amount, 'ether')} WETH from {from_addr} to {to_addr}")
            """


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="OurVoice Backend Service")
    parser.add_argument("--forum-contract-address", type=str, required=True, help="Address of the forum contract")
    parser.add_argument("--ethereum-node-url", type=str, required=True, help="URL of the Ethereum node")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    print(f"Starting OurVoice backend with forum contract at {args.forum_contract_address} and Ethereum node {args.ethereum_node_url}")

    asyncio.run(subscribe_to_transfer_events(args.forum_contract_address, args.ethereum_node_url))


if __name__ == "__main__":
    main()