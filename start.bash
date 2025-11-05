#!/usr/bin/env bash
set -euo pipefail

# Start FastAPI backend
echo "Starting FastAPI (main.py)..."
python3 main.py &
BACKEND_PID=$!

# Start Next.js frontend
echo "Starting Next.js (reader-ui)..."
cd reader-ui
npm run start &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Both services running..."

# Trap Ctrl+C and kill both
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Wait for both to finish
wait $BACKEND_PID $FRONTEND_PID
