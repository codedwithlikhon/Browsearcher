from typing import Dict, List, Optional
from ..domain.models import Session

class TaskSessionService:
    """
    Service for managing task sessions.
    """
    _sessions: Dict[str, Session] = {}

    def create_session(self) -> Session:
        """
        Creates a new session and stores it.
        """
        session = Session()
        self._sessions[session.session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """
        Retrieves a session by its ID.
        """
        return self._sessions.get(session_id)

    def list_sessions(self) -> List[Session]:
        """
        Returns a list of all current sessions.
        """
        return list(self._sessions.values())

    def delete_session(self, session_id: str) -> bool:
        """
        Deletes a session by its ID.
        Returns True if the session was deleted, False otherwise.
        """
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

# Create a singleton instance of the service
session_service = TaskSessionService()