#!/bin/bash

echo "Starting Zocial Backend Microservices..."

# Activate Python virtual environment and start FastAPI Analytics Engine
# It will run on port 5000 in the background
source venv/bin/activate
python3 analytics_engine.py --serve 5000 &

# Start the main Node.js Express Server in the foreground
# It will run on the port provided by Render (or 8000 default)
npm start
