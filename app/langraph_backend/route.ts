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
        const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3001/mcp_server/mcp"));

        // Initialize the client
        client = new Client({
            name: "math-client",
            version: "1.0.0",
        });

        // Connect to the transport
        await client.connect(transport);

        // Get tools with custom configuration
        const tools = await loadMcpTools("math", client, {
            throwOnLoadError: true,
            prefixToolNameWithServerName: false,
            additionalToolNamePrefix: "",
            useStandardContentBlocks: false,
        });

        // Create and run the agent
        const checkpointer = getCheckpointer();

        // Generate new thread_id if not provided, otherwise use existing one
        const threadId = thread_id || randomUUID();
        const isNewThread = !thread_id;

        const config = { configurable: { thread_id: threadId } };
        const agent = createReactAgent({ llm: llm, tools, checkpointer: checkpointer });
        const agentResponse = await agent.invoke({
            messages: convertToLangChainMessages(messages)
        }, config);

        console.log(agentResponse);

        return NextResponse.json({
            response: agentResponse,
            thread_id: threadId,
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