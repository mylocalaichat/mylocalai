# Makefile for mylocalai Next.js app

.PHONY: dev clean modelinspector

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

# Launch MCP Model Inspector
modelinspector:
	@echo "Launching MCP Model Inspector..."
	npx @modelcontextprotocol/inspector@latest http://localhost:3001