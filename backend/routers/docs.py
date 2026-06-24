from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from fastapi import Query as QueryParam

from database import get_db
from models import Document, User, Snapshot
from dependencies import get_current_user

router = APIRouter(prefix="/docs", tags=["docs"])

class DocumentCreate(BaseModel):
    title: Optional[str] = "Untitled Document"

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class DocumentResponse(BaseModel):
    id: str
    title: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    parent_id: Optional[str] = None

    class Config:
        from_attributes = True

class SnapshotCreate(BaseModel):
    content_b64: str
    preview: Optional[str] = None

class SnapshotResponse(BaseModel):
    id: str
    created_at: datetime
    preview: Optional[str] = None

    class Config:
        from_attributes = True

class SnapshotDetailResponse(SnapshotResponse):
    content_b64: str

@router.post("", response_model=DocumentResponse)
async def create_document(doc_data: DocumentCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_doc = Document(title=doc_data.title, owner_id=current_user.id)
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)
    return new_doc

@router.get("", response_model=List[DocumentResponse])
async def list_documents(q: Optional[str] = QueryParam(None, description="Search documents by title"), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Document).where(Document.owner_id == current_user.id)
    if q:
        query = query.where(Document.title.ilike(f"%{q}%"))
    query = query.order_by(Document.updated_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.post("/{doc_id}/branch", response_model=DocumentResponse)
async def branch_document(doc_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get original doc
    result = await db.execute(select(Document).where(Document.id == doc_id))
    orig_doc = result.scalars().first()
    if not orig_doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Get latest snapshot
    snap_result = await db.execute(
        select(Snapshot).where(Snapshot.document_id == doc_id).order_by(Snapshot.created_at.desc())
    )
    latest_snap = snap_result.scalars().first()
    
    # Create new branched document
    new_doc = Document(
        title=f"{orig_doc.title} (Branch)",
        owner_id=current_user.id,
        parent_id=orig_doc.id
    )
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)
    
    # Copy latest snapshot to new document
    if latest_snap:
        new_snap = Snapshot(
            document_id=new_doc.id,
            content_b64=latest_snap.content_b64,
            preview=latest_snap.preview
        )
        db.add(new_snap)
        await db.commit()
        
    return new_doc

@router.patch("/{doc_id}", response_model=DocumentResponse)
async def update_document(doc_id: str, doc_data: DocumentUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Document).where(Document.id == doc_id, Document.owner_id == current_user.id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc_data.title is not None:
        doc.title = doc_data.title
    if doc_data.content is not None:
        doc.content = doc_data.content
        
    await db.commit()
    await db.refresh(doc)
    return doc

@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Document).where(Document.id == doc_id, Document.owner_id == current_user.id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    await db.delete(doc)
    await db.commit()
    return None

# --- Snapshots ---

@router.post("/{doc_id}/snapshot", status_code=status.HTTP_201_CREATED)
async def create_snapshot(doc_id: str, snap_data: SnapshotCreate, db: AsyncSession = Depends(get_db)):
    # Note: In production, verify this request comes from the Hocuspocus server using a secret token
    new_snap = Snapshot(document_id=doc_id, content_b64=snap_data.content_b64, preview=snap_data.preview)
    db.add(new_snap)
    await db.commit()
    return {"status": "success"}

@router.get("/{doc_id}/snapshot/latest")
async def get_latest_snapshot(doc_id: str, db: AsyncSession = Depends(get_db)):
    # Called by Hocuspocus server on document load
    snap_result = await db.execute(
        select(Snapshot).where(Snapshot.document_id == doc_id).order_by(Snapshot.created_at.desc()).limit(1)
    )
    snap = snap_result.scalars().first()
    if not snap:
        return {"content_b64": None}
    return {"content_b64": snap.content_b64}

@router.get("/{doc_id}/snapshots", response_model=List[SnapshotResponse])
async def list_snapshots(doc_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify owner
    result = await db.execute(select(Document).where(Document.id == doc_id, Document.owner_id == current_user.id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Document not found")
        
    snap_result = await db.execute(
        select(Snapshot).where(Snapshot.document_id == doc_id).order_by(Snapshot.created_at.desc())
    )
    return snap_result.scalars().all()

@router.get("/{doc_id}/snapshots/{snapshot_id}", response_model=SnapshotDetailResponse)
async def get_snapshot(doc_id: str, snapshot_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify owner
    result = await db.execute(select(Document).where(Document.id == doc_id, Document.owner_id == current_user.id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Document not found")
        
    snap_result = await db.execute(
        select(Snapshot).where(Snapshot.id == snapshot_id, Snapshot.document_id == doc_id)
    )
    snap = snap_result.scalars().first()
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snap
