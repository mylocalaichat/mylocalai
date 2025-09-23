// Browser storage utility for MyLocalAI chat application
// Replaces PostgreSQL database with localStorage
const STORAGE_KEYS = {
  CONVERSATIONS: 'mylocalai_conversations',
  MESSAGES: 'mylocalai_messages',
  CONVERSATION_COUNTER: 'mylocalai_conversation_counter'
};

export const storageUtils = {
  // Conversation operations
  createConversation: () => {
    const conversations = storageUtils.getAllConversations();
    const counter = localStorage.getItem(STORAGE_KEYS.CONVERSATION_COUNTER) || '0';
    const newId = (parseInt(counter) + 1).toString();

    const newConversation = {
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    conversations.push(newConversation);
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    localStorage.setItem(STORAGE_KEYS.CONVERSATION_COUNTER, newId);

    return newConversation;
  },

  getAllConversations: () => {
    const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    const conversations = stored ? JSON.parse(stored) : [];

    // Add message counts
    return conversations.map(conv => {
      const messages = storageUtils.getMessagesByConversation(conv.id);
      return {
        ...conv,
        message_count: messages.length
      };
    }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  },

  getConversationById: (id) => {
    const conversations = storageUtils.getAllConversations();
    const conversation = conversations.find(conv => conv.id === id);

    if (!conversation) return null;

    const messages = storageUtils.getMessagesByConversation(id);
    return {
      ...conversation,
      messages: messages
    };
  },

  updateConversationTimestamp: (id) => {
    const conversations = storageUtils.getAllConversations();
    const index = conversations.findIndex(conv => conv.id === id);

    if (index !== -1) {
      conversations[index].updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    }
  },

  // Message operations
  addMessage: (conversationId, content, sender) => {
    const messages = storageUtils.getAllMessages();
    const messageId = Date.now().toString();

    const newMessage = {
      id: messageId,
      conversation_id: conversationId,
      content: content,
      sender: sender,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    messages.push(newMessage);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));

    // Update conversation timestamp
    storageUtils.updateConversationTimestamp(conversationId);

    return newMessage;
  },

  getAllMessages: () => {
    const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return stored ? JSON.parse(stored) : [];
  },

  getMessagesByConversation: (conversationId) => {
    const allMessages = storageUtils.getAllMessages();
    return allMessages
      .filter(msg => msg.conversation_id === conversationId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  },

  // Utility functions
  clearAllData: () => {
    localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    localStorage.removeItem(STORAGE_KEYS.CONVERSATION_COUNTER);
  },

  exportData: () => {
    return {
      conversations: storageUtils.getAllConversations(),
      messages: storageUtils.getAllMessages()
    };
  },

  importData: (data) => {
    if (data.conversations) {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(data.conversations));
    }
    if (data.messages) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(data.messages));
    }
  }
};