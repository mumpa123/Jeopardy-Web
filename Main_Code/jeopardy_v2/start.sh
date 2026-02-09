#!/bin/bash
# Jeopardy Game - Automatic Start Script
# Starts both backend and frontend servers automatically

set -e  # Exit on error

echo "=========================================="
echo "🎮 Jeopardy Game - Starting Servers"
echo "=========================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create a pids directory if it doesn't exist
mkdir -p .pids

# Run IP detection script
echo "🔍 Detecting network IP and updating configuration..."
python3 update_ip.py

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ IP detection failed. Exiting."
    exit 1
fi

echo ""

# Check if servers are already running and stop them
STOPPED_ANY=false

if [ -f ".pids/backend.pid" ]; then
    BACKEND_PID=$(cat .pids/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "⚠️  Backend server already running (PID: $BACKEND_PID) - stopping it..."
        kill $BACKEND_PID 2>/dev/null || true
        sleep 1
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            kill -9 $BACKEND_PID 2>/dev/null || true
        fi
        rm -f .pids/backend.pid
        STOPPED_ANY=true
    fi
fi

if [ -f ".pids/frontend.pid" ]; then
    FRONTEND_PID=$(cat .pids/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "⚠️  Frontend server already running (PID: $FRONTEND_PID) - stopping it..."
        kill $FRONTEND_PID 2>/dev/null || true
        sleep 1
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            kill -9 $FRONTEND_PID 2>/dev/null || true
        fi
        rm -f .pids/frontend.pid
        STOPPED_ANY=true
    fi
fi

if [ "$STOPPED_ANY" = true ]; then
    echo "   ✓ Stopped existing servers"
    echo ""
fi

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found at ./venv"
    echo "Please create one first: python -m venv venv"
    exit 1
fi

# Check if node_modules exists in frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "❌ Frontend dependencies not found"
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo "🚀 Starting backend server..."
# Start backend server in background
source venv/bin/activate
nohup python manage.py runserver 0.0.0.0:8000 > .pids/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > .pids/backend.pid
echo "   ✓ Backend started (PID: $BACKEND_PID)"
echo "   📝 Logs: .pids/backend.log"

echo ""
echo "🚀 Starting frontend server..."
# Start frontend server in background
cd frontend
nohup npm run dev -- --host > ../.pids/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../.pids/frontend.pid
cd ..
echo "   ✓ Frontend started (PID: $FRONTEND_PID)"
echo "   📝 Logs: .pids/frontend.log"

echo ""
echo "=========================================="
echo "✅ Servers started successfully!"
echo "=========================================="
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173 (or check logs for port)"
echo ""
echo "📊 To view logs in real-time:"
echo "   Backend:  tail -f .pids/backend.log"
echo "   Frontend: tail -f .pids/frontend.log"
echo ""
echo "🛑 To stop servers: ./stop.sh"
echo ""
