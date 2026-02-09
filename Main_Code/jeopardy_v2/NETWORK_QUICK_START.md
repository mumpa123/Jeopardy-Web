# Network Quick Start Guide

This guide shows you how to automatically configure the Jeopardy app for any network.

## Problem

When you switch networks (WiFi, mobile hotspot, etc.), your laptop's IP address changes. Other devices need to know this IP to connect to your game server.

## Solution

Use the `update_ip.py` script to automatically detect and configure your current IP.

## Usage

### When You Switch Networks

Every time you switch to a new network, run:

```bash
cd /path/to/jeopardy_v2
python update_ip.py
```

This will:
1. Detect your laptop's current IP address
2. Update `frontend/.env` with the IP
3. Show you the access URLs

### Starting the Servers

#### Option 1: Use the startup script (recommended)

```bash
./start_servers.sh
```

This runs `update_ip.py` for you and guides you through starting the servers.

#### Option 2: Manual startup

**Terminal 1 - Backend:**
```bash
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev -- --host
```

> **Note:** The `-- --host` flag tells Vite to listen on all network interfaces, not just localhost.

### Accessing from Other Devices

After running `update_ip.py`, you'll see output like:

```
📡 Detected IP Address: 192.168.1.100

🌐 Access Points:
  Frontend: http://192.168.1.100:5173
  Backend:  http://192.168.1.100:8000
```

Use the Frontend URL on your phone, tablet, or other devices to access the game.

## Troubleshooting

### "Could not detect network IP address"

Make sure you're connected to a network (WiFi or ethernet).

### Can't connect from phone

1. Check that both devices are on the same network
2. Check firewall settings on your laptop
3. Make sure backend is running with `0.0.0.0:8000` (not just `localhost:8000`)
4. Restart the frontend dev server after running `update_ip.py`

### ALLOWED_HOSTS error

The Django backend has `CORS_ALLOW_ALL_ORIGINS = True` in DEBUG mode, so this shouldn't be an issue. If you see errors, verify `DEBUG = True` in `backend/settings.py`.

## For Localhost Development

If you're only developing on localhost (not accessing from other devices), you can skip running `update_ip.py`. The app will use `window.location.hostname` as a fallback.

## Architecture

- **update_ip.py** - Python script that detects IP and updates config files
- **frontend/.env** - Vite environment variables (auto-updated by script)
- **frontend/src/config.ts** - Frontend configuration (reads from .env)
- **backend/settings.py** - Django settings with CORS configuration
