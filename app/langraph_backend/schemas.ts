import { z } from 'zod';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

// Message schema
export const MessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1, 'Content cannot be empty')
});

// Request body schema
export const LangGraphRequestSchema = z.object({
    model: z.string().min(1, 'Model is required'),
    messages: z.array(MessageSchema).min(1, 'Messages array must not be empty'),
    thread_id: z.string().min(1).optional()
});

// Type exports for TypeScript
export type Message = z.infer<typeof MessageSchema>;
export type LangGraphRequest = z.infer<typeof LangGraphRequestSchema>;

// Helper function to convert our message format to LangChain format
export function convertToLangChainMessages(messages: Message[]) {
    return messages.map(msg => {
        switch (msg.role) {
            case 'user':
                return new HumanMessage(msg.content);
            case 'assistant':
                return new AIMessage(msg.content);
            case 'system':
                return new SystemMessage(msg.content);
            default:
                throw new Error(`Unknown message role: ${msg.role}`);
        }
    });
}