# Local AI Chat

A React chat application that runs AI locally using Ollama. Open source and completely free.

## Philosophy

This application runs AI locally on your machine using Ollama. It's open source and completely free to use.

- **Local**: Everything runs on your hardware
- **Open Source**: Code is transparent and modifiable
- **Cost-Free**: No subscriptions or API fees

## Quick Start

1. **Install Ollama**
   ```bash
   # macOS
   brew install ollama

   # Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Start Ollama and install a model**
   ```bash
   ollama serve
   ollama pull llama3.1:8b
   ```

3. **Run the application**
   ```bash
   npm install
   npm start
   ```

4. **Open http://localhost:3000**

## Features

- ✅ Real-time chat with local AI
- ✅ Conversation history
- ✅ Multiple chat sessions
- ✅ Ollama status monitoring
- ✅ Privacy-focused (all data stays local)

## Requirements

- Node.js (v19 or higher)
- Ollama installed locally

## Supported Models

Works with llama3.1:8b (recommended)

## Configuration

Edit `.env.local` to customize:
```bash
REACT_APP_OLLAMA_URL=http://localhost:11434
PORT=3000
```

## Troubleshooting

**Ollama Not Connected?**
- Ensure `ollama serve` is running
- Check that port 11434 is not blocked
- Verify models are installed with `ollama list`

**Performance Issues?**
- Use smaller models like llama3.1:8b
- Close other applications to free up memory

## Development

```bash
npm start       # Development server
npm run build   # Production build
npm test        # Run tests
```

## License

MIT License - See [LICENSE](LICENSE) file for details.