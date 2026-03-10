#!/bin/bash
echo "Starting File Integrity Monitoring Backend..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000



