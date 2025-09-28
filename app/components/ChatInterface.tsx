import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ChatInterface.css';

const ChatInterface = ({ messages, onSendMessage, status, threadId, thinking }) => {
  const [showThinking, setShowThinking] = useState(true);
  const [copied, setCopied] = useState(false);
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
    if (isScrolledToBottom()) {
      scrollToBottom();
    }
  }, [messages]);


  const handleCopyThreadId = async () => {
    if (!threadId) return;

    try {
      await navigator.clipboard.writeText(threadId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy thread ID:', error);

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
        <div className="thread-info">
          <span className="thread-label">Thread:</span>
          <span
            className={`thread-id ${copied ? 'copied' : ''}`}
            onClick={handleCopyThreadId}
            title="Click to copy thread ID"
          >
            {threadId ? `${threadId.substring(0, 8)}...${threadId.slice(-4)}` : 'Loading...'}
          </span>
          <button
            className="copy-button"
            onClick={handleCopyThreadId}
            title="Copy thread ID"
          >
            📋
          </button>
          {copied && <span className="copy-feedback">Copied!</span>}
        </div>
        <div className="debug-toggle">
          <label className="debug-toggle-label">
            <input
              type="checkbox"
              checked={showThinking}
              onChange={(e) => setShowThinking(e.target.checked)}
              className="debug-toggle-checkbox"
            />
            <span className="debug-toggle-text">🤔 Show Thinking</span>
          </label>
        </div>
      </div>

      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.filter(message => message.text || message.thinking).map((message) => (
          <div key={message.id}>
            {message.thinking && showThinking && (
              <div className="thinking-display">
                <div className="thinking-header">
                  <span className="thinking-icon">🤔</span>
                  <span className="thinking-title">AI was thinking...</span>
                  {message.responseTime && (
                    <div className="response-time">
                      ⏱️ {message.responseTime}s
                    </div>
                  )}
                </div>
                <div className="thinking-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.thinking}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            {message.text && (
              <div
                className={`message ${message.sender === 'user' ? 'user' : 'api'}`}
              >
                <div className="message-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({node, inline, className, children, ...props}: any) {
                        return inline ? (
                          <code className="inline-code" {...props}>
                            {children}
                          </code>
                        ) : (
                          <pre className="code-block">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        )
                      },
                      pre({children, ...props}: any) {
                        return <div className="code-block-wrapper" {...props}>{children}</div>
                      },
                      // Customize links to open in new tab
                      a({href, children, ...props}: any) {
                        return (
                          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                            {children}
                          </a>
                        )
                      }
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                  {message.sender === 'api' && message.responseTime && (
                    <div className="response-time">
                      ⏱️ {message.responseTime}s
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatInterface;