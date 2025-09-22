import React, { useState, useRef, useEffect } from 'react';
import './ChatInterface.css';

const ChatInterface = ({ messages, onSendMessage, status }) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);
    const message = inputValue.trim();
    setInputValue('');

    try {
      await onSendMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon">💬</span>
          Chat Interface
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

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          className="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
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