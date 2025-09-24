import { NextRequest, NextResponse } from 'next/server';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { loadMcpTools } from "@langchain/mcp-adapters";
import { randomUUID } from "node:crypto";
import { getCheckpointer } from "./lib/checkpointer";
import { LangGraphRequestSchema, convertToLangChainMessages } from "./schemas";

// Increase max listeners to prevent warnings during development
process.setMaxListeners(20);

export async function POST(req: NextRequest) {
    let client: Client | null = null;

    try {
        const body = await req.json();

        // Validate request body with Zod
        const validationResult = LangGraphRequestSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validationResult.error.format()
            }, { status: 400 });
        }

        const { model, messages, thread_id } = validationResult.data;

        // Initialize the ChatOpenAI model
        const llm = new ChatOllama({ model: model });

        // Automatically starts and connects to a MCP reference server
        // Use the same port as Next.js dev server (3000)
        const mcpServerUrl = process.env.NODE_ENV === 'development'
            ? "http://localhost:3000/mcp_server/mcp"
            : "http://localhost:3000/mcp_server/mcp";
        const transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl));


        // Initialize the client
        client = new Client({
            name: "web-tools-client",
            version: "1.0.0",
        });

        // Connect to the transport
        await client.connect(transport);

        // Get tools with custom configuration
        const tools = await loadMcpTools("web-tools", client, {
            throwOnLoadError: true,
            prefixToolNameWithServerName: false,
            additionalToolNamePrefix: "",
            useStandardContentBlocks: false,
        });

        // Create and run the agent
        const checkpointer = getCheckpointer();

        // Generate new thread_id if not provided, otherwise use existing one
        const threadId = thread_id || randomUUID();

        // Check if this is a new thread by looking at the checkpointer
        let isNewThread = !thread_id; // Default behavior for when no thread_id is provided

        if (thread_id) {
            // If thread_id is provided, check if it exists in the checkpointer
            try {
                const config = { configurable: { thread_id: threadId } };
                const existingState = await checkpointer.get(config);
                isNewThread = !existingState;
            } catch (error) {
                // If there's an error getting the state, assume it's a new thread
                isNewThread = true;
            }
        }

        const config = { configurable: { thread_id: threadId } };
        const agent = createReactAgent({ llm: llm, tools, checkpointer: checkpointer });


        const agentResponse = await agent.invoke({
            messages: convertToLangChainMessages(messages)
        }, config);


        // Convert agent response to the same format as conversation GET endpoint
        const responseMessages = [];

        if (agentResponse && agentResponse.messages && agentResponse.messages.length > 0) {
            for (const message of agentResponse.messages) {
                let role = 'user';
                let content = '';
                let shouldInclude = true;

                // Handle different message formats and extract content safely
                const messageContent = typeof message.content === 'string'
                    ? message.content
                    : Array.isArray(message.content)
                        ? message.content.map(c => typeof c === 'string' ? c : JSON.stringify(c)).join(' ')
                        : String(message.content || '');

                // Handle different message formats
                if (message.constructor.name === 'HumanMessage' || (message as any)._getType?.() === 'human') {
                    role = 'user';
                    content = messageContent;
                } else if (message.constructor.name === 'AIMessage' || (message as any)._getType?.() === 'ai') {
                    role = 'assistant';
                    content = messageContent;
                } else if (message.constructor.name === 'SystemMessage' || (message as any)._getType?.() === 'system') {
                    shouldInclude = false; // Skip system messages
                } else if ((message as any).type) {
                    // Plain message objects
                    switch ((message as any).type) {
                        case 'human':
                            role = 'user';
                            content = messageContent;
                            break;
                        case 'ai':
                            role = 'assistant';
                            content = messageContent;
                            break;
                        case 'system':
                            shouldInclude = false; // Skip system messages
                            break;
                        default:
                            shouldInclude = false; // Skip unknown message types
                            break;
                    }
                } else if ((message as any).role) {
                    // Already in the correct format
                    switch ((message as any).role) {
                        case 'user':
                            role = 'user';
                            content = messageContent;
                            break;
                        case 'assistant':
                            role = 'assistant';
                            content = messageContent;
                            break;
                        case 'system':
                            shouldInclude = false; // Skip system messages
                            break;
                        default:
                            shouldInclude = false; // Skip unknown roles
                            break;
                    }
                } else {
                    // Unknown message format, skip
                    shouldInclude = false;
                }

                // Only add human and AI messages to the response
                if (shouldInclude && content.trim()) {
                    responseMessages.push({
                        role,
                        content
                    });
                }
            }
        }

        return NextResponse.json({
            thread_id: threadId,
            messages: responseMessages,
            total_messages: responseMessages.length,
            is_new_thread: isNewThread
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
        // Ensure client is always closed, even if there's an error
        if (client) {
            try {
                await client.close();
            } catch (closeError) {
                console.error('Error closing MCP client:', closeError);
            }
        }
    }
}