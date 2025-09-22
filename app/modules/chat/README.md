# Chat Module - MyLocalAI

This is a standalone AI chat interface module powered by Ollama.

## Running the Module Independently

### Prerequisites
- Node.js installed
- Ollama running locally on http://localhost:11434

### Quick Start

1. **Open this module in VS Code:**
   ```bash
   cd app/modules/chat
   code .
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   ```
   http://localhost:3000
   ```

## VS Code Debugging

This module includes its own VS Code configuration for debugging:

### Available Debug Configurations:
- **Chat: debug server-side** - Debug server-side code
- **Chat: debug client-side** - Debug in Chrome browser
- **Chat: debug full stack** - Debug both server and client
- **Chat: debug full stack (server + client)** - Compound configuration

### To Debug:
1. Open this module folder in VS Code
2. Go to Debug panel (Ctrl/Cmd + Shift + D)
3. Select a debug configuration
4. Press F5 to start debugging

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server

## Module Structure

```
chat/
├── .vscode/           # VS Code configuration
│   ├── launch.json    # Debug configurations
│   ├── settings.json  # Editor settings
│   └── tasks.json     # Build tasks
├── app/               # Next.js app structure
│   ├── layout.js      # Root layout
│   └── page.js        # Main chat page
├── components/        # React components
│   ├── ChatInterface.js/.css
│   ├── ChatList.js/.css
│   └── StatusBanner.js/.css
├── utils/             # Utilities
│   └── localStorage.js
├── App.css           # Module styles
├── next.config.js    # Next.js configuration
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

## Environment Variables

- `NEXT_PUBLIC_OLLAMA_URL` - Ollama server URL (default: http://localhost:11434)

## Features

- AI chat interface with conversation history
- Local storage for chat persistence
- Ollama integration with status checking
- Responsive design
- Independent deployment ready

## Deployment

This module can be deployed independently as a standalone Next.js application to any platform that supports Node.js.