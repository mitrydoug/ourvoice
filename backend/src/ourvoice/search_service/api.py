from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from pydantic import BaseModel


class SearchResult(BaseModel):
    statement_id: int
    statement_text: str


def create_api(app: FastAPI) -> None:

    @app.get("/")
    async def root():
        return RedirectResponse(url="/docs")

    @app.get("/health")
    async def health_check():
        return {"status": "ok"}

    @app.get("/search")
    async def search(statement_text: str) -> list[SearchResult]:
        results = app.solr_client.search(f'statementText:{statement_text}')
        return [
            SearchResult(
                statement_id=result["statementId"],
                statement_text=result["statementText"],
            )
            for result in results
        ]
