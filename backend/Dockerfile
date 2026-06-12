FROM node:20-bullseye-slim

# Install Python and dependencies
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv bash

# Set working directory
WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install

# Copy Python requirements and create virtual environment
COPY requirements.txt ./
RUN python3 -m venv venv
RUN . venv/bin/activate && pip install -r requirements.txt

# Copy all source files
COPY . .

# Make the start script executable
RUN chmod +x start.sh

# Expose the port (Render will override this, but we use it as default)
EXPOSE 8000

# Start both Node and Python
CMD ["./start.sh"]
