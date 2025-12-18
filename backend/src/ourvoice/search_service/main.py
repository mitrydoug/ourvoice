import os

from ourvoice.search_service.api import create_api
import pysolr
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


SOLR_URL = os.getenv("SOLR_URL")

app = FastAPI()
app.solr_client = pysolr.Solr(SOLR_URL, always_commit=True)
create_api(app)

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)