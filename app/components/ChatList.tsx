import React, { useState, useEffect } from 'react';
import { storageUtils } from '../utils/localStorage';
import './ChatList.css';

const ChatList = ({ currentConversationId, onConversationSelect, onNewConversation, isCollapsed, onToggleCollapse }) => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(null);

  useEffect(() => {
    loadConversations();

    // Listen for refresh events from the main page
    const handleRefreshChatList = (event: any) => {

      // If we have specific conversation details, update immediately
      if (event.detail && event.detail.threadId && event.detail.firstMessage) {
        const { threadId, firstMessage } = event.detail;

        // Update the specific conversation in the list immediately
        setConversations(prev => prev.map(conv =>
          conv.id === threadId
            ? { ...conv, title: firstMessage, updated_at: new Date().toISOString() }
            : conv
        ));
      }

      // Also refresh from backend to get the complete updated list
      loadConversations();
    };

    window.addEventListener('refreshChatList', handleRefreshChatList);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('refreshChatList', handleRefreshChatList);
    };
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);

      // Try to get conversations from LangGraph backend
      const response = await fetch('/langraph_backend/conversations');
      if (response.ok) {
        const data = await response.json();
        const langGraphConversations = data.conversations || [];

        // Transform LangGraph conversation format to match ChatList expectations
        const transformedConversations = langGraphConversations.map(conv => ({
          id: conv.thread_id,
          updated_at: conv.created_at,
          message_count: 1, // We'll update this when we have access to full message history
          title: conv.first_user_question || 'New conversation'
        }));

        setConversations(transformedConversations);
      } else {
        // Fallback to localStorage
        const data = storageUtils.getAllConversations();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Fallback to localStorage on error
      const data = storageUtils.getAllConversations();
      setConversations(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      // Generate a new UUID for the thread_id
      const newThreadId = crypto.randomUUID();

      // Create conversation entry for immediate UI feedback
      const newConversation = {
        id: newThreadId,
        updated_at: new Date().toISOString(),
        message_count: 0,
        title: 'New conversation'
      };

      setConversations(prev => [newConversation, ...prev]);
      onNewConversation(newThreadId);
    } catch (error) {
      // Fallback to localStorage method
      const newConversation = storageUtils.createConversation();
      setConversations(prev => [newConversation, ...prev]);
      onNewConversation(newConversation.id);
    }
  };

  const handleDeleteConversation = async (conversationId, event) => {
    // Prevent the conversation selection when clicking delete
    event.stopPropagation();

    if (window.confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
      try {
        setDeletingConversation(conversationId);

        // Delete from LangGraph backend
        const response = await fetch(`/langraph_backend/conversations/${conversationId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
        }

        // Also clear from localStorage as fallback
        storageUtils.deleteConversation(conversationId);

        // Remove from local state
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));

        // If this was the current conversation, reload the page to reset
        if (conversationId === currentConversationId) {
          window.location.reload();
        }

      } catch (error) {

        // Fallback to localStorage deletion
        storageUtils.deleteConversation(conversationId);
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));

        if (conversationId === currentConversationId) {
          window.location.reload();
        }
      } finally {
        setDeletingConversation(null);
      }
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear all conversations and messages? This cannot be undone.')) {
      try {
        setIsDeleting(true);

        // Delete all conversations from LangGraph backend
        const deletePromises = conversations.map(async (conversation) => {
          try {
            const response = await fetch(`/langraph_backend/conversations/${conversation.id}`, {
              method: 'DELETE'
            });

            if (!response.ok) {
            } else {
            }
          } catch (error) {
          }
        });

        // Wait for all delete operations to complete
        await Promise.allSettled(deletePromises);

        // Also clear localStorage as fallback
        storageUtils.clearAllData();

        // Clear the conversations list
        setConversations([]);
        setIsDeleting(false);

        // Trigger a page reload to reinitialize with a fresh conversation
        window.location.reload();

      } catch (error) {

        // Fallback to localStorage clearing if API calls fail
        storageUtils.clearAllData();
        setConversations([]);
        setIsDeleting(false);
        window.location.reload();
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
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
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="loading-spinner" style={{ fontSize: '12px' }}>⏳</span>
                ) : (
                  <span className="clear-icon">×</span>
                )}
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
                  <button
                    className="delete-conversation-button"
                    onClick={(event) => handleDeleteConversation(conversation.id, event)}
                    disabled={deletingConversation === conversation.id}
                    title="Delete conversation"
                  >
                    {deletingConversation === conversation.id ? (
                      <span className="deleting-spinner">⏳</span>
                    ) : (
                      <span className="delete-icon">×</span>
                    )}
                  </button>
                  <div className="conversation-main">
                    <div className="conversation-title">
                      {conversation.title && conversation.title !== 'New conversation' ?
                        (conversation.title.length > 30 ?
                          conversation.title.substring(0, 30) + '...' :
                          conversation.title) :
                        `Chat #${conversation.id.substring(0, 8)}`
                      }
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