import { NextRequest, NextResponse } from 'next/server';
import { getCheckpointer } from "../../lib/checkpointer";
import Database from 'better-sqlite3';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ thread_id: string }> }) {
    try {
        const { thread_id } = await params;

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


        // Convert LangChain messages to the format expected by create conversation
        // Only include human and AI messages, filter out system messages
        const messages = [];
        const langchainMessages = conversationState?.channel_values?.messages || [];

        for (const message of langchainMessages) {
            let role = 'user';
            let content = '';
            let shouldInclude = true;

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
                        shouldInclude = false; // Skip system messages
                        break;
                    default:
                        shouldInclude = false; // Skip unknown message types
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
                        shouldInclude = false; // Skip system messages
                        break;
                    default:
                        shouldInclude = false; // Skip unknown message types
                        break;
                }
                content = message.content || '';
            } else if (message.role) {
                // Already in the correct format
                switch (message.role) {
                    case 'user':
                        role = 'user';
                        break;
                    case 'assistant':
                        role = 'assistant';
                        break;
                    case 'system':
                        shouldInclude = false; // Skip system messages
                        break;
                    default:
                        shouldInclude = false; // Skip unknown roles
                        break;
                }
                content = message.content || '';
            }

            // Only add human and AI messages to the response
            if (shouldInclude && content.trim()) {
                messages.push({
                    role,
                    content
                });
            }
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ thread_id: string }> }) {
    try {
        const { thread_id } = await params;

        if (!thread_id) {
            return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
        }

        const checkpointer = getCheckpointer();

        // Get the conversation to check if it exists
        const config = { configurable: { thread_id } };
        const conversationState = await checkpointer.get(config);

        if (!conversationState) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // Since we can't directly access the SQLite connection from the checkpointer,
        // we'll create our own connection to the same database file
        try {
            const dbPath = path.join(process.cwd(), "storage", "langraph_conversations.db");


            // Create a connection to the same database file
            const sqliteConn = new Database(dbPath);

            // Delete all checkpoints for this thread_id from the database
            const deleteCheckpointsResult = sqliteConn
                .prepare("DELETE FROM checkpoints WHERE thread_id = ?")
                .run(thread_id);

            // Also delete from writes table if it exists
            let deleteWritesResult = null;
            try {
                deleteWritesResult = sqliteConn
                    .prepare("DELETE FROM writes WHERE thread_id = ?")
                    .run(thread_id);
            } catch (writesError) {
                // Writes table might not exist in all versions
            }

            // Close the connection
            sqliteConn.close();

            const checkpointsDeleted = deleteCheckpointsResult.changes || 0;
            const writesDeleted = deleteWritesResult?.changes || 0;


            if (checkpointsDeleted === 0) {
            }

        } catch (deleteError) {
            console.error('Failed to delete conversation thread:', deleteError);
            throw new Error(`Failed to delete conversation: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`);
        }

        return NextResponse.json({
            message: 'Conversation deleted successfully',
            thread_id
        });

    } catch (error) {
        console.error('Error deleting conversation:', error);
        return NextResponse.json({
            error: 'Failed to delete conversation',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}