// app/api/[transport]/route.ts
import { createMcpHandler } from "mcp-handler";
import { rollDiceTool } from "../../../tools/rollDice";
import { searxSearchTool } from "../../../tools/searxSearch";
import { scrapeTool } from "../../../tools/scrape";
import { googleSearchTool } from "../../../tools/googleSearch";

// Determine basePath based on whether running from root or mcp_server subdirectory
const getBasePath = () => {
  // Check if we're running from the mcp_server subdirectory
  const cwd = process.cwd();
  if (cwd.includes('/mcp_server')) {
    return "/api";
  }
  // Running from root directory
  return "/modules/mcp_server/app/api";
};

const handler = createMcpHandler(
  (server) => {
    // Register roll dice tool
    server.tool(
      rollDiceTool.name,
      rollDiceTool.description,
      rollDiceTool.inputSchema,
      rollDiceTool.handler
    );

    // Register searx search tool
    server.tool(
      searxSearchTool.name,
      searxSearchTool.description,
      searxSearchTool.inputSchema,
      searxSearchTool.handler
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
    // Optional redis config
    basePath: getBasePath(),
    maxDuration: 60,
    verboseLogs: true,
  }
);
export { handler as GET, handler as POST };