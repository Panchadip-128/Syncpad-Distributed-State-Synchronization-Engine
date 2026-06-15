"""
Shared test fixtures for SyncPad backend tests.
Provides an isolated async SQLite DB and authenticated client helpers.
"""
import os
import sys
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Ensure the backend package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import Base, get_db

TEST_DB_URL = "sqlite+aiosqlite:///./test.db"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_db():
    """Create all tables before module tests and tear down after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app.dependency_overrides[get_db] = override_get_db
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()
    app.dependency_overrides.clear()
    try:
        if os.path.exists("./test.db"):
            os.remove("./test.db")
    except Exception:
        pass


@pytest_asyncio.fixture
async def client():
    """Provide an httpx AsyncClient configured for the ASGI app."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient):
    """Register a unique user and return (client, token) pair for authenticated requests."""
    import uuid
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    resp = await client.post("/auth/register", json={
        "email": email,
        "password": "testpassword123"
    })
    assert resp.status_code == 200, f"Registration failed: {resp.text}"
    token = resp.json()["access_token"]
    return client, token
