import React, { useState, useRef, useCallback } from 'react';

const MessageInput = ({ onSendMessage, status, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const message = inputRef.current?.value?.trim();
    if (!message || isLoading) return;

    inputRef.current.value = '';
    setInputValue('');

    try {
      await onSendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [isLoading, onSendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const handleInputResize = useCallback((e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  }, []);

  return (
    <form className="message-form" onSubmit={handleSubmit}>
      <div className="input-container">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here..."
          className="message-input"
          disabled={isLoading}
          rows={1}
          style={{
            minHeight: '44px',
            maxHeight: '200px',
            height: 'auto',
            resize: 'none',
            overflow: 'hidden'
          }}
          onInput={handleInputResize}
        />
        <button
          type="submit"
          className="send-button"
          disabled={isLoading || !inputValue.trim()}
        >
          Send
        </button>
      </div>
      {status && (
        <div className="status-bar">
          <span className="status-icon">{status.icon}</span>
          <span className="status-text">{status.message}</span>
        </div>
      )}
    </form>
  );
};

export default MessageInput;