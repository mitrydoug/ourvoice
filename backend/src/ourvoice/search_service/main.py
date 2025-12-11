import os

from ourvoice.search_service.api import create_api
import pysolr
from fastapi import FastAPI
from fastapi.responses import RedirectResponse


SOLR_URL = os.getenv("SOLR_URL")

app = FastAPI()
app.solr_client = pysolr.Solr(SOLR_URL, always_commit=True)
create_api(app)