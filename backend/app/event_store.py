"""
In-memory event storage for file integrity monitoring events.
"""
import logging
import threading
from typing import List, Dict, Any
from datetime import datetime
from collections import deque

logger = logging.getLogger(__name__)


class EventStore:
	"""Thread-safe in-memory storage for file events."""
	
	def __init__(self, max_size: int = 10000):
		"""
		Initialize the event store.
		
		Args:
			max_size: Maximum number of events to store (default: 10000)
		"""
		self._events: deque = deque(maxlen=max_size)
		self._lock = threading.Lock()
	
	def add_event(self, event: Dict[str, Any]):
		"""Add a new event to the store (thread-safe)."""
		with self._lock:
			self._events.appendleft(event)  # Most recent first
			logger.debug(f"Event stored: {event.get('event')} - {event.get('filename')}")
	
	def get_events(self, limit: int = None, event_type: str = None) -> List[Dict[str, Any]]:
		"""
		Get events from the store (thread-safe).
		
		Args:
			limit: Maximum number of events to return
			event_type: Filter by event type ('created', 'modified', 'deleted')
		
		Returns:
			List of events
		"""
		with self._lock:
			events = list(self._events)
		
		# Filter by event type if specified
		if event_type:
			events = [e for e in events if e.get('event') == event_type]
		
		# Apply limit
		if limit:
			events = events[:limit]
		
		return events
	
	def clear(self):
		"""Clear all events from the store (thread-safe)."""
		with self._lock:
			self._events.clear()
			logger.info("Event store cleared")
	
	def count(self) -> int:
		"""Get the total number of events (thread-safe)."""
		with self._lock:
			return len(self._events)


# Global event store instance
event_store = EventStore()

