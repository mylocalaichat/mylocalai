import { NextRequest, NextResponse } from 'next/server';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { loadMcpTools } from "@langchain/mcp-adapters";
import { randomUUID } from "node:crypto";
import { getCheckpointer } from "./lib/checkpointer";
import { LangGraphRequestSchema, convertToLangChainMessages } from "./schemas";
import { logger } from "../utils/logger";

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


        // Create SSE response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                let isControllerClosed = false;

                const safeEnqueue = (data: Uint8Array) => {
                    if (!isControllerClosed) {
                        try {
                            controller.enqueue(data);
                        } catch (error) {
                            console.error('Controller enqueue error:', error);
                            isControllerClosed = true;
                        }
                    }
                };

                try {
                    // Send initial response with thread info
                    const initialData = {
                        type: 'start',
                        thread_id: threadId,
                        is_new_thread: isNewThread
                    };
                    safeEnqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

                    // Stream agent response
                    let currentContent = '';
                    let allMessages: any[] = [];

                    for await (const chunk of await agent.stream(
                        {messages: convertToLangChainMessages(messages)},
                        {streamMode: "updates", configurable: config['configurable']}
                    )) {
                        logger.debug("Received chunk:", chunk);

                        // Process each node update
                        for (const [, nodeData] of Object.entries(chunk)) {
                            const data = nodeData as any;

                            // Handle messages array
                            if (data?.messages) {
                                allMessages = data.messages;

                                // Find latest AI message
                                const lastMessage = data.messages[data.messages.length - 1];
                                if (lastMessage?._getType?.() === 'ai' ||
                                    lastMessage?.constructor?.name === 'AIMessage') {

                                    const content = String(lastMessage.content || '');
                                    if (content && content !== currentContent) {
                                        const delta = content.substring(currentContent.length);

                                        if (delta) {
                                            const streamData = {
                                                type: 'delta',
                                                content: delta,
                                                role: 'assistant'
                                            };
                                            safeEnqueue(encoder.encode(
                                                `data: ${JSON.stringify(streamData)}\n\n`
                                            ));
                                        }
                                        currentContent = content;
                                    }
                                }
                            }

                            // Handle tool calls
                            if (data?.messages) {
                                const lastMsg = data.messages[data.messages.length - 1];
                                if (lastMsg?.tool_calls?.length > 0) {
                                    const toolData = {
                                        type: 'tool_call',
                                        message: 'Using tools to get current information...'
                                    };
                                    safeEnqueue(encoder.encode(
                                        `data: ${JSON.stringify(toolData)}\n\n`
                                    ));
                                }
                            }
                        }
                    }

                    // Send final complete event
                    const responseMessages = [];
                    for (const message of allMessages) {
                        let role = 'user';
                        let content = '';
                        let shouldInclude = true;

                        const messageContent = String(message.content || '');

                        if (message._getType?.() === 'human' ||
                            message.constructor?.name === 'HumanMessage') {
                            role = 'user';
                            content = messageContent;
                        } else if (message._getType?.() === 'ai' ||
                                   message.constructor?.name === 'AIMessage') {
                            role = 'assistant';
                            content = messageContent;
                        } else {
                            shouldInclude = false;
                        }

                        if (shouldInclude && content.trim()) {
                            responseMessages.push({ role, content });
                        }
                    }

                    const finalData = {
                        type: 'complete',
                        thread_id: threadId,
                        messages: responseMessages,
                        total_messages: responseMessages.length,
                        is_new_thread: isNewThread
                    };
                    safeEnqueue(encoder.encode(
                        `data: ${JSON.stringify(finalData)}\n\n`
                    ));

                    // Close MCP client after streaming is complete
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.error('Error closing MCP client:', closeError);
                        }
                    }

                } catch (error) {
                    logger.error('Stream error:', error);
                    const errorData = {
                        type: 'error',
                        error: error.message
                    };
                    safeEnqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));

                    // Close client on error too
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.error('Error closing MCP client:', closeError);
                        }
                    }
                } finally {
                    if (!isControllerClosed) {
                        isControllerClosed = true;
                        controller.close();
                    }
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (e) {
        logger.error(e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}