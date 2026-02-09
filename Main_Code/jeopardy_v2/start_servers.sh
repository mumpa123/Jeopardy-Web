#!/bin/bash
# Jeopardy Game Server Startup Script
# Detects network IP and provides startup commands

set -e  # Exit on error

echo "=========================================="
echo "Jeopardy Game - Server Startup"
echo "=========================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Run IP detection script
echo "🔍 Detecting network IP and updating configuration..."
python3 update_ip.py

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ IP detection failed. Exiting."
    exit 1
fi

echo ""
echo "=========================================="
echo "🚀 Ready to start servers!"
echo "=========================================="
echo ""
echo "Open TWO separate terminals and run:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd $(pwd)"
echo "  source venv/bin/activate"
echo "  python manage.py runserver 0.0.0.0:8000"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd $(pwd)/frontend"
echo "  npm run dev -- --host"
echo ""
echo "Press Enter to continue..."
read

# Ask if user wants to start backend in this terminal
echo ""
read -p "Start backend server in this terminal? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting backend server..."
    echo "Note: You'll still need to start the frontend in another terminal"
    echo ""

    # Check if venv exists
    if [ ! -d "venv" ]; then
        echo "❌ Virtual environment not found at ./venv"
        echo "Please create one first: python -m venv venv"
        exit 1
    fi

    # Activate venv and start server
    source venv/bin/activate
    python manage.py runserver 0.0.0.0:8000
else
    echo ""
    echo "👍 No problem! Start the servers manually using the commands above."
fi
