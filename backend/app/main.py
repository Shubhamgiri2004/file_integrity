import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.file_watcher import FileWatcher, MultiFileWatcher
from app.websocket_manager import websocket_manager
from app.routes import logs, stats, settings
from app.event_store import event_store
from fastapi import Query
from typing import Optional, List
from pydantic import BaseModel

class PathUpdateRequest(BaseModel):
	path: str

# Configure logging
logging.basicConfig(
	level=logging.INFO,
	format="[%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# Global file watcher instance
file_watcher = None  # Can be FileWatcher or MultiFileWatcher
# Global event loop reference for async callbacks from watchdog threads
_main_event_loop = None

# Define multiple watch folders for Windows
DEFAULT_WATCH_FOLDERS = [
	r"C:\Users\shubh\Documents",
	r"C:\Users\shubh\OneDrive\Desktop",
	r"C:\Users\shubh\projects"
]


async def on_file_event(event_data: dict):
	"""Callback function when a file or folder event occurs - broadcasts to WebSocket clients."""
	# Event data includes: event, filename, file_path, parent_folder, timestamp, hash, is_folder
	ws_message = {
		"event": event_data.get("event"),  # "created", "modified", "deleted", "moved"
		"filename": event_data.get("filename"),
		"file_path": event_data.get("file_path"),  # Absolute path
		"parent_folder": event_data.get("parent_folder", ""),  # Watched folder name
		"timestamp": event_data.get("timestamp"),  # ISO format string
		"hash": event_data.get("hash", ""),  # SHA-256 hash (empty for deleted/folders)
		"is_folder": event_data.get("is_folder", False)  # True for folder events, False for file events
	}
	
	# Broadcast to all connected WebSocket clients
	try:
		await websocket_manager.broadcast(ws_message)
		client_count = len(websocket_manager.active_connections)
		if client_count > 0:
			logger.info(f"📡 Broadcast: [{ws_message['parent_folder']}] {ws_message['event']} - {ws_message['filename']} → {client_count} client(s)")
		else:
			logger.debug(f"⚠ No clients connected - event not broadcasted: {ws_message['filename']}")
	except Exception as e:
		logger.error(f"Error broadcasting WebSocket message: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
	"""Manage application lifespan events."""
	global file_watcher, _main_event_loop

	# Startup
	logger.info("Initializing database...")
	init_db()

	# Store reference to the main event loop for async callbacks from watchdog threads
	import asyncio
	_main_event_loop = asyncio.get_running_loop()

	# Start multiple file watchers
	logger.info("=" * 60)
	logger.info("Initializing Multi-Folder File Integrity Monitoring")
	logger.info("=" * 60)
	
	file_watcher = MultiFileWatcher(DEFAULT_WATCH_FOLDERS, on_file_event, _main_event_loop)
	active_watchers = file_watcher.start_all()
	
	if active_watchers == 0:
		logger.warning("⚠ No active watchers started! Check if the specified folders exist.")
	else:
		logger.info(f"✓ Successfully monitoring {active_watchers} folder(s) in background threads")
	
	logger.info("=" * 60)
	logger.info("FastAPI application started")
	logger.info("WebSocket endpoint: ws://localhost:8000/ws")
	logger.info("REST API: http://localhost:8000/api")
	logger.info("Events endpoint: http://localhost:8000/events")
	logger.info("=" * 60)

	yield

	# Shutdown
	logger.info("Shutting down all file watchers...")
	if file_watcher:
		if isinstance(file_watcher, MultiFileWatcher):
			file_watcher.stop_all()
		else:
			file_watcher.stop()
	logger.info("Application stopped")


app = FastAPI(
	title="File Integrity Monitoring API",
	description="Backend API for real-time file integrity monitoring",
	version="1.0.0",
	lifespan=lifespan
)

# CORS middleware
app.add_middleware(
	CORSMiddleware,
	allow_origins=[
		"http://localhost:5173",
		"http://localhost:3000",
		"http://127.0.0.1:5173",
		"http://127.0.0.1:3000"
	],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# Include routers
app.include_router(logs.router)
app.include_router(stats.router)
app.include_router(settings.router)


@app.get("/")
def root():
	"""Root endpoint."""
	return {
		"message": "File Integrity Monitoring API",
		"version": "1.0.0",
		"endpoints": {
			"websocket": "/ws",
			"api": "/api",
			"docs": "/docs"
		}
	}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
	"""WebSocket endpoint for real-time file event updates."""
	await websocket_manager.connect(websocket)
	try:
		while True:
			# Keep connection alive and handle any client messages
			data = await websocket.receive_text()
			# Echo back or handle client messages if needed
			logger.debug(f"Received message from client: {data}")
	except WebSocketDisconnect:
		websocket_manager.disconnect(websocket)


@app.post("/api/watcher/update-path")
async def update_watcher_path(request: PathUpdateRequest):
	"""Update the monitored path and restart watcher."""
	global file_watcher
	new_path = request.path
	
	if file_watcher:
		settings.set_monitored_path(new_path)
		file_watcher.update_watch_path(new_path)
		return {"message": f"Watcher path updated to: {new_path}"}
	return {"error": "File watcher not initialized"}


class FileEventResponse(BaseModel):
	"""Response model for file events."""
	event: str
	filename: str
	file_path: str
	parent_folder: str
	timestamp: str
	hash: str


@app.get("/events", response_model=List[FileEventResponse])
async def get_events(
	limit: Optional[int] = Query(None, ge=1, le=1000, description="Maximum number of events to return"),
	event_type: Optional[str] = Query(None, description="Filter by event type: created, modified, deleted")
):
	"""
	Get file events from in-memory storage.
	
	Returns the most recent file events detected by the file watcher.
	"""
	events = event_store.get_events(limit=limit, event_type=event_type)
	logger.info(f"Retrieved {len(events)} events from store")
	return events


@app.delete("/events")
async def clear_events():
	"""Clear all events from in-memory storage."""
	event_store.clear()
	return {"message": "All events cleared from memory"}


if __name__ == "__main__":
	import uvicorn
	uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

