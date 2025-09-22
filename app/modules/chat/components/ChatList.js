import React, { useState, useEffect } from 'react';
import { storageUtils } from '../utils/localStorage';
import './ChatList.css';

const ChatList = ({ currentConversationId, onConversationSelect, onNewConversation, isCollapsed, onToggleCollapse }) => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const data = storageUtils.getAllConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const newConversation = storageUtils.createConversation();
      setConversations(prev => [newConversation, ...prev]);
      onNewConversation(newConversation.id);
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear all conversations and messages? This cannot be undone.')) {
      storageUtils.clearAllData();
      setConversations([]);
      // Trigger a page reload to reinitialize with a fresh conversation
      window.location.reload();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getConversationPreview = (conversation) => {
    if (conversation.message_count === 0) {
      return 'New conversation';
    }
    return `${conversation.message_count} message${conversation.message_count !== 1 ? 's' : ''}`;
  };

  return (
    <div className={`chat-list ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="chat-list-header">
        <div className="chat-list-title">
          <span className="chat-list-icon">◐</span>
          {!isCollapsed && <span className="title-text">Conversations</span>}
        </div>
        <div className="header-buttons">
          {!isCollapsed && (
            <>
              <button
                className="new-chat-button"
                onClick={handleNewChat}
                title="Start new conversation"
              >
                <span className="plus-icon">+</span>
              </button>
              <button
                className="clear-cache-button"
                onClick={handleClearCache}
                title="Clear all conversations"
              >
                <span className="clear-icon">×</span>
              </button>
            </>
          )}
          <button
            className="collapse-button"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="collapse-icon">
              {isCollapsed ? '▶' : '◀'}
            </span>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="conversations-container">
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Loading conversations...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">○</span>
              <p>No conversations yet</p>
              <button
                className="start-chat-button"
                onClick={handleNewChat}
              >
                Start your first chat
              </button>
            </div>
          ) : (
            <div className="conversations-list">
              {conversations.map(conversation => (
                <div
                  key={conversation.id}
                  className={`conversation-item ${
                    currentConversationId === conversation.id ? 'active' : ''
                  }`}
                  onClick={() => onConversationSelect(conversation.id)}
                >
                  <div className="conversation-main">
                    <div className="conversation-title">
                      Chat #{conversation.id}
                    </div>
                    <div className="conversation-preview">
                      {getConversationPreview(conversation)}
                    </div>
                  </div>
                  <div className="conversation-meta">
                    <div className="conversation-date">
                      {formatDate(conversation.updated_at)}
                    </div>
                    {conversation.message_count > 0 && (
                      <div className="message-count-badge">
                        {conversation.message_count}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isCollapsed && (
        <div className="collapsed-content">
          <div className="collapsed-new-chat">
            <button
              className="collapsed-new-chat-button"
              onClick={handleNewChat}
              title="Start new conversation"
            >
              <span className="plus-icon">+</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatList;