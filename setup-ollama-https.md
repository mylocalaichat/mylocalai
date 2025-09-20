# Setup Ollama with HTTPS for Heroku App

## Problem
Your Heroku app runs on HTTPS but needs to connect to local Ollama on HTTP, which browsers block for security.

## Solution 1: HTTPS Tunnel (Recommended)

### Install ngrok
```bash
# Install ngrok
brew install ngrok/ngrok/ngrok
# OR download from https://ngrok.com/
```

### Setup Steps
1. **Start Ollama with CORS**:
   ```bash
   OLLAMA_ORIGINS="*" ollama serve
   ```

2. **Create HTTPS tunnel**:
   ```bash
   ngrok http 11434
   ```

3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

4. **Set environment variable** in Heroku:
   ```bash
   heroku config:set REACT_APP_OLLAMA_URL=https://abc123.ngrok.io
   ```

## Solution 2: Local HTTPS Proxy

### Install local-ssl-proxy
```bash
npm install -g local-ssl-proxy
```

### Setup Steps
1. **Start Ollama with CORS**:
   ```bash
   OLLAMA_ORIGINS="*" ollama serve
   ```

2. **Start HTTPS proxy**:
   ```bash
   local-ssl-proxy --source 11435 --target 11434
   ```

3. **Set environment variable** in Heroku:
   ```bash
   heroku config:set REACT_APP_OLLAMA_URL=https://localhost:11435
   ```

## Solution 3: Browser Security Override (Not Recommended)

### Chrome/Edge
1. Close all browser windows
2. Start with insecure flag:
   ```bash
   # macOS
   open -a "Google Chrome" --args --disable-web-security --user-data-dir="/tmp/chrome_dev"

   # Windows
   chrome.exe --disable-web-security --user-data-dir="c:/temp/chrome_dev"
   ```

### Firefox
1. Type `about:config` in address bar
2. Set `security.mixed_content.block_active_content` to `false`

**Warning**: This disables important security features.

## Verify Setup

Once configured, your Heroku app should successfully connect to local Ollama without console errors.