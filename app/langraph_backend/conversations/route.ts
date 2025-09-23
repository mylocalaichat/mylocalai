import { NextResponse } from 'next/server';
import { getCheckpointer } from "../lib/checkpointer";

export async function GET() {
    try {
        const checkpointer = getCheckpointer();

        // Get all conversation thread IDs from the checkpointer
        const conversations = [];

        // List with no filter to get all threads
        const checkpointGenerator = checkpointer.list({ limit: 100 });

        for await (const checkpoint of checkpointGenerator) {
            console.log('Found checkpoint:', checkpoint);
            conversations.push({
                thread_id: checkpoint.config?.configurable?.thread_id || 'unknown',
                checkpoint_id: checkpoint.checkpoint?.id || checkpoint.checkpoint_id,
                created_at: checkpoint.metadata?.created_at || new Date().toISOString(),
                step: checkpoint.metadata?.step || 0
            });
        }

        console.log('Total conversations found:', conversations.length);
        return NextResponse.json({ conversations });
    } catch (error) {
        console.error('Error listing conversations:', error);
        return NextResponse.json({
            error: 'Failed to list conversations',
            details: error.message
        }, { status: 500 });
    }
}