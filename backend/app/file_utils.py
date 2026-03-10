"""
Utility functions for file operations including hashing.
"""
import hashlib
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def calculate_file_hash(file_path: str) -> str:
	"""
	Calculate SHA-256 hash of a file.
	
	Args:
		file_path: Path to the file
	
	Returns:
		Hex digest of the file hash, or empty string if file doesn't exist or can't be read
	"""
	try:
		path = Path(file_path)
		if not path.exists() or not path.is_file():
			return ""
		
		sha256_hash = hashlib.sha256()
		with open(path, "rb") as f:
			# Read file in chunks to handle large files efficiently
			for byte_block in iter(lambda: f.read(4096), b""):
				sha256_hash.update(byte_block)
		
		return sha256_hash.hexdigest()
	except PermissionError:
		logger.warning(f"Permission denied reading file: {file_path}")
		return ""
	except Exception as e:
		logger.error(f"Error calculating hash for {file_path}: {e}")
		return ""



