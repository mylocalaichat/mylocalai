import { NextRequest, NextResponse } from 'next/server';
import { getCheckpointer } from "../../lib/checkpointer";

export async function GET(req: NextRequest, { params }: { params: { thread_id: string } }) {
    try {
        const { thread_id } = params;

        if (!thread_id) {
            return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
        }

        const checkpointer = getCheckpointer();

        // Get the conversation history for the specific thread
        const config = { configurable: { thread_id } };

        // Get the conversation history for the specific thread
        const conversationState = await checkpointer.get(config);

        if (!conversationState) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        console.log('Conversation state:', conversationState);

        // Convert LangChain messages to the format expected by create conversation
        const messages = [];
        const langchainMessages = conversationState?.channel_values?.messages || [];

        for (const message of langchainMessages) {
            let role = 'user';
            let content = '';

            // Handle different message formats
            if (message._getType) {
                // LangChain message objects
                switch (message._getType()) {
                    case 'human':
                        role = 'user';
                        break;
                    case 'ai':
                        role = 'assistant';
                        break;
                    case 'system':
                        role = 'system';
                        break;
                }
                content = message.content || '';
            } else if (message.type) {
                // Plain message objects
                switch (message.type) {
                    case 'human':
                        role = 'user';
                        break;
                    case 'ai':
                        role = 'assistant';
                        break;
                    case 'system':
                        role = 'system';
                        break;
                }
                content = message.content || '';
            } else if (message.role) {
                // Already in the correct format
                role = message.role;
                content = message.content || '';
            }

            messages.push({
                role,
                content
            });
        }

        return NextResponse.json({
            thread_id,
            messages,
            total_messages: messages.length
        });
    } catch (error) {
        console.error('Error getting conversation:', error);
        return NextResponse.json({ error: 'Failed to get conversation' }, { status: 500 });
    }
}