

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

class SearchResult(BaseModel):
    statement_id: int
    statement: str


def create_api(app: FastAPI) -> None:

    @app.get("/")
    async def root():
        return RedirectResponse(url="/docs")

    @app.get("/health")
    async def health_check():
        return {"status": "ok"}

    @app.get("/search")
    async def search(statement_text: str) -> list[SearchResult]:
        results = app.solr_client.search(f'statement_text_en:"{statement_text}"')
        return [
            SearchResult(
                statement_id=result["statementId_i"],
                statement=result["statement_text_en"][0],
            )
            for result in results
        ]
