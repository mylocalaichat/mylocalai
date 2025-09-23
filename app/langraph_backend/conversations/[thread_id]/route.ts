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

        // Get the latest checkpoint to retrieve the full conversation state
        const conversationState = await checkpointer.get(config);

        if (!conversationState) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        return NextResponse.json({
            thread_id,
            conversation: {
                messages: conversationState?.channel_values?.messages || [],
                checkpoint_id: conversationState.config?.configurable?.checkpoint_id,
                metadata: conversationState.metadata
            }
        });
    } catch (error) {
        console.error('Error getting conversation:', error);
        return NextResponse.json({ error: 'Failed to get conversation' }, { status: 500 });
    }
}