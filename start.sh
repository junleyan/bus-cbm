#!/bin/sh

cd "$(dirname "$0")"

set -e

eval "$(conda shell.bash hook)"

# Activate Conda environment (conda must already be initialized in your shell)
# Change env name if needed
ENV_NAME="detectron2_cpu"
echo "Activating conda environment: $ENV_NAME"
conda activate "$ENV_NAME"

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

# Stop both on Ctrl+C
trap 'echo "Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

# Wait for both to finish
wait $BACKEND_PID
wait $FRONTEND_PID
