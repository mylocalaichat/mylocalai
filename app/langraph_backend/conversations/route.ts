import { NextResponse } from 'next/server';
import { getCheckpointer } from "../lib/checkpointer";

export async function GET() {
    try {
        const checkpointer = getCheckpointer();

        // Get all conversation thread IDs from the checkpointer
        const conversations = [];
        for await (const conv of checkpointer.list({})) {
            conversations.push({
                thread_id: conv.thread_id,
                checkpoint_id: conv.checkpoint_id,
                created_at: conv.created_at
            });
        }

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error('Error listing conversations:', error);
        return NextResponse.json({ error: 'Failed to list conversations' }, { status: 500 });
    }
}