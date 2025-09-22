# Local AI Chat

A React chat application that runs AI locally using Ollama. Open source and completely free. Using https://github.com/web-agent-master/google-search/tree/main to help google search

[![GitHub](https://img.shields.io/badge/GitHub-Source%20Code-181717?style=flat&logo=github)](https://github.com/mylocalaichat/mylocalai)

**[🎥 Watch Demo](https://youtu.be/g14zgT6INoA)**

## Philosophy

This application runs AI locally on your machine using Ollama. It's open source and completely free to use.

- **Local**: Everything runs on your hardware
- **Open Source**: Code is transparent and modifiable
- **Cost-Free**: No subscriptions or API fees

## Quick Start

1. **Install Ollama**

   Download and install Ollama from the official website:
   - **macOS/Windows/Linux**: Visit [https://ollama.com](https://ollama.com) and download the installer for your operating system
   - Follow the installation instructions for your platform

2. **Install a model**
   ```bash
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

- **Hardware**: MacBook Pro or equivalent computer with sufficient RAM and processing power to run Llama3.1:8b locally
- **Software**:
  - Node.js (v19 or higher)
  - Ollama installed locally
- **Recommended**: 16GB+ RAM for optimal performance with Llama3.1:8b

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