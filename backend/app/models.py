from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class FileEvent(Base):
	__tablename__ = "file_events"

	id = Column(Integer, primary_key=True, index=True)
	file_name = Column(String, index=True)
	file_path = Column(String)
	event_type = Column(String)  # "Added", "Modified", "Deleted"
	timestamp = Column(DateTime, default=datetime.utcnow, index=True)
	status = Column(String, default="ok")  # "ok" or "alert"



