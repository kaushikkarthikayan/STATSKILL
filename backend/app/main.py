"""FastAPI application entry point.

Run from the backend folder:
    .venv\\Scripts\\python.exe -m uvicorn app.main:app --reload --port 8000
Interactive API documentation: http://127.0.0.1:8000/docs
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import (
    assessments,
    assistant,
    auth,
    books,
    catalog,
    creators,
    learning,
    my_notes,
    profile,
    progress,
    questions,
    training,
    users,
)
from app.core.config import settings
from app.db.setup import init_database

logger = logging.getLogger("statskill")
API_PREFIX = "/api"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.upload_root.mkdir(parents=True, exist_ok=True)
    init_database()
    yield


app = FastAPI(
    title=f"{settings.APP_NAME} API",
    version=settings.APP_VERSION,
    description="Student skill assessment, MCQ practice, progress reports and course training.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    # Users see a safe message; the traceback goes to the server log only.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on the server. Please try again."},
    )


for router in (
    auth.router,
    profile.router,
    catalog.router,
    questions.router,
    assessments.router,
    progress.router,
    training.resources_router,
    training.training_router,
    books.router,
    creators.router,
    users.router,
    learning.router,
    assistant.router,
    my_notes.router,
):
    app.include_router(router, prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/health", tags=["System"])
def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": settings.DB_ENGINE,
    }

