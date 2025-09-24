import React, { useState, useRef, useEffect } from 'react';
import './ChatInterface.css';

const ChatInterface = ({ messages, onSendMessage, status, debugData, threadId }) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addDebugLog = (type, message, details = null, functionName = null, args = null) => {
    if (isDebugMode) {
      const logEntry = {
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        type,
        message,
        details,
        functionName,
        args
      };
      setDebugLogs(prev => [...prev.slice(-9), logEntry]); // Keep last 10 logs
    }
  };

  const toggleLogExpansion = (logId) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const isScrolledToBottom = () => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop <= clientHeight + 5; // 5px threshold
  };

  useEffect(() => {
    // Only auto-scroll if user is already at the bottom
    if (isScrolledToBottom()) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (status && status.message) {
      const logType = status.icon === '❌' ? 'error' : status.icon === '✅' ? 'success' : 'info';
      addDebugLog(logType, status.message, { isLoading: status.isLoading }, 'statusUpdate', { icon: status.icon, isLoading: status.isLoading });
    }
  }, [status, isDebugMode]);

  useEffect(() => {
    if (debugData && isDebugMode) {
      addDebugLog(
        debugData.type || 'info',
        debugData.message,
        debugData.details,
        debugData.functionName,
        debugData.args
      );
    }
  }, [debugData, isDebugMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);
    const message = inputValue.trim();
    setInputValue('');

    addDebugLog('info', 'Message submitted', { messageLength: message.length }, 'handleSubmit', { message: message.substring(0, 50) + (message.length > 50 ? '...' : '') });

    try {
      await onSendMessage(message);
      addDebugLog('success', 'Message sent successfully', null, 'onSendMessage', { messageLength: message.length });
    } catch (error) {
      addDebugLog('error', 'Failed to send message', { error: error.message }, 'onSendMessage', { message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopyThreadId = async () => {
    if (!threadId) return;

    try {
      await navigator.clipboard.writeText(threadId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addDebugLog('success', 'Thread ID copied to clipboard', { threadId }, 'handleCopyThreadId', { length: threadId.length });
    } catch (error) {
      console.error('Failed to copy thread ID:', error);
      addDebugLog('error', 'Failed to copy thread ID', { error: error.message }, 'handleCopyThreadId', { threadId });

      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = threadId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
      }
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon">💬</span>
          <div className="title-content">
            <div className="main-title">Chat Interface</div>
            {threadId && (
              <div className="thread-id">
                <span className="thread-label">Thread:</span>
                <span className="thread-value">{threadId.substring(0, 8)}...{threadId.substring(threadId.length - 4)}</span>
                <button
                  className="thread-copy-button"
                  onClick={handleCopyThreadId}
                  title={copied ? "Copied!" : "Copy full thread ID"}
                >
                  {copied ? "✓" : "📋"}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="debug-toggle">
          <label className="debug-toggle-label">
            <input
              type="checkbox"
              checked={isDebugMode}
              onChange={(e) => setIsDebugMode(e.target.checked)}
              className="debug-toggle-checkbox"
            />
            <span className="debug-toggle-text">🐛 Debug Mode</span>
          </label>
        </div>
      </div>

      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender === 'user' ? 'user' : 'api'}`}
          >
            {message.text}
          </div>
        ))}
        {isLoading && (
          <div className="message api loading">
            <span>Thinking</span>
            <span className="loading-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isDebugMode && (
        <div className="debug-panel">
          <div className="debug-header">
            <span className="debug-icon">🔍</span>
            Debug Information
          </div>
          <div className="debug-content">
            <div className="debug-section">
              <h4>API Calls & Events</h4>
              <div className="debug-calls">
                {debugLogs.length === 0 ? (
                  <div className="debug-empty">No debug logs yet. Start chatting to see API calls and events.</div>
                ) : (
                  debugLogs.map((log) => {
                    const isExpanded = expandedLogs.has(log.id);
                    const hasExpandableContent = (log.args && JSON.stringify(log.args).length > 100) ||
                                                (log.details && JSON.stringify(log.details).length > 100);

                    return (
                      <div key={log.id} className={`debug-call-item debug-${log.type}`}>
                        <div className="debug-call-header">
                          <span className="debug-timestamp">{log.timestamp.toLocaleTimeString()}</span>
                          <span className="debug-type">{log.type.toUpperCase()}</span>
                          {log.functionName && (
                            <span className="debug-function">{log.functionName}()</span>
                          )}
                          {hasExpandableContent && (
                            <button
                              className="debug-expand-btn"
                              onClick={() => toggleLogExpansion(log.id)}
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? '🔽' : '▶️'}
                            </button>
                          )}
                        </div>
                        <div className="debug-call-body">
                          <span className="debug-message">{log.message}</span>
                          {log.args && (
                            <div className="debug-args">
                              <span className="debug-args-label">Args:</span>
                              <div className="debug-expandable-content">
                                {isExpanded ? (
                                  <pre className="debug-json-full">{JSON.stringify(log.args, null, 2)}</pre>
                                ) : (
                                  <span className="debug-args-value">
                                    {JSON.stringify(log.args).substring(0, 100)}
                                    {JSON.stringify(log.args).length > 100 ? '...' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {log.details && (
                            <div className="debug-details-row">
                              <span className="debug-details-label">Details:</span>
                              <div className="debug-expandable-content">
                                {isExpanded ? (
                                  <pre className="debug-json-full">{JSON.stringify(log.details, null, 2)}</pre>
                                ) : (
                                  <span className="debug-details">
                                    {JSON.stringify(log.details).substring(0, 100)}
                                    {JSON.stringify(log.details).length > 100 ? '...' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          className="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here..."
          rows="1"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!inputValue.trim() || isLoading}
        >
          Send
        </button>
      </form>

      {/* Persistent Status Indicator */}
      <div className="status-indicator">
        <div className="status-content">
          {status && status.message ? (
            <>
              <span className="status-icon">{status.icon}</span>
              <span className="status-text">{status.message}</span>
              {status.isLoading && (
                <span className="status-loading">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              )}
            </>
          ) : (
            <span className="status-text status-ready">Ready</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;