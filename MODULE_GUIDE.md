# MyLocalAI - Modular Next.js Application

This application has been converted to a Next.js app with a modular structure where each module can be served independently.

## Application Structure

```
app/
├── layout.js              # Root layout
├── page.js                # Home page with module directory
├── globals.css            # Global styles
└── modules/               # Independent modules
    └── chat/              # Chat interface module (fully independent)
        ├── app/           # Standalone Next.js app structure
        │   ├── layout.js
        │   └── page.js
        ├── components/    # Module-specific components
        ├── utils/         # Module-specific utilities
        ├── App.css        # Module-specific styles
        ├── next.config.js # Module-specific Next.js config
        └── package.json   # Independent package.json
```

## Running the Application

### Full Application
```bash
npm run dev
# Access at http://localhost:3000
```

### Running Modules Independently

Each module can be run as a standalone Next.js application:

#### Chat Module
```bash
cd app/modules/chat
npm install
npm run dev
# Access at http://localhost:3000
```



## Module URLs

When running the full application:
- Home: http://localhost:3000
- Chat Module: http://localhost:3000/modules/chat

## Features

- **Fully Independent Modules**: Each module is completely self-contained with no shared dependencies
- **No Common Utils**: Each module has its own utilities, components, and styles
- **Next.js App Router**: Uses the new App Router for file-based routing
- **Independent Deployment**: Each module can be deployed as a standalone Next.js application

## Development

- The chat module contains the full AI chat interface from the original React app
- Each module is completely independent with its own components, utils, and styles
- No shared dependencies between modules - each module is a standalone application

## Environment Variables

- `NEXT_PUBLIC_OLLAMA_URL`: Ollama server URL (defaults to http://localhost:11434)
- `OLLAMA_URL`: Server-side Ollama URL

## Migration Notes

- Converted from Create React App to Next.js App Router
- Maintained all original functionality in the chat module
- Added modular structure for independent deployment
- Updated component imports to use relative paths within the app directory