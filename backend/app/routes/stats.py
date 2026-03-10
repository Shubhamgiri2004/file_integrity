from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.models import FileEvent
from pydantic import BaseModel

router = APIRouter(prefix="/api/stats", tags=["stats"])


class StatsResponse(BaseModel):
	total_monitored: int
	total_events: int
	added_count: int
	modified_count: int
	deleted_count: int
	alerts_count: int
	added_today: int
	modified_today: int
	deleted_today: int


@router.get("", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
	"""Get file integrity statistics."""
	# Total counts
	total_events = db.query(FileEvent).count()
	added_count = db.query(FileEvent).filter(FileEvent.event_type == "Added").count()
	modified_count = db.query(FileEvent).filter(FileEvent.event_type == "Modified").count()
	deleted_count = db.query(FileEvent).filter(FileEvent.event_type == "Deleted").count()
	alerts_count = db.query(FileEvent).filter(FileEvent.status == "alert").count()

	# Today's counts
	today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
	added_today = db.query(FileEvent).filter(
		FileEvent.event_type == "Added",
		FileEvent.timestamp >= today_start
	).count()
	modified_today = db.query(FileEvent).filter(
		FileEvent.event_type == "Modified",
		FileEvent.timestamp >= today_start
	).count()
	deleted_today = db.query(FileEvent).filter(
		FileEvent.event_type == "Deleted",
		FileEvent.timestamp >= today_start
	).count()

	# Get unique files monitored (this is a simple approximation)
	total_monitored = db.query(func.count(func.distinct(FileEvent.file_path))).scalar() or 0

	return StatsResponse(
		total_monitored=total_monitored,
		total_events=total_events,
		added_count=added_count,
		modified_count=modified_count,
		deleted_count=deleted_count,
		alerts_count=alerts_count,
		added_today=added_today,
		modified_today=modified_today,
		deleted_today=deleted_today
	)



