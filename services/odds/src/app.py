import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from providers import get_provider
from publisher import OddsPublisher
from runner import run
from storage import get_storage

logging.basicConfig(level=logging.INFO)

RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://localhost:5672")
POLL_INTERVAL_SECONDS = int(os.environ.get("POLL_INTERVAL_SECONDS", "30"))
PROVIDER_NAME = os.environ.get("ODDS_PROVIDER", "mock")
STORAGE_NAME = os.environ.get("ODDS_STORAGE", "postgres")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    provider = get_provider(PROVIDER_NAME)
    storage = get_storage(STORAGE_NAME)
    publisher = OddsPublisher(RABBITMQ_URL)
    worker = asyncio.create_task(
        run(provider, storage, publisher, POLL_INTERVAL_SECONDS),
        name=f"odds-worker-{PROVIDER_NAME}-{STORAGE_NAME}",
    )
    try:
        yield
    finally:
        worker.cancel()
        try:
            await worker
        except asyncio.CancelledError:
            pass


app = FastAPI(lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "provider": PROVIDER_NAME, "storage": STORAGE_NAME}
