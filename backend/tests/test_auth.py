"""
SyncPad Backend Tests — Authentication
Uses async SQLAlchemy + httpx AsyncClient to match the production setup.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import Base, get_db

TEST_DB_URL = "sqlite+aiosqlite:///./test_auth.db"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app.dependency_overrides[get_db] = override_get_db
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()
    app.dependency_overrides.clear()
    try:
        if os.path.exists("./test_auth.db"):
            os.remove("./test_auth.db")
    except Exception:
        pass


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ─── Registration Tests ────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_register_success(client):
    """A new user can register and receives a JWT token."""
    resp = await client.post("/auth/register", json={
        "email": "alice@example.com",
        "password": "securepass123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.anyio
async def test_register_duplicate_email(client):
    """Registering with an already-used email returns 400."""
    await client.post("/auth/register", json={
        "email": "bob@example.com",
        "password": "password123"
    })
    resp = await client.post("/auth/register", json={
        "email": "bob@example.com",
        "password": "differentpass"
    })
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"].lower()


@pytest.mark.anyio
async def test_register_invalid_email(client):
    """Registering with an invalid email format returns 422."""
    resp = await client.post("/auth/register", json={
        "email": "not-an-email",
        "password": "password123"
    })
    assert resp.status_code == 422


# ─── Login Tests ───────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_login_success(client):
    """A registered user can login and receives a valid JWT."""
    await client.post("/auth/register", json={
        "email": "carol@example.com",
        "password": "mypassword123"
    })
    resp = await client.post("/auth/login", json={
        "email": "carol@example.com",
        "password": "mypassword123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    # JWT has exactly 3 parts: header.payload.signature
    assert len(data["access_token"].split(".")) == 3


@pytest.mark.anyio
async def test_login_wrong_password(client):
    """Login with wrong password returns 401 Unauthorized."""
    await client.post("/auth/register", json={
        "email": "dave@example.com",
        "password": "correctpass"
    })
    resp = await client.post("/auth/login", json={
        "email": "dave@example.com",
        "password": "wrongpass"
    })
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_login_nonexistent_user(client):
    """Login with a non-existent email returns 401."""
    resp = await client.post("/auth/login", json={
        "email": "nobody@example.com",
        "password": "password"
    })
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_protected_route_without_token(client):
    """Accessing a protected route without a token returns 401."""
    resp = await client.get("/docs")
    assert resp.status_code == 401
