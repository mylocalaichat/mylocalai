# Makefile for mylocalai Next.js app

.PHONY: dev clean

# Default target - clean, install, and start Next.js in dev mode
dev: clean
	@echo "Installing dependencies..."
	npm install
	@echo "Starting Next.js development server..."
	npm run dev

# Clean node_modules and build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf node_modules .next