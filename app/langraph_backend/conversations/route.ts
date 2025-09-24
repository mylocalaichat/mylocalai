import { NextResponse } from 'next/server';
import { getCheckpointer } from "../lib/checkpointer";

export async function GET() {
    try {
        const checkpointer = getCheckpointer();

        // Get all conversation thread IDs from the checkpointer
        const conversations = [];
        const threadMap = new Map();

        // List with no filter to get all threads
        const checkpointGenerator = checkpointer.list({ limit: 1000 });

        for await (const checkpoint of checkpointGenerator) {
            const threadId = checkpoint.config?.configurable?.thread_id;
            if (!threadId) continue;

            // Only keep the earliest checkpoint for each thread (step 0 or 1)
            const step = checkpoint.metadata?.step || 0;
            if (step > 0 && (!threadMap.has(threadId) || step < threadMap.get(threadId).step)) {
                threadMap.set(threadId, {
                    thread_id: threadId,
                    checkpoint_id: checkpoint.checkpoint?.id || checkpoint.checkpoint_id,
                    created_at: checkpoint.metadata?.created_at || new Date().toISOString(),
                    step: step,
                    checkpoint: checkpoint,
                    messages: checkpoint.checkpoint?.channel_values?.messages || []
                });
            }
        }

        // Extract first user question from each conversation
        for (const [threadId, conversationData] of threadMap) {
            let firstUserQuestion = "No user message found";

            try {
                // Get the checkpoint data to extract messages
                const checkpoint = conversationData.checkpoint;
                const channelData = checkpoint.checkpoint?.channel_values;

                if (channelData && channelData.messages) {
                    // Find the first user message
                    const messages = channelData.messages;
                    for (const message of messages) {
                        if (message._getType && message._getType() === 'human') {
                            firstUserQuestion = message.content || "Empty user message";
                            break;
                        } else if (message.type === 'human' || message.role === 'user') {
                            firstUserQuestion = message.content || "Empty user message";
                            break;
                        }
                    }
                }
            } catch (e) {
            }

            conversations.push({
                thread_id: threadId,
                first_user_question: firstUserQuestion,
                created_at: conversationData.created_at,
                step: conversationData.step
            });
        }

        // Sort by creation date (newest first)
        conversations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error('Error listing conversations:', error);
        return NextResponse.json({
            error: 'Failed to list conversations',
            details: error.message
        }, { status: 500 });
    }
}