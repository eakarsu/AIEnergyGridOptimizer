#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     ⚡ AI Energy Grid Optimizer - Startup ⚡     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo -e "${GREEN}[OK]${NC} Environment variables loaded"
else
    echo -e "${RED}[ERROR]${NC} .env file not found!"
    exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

# Function to kill process on a port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}[CLEANUP]${NC} Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Clean up ports
echo -e "\n${BLUE}[1/6]${NC} Cleaning up ports..."
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
echo -e "${GREEN}[OK]${NC} Ports $BACKEND_PORT and $FRONTEND_PORT are free"

# Check PostgreSQL
echo -e "\n${BLUE}[2/6]${NC} Checking PostgreSQL..."
if command -v pg_isready &> /dev/null; then
    if pg_isready -q; then
        echo -e "${GREEN}[OK]${NC} PostgreSQL is running"
    else
        echo -e "${YELLOW}[WARN]${NC} PostgreSQL is not running. Attempting to start..."
        if command -v brew &> /dev/null; then
            brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
        fi
        sleep 2
        if pg_isready -q; then
            echo -e "${GREEN}[OK]${NC} PostgreSQL started successfully"
        else
            echo -e "${RED}[ERROR]${NC} Could not start PostgreSQL. Please start it manually."
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}[WARN]${NC} pg_isready not found, assuming PostgreSQL is running"
fi

# Create database if not exists
echo -e "\n${BLUE}[3/6]${NC} Setting up database..."
createdb energy_grid_optimizer 2>/dev/null && echo -e "${GREEN}[OK]${NC} Database created" || echo -e "${GREEN}[OK]${NC} Database already exists"

# Install dependencies
echo -e "\n${BLUE}[4/6]${NC} Installing dependencies..."
cd backend && npm install --silent 2>&1 | tail -1 && cd ..
echo -e "${GREEN}[OK]${NC} Backend dependencies installed"
cd frontend && npm install --silent 2>&1 | tail -1 && cd ..
echo -e "${GREEN}[OK]${NC} Frontend dependencies installed"

# Seed database
echo -e "\n${BLUE}[5/6]${NC} Seeding database..."
cd backend && node seed.js && cd ..
echo -e "${GREEN}[OK]${NC} Database seeded with sample data"

# Start services with hot reload
echo -e "\n${BLUE}[6/6]${NC} Starting services with hot reload..."
echo -e "${CYAN}─────────────────────────────────────────────────${NC}"
echo -e "${GREEN}  Backend:${NC}  http://localhost:$BACKEND_PORT (nodemon)"
echo -e "${GREEN}  Frontend:${NC} http://localhost:$FRONTEND_PORT (vite HMR)"
echo -e "${CYAN}─────────────────────────────────────────────────${NC}"
echo ""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}[SHUTDOWN]${NC} Stopping services..."
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    echo -e "${GREEN}[OK]${NC} All services stopped"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend with nodemon for hot reload
cd backend && npx nodemon --watch . --ext js,json server.js &
BACKEND_PID=$!
cd ..

# Wait for backend
sleep 2

# Start frontend with Vite HMR
cd frontend && npx vite --port $FRONTEND_PORT --host &
FRONTEND_PID=$!
cd ..

echo -e "\n${GREEN}[READY]${NC} All services are running! Press Ctrl+C to stop."
echo ""

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID
