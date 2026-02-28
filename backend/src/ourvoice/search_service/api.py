"""Search API routes for the OurVoice search service."""

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from ourvoice.indexer import STATEMENTS_INDEX


class SearchResult(BaseModel):
    statement_id: int
    statement_text: str


def create_api(app: FastAPI) -> None:
    """Register search routes on *app*."""

    @app.get("/")
    async def root():
        return RedirectResponse(url="/docs")

    @app.get("/health")
    async def health_check():
        return {"status": "ok"}

    @app.get("/search")
    async def search(statement_text: str) -> list[SearchResult]:
        """Full-text search over indexed statements."""
        results = app.state.meili_client.index(STATEMENTS_INDEX).search(statement_text)
        return [
            SearchResult(
                statement_id=hit["statementId"],
                statement_text=hit["statementText"],
            )
            for hit in results["hits"]
        ]
