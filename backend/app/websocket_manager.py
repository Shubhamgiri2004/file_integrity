import json
import logging
from typing import Set, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
	def __init__(self):
		self.active_connections: Set[WebSocket] = set()

	async def connect(self, websocket: WebSocket):
		"""Accept a new WebSocket connection."""
		await websocket.accept()
		self.active_connections.add(websocket)
		logger.info(f"WebSocket connected. Total clients: {len(self.active_connections)}")

	def disconnect(self, websocket: WebSocket):
		"""Remove a WebSocket connection."""
		self.active_connections.discard(websocket)
		logger.info(f"WebSocket disconnected. Total clients: {len(self.active_connections)}")

	async def broadcast(self, message: Dict[str, Any]):
		"""Broadcast a message to all connected clients."""
		if not self.active_connections:
			return

		message_json = json.dumps(message)
		disconnected = set()

		for connection in self.active_connections:
			try:
				await connection.send_text(message_json)
			except Exception as e:
				logger.error(f"Error sending message to client: {e}")
				disconnected.add(connection)

		# Remove disconnected clients
		for connection in disconnected:
			self.disconnect(connection)

		if len(self.active_connections) > 0:
			logger.info(f"WebSocket event sent to {len(self.active_connections)} clients")


# Global WebSocket manager instance
websocket_manager = WebSocketManager()



