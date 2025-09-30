from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import time

class Event(BaseModel):
    """
    Represents a single event in a session's history.
    """
    event_id: str = Field(default_factory=lambda: f"evt_{int(time.time() * 1000)}")
    type: str
    data: Dict[str, Any]
    timestamp: float = Field(default_factory=time.time)

class Session(BaseModel):
    """
    Represents a single chat session.
    """
    session_id: str = Field(default_factory=lambda: f"sid_{int(time.time() * 1000)}")
    title: str = "New Chat"
    created_at: float = Field(default_factory=time.time)
    events: List[Event] = []
    status: str = "active"
    unread_message_count: int = 0

    def add_event(self, event_type: str, data: Dict[str, Any]) -> Event:
        """
        Adds a new event to the session's history.
        """
        event = Event(type=event_type, data=data)
        self.events.append(event)
        return event

    @property
    def latest_message(self) -> Optional[str]:
        """
        Returns the content of the last message event.
        """
        for event in reversed(self.events):
            if event.type == "message":
                return event.data.get("content")
        return None

    @property
    def latest_message_at(self) -> Optional[float]:
        """
        Returns the timestamp of the last message event.
        """
        for event in reversed(self.events):
            if event.type == "message":
                return event.timestamp
        return None