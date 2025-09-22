// app/api/[transport]/route.ts
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

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
    server.tool(
      "roll_dice",
      "Rolls an N-sided die",
      {
        sides: z.number().int().min(2),
      },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
        };
      }
    );

    server.tool(
      "search_searx_for_url",
      "Search the web using SearX metasearch engine to get relevant URLs",
      {
        query: z.string().min(1),
      },
      async ({ query }) => {
        try {
          const searxUrl = process.env.SEARX_URL || "https://searx.be";
          const searchUrl = `${searxUrl}/search?q=${encodeURIComponent(query)}&format=html`;

          const response = await fetch(searchUrl, {
            headers: {
              "User-Agent": "MCP-SearX-Tool/1.0",
            },
          });

          if (!response.ok) {
            throw new Error(`SearX search failed: ${response.status}`);
          }

          const html = await response.text();

          // Parse HTML to extract search results
          const parseResults = (html: string) => {
            const results: Array<{title: string, url: string, content: string}> = [];

            // Updated regex-based parsing for SearXNG HTML results
            const resultRegex = /<article[^>]*class="result[^"]*"[^>]*>[\s\S]*?<h3[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>[\s\S]*?<p[^>]*class="content"[^>]*>\s*([\s\S]*?)\s*<\/p>[\s\S]*?<\/article>/gi;

            let match;
            while ((match = resultRegex.exec(html)) !== null && results.length < 10) {
              // Clean up title by removing HTML tags and normalizing spaces
              const cleanTitle = match[2]
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/\s+/g, ' ')    // Normalize whitespace
                .trim();

              // Clean up content by removing HTML tags and normalizing spaces
              const cleanContent = match[3]
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/\s+/g, ' ')    // Normalize whitespace
                .trim();

              results.push({
                url: match[1].trim(),
                title: cleanTitle,
                content: cleanContent
              });
            }

            return results;
          };

          const results = parseResults(html);

          const searchResult = {
            query,
            count: results.length,
            urls: results.map(result => result.url)
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(searchResult, null, 2)
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `❌ Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
            }],
          };
        }
      }
    );
  },
  {
    // Optional server options
  },
  {
    // Optional redis config
    redisUrl: process.env.REDIS_URL,
    basePath: getBasePath(),
    maxDuration: 60,
    verboseLogs: true,
  }
);
export { handler as GET, handler as POST };