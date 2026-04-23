"""Search API routes for the OurVoice search service."""

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from ourvoice.indexer import STATEMENTS_INDEX


class SearchResult(BaseModel):
    statement_id: int
    statement_text: str
    last_engagement: int | None = None


def create_api(app: FastAPI) -> None:
    """Register search routes on *app*."""

    @app.get("/")
    async def root():
        return RedirectResponse(url="/docs")

    @app.get("/health")
    async def health_check():
        return {"status": "ok"}

    @app.get("/search")
    async def search(
        statement_text: str,
        forum_address: str,
    ) -> list[SearchResult]:
        """Full-text search over indexed statements.

        Results are always scoped to a single forum contract.

        Uses Meilisearch's ``frequency`` matching strategy so that
        rare/distinctive words are weighted higher than common ones.
        """
        search_params: dict[str, object] = {
            "matchingStrategy": "frequency",
            "filter": f'forumAddress = "{forum_address}"',
        }

        results = app.state.meili_client.index(STATEMENTS_INDEX).search(
            statement_text, search_params
        )
        return [
            SearchResult(
                statement_id=hit["statementId"],
                statement_text=hit["statementText"],
                last_engagement=hit.get("lastEngagement"),
            )
            for hit in results["hits"]
        ]
