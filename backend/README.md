# File Integrity Monitoring Backend

Python backend for real-time file integrity monitoring using FastAPI, WebSocket, and SQLite.

## Features

- 🔍 **Real-time file monitoring** using `watchdog` library
- 📡 **WebSocket support** for live event broadcasting
- 🗄️ **SQLite database** for event logging
- 📊 **REST API** for logs, stats, and settings
- 🔄 **CORS enabled** for React frontend integration

## Tech Stack

- **FastAPI** - Modern Python web framework
- **Watchdog** - File system monitoring
- **SQLAlchemy** - ORM for database operations
- **WebSocket** - Real-time bidirectional communication
- **SQLite** - Lightweight database

## Setup

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**

   **Windows:**
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

   **Linux/Mac:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create the monitored folder (optional):**
   ```bash
   mkdir monitored
   ```
   The backend will create this folder automatically if it doesn't exist.

## Running the Server

### Option 1: Using the run script

**Windows (PowerShell):**
```powershell
.\run.bat
```
*(Use `.\` so PowerShell runs the script from the current directory.)*

**Linux/Mac:**
```bash
chmod +x run.sh
./run.sh
```

### Option 2: Using uvicorn directly

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Option 3: Using Python directly

```bash
python -m app.main
```

The server will start on `http://localhost:8000`

## API Endpoints

### WebSocket

- **Endpoint:** `ws://localhost:8000/ws`
- **Description:** Real-time file event updates
- **Message Format:**
  ```json
  {
    "id": "1",
    "file": "example.txt",
    "filePath": "/path/to/example.txt",
    "event": "Modified",
    "action": "modified",
    "timestamp": "2025-11-05T14:21:32",
    "status": "ok"
  }
  ```

### REST API

#### Logs

- **GET** `/api/logs` - Get paginated file events
  - Query params: `skip` (default: 0), `limit` (default: 20), `event_type` (optional)
  - Example: `GET /api/logs?skip=0&limit=20&event_type=Modified`

- **DELETE** `/api/logs/clear` - Clear all logs

#### Stats

- **GET** `/api/stats` - Get file integrity statistics
  - Returns: total_monitored, total_events, added_count, modified_count, deleted_count, alerts_count, added_today, modified_today, deleted_today

#### Settings

- **GET** `/api/settings` - Get current monitoring settings
- **POST** `/api/settings` - Update monitoring settings
  - Body: `{"monitored_path": "/path/to/folder"}`

#### Watcher

- **POST** `/api/watcher/update-path` - Update monitored path and restart watcher
  - Body: `"new_path_string"`

## API Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Database

The SQLite database (`integrity.db`) is automatically created on first run. It contains:

- **file_events** table with columns:
  - `id` - Primary key
  - `file_name` - Name of the file
  - `file_path` - Full path to the file
  - `event_type` - "Added", "Modified", or "Deleted"
  - `timestamp` - Event timestamp
  - `status` - "ok" or "alert"

## Configuration

### Environment Variables (Optional)

Create a `.env` file in the `backend/` directory:

```env
MONITORED_PATH=./monitored
DATABASE_URL=sqlite:///./integrity.db
HOST=0.0.0.0
PORT=8000
```

### Default Settings

- **Monitored path:** `./monitored` (relative to backend directory)
- **Database:** `integrity.db` (SQLite)
- **Port:** 8000
- **CORS origins:** `http://localhost:5173`, `http://localhost:3000`

## Frontend Integration

The backend is configured to work with the React frontend:

1. **WebSocket connection:**
   ```javascript
   const ws = new WebSocket('ws://localhost:8000/ws');
   ws.onmessage = (event) => {
     const data = JSON.parse(event.data);
     console.log('File event:', data);
   };
   ```

2. **REST API calls:**
   ```javascript
   // Get stats
   fetch('http://localhost:8000/api/stats')
     .then(res => res.json())
     .then(data => console.log(data));
   ```

## Testing

### Test File Monitoring

1. Start the backend server
2. Create or modify files in the `monitored/` folder
3. Watch the terminal for log messages
4. Check the WebSocket connection in your frontend
5. Query the REST API to see logged events

### Example Test

```bash
# Create a test file
echo "Hello World" > monitored/test.txt

# Modify the file
echo "Updated content" >> monitored/test.txt

# Delete the file
rm monitored/test.txt
```

## Logging

The backend logs all file events to the console:

```
[INFO] Initializing database...
[INFO] Starting file watcher for: C:\path\to\monitored
[INFO] File watcher started monitoring: C:\path\to\monitored
[INFO] FastAPI application started
[INFO] WebSocket endpoint: ws://localhost:8000/ws
[INFO] File added: test.txt at 2025-11-05T14:21:32
[INFO] WebSocket event sent to 1 clients
```

## Troubleshooting

### Port Already in Use

If port 8000 is already in use, change it in the run script or command:
```bash
uvicorn app.main:app --reload --port 8001
```

### Database Issues

If you encounter database errors, delete `integrity.db` and restart the server to recreate it.

### File Watcher Not Working

- Ensure the monitored path exists or is accessible
- Check file permissions
- Verify the path is correct in settings

## Development

### Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── database.py          # Database configuration
│   ├── models.py            # SQLAlchemy models
│   ├── file_watcher.py      # File monitoring logic
│   ├── websocket_manager.py # WebSocket connection management
│   ├── routes/
│   │   ├── logs.py          # Log endpoints
│   │   ├── stats.py         # Statistics endpoints
│   │   └── settings.py      # Settings endpoints
│   └── utils/               # Utility functions
├── requirements.txt         # Python dependencies
├── run.bat                  # Windows run script
├── run.sh                   # Linux/Mac run script
└── README.md               # This file
```

## License

This project is part of the File Integrity Monitoring System.



