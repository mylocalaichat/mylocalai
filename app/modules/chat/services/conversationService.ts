import { Message, SavedMessage, ConversationData } from '../types';
import { storageUtils } from '../utils/localStorage';

export class ConversationService {

  // Convert between internal Message type and storage format
  private convertToMessage(savedMessage: SavedMessage): Message {
    return {
      id: savedMessage.id,
      text: savedMessage.content,
      sender: savedMessage.sender,
      timestamp: new Date(savedMessage.timestamp)
    };
  }

  private convertToSavedMessage(conversationId: string, content: string, sender: 'user' | 'api' | 'system'): SavedMessage {
    const saved = storageUtils.addMessage(conversationId, content, sender);
    return {
      id: saved.id,
      content: saved.content,
      sender: saved.sender,
      timestamp: new Date(saved.timestamp)
    };
  }

  // Get all conversations
  getAllConversations(): ConversationData[] {
    return storageUtils.getAllConversations();
  }

  // Create a new conversation
  createConversation(): ConversationData {
    return storageUtils.createConversation();
  }

  // Load messages for a conversation
  loadMessages(conversationId: string): Message[] {
    try {
      const dbMessages = storageUtils.getMessagesByConversation(conversationId);
      return dbMessages.map(msg => this.convertToMessage(msg));
    } catch (error) {
      console.error('Error loading messages:', error);
      return [];
    }
  }

  // Save a message to a conversation
  async saveMessage(conversationId: string, content: string, sender: 'user' | 'api' | 'system'): Promise<Message | null> {
    try {
      const savedMessage = this.convertToSavedMessage(conversationId, content, sender);
      return this.convertToMessage(savedMessage);
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  }

  // Initialize conversation with welcome message
  async initializeConversation(): Promise<{ conversationId: string; messages: Message[] }> {
    try {
      // Check if there are existing conversations
      const existingConversations = this.getAllConversations();

      if (existingConversations.length > 0) {
        // Load the most recent conversation
        const recentConversation = existingConversations[0];
        const messages = this.loadMessages(recentConversation.id);
        return {
          conversationId: recentConversation.id,
          messages
        };
      } else {
        // Create a new conversation
        const conversation = this.createConversation();
        return {
          conversationId: conversation.id,
          messages: []
        };
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
      // Fallback to creating a new conversation
      const conversation = this.createConversation();
      return {
        conversationId: conversation.id,
        messages: []
      };
    }
  }

  // Add welcome message to a conversation
  async addWelcomeMessage(conversationId: string, ollamaStatus: { success: boolean; message?: string }): Promise<Message | null> {
    let welcomeMessage: string;

    if (ollamaStatus.success) {
      welcomeMessage = "Welcome! I'm powered by Ollama and storing chats in browser storage. Ask me anything!";
    } else {
      welcomeMessage = `Welcome! I'm ready to chat, but I need Ollama to be running first.

${ollamaStatus.message}`;
    }

    return await this.saveMessage(conversationId, welcomeMessage, 'api');
  }

  // Add welcome message for new conversation
  async addNewConversationWelcome(conversationId: string, ollamaStatus: { success: boolean; message?: string }): Promise<Message | null> {
    let welcomeMessage: string;

    if (ollamaStatus.success) {
      welcomeMessage = "Welcome to a new conversation! I'm powered by Ollama and ready to help. Ask me anything!";
    } else {
      welcomeMessage = `Welcome to a new conversation! I need Ollama to be running first.

${ollamaStatus.message}`;
    }

    return await this.saveMessage(conversationId, welcomeMessage, 'api');
  }

  // Build conversation history for AI context
  buildConversationHistory(messages: Message[]): string[] {
    return messages
      .filter(msg => msg.sender !== 'system')
      .map(msg => `${msg.sender === 'user' ? 'Human' : 'Assistant'}: ${msg.text}`);
  }
}