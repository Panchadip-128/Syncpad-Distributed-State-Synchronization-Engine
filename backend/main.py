from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import contextlib

from database import engine, Base
from routers import auth, docs, ai

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Clean up
    await engine.dispose()

app = FastAPI(title="Syncpad API", lifespan=lifespan, docs_url="/api-docs")

# Allow CORS from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(docs.router)
app.include_router(ai.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Syncpad API"}
