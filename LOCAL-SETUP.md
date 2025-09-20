# Local AI Chat Setup

A React chat application that runs locally and connects to your local Ollama installation.

## Prerequisites

- Node.js (v14 or higher)
- Ollama installed on your machine

## Setup Instructions

### 1. Install Ollama
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows - Download from https://ollama.com/download
```

### 2. Start Ollama Service
```bash
ollama serve
```
Keep this terminal window open.

### 3. Install a Language Model
In a new terminal:
```bash
# Recommended model (8GB)
ollama pull llama3.1:8b

# Alternative smaller model (3GB)
ollama pull llama3.1:latest

# Or other models
ollama pull llama2:latest
ollama pull mistral:latest
```

### 4. Verify Ollama Installation
```bash
ollama list
```
You should see your installed model(s).

### 5. Install App Dependencies
```bash
npm install
```

### 6. Start the Application
```bash
npm start
```

The app will open at http://localhost:3000

## Usage

1. **Check Status**: The banner shows Ollama connection status
2. **Start Chatting**: Type messages in the input field
3. **Model Support**: Works with any Ollama model you have installed
4. **Local Storage**: Conversations are saved in browser localStorage

## Troubleshooting

### Ollama Not Connected
- Ensure `ollama serve` is running
- Check that port 11434 is not blocked
- Verify models are installed with `ollama list`

### Performance Issues
- Larger models (70B+) require significant RAM
- Use smaller models like llama3.1:8b for better performance
- Close other applications to free up memory

### Port Conflicts
- Default ports: React (3000), Ollama (11434)
- Change React port: `PORT=3001 npm start`
- Change Ollama port: `OLLAMA_HOST=0.0.0.0:11435 ollama serve`

## Features

- ✅ Real-time chat with local AI
- ✅ Conversation history
- ✅ Multiple chat sessions
- ✅ Ollama status monitoring
- ✅ No internet required after setup
- ✅ Privacy-focused (all data stays local)

## Configuration

Edit `.env.local` to customize:
```bash
REACT_APP_OLLAMA_URL=http://localhost:11434
PORT=3000
```