from fastapi import APIRouter, HTTPException
from typing import List
from ..application.taskSessionService import session_service
from ..domain.models import Session

router = APIRouter()

@router.put("/sessions", response_model=Session)
async def create_session():
    """
    Create a new conversation session.
    """
    session = session_service.create_session()
    return session

@router.get("/sessions", response_model=List[Session])
async def list_sessions():
    """
    Get a list of all sessions.
    """
    return session_service.list_sessions()

@router.get("/sessions/{session_id}", response_model=Session)
async def get_session(session_id: str):
    """
    Get session information including conversation history.
    """
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str):
    """
    Delete a session.
    """
    if not session_service.delete_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return

@router.post("/sessions/{session_id}/stop")
async def stop_session(session_id: str):
    """
    Stop an active session.
    """
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.status = "stopped"
    return {"message": f"Session {session_id} stopped."}

@router.post("/sessions/{session_id}/chat")
async def chat_with_session(session_id: str):
    """
    Send a message to the session and receive a streaming response.
    (This is a placeholder and will be implemented later)
    """
    if not session_service.get_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Chat functionality not yet implemented."}

@router.get("/health")
async def health_check():
    """
    Health check endpoint to verify that the server is running.
    """
    return {"status": "ok"}