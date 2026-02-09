# Transfer Checklist: Windows → Arch Linux

Complete checklist for moving the Jeopardy game to your Arch Linux laptop.

---

## On Windows Machine (Before Transfer)

### 1. Export Database
```bash
cd /mnt/c/Users/patri/Documents/jeopardyv2_research/Jeopardy-Web/Main_Code/jeopardy_v2
./export_database.sh
```
This creates `jeopardy_database_dump.sql` (~size will vary based on data)

### 2. Verify All Files Are Present

**Critical Backend Files:**
- [ ] `manage.py`
- [ ] `requirements.txt` ✓ (newly created)
- [ ] `.env` file (contains DB password and secret key)
- [ ] `jeopardy_database_dump.sql` (created by export script)

**Backend Apps:**
- [ ] `backend/` folder (settings.py, urls.py, asgi.py, wsgi.py)
- [ ] `api/` folder (views.py, serializers.py, urls.py)
- [ ] `games/` folder (models.py, consumers.py, engine.py, routing.py)
- [ ] `users/` folder (models.py)

**Frontend Files:**
- [ ] `frontend/src/` folder (all React components, services, types)
- [ ] `frontend/public/` folder (IMPORTANT: contains dd_pic.jpg, dd.mp3, fonts/)
- [ ] `frontend/package.json`
- [ ] `frontend/package-lock.json`
- [ ] `frontend/vite.config.ts`
- [ ] `frontend/index.html`
- [ ] `frontend/tsconfig.json`

**Documentation:**
- [ ] `claude.md`
- [ ] `STARTUP_GUIDE.md`
- [ ] `ARCH_LINUX_SETUP.md` ✓ (newly created)
- [ ] `NETWORK_SETUP.md`

**Helper Scripts:**
- [ ] `export_database.sh` ✓ (newly created)
- [ ] `import_database.sh` ✓ (newly created)

---

## Transfer Methods

### Option 1: USB Drive (Easiest)
1. Copy entire `jeopardy_v2` folder to USB drive
2. On Arch laptop: `cp -r /media/usb/jeopardy_v2 ~/jeopardy_game/`
3. Verify: `ls -la ~/jeopardy_game/jeopardy_v2/`

### Option 2: SCP/RSYNC Over Network
```bash
# On Windows WSL, run:
rsync -avz --progress \
  /mnt/c/Users/patri/Documents/jeopardyv2_research/Jeopardy-Web/Main_Code/jeopardy_v2/ \
  your-username@ARCH-LAPTOP-IP:~/jeopardy_game/

# Replace ARCH-LAPTOP-IP with your Arch laptop's IP (run: ip addr show)
```

### Option 3: Git Repository
```bash
# On Windows:
cd /mnt/c/Users/patri/Documents/jeopardyv2_research/Jeopardy-Web/Main_Code/jeopardy_v2
git init
git add .
git commit -m "Initial commit"
git push origin main

# On Arch:
git clone <your-repo-url>
```

---

## On Arch Linux Machine (After Transfer)

### 1. Install System Dependencies
```bash
sudo pacman -Syu
sudo pacman -S python python-pip python-virtualenv postgresql redis nodejs npm git
```

### 2. Set Up PostgreSQL
```bash
# Initialize PostgreSQL (first time only)
sudo -u postgres initdb -D /var/lib/postgres/data

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE jeopardy_v2;
CREATE USER jeopardy_user WITH PASSWORD 'jeopardy_user';
GRANT ALL PRIVILEGES ON DATABASE jeopardy_v2 TO jeopardy_user;
ALTER USER jeopardy_user CREATEDB;
\q
EOF
```

### 3. Set Up Redis
```bash
sudo systemctl start redis
sudo systemctl enable redis
redis-cli ping  # Should return: PONG
```

### 4. Import Database
```bash
cd ~/jeopardy_game/jeopardy_v2
./import_database.sh
```

### 5. Set Up Python Environment
```bash
cd ~/jeopardy_game/jeopardy_v2
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
```

### 6. Set Up Frontend
```bash
cd ~/jeopardy_game/jeopardy_v2/frontend
npm install
```

### 7. Get Your Arch Laptop's IP
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1
# Example output: 192.168.1.25
```

### 8. Update Configuration Files

**File: `frontend/src/services/api.ts`**
```typescript
// Change this line:
const API_BASE_URL = 'http://192.168.1.16:8000/api';
// To your Arch laptop IP:
const API_BASE_URL = 'http://YOUR-ARCH-IP:8000/api';
```

**File: `frontend/src/services/websocket.ts`**
```typescript
// Change this line:
const wsUrl = `ws://192.168.1.16:8000/ws/game/${this.gameId}/`;
// To your Arch laptop IP:
const wsUrl = `ws://YOUR-ARCH-IP:8000/ws/game/${this.gameId}/`;
```

**File: `backend/settings.py`**
```python
# Update ALLOWED_HOSTS:
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', 'YOUR-ARCH-IP']

# Update CORS_ALLOWED_ORIGINS:
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://YOUR-ARCH-IP:5173',
]
```

### 9. Start the Servers

**Terminal 1 - Backend:**
```bash
cd ~/jeopardy_game/jeopardy_v2
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 - Frontend:**
```bash
cd ~/jeopardy_game/jeopardy_v2/frontend
npm run dev
```

### 10. Test Access

**From Arch Laptop:**
- [ ] Open browser: `http://localhost:5173`
- [ ] Should see game lobby

**From Another Device (same Wi-Fi):**
- [ ] Open browser: `http://YOUR-ARCH-IP:5173`
- [ ] Should see game lobby
- [ ] Create game and join as player
- [ ] Test buzzer functionality

---

## Verification Checklist

### Backend Verification
- [ ] Django server starts without errors
- [ ] Can access Django admin: `http://localhost:8000/admin`
- [ ] API endpoints respond: `http://localhost:8000/api/episodes/`
- [ ] WebSocket connects (check browser console logs)

### Frontend Verification
- [ ] Vite dev server starts
- [ ] Can access lobby: `http://localhost:5173`
- [ ] Can see episode list in lobby
- [ ] Can create a game
- [ ] Can join as host
- [ ] Can join as player
- [ ] Board displays correctly
- [ ] Categories load from API (not mock data)

### Database Verification
```bash
psql -U jeopardy_user -d jeopardy_v2 -h localhost << EOF
-- Check if episodes exist
SELECT COUNT(*) FROM games_episode;
-- Should return 7524 or similar large number

-- Check if categories exist
SELECT COUNT(*) FROM games_category;

-- Check if clues exist
SELECT COUNT(*) FROM games_clue;
\q
EOF
```

### Game Flow Verification
- [ ] Create game → Works
- [ ] Join as host → Works
- [ ] Join as player → Works
- [ ] Click clue → Clue modal appears
- [ ] Host clicks "Finished Reading" → Buzzer unlocks (red border)
- [ ] Player buzzes → Buzzer queue appears on host
- [ ] Host judges answer → Score updates on all views
- [ ] Click "Next Clue" → Returns to board
- [ ] Daily Double appears with "DD" text → Works
- [ ] Daily Double animation plays → dd_pic.jpg and dd.mp3 work

---

## Common Issues and Fixes

### "No module named 'django'"
```bash
source venv/bin/activate  # Forgot to activate virtual environment
pip install -r requirements.txt
```

### "Connection refused" when accessing from other devices
```bash
# Make sure servers are running with 0.0.0.0 binding
python manage.py runserver 0.0.0.0:8000  # Not just 'runserver'

# Check firewall
sudo ufw status
sudo ufw allow 8000/tcp
sudo ufw allow 5173/tcp
```

### "No episodes found" in game lobby
```bash
# Database import didn't work or was skipped
cd ~/jeopardy_game/jeopardy_v2
./import_database.sh
```

### Frontend shows "Failed to load game data"
- Check backend is running: `curl http://localhost:8000/api/episodes/`
- Check CORS settings in `backend/settings.py`
- Check browser console for errors (F12)

### Daily Double image/sound not loading
```bash
# Make sure files exist
ls -lh frontend/public/dd_pic.jpg
ls -lh frontend/public/dd.mp3

# Files should be ~69K and ~56K respectively
```

---

## File Sizes Reference

To verify transfer completeness:
- Database dump: ~10MB - 500MB (depends on episode count)
- `dd_pic.jpg`: ~69K
- `dd.mp3`: ~56K
- `node_modules/`: ~200MB (regenerated by npm install)
- `venv/`: ~100MB (regenerated by pip install)

---

## Quick Start Command (After Setup)

Save this for future use:

```bash
# Start backend
cd ~/jeopardy_game/jeopardy_v2 && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000

# In another terminal, start frontend
cd ~/jeopardy_game/jeopardy_v2/frontend && npm run dev
```

Or create an alias in `~/.bashrc`:
```bash
alias jeopardy-start='cd ~/jeopardy_game/jeopardy_v2 && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000 &; cd frontend && npm run dev'
```

---

## Security Notes

Since you're running on local network only:
- No need for HTTPS/SSL certificates
- Keep DEBUG=True in settings.py for easier troubleshooting
- Firewall should only allow local network access (not internet)
- Default passwords (jeopardy_user) are fine for local dev

---

## Need Help?

Check these files:
- Full setup guide: `ARCH_LINUX_SETUP.md`
- Project documentation: `claude.md`
- Startup guide: `STARTUP_GUIDE.md`
