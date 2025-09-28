'use client'

import React, { useState, useEffect, useCallback } from 'react';
import ChatInterface from './components/ChatInterface';
import MessageInput from './components/MessageInput';
import ChatList from './components/ChatList';
import StatusBanner from './components/StatusBanner';
import { storageUtils } from './utils/localStorage';
import { parseThinkingTags } from './utils/thinkingParser';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [status, setStatus] = useState(null);
  const [currentThinking, setCurrentThinking] = useState('');

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
          welcomeMessage = "Hi there! I'm your AI assistant powered by LangGraph with real-time tools including web search, web scraping, and more. I'm here to help with questions, research, current events, or anything else you need. What can I assist you with today?";
        } else {
          welcomeMessage = `Hi! I'm your AI assistant, but I need Ollama to be running first to help you properly.

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

        const formattedMessages = langGraphMessages.map((msg, index) => {
          if (msg.role === 'user') {
            // User messages don't have thinking content
            return {
              id: `${threadId}-${index}`,
              text: msg.content,
              sender: 'user',
              timestamp: new Date()
            };
          } else {
            // AI messages - parse thinking content
            const { thinking, content } = parseThinkingTags(msg.content);
            return {
              id: `${threadId}-${index}`,
              text: content,
              thinking: thinking,
              sender: 'api',
              timestamp: new Date()
            };
          }
        });

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
      const formattedMessages = dbMessages.map(msg => {
        if (msg.sender === 'user') {
          // User messages don't have thinking content
          return {
            id: msg.id,
            text: msg.content,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp)
          };
        } else {
          // AI messages - parse thinking content
          const { thinking, content } = parseThinkingTags(msg.content);
          return {
            id: msg.id,
            text: content,
            thinking: thinking,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp)
          };
        }
      });
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


  const checkOllamaStatus = async () => {
    try {
      const ollamaUrl = getOllamaUrl();


      // Check if Ollama is running
      const healthResponse = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!healthResponse.ok) {
        throw new Error('Ollama service not responding');
      }

      const data = await healthResponse.json();
      const models = data.models || [];


      // Check if required model is available
      const requiredModel = 'qwen3:4b';
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
ollama pull qwen3:4b
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

The required model (qwen3:4b) is not installed.

**Install the model:**
\`\`\`bash
ollama pull qwen3:4b
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

    const startTime = Date.now(); // Track start time for response timing

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

      // Check if this is the first user message in the conversation
      const existingUserMessages = messages.filter(msg => msg.sender === 'user');
      const isFirstUserMessage = existingUserMessages.length === 0;

      let conversationMessages;

      if (isFirstUserMessage) {
        // First message: Include system prompt + all conversation history + current message

        conversationMessages = messages
          .filter(msg => msg.sender !== 'system')
          .map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }));

        // Add the current user message
        conversationMessages.push({
          role: 'user',
          content: message
        });

        // Add system prompt at the beginning with current date
        const systemPrompt = `Current Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

You are an intelligent, helpful, and engaging AI assistant with access to real-time web search, web scraping, and other powerful tools. Your goal is to provide exceptional assistance that goes beyond static knowledge.

THINKING PROCESS:
- When you need to reason through a problem or plan your approach, wrap your internal reasoning in <think></think> tags
- Your thinking will be displayed separately to help users understand your process
- Example: <think>The user is asking about X, so I should first search for recent information about Y, then explain Z.</think>

CORE BEHAVIORS:
- Be conversational, friendly, and personable - like talking to a knowledgeable friend
- Always prioritize accuracy and helpfulness over speed
- Show enthusiasm for helping and learning alongside the user
- Admit when you're uncertain and use tools to find accurate information

TOOL USAGE (CRITICAL - ABSOLUTELY MANDATORY):
- **NEVER make up or guess information** - if you don't know something current, SEARCH FOR IT
- **ALWAYS search first** for ANY questions about current events, people in office, recent news, or facts that could change
- **Presidents, politicians, current events**: MUST search - never rely on training data
- **Companies, stocks, weather, sports**: MUST search for current information
- **When asked "who is the current..."** ALWAYS use google_search tool first
- **Never claim to search without actually using the google_search tool**
- If unsure whether to search: SEARCH. Better to search unnecessarily than give wrong info
- **enableScraping parameter**: Use sparingly! Only set to true when you need to dive deep into specific page content. Default should be false for basic searches.

RESPONSE STYLE:
- Start responses naturally, don't announce tool usage unless explaining why
- Explain complex topics clearly with examples when helpful
- Provide comprehensive answers that anticipate follow-up questions
- Include relevant details and context from your searches
- End with engaging follow-up questions when appropriate

Remember: Your tools give you superpowers - use them! Users expect current, accurate information, not outdated training data.`;

        conversationMessages.unshift({
          role: 'system',
          content: systemPrompt
        });
      } else {
        // Subsequent messages: Include system prompt to maintain tool awareness
        const systemPrompt = `Current Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

You are an intelligent, helpful, and engaging AI assistant with access to real-time web search, web scraping, and other powerful tools. Your goal is to provide exceptional assistance that goes beyond static knowledge.

THINKING PROCESS:
- When you need to reason through a problem or plan your approach, wrap your internal reasoning in <think></think> tags
- Your thinking will be displayed separately to help users understand your process
- Example: <think>The user is asking about X, so I should first search for recent information about Y, then explain Z.</think>

CORE BEHAVIORS:
- Be conversational, friendly, and personable - like talking to a knowledgeable friend
- Always prioritize accuracy and helpfulness over speed
- Show enthusiasm for helping and learning alongside the user
- Admit when you're uncertain and use tools to find accurate information

TOOL USAGE (CRITICAL - ABSOLUTELY MANDATORY):
- **NEVER make up or guess information** - if you don't know something current, SEARCH FOR IT
- **ALWAYS search first** for ANY questions about current events, people in office, recent news, or facts that could change
- **Presidents, politicians, current events**: MUST search - never rely on training data
- **Companies, stocks, weather, sports**: MUST search for current information
- **When asked "who is the current..."** ALWAYS use google_search tool first
- **Never claim to search without actually using the google_search tool**
- If unsure whether to search: SEARCH. Better to search unnecessarily than give wrong info
- **enableScraping parameter**: Use sparingly! Only set to true when you need to dive deep into specific page content. Default should be false for basic searches.

RESPONSE STYLE:
- Start responses naturally, don't announce tool usage unless explaining why
- Explain complex topics clearly with examples when helpful
- Provide comprehensive answers that anticipate follow-up questions
- Include relevant details and context from your searches
- End with engaging follow-up questions when appropriate

Remember: Your tools give you superpowers - use them! Users expect current, accurate information, not outdated training data.`;

        conversationMessages = [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ];
      }

      // Update status - calling LangGraph
      setStatus({ icon: '🤖', message: 'Processing with LangGraph agent', isLoading: true });


      // Create SSE connection for streaming response
      const sseUrl = new URL('/langraph_backend', window.location.origin);

      const response = await fetch(sseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          model: 'qwen3:4b',
          messages: conversationMessages,
          thread_id: conversationId
        })
      });

      if (!response.ok) {
        throw new Error(`LangGraph HTTP error! status: ${response.status}`);
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let responseText = '';
      let langGraphData = {
        thread_id: conversationId,
        is_new_thread: false,
        messages: [],
        total_messages: 0
      };
      let streamingMessageId = null;

      if (reader) {


        // Prepare streaming message ID but don't add empty message yet
        streamingMessageId = `${conversationId}-streaming-${Date.now()}`;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6));

                  switch (eventData.type) {
                    case 'start':
                      // Update status - streaming started
                      setStatus({ icon: '🤖', message: 'Streaming response...', isLoading: true });
                      // Update langGraphData with initial info
                      langGraphData.thread_id = eventData.thread_id || conversationId;
                      langGraphData.is_new_thread = eventData.is_new_thread || false;
                      break;

                    case 'delta':
                      // Update streaming content
                      responseText += eventData.content;

                      // Parse thinking tags from the current response
                      const { thinking, content } = parseThinkingTags(responseText);

                      // Update thinking state if we have thinking content
                      if (thinking) {
                        setCurrentThinking(thinking);
                      }

                      // Create or update streaming message
                      setMessages(prev => {
                        const existingMessage = prev.find(msg => msg.id === streamingMessageId);
                        if (existingMessage) {
                          // Update existing message
                          return prev.map(msg =>
                            msg.id === streamingMessageId
                              ? { ...msg, text: content, thinking: thinking }
                              : msg
                          );
                        } else {
                          // Create new streaming message
                          const streamingMessage = {
                            id: streamingMessageId,
                            text: content,
                            thinking: thinking,
                            sender: 'api',
                            timestamp: new Date()
                          };
                          return [...prev, streamingMessage];
                        }
                      });
                      break;

                    case 'tool_call':
                      // Update status for tool usage
                      setStatus({ icon: '🔍', message: eventData.message, isLoading: true });
                      break;

                    case 'complete':
                      // Final response received
                      langGraphData = eventData;
                      // Extract final response from complete data
                      if (eventData.messages && eventData.messages.length > 0) {
                        for (let i = eventData.messages.length - 1; i >= 0; i--) {
                          const message = eventData.messages[i];
                          if (message.role === 'assistant' && message.content) {
                            responseText = message.content;
                            break;
                          }
                        }
                      }
                      break;

                    case 'error':
                      throw new Error(eventData.error);
                  }
                } catch (parseError) {
                  // Ignore parsing errors for incomplete chunks
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      if (!responseText) {
        responseText = 'No response received from LangGraph agent';
      }


      // Parse final response for thinking content
      const { thinking: finalThinking, content: finalContent } = parseThinkingTags(responseText);

      // Calculate response time
      const endTime = Date.now();
      const responseTime = ((endTime - startTime) / 1000).toFixed(1); // Convert to seconds with 1 decimal

      // Replace streaming message with final message including thinking content and response time
      if (streamingMessageId) {
        // Update the streaming message with final content and thinking
        setMessages(prev => prev.map(msg =>
          msg.id === streamingMessageId
            ? {
                ...msg,
                text: finalContent,
                thinking: finalThinking,
                responseTime: responseTime,
                id: `${conversationId}-${Date.now()}-response`
              }
            : msg
        ));
      } else {
        // Fallback: add as new message if streaming failed
        const apiMessage = {
          id: `${conversationId}-${Date.now()}-response`,
          text: finalContent,
          thinking: finalThinking,
          responseTime: responseTime,
          sender: 'api',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, apiMessage]);
      }

      // Update status - completed
      setStatus({ icon: '✅', message: 'Response complete', isLoading: false });
      setTimeout(() => setStatus(null), 2000);

      // If this was a new thread, refresh the chat list to show the first message

      if (langGraphData.is_new_thread) {
        // Also dispatch the first user message for immediate UI update
        const firstUserMessage = conversationMessages.find(msg => msg.role === 'user')?.content || message;

        setTimeout(() => {
          // Trigger a custom event to refresh the chat list with the first message
          window.dispatchEvent(new CustomEvent('refreshChatList', {
            detail: {
              threadId: conversationId,
              firstMessage: firstUserMessage
            }
          }));
        }, 1000); // Small delay to ensure conversation is saved
      } else {
      }

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

      // Clear thinking state when switching conversations
      setCurrentThinking('');

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

      // Clear thinking state when starting new conversation
      setCurrentThinking('');

      // For LangGraph conversations, we'll start with an empty messages array
      // The conversation will be created when the first message is sent
      setMessages([]);

      // Add a welcome message to the UI only (not persisted until first user message)
      const welcomeMessage: string = "Hi there! I'm your AI assistant powered by LangGraph with real-time tools including web search, web scraping, and more. I'm here to help with questions, research, current events, or anything else you need. What can I assist you with today?";

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
          <div className="chat-area">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              status={status}
              threadId={conversationId}
              thinking={currentThinking}
            />
            <MessageInput
              onSendMessage={handleSendMessage}
              status={status}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}