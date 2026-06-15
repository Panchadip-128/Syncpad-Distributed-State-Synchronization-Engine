"""
SyncPad Backend Tests — Documents API
Tests all CRUD operations, branching, snapshots, and search.
"""
import pytest


# ─── Document CRUD ──────────────────────────────────────────────────────────


@pytest.mark.anyio
async def test_create_document(auth_client):
    """Authenticated user can create a document."""
    client, token = auth_client
    resp = await client.post("/docs", json={"title": "Test Doc"}, headers={
        "Authorization": f"Bearer {token}"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Test Doc"
    assert "id" in data
    assert "owner_id" in data


@pytest.mark.anyio
async def test_create_document_default_title(auth_client):
    """Document created without a title gets 'Untitled Document'."""
    client, token = auth_client
    resp = await client.post("/docs", json={}, headers={
        "Authorization": f"Bearer {token}"
    })
    assert resp.status_code == 200
    assert resp.json()["title"] == "Untitled Document"


@pytest.mark.anyio
async def test_list_documents(auth_client):
    """GET /docs returns all documents owned by the authenticated user."""
    client, token = auth_client
    headers = {"Authorization": f"Bearer {token}"}

    # Create two documents
    await client.post("/docs", json={"title": "Doc A"}, headers=headers)
    await client.post("/docs", json={"title": "Doc B"}, headers=headers)

    resp = await client.get("/docs", headers=headers)
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) >= 2
    titles = [d["title"] for d in docs]
    assert "Doc A" in titles
    assert "Doc B" in titles


@pytest.mark.anyio
async def test_get_document(auth_client):
    """GET /docs/{id} returns the specific document."""
    client, token = auth_client
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/docs", json={"title": "Fetch Me"}, headers=headers)
    doc_id = create_resp.json()["id"]

    resp = await client.get(f"/docs/{doc_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Fetch Me"


@pytest.mark.anyio
async def test_get_document_not_found(auth_client):
    """GET /docs/{id} with unknown ID returns 404."""
    client, token = auth_client
    resp = await client.get("/docs/nonexistent-id", headers={
        "Authorization": f"Bearer {token}"
    })
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_document_title(auth_client):
    """PATCH /docs/{id} can update the title."""
    client, token = auth_client
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/docs", json={"title": "Old Title"}, headers=headers)
    doc_id = create_resp.json()["id"]

    resp = await client.patch(f"/docs/{doc_id}", json={"title": "New Title"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"


@pytest.mark.anyio
async def test_delete_document(auth_client):
    """DELETE /docs/{id} removes the document; subsequent GET returns 404."""
    client, token = auth_client
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/docs", json={"title": "Delete Me"}, headers=headers)
    doc_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/docs/{doc_id}", headers=headers)
    assert del_resp.status_code == 204

    get_resp = await client.get(f"/docs/{doc_id}", headers=headers)
    assert get_resp.status_code == 404


@pytest.mark.anyio
async def test_delete_nonexistent_document(auth_client):
    """DELETE /docs/{id} with unknown ID returns 404."""
    client, token = auth_client
    resp = await client.delete("/docs/nonexistent-id", headers={
        "Authorization": f"Bearer {token}"
    })
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_unauthorized_access(client):
    """Accessing /docs without a token returns 401."""
    resp = await client.get("/docs")
    assert resp.status_code == 401


# ─── Branching ──────────────────────────────────────────────────────────────


@pytest.mark.anyio
async def test_branch_document(auth_client):
    """POST /docs/{id}/branch creates a new doc with parent_id set."""
    client, token = auth_client
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/docs", json={"title": "Parent Doc"}, headers=headers)
    parent_id = create_resp.json()["id"]

    branch_resp = await client.post(f"/docs/{parent_id}/branch", headers=headers)
    assert branch_resp.status_code == 200
    branch_data = branch_resp.json()
    assert branch_data["title"] == "Parent Doc (Branch)"
    assert branch_data["parent_id"] == parent_id


@pytest.mark.anyio
async def test_branch_nonexistent_document(auth_client):
    """POST /docs/{id}/branch with unknown ID returns 404."""
    client, token = auth_client
    resp = await client.post("/docs/nonexistent-id/branch", headers={
        "Authorization": f"Bearer {token}"
    })
    assert resp.status_code == 404


# ─── Snapshots ──────────────────────────────────────────────────────────────


@pytest.mark.anyio
async def test_create_and_list_snapshots(auth_client):
    """Create a snapshot, then list snapshots for that document."""
    client, token = auth_client
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/docs", json={"title": "Snap Doc"}, headers=headers)
    doc_id = create_resp.json()["id"]

    # Create a snapshot (this endpoint is unauthenticated — used by Hocuspocus server)
    snap_resp = await client.post(f"/docs/{doc_id}/snapshot", json={
        "content_b64": "SGVsbG8gV29ybGQ=",
        "preview": "Hello World"
    })
    assert snap_resp.status_code == 201

    # List snapshots (authenticated)
    list_resp = await client.get(f"/docs/{doc_id}/snapshots", headers=headers)
    assert list_resp.status_code == 200
    snaps = list_resp.json()
    assert len(snaps) >= 1
    assert snaps[0]["preview"] == "Hello World"


@pytest.mark.anyio
async def test_get_snapshot_detail(auth_client):
    """GET /docs/{doc_id}/snapshots/{snapshot_id} returns content_b64."""
    client, token = auth_client
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/docs", json={"title": "Detail Doc"}, headers=headers)
    doc_id = create_resp.json()["id"]

    await client.post(f"/docs/{doc_id}/snapshot", json={
        "content_b64": "VGVZDCBEYXRH",
        "preview": "Test Data"
    })

    list_resp = await client.get(f"/docs/{doc_id}/snapshots", headers=headers)
    snap_id = list_resp.json()[0]["id"]

    detail_resp = await client.get(f"/docs/{doc_id}/snapshots/{snap_id}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["content_b64"] == "VGVZDCBEYXRH"


# ─── Search (q parameter) ──────────────────────────────────────────────────


@pytest.mark.anyio
async def test_search_documents(auth_client):
    """GET /docs?q=<term> filters documents by title (case-insensitive)."""
    client, token = auth_client
    headers = {"Authorization": f"Bearer {token}"}

    await client.post("/docs", json={"title": "Architecture Notes"}, headers=headers)
    await client.post("/docs", json={"title": "Meeting Minutes"}, headers=headers)
    await client.post("/docs", json={"title": "Architecture Diagram"}, headers=headers)

    resp = await client.get("/docs?q=architecture", headers=headers)
    assert resp.status_code == 200
    docs = resp.json()
    assert all("architecture" in d["title"].lower() for d in docs)
    assert len(docs) >= 2


@pytest.mark.anyio
async def test_search_no_results(auth_client):
    """GET /docs?q=<nonexistent> returns empty list."""
    client, token = auth_client
    resp = await client.get("/docs?q=zzz_nonexistent_zzz", headers={
        "Authorization": f"Bearer {token}"
    })
    assert resp.status_code == 200
    assert resp.json() == []
