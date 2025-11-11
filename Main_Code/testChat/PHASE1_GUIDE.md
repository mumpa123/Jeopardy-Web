# Phase 1: Foundation Setup - Beginner's Guide

## Understanding the Technologies

Before we start coding, let's understand what each tool does and why we need it:

### 1. **Django** - The Backend Framework
**What it is:** A Python framework that helps you build websites quickly. Think of it as a pre-built kitchen - you don't need to build the oven and fridge from scratch, they're already there.

**Why we use it:**
- Handles database operations automatically
- Manages user authentication
- Provides URL routing (connecting web addresses to functions)
- Has a built-in admin panel

**Real-world analogy:** If you were building a restaurant, Django is like renting a space that already has a kitchen, tables, and basic equipment. You just add your own recipes (code).

### 2. **PostgreSQL** - The Database
**What it is:** A database system that stores data permanently in organized tables (like Excel spreadsheets, but much more powerful).

**Why we use it instead of SQLite:**
- Handles multiple users at once better
- More reliable for production use
- Better performance with lots of data

**In the old app:** You used SQLite (the `db.sqlite3` file). It's like a filing cabinet. PostgreSQL is like a whole warehouse with forklifts and organization systems.

### 3. **Redis** - The In-Memory Data Store
**What it is:** Super-fast temporary storage that keeps data in RAM (memory) instead of on disk.

**Why we use it:**
- **Speed:** 1000x faster than reading from disk
- **Real-time features:** Perfect for WebSocket messages
- **Buzzer timing:** Can handle precise timing for buzzer presses

**Real-world analogy:** PostgreSQL is like your long-term storage (hard drive). Redis is like your sticky notes and whiteboard - quick access for things you need right now.

### 4. **Django Channels** - WebSocket Support
**What it is:** An extension to Django that adds WebSocket support (real-time bidirectional communication).

**Why we use it:**
- Real-time updates (when player buzzes, everyone sees it instantly)
- Replaces the basic WebSocket setup in your old app
- Integrates with Redis for message passing

**In the old app:** You used basic Django Channels. We're upgrading how we use it.

### 5. **Django REST Framework (DRF)** - API Builder
**What it is:** A toolkit for building Web APIs (ways for frontend to talk to backend).

**Why we use it:**
- Creates clean URLs for data access (like `/api/games/`, `/api/episodes/`)
- Automatically validates data
- Provides browsable API (you can test in your browser)

**Example:** Instead of mixing HTML templates with game logic, we separate them:
- Backend provides data via API: `/api/game/123/state/`
- Frontend displays it however it wants

---

## Step-by-Step Setup

### Prerequisites Check

First, let's verify you have Python installed:

```bash
python --version
```

**Expected output:** Something like `Python 3.11.x` or `Python 3.10.x`

**If not installed:** Download from [python.org](https://python.org) (version 3.10 or higher)

---

### Step 1: Create Project Directory

Let's create a fresh directory for the new version:

```bash
# Navigate to your projects folder
cd /mnt/c/Users/patri/Documents/jeopardyv2_research/Jeopardy-Web/Main_Code/

# Create new directory
mkdir jeopardy_v2
cd jeopardy_v2
```

**What this does:** Creates a new folder separate from your old `testChat` project, so we can start fresh without breaking the old version.

---

### Step 2: Set Up Python Virtual Environment

**What is a virtual environment?**
A virtual environment is an isolated Python installation for this project only. It's like having a separate toolbox for each project so tools don't conflict.

**Why we need it:**
- Different projects need different versions of libraries
- Keeps your system Python clean
- Makes it easy to share your project (we'll create a `requirements.txt` file)

```bash
# Create virtual environment named 'venv'
python -m venv venv

# Activate it (Windows)
source venv/bin/activate

# Your prompt should now show (venv) at the beginning
```

**Visual indicator:** After activating, your terminal prompt changes:
```
(venv) patri@computer:~/jeopardy_v2$
```

**To deactivate later:** Just type `deactivate`

---

### Step 3: Install Django and Required Packages

Now we'll install all the Python libraries we need:

```bash
# Upgrade pip (Python's package installer)
pip install --upgrade pip

# Install Django and other packages
pip install django==4.2
pip install djangorestframework==3.14.0
pip install channels==4.0.0
pip install channels-redis==4.1.0
pip install psycopg2-binary==2.9.9  # PostgreSQL adapter
pip install redis==5.0.0
pip install python-decouple==3.8   # For environment variables
```

**What each package does:**
- `django`: The main framework
- `djangorestframework`: API building tools
- `channels`: WebSocket support
- `channels-redis`: Connects Channels to Redis
- `psycopg2-binary`: Lets Django talk to PostgreSQL
- `redis`: Python client for Redis
- `python-decouple`: Manages configuration (passwords, API keys, etc.)

**Time estimate:** 2-3 minutes to install everything

---

### Step 4: Install PostgreSQL

**On Windows (WSL):**

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo service postgresql start

# Check if it's running
sudo service postgresql status
```

**Expected output:** Should say "online" or "running"

**What this does:**
- Installs PostgreSQL database server
- Starts it as a background service
- PostgreSQL will now be running and ready to accept connections

---

### Step 5: Create Database and User

Now we'll create a database specifically for our Jeopardy app:

```bash
# Switch to postgres user
sudo -u postgres psql

# You're now in PostgreSQL's command line (prompt changes to: postgres=#)
```

Run these commands inside PostgreSQL:

```sql
-- Create database
CREATE DATABASE jeopardy_v2;

-- Create user with password
CREATE USER jeopardy_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE jeopardy_v2 TO jeopardy_user;

-- Grant schema privileges (PostgreSQL 15+)
\c jeopardy_v2
GRANT ALL ON SCHEMA public TO jeopardy_user;

-- Exit PostgreSQL
\q
```

**What each command does:**
- `CREATE DATABASE`: Creates an empty database named `jeopardy_v2`
- `CREATE USER`: Creates a user account that can access the database
- `GRANT ALL PRIVILEGES`: Gives our user permission to read/write data
- `\c jeopardy_v2`: Connects to the new database
- `\q`: Quits PostgreSQL command line

**Security note:** Replace `'your_secure_password_here'` with a real password. Write it down - you'll need it later!

---

### Step 6: Install Redis

Redis installation:

```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo service redis-server start

# Test that Redis is working
redis-cli ping
```

**Expected output:** `PONG`

**What this does:**
- Installs Redis server
- Starts it as a background service
- Tests connection (ping/pong like a network test)

---

### Step 7: Create Django Project

Now the fun part - creating our project!

```bash
# Make sure you're in jeopardy_v2 directory with venv activated
# Create Django project named 'backend'
django-admin startproject backend .

# The dot (.) means "create it in current directory"
# Without the dot, it would create another nested folder
```

**What this creates:**
```
jeopardy_v2/
├── venv/              (virtual environment)
├── backend/           (project configuration)
│   ├── __init__.py
│   ├── settings.py    (main configuration file)
│   ├── urls.py        (URL routing)
│   ├── asgi.py        (async server config)
│   └── wsgi.py        (standard server config)
└── manage.py          (command-line utility)
```

**Think of it like:**
- `manage.py`: Your control panel for the project
- `backend/settings.py`: The project's brain - all configuration lives here
- `backend/urls.py`: The project's map - tells Django which URLs go where

---

### Step 8: Create Django Apps

Django projects are divided into "apps" - modular components. We'll create three:

```bash
# Create 'games' app (handles game logic, episodes, clues)
python manage.py startapp games

# Create 'users' app (handles players, authentication)
python manage.py startapp users

# Create 'api' app (handles REST API endpoints)
python manage.py startapp api
```

**What are Django apps?**
Think of apps like departments in a company:
- **games app**: The game department - handles episodes, clues, game state
- **users app**: The HR department - handles players, accounts, permissions
- **api app**: The communication department - provides clean ways for frontend to get data

**Directory structure now:**
```
jeopardy_v2/
├── backend/          (project settings)
├── games/            (game logic app)
│   ├── models.py     (database table definitions)
│   ├── views.py      (request handlers)
│   ├── admin.py      (admin panel config)
│   └── ...
├── users/            (user management app)
├── api/              (REST API app)
├── manage.py
└── venv/
```

---

### Step 9: Configure Settings

Now we need to tell Django about our database, Redis, and apps.

Open `backend/settings.py` and make these changes:

**9.1: Add installed apps**

Find the `INSTALLED_APPS` list and update it:

```python
INSTALLED_APPS = [
    'daphne',  # Add this FIRST (for WebSocket support)
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'channels',

    # Our apps
    'games',
    'users',
    'api',
]
```

**Why this order matters:**
- `daphne` must be first so it handles WebSocket connections
- Django's built-in apps provide core functionality
- Third-party apps add features
- Our apps use everything above them

**9.2: Configure database**

Find the `DATABASES` section and replace it:

```python
# OLD CODE (SQLite):
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }

# NEW CODE (PostgreSQL):
from decouple import config

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'jeopardy_v2',
        'USER': 'jeopardy_user',
        'PASSWORD': config('DB_PASSWORD'),  # We'll set this in a moment
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

**What this does:**
- Tells Django to use PostgreSQL instead of SQLite
- Provides connection details (database name, username, etc.)
- Uses `config()` to load password from environment variable (more secure)

**9.3: Add ASGI configuration**

Add this line near the bottom of settings.py:

```python
# Add after WSGI_APPLICATION line
ASGI_APPLICATION = 'backend.asgi.application'
```

**What this does:** Tells Django to use ASGI (Async Server Gateway Interface) which supports WebSockets.

**9.4: Configure Channel Layers (Redis)**

Add this at the end of settings.py:

```python
# Channel Layers Configuration
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
            "capacity": 1500,  # Max messages in queue
            "expiry": 10,      # Message expiry time (seconds)
        },
    },
}
```

**What this does:**
- Tells Django Channels to use Redis for message passing
- `hosts`: Where Redis is running (localhost, port 6379)
- `capacity`: How many messages can wait in queue
- `expiry`: Messages older than 10 seconds are discarded

**9.5: Configure REST Framework**

Add this at the end of settings.py:

```python
# Django REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',  # Nice HTML interface
    ],
}
```

**What this does:**
- Sets up pagination (split large lists into pages of 50 items)
- Enables JSON responses (standard API format)
- Enables browsable API (you can view API in browser)

---

### Step 10: Create Environment File

Create a file named `.env` in your project root (next to manage.py):

```bash
# Create .env file
touch .env
```

Edit `.env` and add:

```env
# Database
DB_PASSWORD=your_secure_password_here

# Django
SECRET_KEY=your-secret-key-here-generate-a-long-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

**What this file does:**
- Stores sensitive configuration (passwords, secret keys)
- Keeps secrets out of version control (don't commit this file!)
- Makes it easy to change settings between development and production

**Generate a secret key:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copy the output into your `.env` file for SECRET_KEY.

**Update settings.py to use it:**

At the top of settings.py, add:
```python
from decouple import config

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')
```

---

### Step 11: Update ASGI Configuration

Edit `backend/asgi.py` to support WebSockets:

```python
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Initialize Django ASGI application early
django_asgi_app = get_asgi_application()

# Import after Django setup
from games import routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            routing.websocket_urlpatterns
        )
    ),
})
```

**What this does:**
- `ProtocolTypeRouter`: Routes traffic based on protocol (HTTP vs WebSocket)
- `http`: Normal web requests go to Django
- `websocket`: WebSocket connections go to our custom routing
- `AuthMiddlewareStack`: Adds user authentication to WebSockets

---

### Step 12: Test the Setup

Let's make sure everything works so far:

```bash
# Run migrations (creates Django's built-in tables)
python manage.py migrate

# Create superuser account (for admin panel)
python manage.py createsuperuser
# Follow prompts: enter username, email (optional), password
```

**What `migrate` does:**
- Creates database tables for Django's built-in features (users, sessions, etc.)
- You'll see output like: "Applying contenttypes.0001_initial... OK"

**Start the development server:**

```bash
python manage.py runserver
```

**Expected output:**
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

**Test it:**
1. Open browser to http://127.0.0.1:8000/
2. You should see Django's welcome page (a rocket ship)
3. Go to http://127.0.0.1:8000/admin/
4. Log in with your superuser credentials
5. You should see Django's admin panel!

Press `Ctrl+C` to stop the server.

---

## Summary: What We've Accomplished

✅ **Installed all required software** (Django, PostgreSQL, Redis)
✅ **Created project structure** (3 Django apps)
✅ **Configured database** (PostgreSQL instead of SQLite)
✅ **Set up Redis** (for real-time messaging)
✅ **Configured WebSocket support** (ASGI + Channels)
✅ **Set up REST framework** (for API endpoints)
✅ **Secured configuration** (environment variables)
✅ **Tested basic setup** (server runs, admin panel works)

---

## Next Steps Preview

In the next part, we'll:
1. Create database models (Episode, Clue, Game, Player, etc.)
2. Write the CSV import script
3. Import your existing episode data
4. Create a basic WebSocket consumer

---

## Troubleshooting Common Issues

### "pg_config executable not found"
**Problem:** psycopg2 can't find PostgreSQL
**Solution:**
```bash
sudo apt install libpq-dev python3-dev
pip install psycopg2-binary
```

### "Redis connection refused"
**Problem:** Redis isn't running
**Solution:**
```bash
sudo service redis-server start
```

### "No module named 'decouple'"
**Problem:** Package not installed in virtual environment
**Solution:** Make sure venv is activated (you see `(venv)` in prompt), then:
```bash
pip install python-decouple
```

### "Port already in use"
**Problem:** Another process is using port 8000
**Solution:** Use a different port:
```bash
python manage.py runserver 8001
```

---

## Understanding the Architecture So Far

```
┌─────────────────────────────────────────┐
│   Browser (localhost:8000)              │
└────────────────┬────────────────────────┘
                 │
                 │ HTTP/WebSocket
                 │
┌────────────────▼────────────────────────┐
│   Django (backend/)                     │
│   ├─ settings.py (configuration)        │
│   ├─ asgi.py (routing)                  │
│   └─ urls.py (URL mapping)              │
└──────┬──────────────┬───────────────────┘
       │              │
       │              │
┌──────▼──────┐  ┌───▼──────────┐
│ PostgreSQL  │  │   Redis      │
│ (long-term  │  │   (real-time │
│  storage)   │  │   messages)  │
└─────────────┘  └──────────────┘
```

**Current state:**
- Django is the "traffic controller"
- PostgreSQL stores permanent data
- Redis handles temporary, real-time data
- Everything is connected and ready for us to build game logic!

---

## Questions to Check Your Understanding

1. **Why did we use PostgreSQL instead of SQLite?**
   <details>
   <summary>Answer</summary>
   PostgreSQL handles multiple users better and is more reliable for production. SQLite is like a filing cabinet (good for one person), PostgreSQL is like a warehouse (good for many people).
   </details>

2. **What does Redis do that PostgreSQL doesn't?**
   <details>
   <summary>Answer</summary>
   Redis stores data in RAM (super fast) and is perfect for temporary data like WebSocket messages and buzzer timing. PostgreSQL stores data on disk (permanent but slower).
   </details>

3. **What's the difference between a Django "project" and an "app"?**
   <details>
   <summary>Answer</summary>
   A project is the whole website. Apps are modular components. Our project (backend) contains three apps: games, users, and api.
   </details>

4. **Why did we create a virtual environment?**
   <details>
   <summary>Answer</summary>
   To isolate this project's dependencies from other Python projects and your system Python. Each project can have its own versions of libraries without conflicts.
   </details>

---

Ready to move on to creating the database models? Let me know if you need clarification on anything so far!
