'use client'

import React, { useState, useEffect, useCallback } from 'react';
import ChatInterface from '../components/ChatInterface';
import ChatList from '../components/ChatList';
import StatusBanner from '../components/StatusBanner';
import { ConversationService } from '../services/conversationService';
import { OllamaService } from '../services/ollamaService';
import { DebugService } from '../services/debugService';
import { Message, StatusUpdate, DebugEvent } from '../types';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [status, setStatus] = useState<StatusUpdate | null>(null);
  const [debugData, setDebugData] = useState<DebugEvent | null>(null);

  // Initialize services
  const conversationService = new ConversationService();
  const ollamaService = new OllamaService();
  const debugService = new DebugService();

  // Initialize conversation on app load
  useEffect(() => {
    // Set up debug callback
    debugService.setDebugCallback(setDebugData);
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    try {
      setIsLoading(true);
      const result = await conversationService.initializeConversation();
      setConversationId(result.conversationId);
      setMessages(result.messages);

      // Add welcome message if no messages exist
      if (result.messages.length === 0) {
        const ollamaStatus = await ollamaService.checkOllamaStatus();
        const welcomeMessage = await conversationService.addWelcomeMessage(result.conversationId, ollamaStatus);
        if (welcomeMessage) {
          setMessages([welcomeMessage]);
        }
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
      setMessages([{
        id: Date.now().toString(),
        text: "Error initializing conversation. Please try again.",
        sender: 'api',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = (convId: string) => {
    try {
      const messages = conversationService.loadMessages(convId);
      setMessages(messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const saveMessage = async (convId: string, content: string, sender: 'user' | 'api' | 'system') => {
    return await conversationService.saveMessage(convId, content, sender);
  };


  const handleSendMessage = async (message: string) => {
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
      const ollamaStatus = await ollamaService.checkOllamaStatus();
      if (!ollamaStatus.success) {
        setStatus({ icon: '❌', message: 'Ollama not available', isLoading: false });
        const errorMessage = await saveMessage(conversationId, ollamaStatus.message || 'Ollama service unavailable', 'api');
        if (errorMessage) {
          setMessages(prev => [...prev, errorMessage]);
        }
        setTimeout(() => setStatus(null), 3000);
        return;
      }

      // Update status - preparing request
      setStatus({ icon: '⚡', message: 'Preparing request with conversation history', isLoading: true });

      // Build conversation history for context
      const conversationHistory = conversationService.buildConversationHistory(messages);

      // Update status - calling LLM
      setStatus({ icon: '🤖', message: 'Waiting for LLM response', isLoading: true });

      // Log API request
      debugService.logApiRequest(
        `${ollamaService.getOllamaUrl()}/api/generate`,
        'POST',
        'llama3.1:8b',
        conversationHistory.join('\n\n').length + message.length
      );

      // Call Ollama API with conversation history
      const responseText = await ollamaService.generateWithConversation(message, conversationHistory);

      // Log API response
      debugService.logApiResponse(
        responseText.length,
        'llama3.1:8b',
        responseText
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus({ icon: '❌', message: `Error: ${errorMessage}`, isLoading: false });

      // Save error message to database
      const errorText = `Error: ${errorMessage}. Make sure Ollama is running locally.`;
      const errorMsg = await saveMessage(conversationId, errorText, 'api');
      if (errorMsg) {
        setMessages(prev => [...prev, errorMsg]);
      }

      setTimeout(() => setStatus(null), 5000);
    }
  };

  const handleConversationSelect = useCallback((convId: string) => {
    if (convId === conversationId) return; // Already selected

    try {
      setConversationId(convId);
      loadMessages(convId);
    } catch (error) {
      console.error('Error switching conversation:', error);
    }
  }, [conversationId]);

  const handleNewConversation = async (newConvId: string) => {
    try {
      setIsLoading(true);
      setConversationId(newConvId);

      // Check Ollama status and add appropriate welcome message
      const ollamaStatus = await ollamaService.checkOllamaStatus();
      const welcomeMessage = await conversationService.addNewConversationWelcome(newConvId, ollamaStatus);

      if (welcomeMessage) {
        setMessages([welcomeMessage]);
      } else {
        loadMessages(newConvId);
      }
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