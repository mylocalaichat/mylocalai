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

      // Try to get existing conversations from LangGraph backend
      try {
        const response = await fetch('/langraph_backend/conversations');
        if (response.ok) {
          const data = await response.json();
          const existingConversations = data.conversations || [];

          if (existingConversations.length > 0) {
            // Load the most recent conversation
            const recentConversation = existingConversations[0];
            setConversationId(recentConversation.thread_id);
            await loadMessagesFromLangGraph(recentConversation.thread_id);
            return;
          }
        }
      } catch (error) {
        console.log('LangGraph backend not available, using localStorage fallback');
      }

      // Fallback to localStorage or create new conversation
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
          welcomeMessage = "Welcome! I'm powered by Ollama with LangGraph tools. Ask me anything!";
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

  const loadMessagesFromLangGraph = async (threadId) => {
    try {
      const response = await fetch(`/langraph_backend/conversations/${threadId}`);
      if (response.ok) {
        const data = await response.json();
        const langGraphMessages = data.messages || [];

        const formattedMessages = langGraphMessages.map((msg, index) => ({
          id: `${threadId}-${index}`,
          text: msg.content,
          sender: msg.role === 'user' ? 'user' : 'api',
          timestamp: new Date()
        }));

        setMessages(formattedMessages);
      } else {
        throw new Error('Failed to load messages from LangGraph');
      }
    } catch (error) {
      console.error('Error loading messages from LangGraph:', error);
      // Fallback to localStorage if available
      loadMessages(threadId);
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
      setStatus({ icon: '📤', message: 'Sending message to LangGraph', isLoading: true });

      // Add user message to UI immediately
      const userMessage = {
        id: `${conversationId}-${Date.now()}`,
        text: message,
        sender: 'user',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // Update status - preparing request
      setStatus({ icon: '⚡', message: 'Preparing conversation context', isLoading: true });

      // Build messages array for LangGraph (excluding the current message from messages state)
      const conversationMessages = messages
        .filter(msg => msg.sender !== 'system')
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));

      // Add the current message
      conversationMessages.push({
        role: 'user',
        content: message
      });

      // Update status - calling LangGraph
      setStatus({ icon: '🤖', message: 'Processing with LangGraph agent', isLoading: true });

      // Log API request
      addDebugEvent('info', 'Making API call to LangGraph backend',
        { url: '/langraph_backend', method: 'POST' },
        'fetch',
        { model: 'llama3.1:8b', messageCount: conversationMessages.length }
      );

      const langGraphResponse = await fetch('/langraph_backend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3.1:8b',
          messages: conversationMessages,
          thread_id: conversationId
        })
      });

      if (!langGraphResponse.ok) {
        const errorText = await langGraphResponse.text();
        addDebugEvent('error', `LangGraph request failed with status ${langGraphResponse.status}`,
          { status: langGraphResponse.status, statusText: langGraphResponse.statusText, error: errorText },
          'fetch',
          { url: '/langraph_backend' }
        );
        throw new Error(`LangGraph HTTP error! status: ${langGraphResponse.status}`);
      }

      // Update status - processing response
      setStatus({ icon: '📥', message: 'Response received, processing', isLoading: true });

      const langGraphData = await langGraphResponse.json();
      console.log('Full LangGraph response:', JSON.stringify(langGraphData, null, 2));

      // Extract the last assistant message from the response
      let responseText = 'No response received from LangGraph agent';

      if (langGraphData && langGraphData.messages && langGraphData.messages.length > 0) {
        // Find the last assistant message
        for (let i = langGraphData.messages.length - 1; i >= 0; i--) {
          const message = langGraphData.messages[i];
          console.log(`Message ${i}:`, message);

          // Look for assistant messages
          if (message.role === 'assistant' && message.content) {
            responseText = message.content;
            break;
          }
        }
      } else {
        console.log('No messages found in LangGraph response or invalid structure');
      }

      // Log API response
      addDebugEvent('success', 'LangGraph response received successfully',
        {
          responseLength: responseText.length,
          threadId: langGraphData.thread_id,
          isNewThread: langGraphData.is_new_thread,
          totalMessages: langGraphData.total_messages || 0
        },
        'fetch',
        { responseText: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '') }
      );

      // Add API response to UI
      const apiMessage = {
        id: `${conversationId}-${Date.now()}-response`,
        text: responseText,
        sender: 'api',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, apiMessage]);

      // Update status - completed
      setStatus({ icon: '✅', message: 'Response complete', isLoading: false });
      setTimeout(() => setStatus(null), 2000);

    } catch (error) {
      console.error('Error in handleSendMessage:', error);

      // Update status - error
      setStatus({ icon: '❌', message: `Error: ${error.message}`, isLoading: false });

      // Add error message to UI
      const errorText = `Error: ${error.message}. Make sure the LangGraph backend is running.`;
      const errorMessage = {
        id: `${conversationId}-${Date.now()}-error`,
        text: errorText,
        sender: 'api',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);

      setTimeout(() => setStatus(null), 5000);
    }
  };

  const handleConversationSelect = useCallback(async (convId: string) => {
    if (convId === conversationId) return; // Already selected

    try {
      setConversationId(convId);

      // Try to load from LangGraph first
      try {
        await loadMessagesFromLangGraph(convId);
      } catch (error) {
        // Fallback to localStorage
        loadMessages(convId);
      }
    } catch (error) {
      console.error('Error switching conversation:', error);
    }
  }, [conversationId]);

  const handleNewConversation = async (newConvId: string) => {
    try {
      setIsLoading(true);
      setConversationId(newConvId);

      // For LangGraph conversations, we'll start with an empty messages array
      // The conversation will be created when the first message is sent
      setMessages([]);

      // Add a welcome message to the UI only (not persisted until first user message)
      const welcomeMessage: string = "Welcome! I'm powered by LangGraph with MCP tools. Ask me anything!";

      const welcomeMessageObj = {
        id: `${newConvId}-welcome`,
        text: welcomeMessage,
        sender: 'api',
        timestamp: new Date()
      };

      setMessages([welcomeMessageObj]);
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
            threadId={conversationId}
          />
        </div>
      </div>
    </div>
  );
}