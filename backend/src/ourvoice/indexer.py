"""Blockchain event indexer — subscribes to new blocks via WebSocket and indexes
``StatementAdded`` events into Meilisearch.

Can be run standalone (``python -m ourvoice.main``) or embedded in the combined
process via the ``run_indexer`` coroutine.
"""

import asyncio
import json
import logging
from importlib.resources import files
from typing import Any

import meilisearch
from web3 import AsyncWeb3, WebSocketProvider

logger = logging.getLogger(__name__)


# Meilisearch index name for statements.
STATEMENTS_INDEX = "statements"


def _load_forum_abi() -> list[dict[str, Any]]:
    """Load the Forum ABI from the package data."""
    abi_path = files("ourvoice").joinpath("ForumABI.json")
    return json.loads(abi_path.read_text())["abi"]


def _ensure_index(client: meilisearch.Client) -> None:
    """Create the statements index if it doesn't exist and configure searchable
    attributes."""
    try:
        client.get_index(STATEMENTS_INDEX)
    except meilisearch.errors.MeilisearchApiError:
        client.create_index(STATEMENTS_INDEX, {"primaryKey": "id"})

    # Ensure searchable/filterable attributes are configured.
    client.index(STATEMENTS_INDEX).update_searchable_attributes(["statementText"])
    client.index(STATEMENTS_INDEX).update_filterable_attributes(["statementId"])


async def run_indexer(
    meili_client: meilisearch.Client,
    forum_contract_address: str,
    ethereum_node_url: str,
) -> None:
    """Subscribe to new blocks and index ``StatementAdded`` events.

    This coroutine runs indefinitely.  It is safe to cancel via
    ``task.cancel()``.
    """
    forum_abi = _load_forum_abi()
    _ensure_index(meili_client)
    index = meili_client.index(STATEMENTS_INDEX)

    logger.info(
        "Starting indexer for contract %s via %s",
        forum_contract_address,
        ethereum_node_url,
    )

    while True:
        try:
            async with AsyncWeb3(WebSocketProvider(ethereum_node_url)) as w3:
                contract = w3.eth.contract(
                    address=forum_contract_address, abi=forum_abi
                )
                await w3.eth.subscribe("newHeads")
                logger.info("Subscribed to new block headers")

                async for response in w3.socket.process_subscriptions():
                    block = response["result"]
                    block_number = block["number"]
                    logger.debug("Block #%s mined", block_number)

                    logs = await contract.events.StatementAdded().get_logs(
                        from_block=block_number
                    )

                    if logs:
                        docs = [
                            {
                                "id": str(log.args.id),
                                "statementId": log.args.id,
                                "statementText": log.args.statement,
                            }
                            for log in logs
                        ]
                        index.add_documents(docs)
                        logger.info(
                            "Indexed %d statement(s) from block #%s",
                            len(docs),
                            block_number,
                        )
        except asyncio.CancelledError:
            logger.info("Indexer cancelled, shutting down")
            raise
        except Exception:
            logger.exception("Indexer connection error, reconnecting in 5 seconds…")
            await asyncio.sleep(5)
