from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import FileEvent
from pydantic import BaseModel

router = APIRouter(prefix="/api/logs", tags=["logs"])


class FileEventResponse(BaseModel):
	id: int
	file_name: str
	file_path: str
	event_type: str
	timestamp: datetime
	status: str

	class Config:
		from_attributes = True


@router.get("", response_model=List[FileEventResponse])
def get_logs(
	skip: int = Query(0, ge=0),
	limit: int = Query(20, ge=1, le=100),
	event_type: Optional[str] = Query(None, description="Filter by event type: Added, Modified, Deleted"),
	db: Session = Depends(get_db)
):
	"""Get paginated file event logs."""
	query = db.query(FileEvent)

	if event_type:
		query = query.filter(FileEvent.event_type == event_type)

	events = query.order_by(desc(FileEvent.timestamp)).offset(skip).limit(limit).all()
	return events


@router.delete("/clear")
def clear_logs(db: Session = Depends(get_db)):
	"""Clear all file event logs."""
	try:
		db.query(FileEvent).delete()
		db.commit()
		return {"message": "All logs cleared successfully"}
	except Exception as e:
		db.rollback()
		raise e



