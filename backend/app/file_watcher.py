import os
import logging
import threading
import time
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent
from datetime import datetime
from typing import Callable, Optional
from sqlalchemy.orm import Session

from app.models import FileEvent
from app.database import SessionLocal
from app.file_utils import calculate_file_hash
from app.event_store import event_store

# ---------------- IGNORE LIST ----------------
# Ignore SQLite database files to prevent infinite update loop
# SQLite constantly modifies these files internally, causing thousands of events per second
IGNORED_PATHS = [
    "integrity.db",         # SQLite database file - prevents infinite update loop
    "integrity.db-journal", # SQLite journal file - prevents infinite update loop
    "__pycache__",          # Python cache
    "venv",                 # virtual environment
    ".DS_Store",            # macOS system file
    "thumbs.db",            # Windows thumbnail cache
    ".git",                 # Git repository
    "node_modules"          # Node.js dependencies
]

# File extensions and patterns to ignore
IGNORED_EXTENSIONS = [".tmp", ".log"]
IGNORED_PREFIXES = ["~"]  # Files starting with ~ (temporary files)

def should_ignore(path: str) -> bool:
    """
    Return True if the file path should be ignored.
    
    Checks if any ignored pattern appears in the file path, or if the file
    has an ignored extension or starts with an ignored prefix.
    This prevents monitoring system files, database files, cache directories,
    temporary files, and log files.
    """
    path_str = str(path).lower()
    file_name = os.path.basename(path_str)
    
    # Check for ignored paths (directories, database files, etc.)
    if any(ignored.lower() in path_str for ignored in IGNORED_PATHS):
        return True
    
    # Check for ignored file extensions (.tmp, .log)
    if any(file_name.endswith(ext.lower()) for ext in IGNORED_EXTENSIONS):
        return True
    
    # Check for ignored prefixes (~ temporary files)
    if any(file_name.startswith(prefix) for prefix in IGNORED_PREFIXES):
        return True
    
    return False
# ------------------------------------------------


logger = logging.getLogger(__name__)



class FileChangeHandler(FileSystemEventHandler):
	# 🔹 FIX: Class-level duplicate suppression - tracks recent events to prevent duplicates
	# Key: (file_path, event_type), Value: timestamp of last event
	_recent_events: dict[tuple[str, str], float] = {}
	_lock = threading.Lock()  # Thread-safe access to _recent_events
	DEBOUNCE_WINDOW = 0.5  # Ignore duplicate events within 500ms (only true duplicates)
	
	def __init__(self, on_event_callback: Optional[Callable] = None, event_loop=None, watched_folder: str = ""):
		super().__init__()
		self.on_event_callback = on_event_callback
		self.event_loop = event_loop
		self.watched_folder = watched_folder

	def _handle_event(self, event: FileSystemEvent, event_type: str, watched_folder: str, is_directory: bool = False):
		"""Handle file system events (created, modified, deleted) for both files and directories."""
		file_path = getattr(event, "src_path", None)
		if not file_path:
			return
		
		# For directory events, use the directory-specific handler
		if event.is_directory or is_directory:
			self._handle_directory_event(event, event_type, watched_folder)
			return

		# Ignore SQLite database files to prevent infinite update loop
		# SQLite constantly modifies integrity.db and integrity.db-journal internally
		if should_ignore(file_path):
			logger.debug(f"[Ignored] {os.path.basename(file_path)} {event_type.lower()} - skipping event")
			return

		# Validate file path - for deleted events, the file won't exist, which is expected
		# For created/modified, we need to check if the file exists
		# For deleted, we just need to verify the path is valid
		if event_type.lower() == "deleted":
			# Deleted files won't exist - this is expected, just verify path format
			if not file_path or not os.path.dirname(file_path):
				logger.warning(f"⚠️ Skipping invalid deleted event: {file_path}")
				return
		else:
			# For created/modified, check if file exists (with small delay for file system sync)
			if not os.path.exists(file_path):
				# File might not exist yet for created events, or might be a temp file
				# Log at debug level and continue - let the hash calculation handle it
				logger.debug(f"File not found yet (may be in progress): {file_path}")

		file_name = os.path.basename(file_path)
		
		# Skip hidden files (starting with .) - other patterns are handled by should_ignore()
		if file_name.startswith("."):
			return

		# 🔹 FIX: Check for duplicate events within debounce window (only true duplicates)
		# This prevents the same event from being processed multiple times within 500ms
		# Different actions (created vs modified vs deleted) on the same file are NOT duplicates
		event_type_lower = event_type.lower()
		event_key = (file_path, event_type_lower)
		current_time = time.time()
		
		with self._lock:
			last_event_time = self._recent_events.get(event_key, 0.0)
			time_since_last = current_time - last_event_time
			
			# Only suppress if this is a true duplicate (same file+action within 500ms)
			# First event (last_event_time == 0.0) should always pass
			if last_event_time > 0.0 and time_since_last < self.DEBOUNCE_WINDOW:
				# True duplicate: same file path + same action within 500ms - ignore it
				logger.debug(f"[Duplicate Suppressed] {file_name} {event_type_lower} - last identical event {time_since_last:.3f}s ago")
				return
			
			# Update last event time for this file+action combination
			self._recent_events[event_key] = current_time
			
			# Clean up old entries (older than 2 seconds) to prevent memory leak
			cutoff_time = current_time - 2.0
			self._recent_events = {
				k: v for k, v in self._recent_events.items()
				if v > cutoff_time
			}

		parent_folder = os.path.basename(watched_folder.rstrip(os.sep)) if watched_folder else os.path.dirname(file_path)

		timestamp = datetime.utcnow()
		
		# Calculate file hash for created and modified events
		file_hash = ""
		if event_type_lower in ["created", "modified"]:
			# Small delay to ensure file is fully written before hashing
			time.sleep(0.05)  # Reduced from 0.1s to 0.05s for faster response
			try:
				if os.path.exists(file_path):
					file_hash = calculate_file_hash(file_path)
					if file_hash:
						logger.info(f"✓ [{parent_folder}] File {event_type_lower}: {file_name} | Hash: {file_hash[:16]}...")
					else:
						logger.info(f"✓ [{parent_folder}] File {event_type_lower}: {file_name} | Hash: (unavailable)")
				else:
					logger.info(f"✓ [{parent_folder}] File {event_type_lower}: {file_name} | Hash: (file not found)")
			except Exception as e:
				logger.warning(f"Error calculating hash for {file_name}: {e}")
				file_hash = ""
		else:
			logger.info(f"✓ [{parent_folder}] File {event_type_lower}: {file_name}")

		# Create event data in the format requested
		event_data = {
			"event": event_type_lower,  # "created", "modified", "deleted"
			"filename": file_name,
			"file_path": file_path,  # Absolute path
			"parent_folder": parent_folder,  # Name of the watched folder
			"timestamp": timestamp.isoformat(),
			"hash": file_hash,
			"is_folder": False  # Flag to indicate this is a file event
		}

		# Store in memory (thread-safe)
		event_store.add_event(event_data)

		# Save to database (optional, for persistence)
		try:
			db = SessionLocal()
			try:
				db_event = FileEvent(
					file_name=file_name,
					file_path=file_path,
					event_type=event_type,
					timestamp=timestamp,
					status="ok"
				)
				db.add(db_event)
				db.commit()
				db.refresh(db_event)
				event_data["id"] = str(db_event.id)
			except Exception as e:
				logger.error(f"Error saving event to database: {e}")
				db.rollback()
				event_data["id"] = str(hash(f"{file_path}{timestamp}"))
			finally:
				db.close()
		except Exception as e:
			logger.error(f"Database error: {e}")
			event_data["id"] = str(hash(f"{file_path}{timestamp}"))

		# Call async callback for WebSocket broadcasting
		# Use the main event loop if available, otherwise create a new one
		if self.on_event_callback:
			try:
				if self.event_loop and self.event_loop.is_running():
					# Schedule callback in the main FastAPI event loop (thread-safe)
					import asyncio
					future = asyncio.run_coroutine_threadsafe(self.on_event_callback(event_data), self.event_loop)
					# Log errors if broadcast fails
					def log_error(f):
						try:
							exc = f.exception()
							if exc:
								logger.error(f"WebSocket broadcast error: {exc}")
						except Exception:
							pass
					future.add_done_callback(log_error)
				else:
					# Fallback: create a new event loop in a separate thread
					logger.warning("Event loop not available, creating new loop for WebSocket broadcast")
					def run_async_callback():
						"""Run the async callback in a new event loop."""
						import asyncio
						new_loop = asyncio.new_event_loop()
						asyncio.set_event_loop(new_loop)
						try:
							new_loop.run_until_complete(self.on_event_callback(event_data))
						except Exception as e:
							logger.error(f"Error in async callback: {e}")
						finally:
							new_loop.close()
					
					# Run callback in a separate thread to avoid blocking
					callback_thread = threading.Thread(target=run_async_callback, daemon=True)
					callback_thread.start()
			except Exception as e:
				logger.error(f"Error scheduling WebSocket broadcast: {e}", exc_info=True)

	def _handle_directory_event(self, event: FileSystemEvent, event_type: str, watched_folder: str):
		"""Handle directory-level events (created, deleted, moved/renamed)."""
		dir_path = getattr(event, "src_path", None)
		if not dir_path:
			return
		
		# Ignore system folders and temp directories
		if should_ignore(dir_path):
			logger.debug(f"[Ignored] Directory {os.path.basename(dir_path)} {event_type.lower()} - skipping event")
			return
		
		dir_name = os.path.basename(dir_path)
		
		# Skip hidden directories (starting with .)
		if dir_name.startswith("."):
			return
		
		# Check for duplicate events within debounce window
		event_type_lower = event_type.lower()
		event_key = (dir_path, event_type_lower, "directory")
		current_time = time.time()
		
		with self._lock:
			last_event_time = self._recent_events.get(event_key, 0.0)
			time_since_last = current_time - last_event_time
			
			# Only suppress if this is a true duplicate (same directory+action within 500ms)
			if last_event_time > 0.0 and time_since_last < self.DEBOUNCE_WINDOW:
				logger.debug(f"[Duplicate Suppressed] Directory {dir_name} {event_type_lower} - last identical event {time_since_last:.3f}s ago")
				return
			
			# Update last event time for this directory+action combination
			self._recent_events[event_key] = current_time
			
			# Clean up old entries
			cutoff_time = current_time - 2.0
			self._recent_events = {
				k: v for k, v in self._recent_events.items()
				if v > cutoff_time
			}
		
		parent_folder = os.path.basename(watched_folder.rstrip(os.sep)) if watched_folder else os.path.dirname(dir_path)
		timestamp = datetime.utcnow()
		
		# Log directory event
		logger.info(f"✓ [{parent_folder}] Directory {event_type_lower}: {dir_name}")
		
		# Create event data for directory
		event_data = {
			"event": event_type_lower,  # "created", "deleted", "moved"
			"filename": dir_name,
			"file_path": dir_path,  # Absolute path
			"parent_folder": parent_folder,
			"timestamp": timestamp.isoformat(),
			"hash": "",  # Directories don't have hashes
			"is_folder": True  # Flag to indicate this is a folder event
		}
		
		# Store in memory (thread-safe)
		event_store.add_event(event_data)
		
		# Save to database
		try:
			db = SessionLocal()
			try:
				db_event = FileEvent(
					file_name=dir_name,
					file_path=dir_path,
					event_type=event_type,
					timestamp=timestamp,
					status="ok"
				)
				db.add(db_event)
				db.commit()
				db.refresh(db_event)
				event_data["id"] = str(db_event.id)
			except Exception as e:
				logger.error(f"Error saving directory event to database: {e}")
				db.rollback()
				event_data["id"] = str(hash(f"{dir_path}{timestamp}"))
			finally:
				db.close()
		except Exception as e:
			logger.error(f"Database error: {e}")
			event_data["id"] = str(hash(f"{dir_path}{timestamp}"))
		
		# Call async callback for WebSocket broadcasting
		if self.on_event_callback:
			try:
				if self.event_loop and self.event_loop.is_running():
					import asyncio
					future = asyncio.run_coroutine_threadsafe(self.on_event_callback(event_data), self.event_loop)
					def log_error(f):
						try:
							exc = f.exception()
							if exc:
								logger.error(f"WebSocket broadcast error: {exc}")
						except Exception:
							pass
					future.add_done_callback(log_error)
				else:
					logger.warning("Event loop not available, creating new loop for WebSocket broadcast")
					def run_async_callback():
						import asyncio
						new_loop = asyncio.new_event_loop()
						asyncio.set_event_loop(new_loop)
						try:
							new_loop.run_until_complete(self.on_event_callback(event_data))
						except Exception as e:
							logger.error(f"Error in async callback: {e}")
						finally:
							new_loop.close()
					
					callback_thread = threading.Thread(target=run_async_callback, daemon=True)
					callback_thread.start()
			except Exception as e:
				logger.error(f"Error scheduling WebSocket broadcast: {e}", exc_info=True)

	def on_created(self, event: FileSystemEvent):
		"""Handle file or directory creation."""
		if event.is_directory:
			self._handle_directory_event(event, "created", self.watched_folder)
		else:
			self._handle_event(event, "created", self.watched_folder)

	def on_modified(self, event: FileSystemEvent):
		"""Handle file modification (directories don't have modified events)."""
		if not event.is_directory:
			self._handle_event(event, "modified", self.watched_folder)

	def on_deleted(self, event: FileSystemEvent):
		"""Handle file or directory deletion."""
		if event.is_directory:
			self._handle_directory_event(event, "deleted", self.watched_folder)
		else:
			self._handle_event(event, "deleted", self.watched_folder)
	
	def on_moved(self, event: FileSystemEvent):
		"""Handle file or directory move/rename events."""
		# Watchdog's on_moved is called for both source and destination
		# We only want to track the destination (new location) for created events
		# and the source (old location) for deleted events
		# However, for simplicity, we'll track it as a "moved" event for directories
		if event.is_directory:
			# For directories, treat move as "renamed" or "moved"
			# Check if it's a rename (same parent) or move (different parent)
			src_path = getattr(event, "src_path", None)
			dest_path = getattr(event, "dest_path", None)
			
			if src_path and dest_path:
				src_parent = os.path.dirname(src_path)
				dest_parent = os.path.dirname(dest_path)
				
				# If same parent, it's a rename; otherwise it's a move
				# For now, we'll treat both as "moved" and log the new path
				# Create a synthetic event for the new location
				class MovedEvent:
					def __init__(self, path):
						self.src_path = path
						self.is_directory = True
				
				moved_event = MovedEvent(dest_path)
				self._handle_directory_event(moved_event, "moved", self.watched_folder)
		else:
			# For files, we could handle move similarly, but for now skip
			# File moves are typically handled as delete + create
			pass


class FileWatcher:
	def __init__(self, watch_path: str, on_event_callback: Optional[Callable] = None, event_loop=None):
		self.watch_path = Path(watch_path)
		self.observer = Observer()
		self.event_handler = FileChangeHandler(on_event_callback, event_loop, str(self.watch_path))
		self.is_running = False

	def start(self):
		"""Start watching the directory."""
		if not self.watch_path.exists():
			logger.warning(f"Watch path does not exist: {self.watch_path}. Skipping this folder.")
			return False

		try:
			self.observer.schedule(self.event_handler, str(self.watch_path), recursive=True)
			self.observer.start()
			self.is_running = True
			logger.info(f"✓ File watcher started monitoring: {self.watch_path}")
			return True
		except Exception as e:
			logger.error(f"Error starting watcher for {self.watch_path}: {e}")
			return False

	def stop(self):
		"""Stop watching the directory."""
		if self.is_running:
			self.observer.stop()
			self.observer.join()
			self.is_running = False
			logger.info(f"File watcher stopped for: {self.watch_path}")

	def update_watch_path(self, new_path: str):
		"""Update the watch path."""
		if self.is_running:
			self.stop()
		self.watch_path = Path(new_path)
		self.event_handler.watched_folder = str(self.watch_path)
		self.start()


class MultiFileWatcher:
	"""Manages multiple file watchers for different directories."""
	
	def __init__(self, watch_paths: list[str], on_event_callback: Optional[Callable] = None, event_loop=None):
		self.watch_paths = watch_paths
		self.on_event_callback = on_event_callback
		self.event_loop = event_loop
		self.watchers: list[FileWatcher] = []
	
	def start_all(self):
		"""Start watching all specified directories."""
		active_count = 0
		logger.info(f"Starting multi-folder monitoring for {len(self.watch_paths)} folder(s)...")
		
		for watch_path in self.watch_paths:
			path_obj = Path(watch_path)
			if not path_obj.exists():
				logger.warning(f"⚠ Skipping non-existent folder: {watch_path}")
				continue
			
			if not path_obj.is_dir():
				logger.warning(f"⚠ Skipping non-directory path: {watch_path}")
				continue
			
			watcher = FileWatcher(watch_path, self.on_event_callback, self.event_loop)
			if watcher.start():
				self.watchers.append(watcher)
				active_count += 1
		
		logger.info(f"✓ Started monitoring {active_count} out of {len(self.watch_paths)} folder(s)")
		return active_count
	
	def stop_all(self):
		"""Stop all watchers."""
		for watcher in self.watchers:
			watcher.stop()
		self.watchers.clear()
		logger.info("All file watchers stopped")

