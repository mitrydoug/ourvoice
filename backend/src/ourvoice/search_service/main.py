"""Standalone search-API entry-point.

Run with:
    uvicorn ourvoice.search_service.main:app --host 0.0.0.0 --port 8000

Or via FastAPI CLI:
    fastapi run src/ourvoice/search_service/main.py
"""

import os

import meilisearch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ourvoice.search_service.api import create_api

MEILI_URL = os.getenv("MEILI_URL", "http://localhost:7700")
MEILI_API_KEY = os.getenv("MEILI_API_KEY", "")

app = FastAPI(title="OurVoice Search API")
app.state.meili_client = meilisearch.Client(MEILI_URL, MEILI_API_KEY)
create_api(app)

origins = [
    "http://localhost:5173",
    "http://localhost:4173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
