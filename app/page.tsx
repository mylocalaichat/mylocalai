'use client'

import React, { useState, useEffect, useCallback } from 'react';
import ChatInterface from './components/ChatInterface';
import ChatList from './components/ChatList';
import StatusBanner from './components/StatusBanner';
import { storageUtils } from './utils/localStorage';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [status, setStatus] = useState(null);
  const [debugData, setDebugData] = useState(null);

  // Initialize conversation on app load
  useEffect(() => {
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    try {
      setIsLoading(true);

      // Check if there are existing conversations
      const existingConversations = storageUtils.getAllConversations();

      if (existingConversations.length > 0) {
        // Load the most recent conversation
        const recentConversation = existingConversations[0];
        setConversationId(recentConversation.id);
        loadMessages(recentConversation.id);
      } else {
        // Create a new conversation only if none exist
        const conversation = storageUtils.createConversation();
        setConversationId(conversation.id);

        // Check Ollama status and add appropriate welcome message
        const ollamaStatus = await checkOllamaStatus();
        let welcomeMessage;

        if (ollamaStatus.success) {
          welcomeMessage = "Welcome! I'm powered by Ollama and storing chats in browser storage. Ask me anything!";
        } else {
          welcomeMessage = `Welcome! I'm ready to chat, but I need Ollama to be running first.

${ollamaStatus.message}`;
        }

        await saveMessage(conversation.id, welcomeMessage, 'api');

        // Load messages from localStorage
        loadMessages(conversation.id);
      }

    } catch (error) {
      console.error('Error initializing conversation:', error);
      // Fallback to local state
      setMessages([{
        id: Date.now(),
        text: "Error initializing conversation. Please try again.",
        sender: 'api',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = (convId) => {
    try {
      const dbMessages = storageUtils.getMessagesByConversation(convId);
      const formattedMessages = dbMessages.map(msg => ({
        id: msg.id,
        text: msg.content,
        sender: msg.sender,
        timestamp: new Date(msg.timestamp)
      }));
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const saveMessage = async (convId, content, sender) => {
    try {
      const savedMessage = storageUtils.addMessage(convId, content, sender);
      return {
        id: savedMessage.id,
        text: savedMessage.content,
        sender: savedMessage.sender,
        timestamp: new Date(savedMessage.timestamp)
      };
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  const getOllamaUrl = () => {
    return process.env.NEXT_PUBLIC_OLLAMA_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
  };

  const addDebugEvent = (type, message, details = null, functionName = null, args = null) => {
    setDebugData({
      type,
      message,
      details,
      functionName,
      args,
      timestamp: Date.now() // Add timestamp to force re-render
    });
  };

  const checkOllamaStatus = async () => {
    try {
      const ollamaUrl = getOllamaUrl();

      // Log status check start
      addDebugEvent('info', 'Checking Ollama status',
        { url: `${ollamaUrl}/api/tags` },
        'checkOllamaStatus',
        { endpoint: 'api/tags' }
      );

      // Check if Ollama is running
      const healthResponse = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!healthResponse.ok) {
        addDebugEvent('error', 'Ollama status check failed',
          { status: healthResponse.status, statusText: healthResponse.statusText },
          'checkOllamaStatus',
          { url: `${ollamaUrl}/api/tags` }
        );
        throw new Error('Ollama service not responding');
      }

      const data = await healthResponse.json();
      const models = data.models || [];

      // Log successful status check
      addDebugEvent('success', 'Ollama status check successful',
        { modelsFound: models.length, models: models.map(m => m.name) },
        'checkOllamaStatus',
        { availableModels: models.length }
      );

      // Check if required model is available
      const requiredModel = 'llama3.1:8b';
      const hasRequiredModel = models.some(model =>
        model.name === requiredModel || model.name.startsWith('llama3.1')
      );

      if (!hasRequiredModel) {
        throw new Error(`Model ${requiredModel} not found. Available models: ${models.map(m => m.name).join(', ') || 'none'}`);
      }

      return { success: true, models };
    } catch (error) {
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        const ollamaUrl = getOllamaUrl();
        return {
          success: false,
          error: 'Connection failed',
          message: `🚫 **Ollama Not Running**

Please start Ollama first:

**macOS/Linux:**
\`\`\`bash
ollama serve
\`\`\`

**Then install the required model:**
\`\`\`bash
ollama pull llama3.1:8b
\`\`\`

**Check if it's running:**
\`\`\`bash
ollama list
\`\`\`

Make sure Ollama is running on ${ollamaUrl}`
        };
      } else if (error.message.includes('Model')) {
        return {
          success: false,
          error: 'Model not found',
          message: `🤖 **Model Not Available**

The required model (llama3.1:8b) is not installed.

**Install the model:**
\`\`\`bash
ollama pull llama3.1:8b
\`\`\`

**Alternative models you can try:**
\`\`\`bash
ollama pull llama3.1:latest
ollama pull llama3:latest
ollama pull llama2:latest
\`\`\`

${error.message}`
        };
      } else {
        return {
          success: false,
          error: 'Ollama error',
          message: `❌ **Ollama Error**

${error.message}

Please ensure Ollama is properly installed and running.`
        };
      }
    }
  };

  const handleSendMessage = async (message) => {
    if (!conversationId) {
      console.error('No conversation ID available');
      return;
    }

    try {
      // Set initial status
      setStatus({ icon: '📤', message: 'Sending message to server', isLoading: true });

      // Save user message to database
      const userMessage = await saveMessage(conversationId, message, 'user');
      if (userMessage) {
        setMessages(prev => [...prev, userMessage]);
      }

      // Update status - checking Ollama
      setStatus({ icon: '🔍', message: 'Checking Ollama status', isLoading: true });

      // Check Ollama status before making the API call
      const ollamaStatus = await checkOllamaStatus();
      if (!ollamaStatus.success) {
        setStatus({ icon: '❌', message: 'Ollama not available', isLoading: false });
        const errorMessage = await saveMessage(conversationId, ollamaStatus.message, 'api');
        if (errorMessage) {
          setMessages(prev => [...prev, errorMessage]);
        }
        setTimeout(() => setStatus(null), 3000);
        return;
      }

      // Update status - preparing request
      setStatus({ icon: '⚡', message: 'Preparing request with conversation history', isLoading: true });

      // Build conversation history for context (excluding the current message)
      const conversationHistory = messages
        .filter(msg => msg.sender !== 'system') // Exclude system messages if any
        .map(msg => `${msg.sender === 'user' ? 'Human' : 'Assistant'}: ${msg.text}`)
        .join('\n\n');

      // Build the full prompt with history + current message
      const fullPrompt = conversationHistory
        ? `${conversationHistory}\n\nHuman: ${message}\n\nAssistant:`
        : `Human: ${message}\n\nAssistant:`;

      // Update status - calling LLM
      setStatus({ icon: '🤖', message: 'Waiting for LLM response', isLoading: true });

      // Call Ollama API
      const ollamaUrl = getOllamaUrl();
      const requestBody = {
        model: 'llama3.1:8b',
        prompt: fullPrompt,
        stream: false
      };

      // Log API request
      addDebugEvent('info', 'Making API call to Ollama',
        { url: `${ollamaUrl}/api/generate`, method: 'POST' },
        'fetch',
        { model: requestBody.model, promptLength: fullPrompt.length }
      );

      const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!ollamaResponse.ok) {
        const errorText = await ollamaResponse.text();
        addDebugEvent('error', `API request failed with status ${ollamaResponse.status}`,
          { status: ollamaResponse.status, statusText: ollamaResponse.statusText, error: errorText },
          'fetch',
          { url: `${ollamaUrl}/api/generate` }
        );
        throw new Error(`Ollama HTTP error! status: ${ollamaResponse.status}`);
      }

      // Update status - processing response
      setStatus({ icon: '📥', message: 'Response received, processing', isLoading: true });

      const ollamaData = await ollamaResponse.json();
      const responseText = ollamaData.response || 'No response received from Ollama';

      // Log API response
      addDebugEvent('success', 'API response received successfully',
        {
          responseLength: responseText.length,
          modelUsed: ollamaData.model || requestBody.model,
          totalDuration: ollamaData.total_duration,
          loadDuration: ollamaData.load_duration,
          promptEvalCount: ollamaData.prompt_eval_count,
          evalCount: ollamaData.eval_count
        },
        'fetch',
        { responseText: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '') }
      );

      // Save API response to database
      const apiMessage = await saveMessage(conversationId, responseText, 'api');
      if (apiMessage) {
        setMessages(prev => [...prev, apiMessage]);
      }

      // Update status - completed
      setStatus({ icon: '✅', message: 'Response complete', isLoading: false });
      setTimeout(() => setStatus(null), 2000);

    } catch (error) {
      console.error('Error in handleSendMessage:', error);

      // Update status - error
      setStatus({ icon: '❌', message: `Error: ${error.message}`, isLoading: false });

      // Save error message to database
      const errorText = `Error: ${error.message}. Make sure Ollama is running locally.`;
      const errorMessage = await saveMessage(conversationId, errorText, 'api');
      if (errorMessage) {
        setMessages(prev => [...prev, errorMessage]);
      }

      setTimeout(() => setStatus(null), 5000);
    }
  };

  const handleConversationSelect = useCallback((convId) => {
    if (convId === conversationId) return; // Already selected

    try {
      setConversationId(convId);
      loadMessages(convId);
    } catch (error) {
      console.error('Error switching conversation:', error);
    }
  }, [conversationId]);

  const handleNewConversation = async (newConvId) => {
    try {
      setIsLoading(true);
      setConversationId(newConvId);

      // Check Ollama status and add appropriate welcome message
      const ollamaStatus = await checkOllamaStatus();
      let welcomeMessage;

      if (ollamaStatus.success) {
        welcomeMessage = "Welcome to a new conversation! I'm powered by Ollama and ready to help. Ask me anything!";
      } else {
        welcomeMessage = `Welcome to a new conversation! I need Ollama to be running first.

${ollamaStatus.message}`;
      }

      await saveMessage(newConvId, welcomeMessage, 'api');
      loadMessages(newConvId);
    } catch (error) {
      console.error('Error creating new conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="app-container" style={{
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          color: '#667eea'
        }}>
          Initializing conversation...
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <StatusBanner />
      <div className="app-main">
        <div className="app-container">
          <ChatList
            currentConversationId={conversationId}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
          />
          <div className="resize-handle"></div>
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            status={status}
            debugData={debugData}
          />
        </div>
      </div>
    </div>
  );
}