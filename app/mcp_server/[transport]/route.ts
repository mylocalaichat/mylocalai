// app/api/[transport]/route.ts
import { createMcpHandler } from "mcp-handler";
import { rollDiceTool } from "../tools/rollDice";
import { scrapeTool } from "../tools/scrape";
import { googleSearchTool } from "../tools/googleSearch";

const handler = createMcpHandler(
  (server) => {
    // Register roll dice tool
    server.tool(
      rollDiceTool.name,
      rollDiceTool.description,
      rollDiceTool.inputSchema,
      rollDiceTool.handler
    );

    // Register scrape tool
    server.tool(
      scrapeTool.name,
      scrapeTool.description,
      scrapeTool.inputSchema,
      scrapeTool.handler
    );

    // Register Google search tool
    server.tool(
      googleSearchTool.name,
      googleSearchTool.description,
      googleSearchTool.inputSchema,
      googleSearchTool.handler
    );
  },
  {
    // Optional server options
  },
  {
    // Updated basePath for flattened structure
    basePath: "/mcp_server",
    maxDuration: 60,
    // Only enable verbose logs in development mode
    verboseLogs: process.env.NODE_ENV !== 'production',
  }
);
export { handler as GET, handler as POST };