import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_ai_assist_invalid_action():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/ai/assist", json={
            "text": "Hello world",
            "action": "invalid_action"
        })
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid action"

@pytest.mark.asyncio
async def test_ai_assist_valid_action():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/ai/assist", json={
            "text": "Hello world",
            "action": "rewrite"
        })
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
