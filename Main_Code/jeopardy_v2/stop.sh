#!/bin/bash
# Jeopardy Game - Stop Script
# Stops both backend and frontend servers

echo "=========================================="
echo "🛑 Jeopardy Game - Stopping Servers"
echo "=========================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

STOPPED_ANY=false

# Stop backend server
if [ -f ".pids/backend.pid" ]; then
    BACKEND_PID=$(cat .pids/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "🔴 Stopping backend server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        sleep 1
        # Force kill if still running
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo "   Force stopping backend..."
            kill -9 $BACKEND_PID 2>/dev/null || true
        fi
        echo "   ✓ Backend stopped"
        STOPPED_ANY=true
    else
        echo "⚠️  Backend server not running"
    fi
    rm -f .pids/backend.pid
else
    echo "⚠️  No backend PID file found"
fi

echo ""

# Stop frontend server
if [ -f ".pids/frontend.pid" ]; then
    FRONTEND_PID=$(cat .pids/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "🔴 Stopping frontend server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        sleep 1
        # Force kill if still running
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo "   Force stopping frontend..."
            kill -9 $FRONTEND_PID 2>/dev/null || true
        fi
        echo "   ✓ Frontend stopped"
        STOPPED_ANY=true
    else
        echo "⚠️  Frontend server not running"
    fi
    rm -f .pids/frontend.pid
else
    echo "⚠️  No frontend PID file found"
fi

echo ""

if [ "$STOPPED_ANY" = true ]; then
    echo "=========================================="
    echo "✅ Servers stopped successfully!"
    echo "=========================================="
else
    echo "=========================================="
    echo "ℹ️  No servers were running"
    echo "=========================================="
fi
echo ""
