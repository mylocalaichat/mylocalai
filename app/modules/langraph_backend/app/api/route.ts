import { NextRequest, NextResponse } from 'next/server';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { loadMcpTools } from "@langchain/mcp-adapters";
import { randomUUID } from "node:crypto";
import { MemorySaver } from "@langchain/langgraph";


export async function POST(req: NextRequest) {
    //get model and fullprompt from the request body
    const { model, fullprompt } = await req.json();
    console.log("model", model);
    console.log("fullprompt", fullprompt);

    if (!model) {
        return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }
    if (!fullprompt) {
        return NextResponse.json({ error: 'Fullprompt is required' }, { status: 400 });
    }

    // Initialize the ChatOpenAI model
    const llm = new ChatOllama({ model: model });

    // Automatically starts and connects to a MCP reference server
    const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3001/modules/mcp_server/app/api/mcp"));

    // Initialize the client
    const client = new Client({
        name: "math-client",
        version: "1.0.0",
    });

    try {
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
        const checkpointer = new MemorySaver();

        const config = { configurable: { thread_id: "1" } };
        const agent = createReactAgent({ llm: llm, tools, checkpointer: checkpointer });
        const agentResponse = await agent.invoke({
            messages: [{ role: "user", content: fullprompt }]
        }, config);
        console.log(agentResponse);
        return NextResponse.json({ response: agentResponse });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
        // Clean up connection
        await client.close();
    }
}
