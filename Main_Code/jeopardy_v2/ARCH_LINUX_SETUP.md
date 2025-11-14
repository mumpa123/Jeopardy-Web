# Jeopardy Game - Arch Linux Setup Guide

Complete guide to set up and run the Jeopardy game on your Arch Linux laptop.

---

## Step 1: Install Required Dependencies

```bash
# Update system
sudo pacman -Syu

# Install Python and development tools
sudo pacman -S python python-pip python-virtualenv

# Install PostgreSQL
sudo pacman -S postgresql

# Install Redis
sudo pacman -S redis

# Install Node.js and npm
sudo pacman -S nodejs npm

# Install Git (if not already installed)
sudo pacman -S git
```

---

## Step 2: Transfer Project Files

### Option A: Using Git (Recommended)
If you have the project in a Git repository:
```bash
git clone <your-repo-url>
cd jeopardy_v2
```

### Option B: Using SCP/RSYNC
From your Windows machine, copy to Arch laptop:

```bash
# On your Arch laptop, create directory
mkdir -p ~/jeopardy_game
cd ~/jeopardy_game

# From Windows WSL, rsync to Arch laptop
rsync -avz --progress \
  /mnt/c/Users/patri/Documents/jeopardyv2_research/Jeopardy-Web/Main_Code/jeopardy_v2/ \
  user@arch-laptop-ip:~/jeopardy_game/

# Or use SCP
scp -r /mnt/c/Users/patri/Documents/jeopardyv2_research/Jeopardy-Web/Main_Code/jeopardy_v2 \
  user@arch-laptop-ip:~/jeopardy_game/
```

### Option C: USB Drive
1. Copy the entire `jeopardy_v2` folder to a USB drive from Windows
2. Mount USB on Arch laptop and copy files
3. Make sure all files are copied, including hidden files (`.env`, etc.)

---

## Step 3: Set Up PostgreSQL Database

```bash
# Initialize PostgreSQL (first time only)
sudo -u postgres initdb -D /var/lib/postgres/data

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Auto-start on boot

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE jeopardy_v2;
CREATE USER jeopardy_user WITH PASSWORD 'jeopardy_user';
GRANT ALL PRIVILEGES ON DATABASE jeopardy_v2 TO jeopardy_user;
ALTER USER jeopardy_user CREATEDB;
\q
EOF

# Test connection
psql -U jeopardy_user -d jeopardy_v2 -h localhost -W
# Enter password: jeopardy_user
# Should connect successfully, type \q to exit
```

---

## Step 4: Set Up Redis

```bash
# Start Redis service
sudo systemctl start redis
sudo systemctl enable redis  # Auto-start on boot

# Test Redis
redis-cli ping
# Should return: PONG
```

---

## Step 5: Set Up Python Backend

```bash
cd ~/jeopardy_game/jeopardy_v2

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# If requirements.txt doesn't exist, install manually:
pip install django djangorestframework django-cors-headers \
  channels channels-redis daphne psycopg2-binary redis python-decouple
```

---

## Step 6: Configure Environment Variables

Create/edit the `.env` file:

```bash
cd ~/jeopardy_game/jeopardy_v2
nano .env
```

Add these contents:
```env
DB_PASSWORD=jeopardy_user
SECRET_KEY=#$8hdi13=umt+gycl69v*67!u=n@oy#-u2i0ko)!rgt)qv*2^d
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
```

---

## Step 7: Run Database Migrations

```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Run migrations
python manage.py migrate

# Create superuser (optional, for Django admin)
python manage.py createsuperuser
```

---

## Step 8: Set Up Frontend

```bash
cd ~/jeopardy_game/jeopardy_v2/frontend

# Install Node dependencies
npm install

# Update API URLs for local development
# Edit frontend/src/services/api.ts and frontend/src/services/websocket.ts
# Change IP addresses to your Arch laptop's local IP
```

**Get your Arch laptop's IP:**
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Update these files to use your laptop's IP (e.g., `192.168.1.20`):
- `frontend/src/services/api.ts` → Change `API_BASE_URL` to `http://192.168.1.20:8000/api`
- `frontend/src/services/websocket.ts` → Change websocket URL to `ws://192.168.1.20:8000`
- `backend/settings.py` → Add your laptop IP to `ALLOWED_HOSTS`
- `backend/settings.py` → Add `http://192.168.1.20:5173` to `CORS_ALLOWED_ORIGINS`

---

## Step 9: Configure Network Access

Update Django settings for network access:

```bash
nano ~/jeopardy_game/jeopardy_v2/backend/settings.py
```

Find and update:
```python
# Replace 192.168.1.16 with your Arch laptop's IP
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '192.168.1.20']

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.1.20:5173',  # Your Arch laptop IP
]
```

---

## Step 10: Start the Servers

### Terminal 1 - Backend (Django)
```bash
cd ~/jeopardy_game/jeopardy_v2
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

### Terminal 2 - Frontend (Vite)
```bash
cd ~/jeopardy_game/jeopardy_v2/frontend
npm run dev
```

The frontend should show:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.20:5173/
```

---

## Step 11: Access the Game

### From Arch Laptop:
- `http://localhost:5173`
- `http://192.168.1.20:5173`

### From Other Devices (same Wi-Fi):
- `http://192.168.1.20:5173`

---

## Firewall Configuration (if needed)

If you have a firewall enabled:

```bash
# Using ufw
sudo ufw allow 8000/tcp
sudo ufw allow 5173/tcp

# Using iptables
sudo iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5173 -j ACCEPT
```

---

## Troubleshooting

### PostgreSQL Connection Error
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo journalctl -u postgresql -n 50

# Try connecting manually
psql -U jeopardy_user -d jeopardy_v2 -h localhost
```

### Redis Connection Error
```bash
# Check Redis is running
sudo systemctl status redis

# Test Redis
redis-cli ping
```

### Port Already in Use
```bash
# Check what's using port 8000
sudo lsof -i :8000

# Check what's using port 5173
sudo lsof -i :5173

# Kill process if needed
sudo kill <PID>
```

### Database Has No Episodes
If the database is empty, you need to import episode data. Check if there's a database dump or fixture file to load.

---

## Quick Start (After Initial Setup)

Once everything is set up, you can start the game with:

```bash
# Terminal 1
cd ~/jeopardy_game/jeopardy_v2
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000

# Terminal 2
cd ~/jeopardy_game/jeopardy_v2/frontend
npm run dev
```

Access at: `http://192.168.1.20:5173` (replace with your actual IP)

---

## Files to Copy

Make sure these critical files are copied:
- **Backend:**
  - All `.py` files in `api/`, `backend/`, `games/`, `users/`
  - `manage.py`
  - `requirements.txt` (if it exists)
  - `.env` file (create it if missing)
  - Database dump (if you have episode data)

- **Frontend:**
  - All files in `frontend/src/`
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `frontend/vite.config.ts`
  - `frontend/index.html`
  - `frontend/public/` folder (contains dd_pic.jpg, dd.mp3, fonts)

- **Documentation:**
  - `claude.md`
  - `STARTUP_GUIDE.md`

---

## Notes

1. **No WSL2 networking issues** - Native Linux is simpler!
2. **Better performance** - Running natively on Linux is faster than WSL2
3. **Episode data** - Make sure to copy the PostgreSQL database or have a way to import the 7,524 episodes
4. **Daily Double assets** - Ensure `dd_pic.jpg` and `dd.mp3` are in `frontend/public/`

---

## Getting Episode Data

If the database is empty after setup, you have options:

### Option 1: PostgreSQL Dump from Windows
On Windows WSL:
```bash
pg_dump -U jeopardy_user -h localhost jeopardy_v2 > jeopardy_dump.sql
```

On Arch Linux:
```bash
psql -U jeopardy_user -d jeopardy_v2 -h localhost < jeopardy_dump.sql
```

### Option 2: Django Fixtures
If you have Django fixture files, load them:
```bash
python manage.py loaddata episodes.json
```

### Option 3: Web Scraper
If you have the `jeopardy_web_scraper.py` script, run it to populate data.
