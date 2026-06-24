from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import contextlib

from database import engine, Base
from routers import auth, docs, ai

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables verified.")
    except Exception as e:
        print(f"Warning: Failed to connect to database during startup: {e}")
    
    yield
    
    # Clean up
    try:
        await engine.dispose()
    except Exception:
        pass

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Syncpad API", lifespan=lifespan, docs_url="/api-docs")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allow CORS from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(docs.router)
app.include_router(ai.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Syncpad API!"}

