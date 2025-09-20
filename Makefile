# Makefile for mylocalai React app with PostgreSQL backend

.PHONY: dev build clean install backend frontend db-setup help

# Default target - starts both backend and frontend
dev: install backend-deps
	@echo "Starting development environment..."
	@echo "Backend will start on http://localhost:3010"
	@echo "Frontend will start on http://localhost:3005"
	@make backend &
	@sleep 2
	@make frontend

# Start backend only
backend: backend-deps
	@echo "Starting backend server..."
	cd backend && npm start

# Start frontend only
frontend: install
	@echo "Starting React development server..."
	npm start

# Install frontend dependencies
install:
	@echo "Installing frontend dependencies..."
	npm install

# Install backend dependencies
backend-deps:
	@echo "Installing backend dependencies..."
	cd backend && npm install

# Set up database schema
db-setup:
	@echo "Setting up PostgreSQL database..."
	psql -h localhost -U $(shell whoami) -d postgres -c "\
	CREATE SCHEMA IF NOT EXISTS mylocalai; \
	CREATE TABLE IF NOT EXISTS mylocalai.conversations ( \
	  id SERIAL PRIMARY KEY, \
	  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
	  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP \
	); \
	CREATE TABLE IF NOT EXISTS mylocalai.messages ( \
	  id SERIAL PRIMARY KEY, \
	  conversation_id INTEGER REFERENCES mylocalai.conversations(id) ON DELETE CASCADE, \
	  content TEXT NOT NULL, \
	  sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'api')), \
	  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
	  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP \
	); \
	CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON mylocalai.messages(conversation_id); \
	CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON mylocalai.messages(timestamp);"
	@echo "Database schema created successfully!"

# Build for production
build: install backend-deps
	@echo "Building for production..."
	npm run build

# Clean node_modules and build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf node_modules build backend/node_modules

# Show help
help:
	@echo "Available targets:"
	@echo "  dev          - Start both backend and frontend (default)"
	@echo "  backend      - Start backend server only"
	@echo "  frontend     - Start frontend only"
	@echo "  install      - Install frontend dependencies"
	@echo "  backend-deps - Install backend dependencies"
	@echo "  db-setup     - Set up PostgreSQL database schema"
	@echo "  build        - Build for production"
	@echo "  clean        - Clean build artifacts"
	@echo "  help         - Show this help message"
	@echo ""
	@echo "Prerequisites:"
	@echo "  - PostgreSQL running locally"
	@echo "  - Ollama running locally (ollama serve)"
	@echo "  - Node.js and npm installed"