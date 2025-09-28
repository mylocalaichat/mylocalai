# Makefile for mylocalai Next.js app

.PHONY: dev build start prod install clean storage modelinspector help

# Default target - clean, install, and start Next.js in dev mode
dev: clean
	@echo "Installing dependencies..."
	npm install
	@echo "Starting Next.js development server..."
	npm run dev

# Build for production
build:
	@echo "Building for production..."
	NODE_ENV=production npm run build

# Start production server
start:
	@echo "Starting production server..."
	NODE_ENV=production npm run start

# Build and start production (complete prod workflow)
prod: install storage build start

# Create storage directory
storage:
	@echo "Creating storage directory..."
	mkdir -p storage

# Install dependencies only
install:
	@echo "Installing dependencies..."
	npm install

# Clean node_modules and build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf node_modules .next

# Launch MCP Model Inspector
modelinspector:
	@echo "Launching MCP Model Inspector..."
	npx @modelcontextprotocol/inspector@latest http://localhost:3001

# Show available commands
help:
	@echo "Available commands:"
	@echo "  make dev           - Clean, install, and start development server"
	@echo "  make build         - Build for production"
	@echo "  make start         - Start production server"
	@echo "  make prod          - Install, create storage, build, and start production server"
	@echo "  make install       - Install npm dependencies"
	@echo "  make storage       - Create storage directory"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make modelinspector - Launch MCP Model Inspector"
	@echo "  make help          - Show this help message"