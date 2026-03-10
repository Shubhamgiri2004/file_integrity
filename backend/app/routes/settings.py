from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter(prefix="/api/settings", tags=["settings"])

# Store settings in memory (can be extended to use database or config file)
# Default to watched_folder at project root (one level up from backend/)
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_settings = {
	"monitored_path": os.path.join(_project_root, "watched_folder")
}


class SettingsResponse(BaseModel):
	monitored_path: str


class SettingsUpdate(BaseModel):
	monitored_path: str


@router.get("", response_model=SettingsResponse)
def get_settings():
	"""Get current monitoring settings."""
	return SettingsResponse(monitored_path=_settings["monitored_path"])


@router.post("", response_model=SettingsResponse)
def update_settings(settings: SettingsUpdate):
	"""Update monitoring settings."""
	_settings["monitored_path"] = settings.monitored_path
	return SettingsResponse(monitored_path=_settings["monitored_path"])


def get_monitored_path() -> str:
	"""Get the current monitored path."""
	return _settings["monitored_path"]


def set_monitored_path(path: str):
	"""Set the monitored path."""
	_settings["monitored_path"] = path

