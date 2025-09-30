import pytest
from httpx import AsyncClient
import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from backend.src.api.server import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.mark.anyio
async def test_health_check(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.anyio
async def test_session_management(client: AsyncClient):
    # 1. Create a new session
    create_response = await client.put("/api/v1/sessions")
    assert create_response.status_code == 200
    session_data = create_response.json()
    session_id = session_data["session_id"]
    assert session_id is not None
    assert session_data["title"] == "New Chat"

    # 2. List sessions and verify the new session is there
    list_response = await client.get("/api/v1/sessions")
    assert list_response.status_code == 200
    sessions = list_response.json()
    # The list should contain exactly one session
    assert len(sessions) == 1
    assert sessions[0]["session_id"] == session_id

    # 3. Get the specific session
    get_response = await client.get(f"/api/v1/sessions/{session_id}")
    assert get_response.status_code == 200
    assert get_response.json()["session_id"] == session_id

    # 4. Delete the session
    delete_response = await client.delete(f"/api/v1/sessions/{session_id}")
    assert delete_response.status_code == 204

    # 5. Verify the session is deleted
    get_deleted_response = await client.get(f"/api/v1/sessions/{session_id}")
    assert get_deleted_response.status_code == 404

    # 6. Verify that listing sessions now returns an empty list
    list_after_delete_response = await client.get("/api/v1/sessions")
    assert list_after_delete_response.status_code == 200
    assert len(list_after_delete_response.json()) == 0