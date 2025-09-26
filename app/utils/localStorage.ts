// Browser storage utility for MyLocalAI chat application
// Replaces PostgreSQL database with localStorage

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender: string;
  timestamp: string;
  created_at: string;
}

const STORAGE_KEYS = {
  CONVERSATIONS: 'mylocalai_conversations',
  MESSAGES: 'mylocalai_messages'
};

export const storageUtils = {
  // Conversation operations
  createConversation: (): Conversation => {
    const conversations = storageUtils.getAllConversations();
    const newId = crypto.randomUUID();

    const newConversation = {
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    conversations.push(newConversation);
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));

    return newConversation;
  },

  getAllConversations: (): Conversation[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    const conversations = stored ? JSON.parse(stored) : [];

    // Add message counts
    return conversations.map((conv: Conversation) => {
      const messages = storageUtils.getMessagesByConversation(conv.id);
      return {
        ...conv,
        message_count: messages.length
      };
    }).sort((a: Conversation, b: Conversation) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  getConversationById: (id: string): ConversationWithMessages | null => {
    const conversations = storageUtils.getAllConversations();
    const conversation = conversations.find((conv: Conversation) => conv.id === id);

    if (!conversation) return null;

    const messages = storageUtils.getMessagesByConversation(id);
    return {
      ...conversation,
      messages: messages
    };
  },

  updateConversationTimestamp: (id: string): void => {
    const conversations = storageUtils.getAllConversations();
    const index = conversations.findIndex((conv: Conversation) => conv.id === id);

    if (index !== -1) {
      conversations[index].updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    }
  },

  deleteConversation: (id: string): void => {
    // Remove conversation
    const conversations = storageUtils.getAllConversations();
    const filteredConversations = conversations.filter((conv: Conversation) => conv.id !== id);
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(filteredConversations));

    // Remove all messages for this conversation
    const allMessages = storageUtils.getAllMessages();
    const filteredMessages = allMessages.filter((msg: Message) => msg.conversation_id !== id);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(filteredMessages));
  },

  // Message operations
  addMessage: (conversationId: string, content: string, sender: string): Message => {
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

  getAllMessages: (): Message[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return stored ? JSON.parse(stored) : [];
  },

  getMessagesByConversation: (conversationId: string): Message[] => {
    const allMessages = storageUtils.getAllMessages();
    return allMessages
      .filter((msg: Message) => msg.conversation_id === conversationId)
      .sort((a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  // Utility functions
  clearAllData: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  },

  exportData: (): { conversations: Conversation[], messages: Message[] } => {
    return {
      conversations: storageUtils.getAllConversations(),
      messages: storageUtils.getAllMessages()
    };
  },

  importData: (data: { conversations?: Conversation[], messages?: Message[] }): void => {
    if (data.conversations) {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(data.conversations));
    }
    if (data.messages) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(data.messages));
    }
  }
};