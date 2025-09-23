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

        // Get all checkpoints for this thread to build message history
        const checkpointHistory = [];
        for await (const checkpoint of checkpointer.list(config)) {
            checkpointHistory.push(checkpoint);
        }

        return NextResponse.json({
            thread_id,
            conversation: {
                messages: conversationState?.channel_values?.messages || [],
                checkpoint_id: conversationState.checkpoint?.id,
                metadata: conversationState.metadata,
                history_count: checkpointHistory.length,
                current_state: conversationState.channel_values
            }
        });
    } catch (error) {
        console.error('Error getting conversation:', error);
        return NextResponse.json({ error: 'Failed to get conversation' }, { status: 500 });
    }
}