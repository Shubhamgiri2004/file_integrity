@echo off
echo Starting File Integrity Monitoring Backend...
if exist "venv\Scripts\activate.bat" (call venv\Scripts\activate.bat) else if exist "..\.venv\Scripts\activate.bat" (call ..\.venv\Scripts\activate.bat)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000



