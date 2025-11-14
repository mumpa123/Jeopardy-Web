# Jeopardy Game Server - Startup Guide

This guide provides step-by-step instructions to start the Django backend and React frontend servers.

---

## Prerequisites

Ensure the following are installed and running:

- **Python 3.8+** with virtual environment activated
- **Node.js 16+** and npm
- **PostgreSQL 12+** (running on port 5432)
- **Redis 6+** (running on port 6379)

---

## Quick Start (Both Servers)

### Terminal 1 - Backend Server
```bash
# From project root directory
source venv/bin/activate
python manage.py runserver
```

### Terminal 2 - Frontend Server
```bash
# From project root directory
cd frontend
npm run dev
```

**Access Points:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api
- Django Admin: http://localhost:8000/admin
- WebSocket: ws://localhost:8000/ws/game/{game_id}/

---

## Detailed Setup Instructions

### 1. Backend Setup

#### Step 1.1: Verify PostgreSQL Database

Ensure the database and user exist:

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql shell:
CREATE DATABASE jeopardy_v2;
CREATE USER jeopardy_user WITH PASSWORD 'jeopardy_user';
GRANT ALL PRIVILEGES ON DATABASE jeopardy_v2 TO jeopardy_user;
\q
```

#### Step 1.2: Verify Redis is Running

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start Redis:
redis-server
```

#### Step 1.3: Activate Virtual Environment

```bash
# From project root directory
source venv/bin/activate

# Verify activation (prompt should show (venv))
```

#### Step 1.4: Apply Database Migrations

```bash
# Run migrations to create database tables
python manage.py migrate

# Create a superuser for Django admin (optional)
python manage.py createsuperuser
```

#### Step 1.5: Start Django Development Server

```bash
# Starts on http://127.0.0.1:8000
python manage.py runserver
```

**Expected Output:**
```
Watching for file changes with StatReloader
Performing system checks...

System check identified no issues (0 silenced).
November 12, 2025 - 12:00:00
Django version 4.2, using settings 'backend.settings'
Starting ASGI/Daphne development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

---

### 2. Frontend Setup

#### Step 2.1: Install Dependencies (First Time Only)

```bash
cd frontend
npm install
```

#### Step 2.2: Start Vite Development Server

```bash
# From frontend directory
npm run dev
```

**Expected Output:**
```
  VITE v7.1.7  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## Verification Steps

### Backend Verification

1. **Check API Endpoints:**
   ```bash
   curl http://localhost:8000/api/episodes/
   ```
   Should return: `[]` (empty array if no episodes exist)

2. **Check Django Admin:**
   - Navigate to http://localhost:8000/admin
   - Login with superuser credentials

3. **Check WebSocket Connection:**
   - Use browser dev tools console:
   ```javascript
   const ws = new WebSocket('ws://localhost:8000/ws/game/test-game/');
   ws.onopen = () => console.log('Connected!');
   ```

### Frontend Verification

1. **Check Frontend Loads:**
   - Navigate to http://localhost:5173
   - Should see React application load without errors

2. **Check Console for Errors:**
   - Open browser DevTools (F12)
   - Look for any TypeScript or connection errors

---

## Troubleshooting

### Backend Issues

**Problem:** `django.db.utils.OperationalError: FATAL: database "jeopardy_v2" does not exist`
- **Solution:** Run Step 1.1 to create the database

**Problem:** `Error: Cannot connect to Redis at 127.0.0.1:6379`
- **Solution:** Start Redis server with `redis-server`

**Problem:** `django.core.exceptions.ImproperlyConfigured: Requested setting DB_PASSWORD`
- **Solution:** Ensure `.env` file exists in project root with `DB_PASSWORD=jeopardy_user`

### Frontend Issues

**Problem:** `npm: command not found`
- **Solution:** Install Node.js from https://nodejs.org

**Problem:** `Error: Failed to resolve entry for package`
- **Solution:** Delete `node_modules` and run `npm install` again

**Problem:** `ERR_CONNECTION_REFUSED to localhost:8000`
- **Solution:** Ensure backend server is running first

### General Issues

**Problem:** WebSocket connection fails
- **Solution:**
  1. Verify Redis is running (`redis-cli ping`)
  2. Check backend logs for channel layer errors
  3. Verify no firewall blocking port 8000

**Problem:** CORS errors in browser console
- **Solution:** Currently configured for localhost only. Check `backend/settings.py` CORS settings if needed.

---

## Development Workflow

1. Start Redis (if not already running)
2. Start PostgreSQL (if not already running)
3. Open Terminal 1: Start Django backend
4. Open Terminal 2: Start React frontend
5. Make code changes (servers auto-reload on file changes)

---

## Stopping the Servers

- **Backend:** Press `CTRL+C` in Terminal 1
- **Frontend:** Press `CTRL+C` in Terminal 2
- **Deactivate venv:** Run `deactivate` command

---

## Notes

- Django uses Daphne ASGI server for WebSocket support
- Frontend uses Vite with Hot Module Replacement (HMR)
- Both servers auto-reload on code changes
- Backend runs on port **8000**
- Frontend runs on port **5173** (Vite default)
- WebSocket URL pattern: `ws://localhost:8000/ws/game/{game_id}/`
