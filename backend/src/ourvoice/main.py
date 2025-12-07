import argparse
import asyncio
import json
from os.path import join
from pprint import pprint

import pysolr
from web3 import AsyncWeb3, WebSocketProvider


async def subscribe_to_transfer_events(
    forum_contract_address: str, ethereum_node_url: str, solr_url: str
) -> None:

    with open("./src/ourvoice/ForumABI.json", "r") as f:
        forum_abi = json.load(f)["abi"]

    solr_client = pysolr.Solr(solr_url, always_commit=True)

    async with AsyncWeb3(WebSocketProvider(ethereum_node_url)) as w3:

        weth_contract = w3.eth.contract(address=forum_contract_address, abi=forum_abi)
        # subscribe to new block headers:
        subscription_id = await w3.eth.subscribe("newHeads")
        pprint(subscription_id)

        # listen for events as they occur:
        async for response in w3.socket.process_subscriptions():
            # handle each event:
            result = response["result"]
            pprint(result)

            pprint(f"Block #{result['number']} mined")

            logs = await weth_contract.events.StatementAdded().get_logs(
                from_block=result["number"]
            )

            for log in logs:
                pprint(
                    f'New statement added with ID {log.args.id}: "{log.args.statement}"'
                )
                doc = {
                    "id": str(log.args.id),
                    "statementId": log.args.id,
                    "statement": log.args.statement,
                }
                solr_client.add([doc])
                pprint(f"Indexed statement ID {log.args.id} into Solr")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="OurVoice Backend Service")
    parser.add_argument(
        "--forum-contract-address",
        type=str,
        required=True,
        help="Address of the forum contract",
    )
    parser.add_argument(
        "--ethereum-node-url", type=str, required=True, help="URL of the Ethereum node"
    )
    parser.add_argument(
        "--solr-url", type=str, required=True, help="URL of the Solr instance"
    )
    return parser.parse_args()


async def heartbeat() -> None:
    while True:
        pprint("Heartbeat: OurVoice backend is running...")
        await asyncio.sleep(5)


async def main() -> None:
    args = parse_args()
    pprint(
        f"Starting OurVoice backend with forum contract at {args.forum_contract_address} and Ethereum node {args.ethereum_node_url}"
    )

    s = asyncio.create_task(
        subscribe_to_transfer_events(
            args.forum_contract_address,
            args.ethereum_node_url,
            args.solr_url
        )
    )
    m = asyncio.create_task(heartbeat())
    await asyncio.gather(s, m)


if __name__ == "__main__":
    asyncio.run(main())
