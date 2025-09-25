# Local AI Chat with LangGraph & MCP Tools

A Next.js chat application powered by **LangGraph** with **MCP (Model Context Protocol)** tools for real-time web search and data access. Features **Server-Sent Events (SSE)** streaming for real-time AI responses. Completely local and open source.

[![GitHub](https://img.shields.io/badge/GitHub-Source%20Code-181717?style=flat&logo=github)](https://github.com/mylocalaichat/mylocalai)

**[🎥 Watch Demo](https://youtu.be/g14zgT6INoA)**

## Architecture

### Core Components
- **Next.js 15** - Modern React framework with App Router
- **LangGraph** - AI agent framework for complex reasoning workflows
- **MCP Tools** - Google search, web scraping, and data access tools
- **SSE Streaming** - Real-time response streaming via Server-Sent Events
- **Ollama** - Local LLM hosting (Qwen 3 14B recommended)

### Data Flow
```
User Message → LangGraph Agent → MCP Tools (Web Search) → LLM → SSE Stream → UI
```

## Features

### 🚀 Advanced AI Capabilities
- ✅ **LangGraph Agent** - Complex reasoning and tool usage
- ✅ **Real-time Web Search** - Current information via Google Search
- ✅ **Web Scraping** - Extract content from specific URLs
- ✅ **SSE Streaming** - Real-time response updates
- ✅ **Tool Call Visibility** - See when AI uses external tools

### 💬 Chat Interface
- ✅ **Markdown Rendering** - Rich text responses with code highlighting
- ✅ **Conversation History** - Persistent chat threads
- ✅ **Multiple Sessions** - Manage multiple conversations
- ✅ **Real-time Status** - Live updates during processing

### 🔒 Privacy & Performance
- ✅ **Completely Local** - AI runs on your hardware
- ✅ **No API Keys Required** - Uses local Ollama instance
- ✅ **Thread Management** - SQLite-based conversation storage
- ✅ **Debug Mode** - Detailed logging and performance metrics

## Quick Start

### 1. Install Ollama
```bash
# macOS
brew install ollama

# Windows/Linux
# Visit https://ollama.com for installer
```

### 2. Install Required Model
```bash
ollama pull qwen3:14b
# Alternative: ollama pull llama3.1:8b
```

### 3. Start Ollama Service
```bash
ollama serve
```

### 4. Run the Application
```bash
npm install
npm run dev
```

### 5. Open Browser
Navigate to [http://localhost:3000](http://localhost:3000)

## Technical Requirements

### Hardware
- **RAM**: 16GB+ (recommended for Qwen 3 14B)
- **CPU**: Modern multi-core processor
- **Storage**: 10GB+ free space for models

### Software
- **Node.js**: v18+ (v20+ recommended)
- **Ollama**: Latest version
- **Modern Browser**: Chrome, Firefox, Safari, Edge

### Key Dependencies
- **Next.js 15** - React framework with App Router
- **LangGraph** - AI agent framework (@langchain/langgraph ^0.4.9)
- **MCP SDK** - Model Context Protocol (@modelcontextprotocol/sdk ^1.18.1)
- **Ollama LangChain** - Local LLM integration (@langchain/ollama ^0.2.4)
- **SQLite Checkpointer** - Conversation persistence (@langchain/langgraph-checkpoint-sqlite ^0.2.1)

## Configuration

### Environment Variables
Create `.env.local`:
```bash
REACT_APP_OLLAMA_URL=http://localhost:11434
PORT=3000
NODE_ENV=development
```

### Model Configuration
Edit `app/page.tsx` to change the model:
```typescript
const requiredModel = 'qwen3:14b';
// or 'llama3.1:8b', 'llama3.1:70b', etc.
```

## MCP Tools Available

### Google Search (`google_search`)
- **Purpose**: Get current information from web search
- **Usage**: Automatically used for current events, facts, news
- **Parameters**: `query` (string)

### Web Scraper (`scrape`)
- **Purpose**: Extract content from specific URLs
- **Usage**: Get detailed information from websites
- **Parameters**: `url` (string)

### Dice Roller (`roll_dice`)
- **Purpose**: Generate random numbers
- **Usage**: Games, randomization, decision making
- **Parameters**: `sides` (number), `count` (number)

## Development

### Available Scripts
```bash
npm run dev          # Development server with hot reload
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint code checking
npm test             # Run test suite
```

### Project Structure
```
app/
├── components/           # React components
│   ├── ChatInterface.tsx # Main chat UI
│   ├── ChatList.tsx     # Conversation sidebar
│   └── StatusBanner.tsx # Connection status indicator
├── langraph_backend/    # LangGraph API routes
│   ├── route.ts        # Main SSE streaming endpoint
│   ├── schemas.ts      # Request/response validation
│   ├── lib/            # Utilities and checkpointer
│   └── conversations/  # Thread management API
│       ├── route.ts    # List conversations
│       └── [thread_id]/route.ts # Get/delete specific conversation
├── mcp_server/         # MCP tool implementations
│   ├── [transport]/    # MCP protocol handler
│   │   └── route.ts    # Tool registration and routing
│   ├── tools/         # Individual tool definitions
│   │   ├── googleSearch.ts # Google search tool
│   │   ├── scrape.ts   # Web scraping tool
│   │   └── rollDice.ts # Random number generator
│   ├── search/        # Google search implementation
│   └── scrape/        # Web scraping implementation
├── utils/             # Shared utilities
│   └── localStorage.ts # Browser storage helpers
├── layout.tsx         # Root layout component
└── page.tsx           # Main chat page
```

### Adding New MCP Tools
1. Create tool definition in `app/mcp_server/tools/`
2. Register in `app/mcp_server/[transport]/route.ts`
3. Tool will be automatically available to LangGraph agent

## Troubleshooting

### Ollama Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# List installed models
ollama list

# Check model installation
ollama pull qwen3:14b
```

### Performance Optimization
- **Reduce Model Size**: Use `qwen3:7b` or `llama3.1:8b` for lower memory usage
- **Close Applications**: Free up RAM for better model performance
- **Check Resources**: Monitor CPU/RAM usage during chat

### SSE Streaming Issues
- Check browser console for connection errors
- Verify LangGraph backend is running on port 3000
- Ensure no firewall blocking Server-Sent Events

### MCP Tool Errors
- Verify MCP server is connected in logs
- Check tool implementation in `app/mcp_server/tools/`
- Ensure Google search API is accessible

## API Endpoints

### Chat Streaming
- **POST** `/langraph_backend` - SSE streaming chat endpoint
- **Headers**: `Content-Type: application/json`, `Accept: text/event-stream`

### Conversation Management
- **GET** `/langraph_backend/conversations` - List all conversations
- **GET** `/langraph_backend/conversations/[id]` - Get specific conversation
- **DELETE** `/langraph_backend/conversations/[id]` - Delete conversation

### MCP Tools
- **POST** `/mcp_server/mcp` - MCP protocol endpoint for tools

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Ollama](https://ollama.com) - Local LLM hosting
- [LangGraph](https://langchain-ai.github.io/langgraph/) - AI agent framework
- [Model Context Protocol](https://modelcontextprotocol.io/) - Tool integration standard
- [Next.js](https://nextjs.org/) - React framework