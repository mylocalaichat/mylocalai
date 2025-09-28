import { z } from "zod";
import { googleSearch, getGoogleSearchPageHtml } from "../search/search";

export const googleSearchTool = {
  name: "google_search",
  description: "Search Google and return parsed results or raw HTML. Optionally scrape content from result URLs.",
  inputSchema: {
    query: z.string().min(1),
    limit: z.number().min(1).max(20).optional().describe("Number of search results to return (1-20)"),
    timeout: z.number().min(5000).max(120000).optional().describe("Browser timeout in milliseconds (5000-120000)"),
    locale: z.string().optional().describe("Search result language/locale (e.g., 'en-US', 'zh-CN')"),
  },
  handler: async ({
    query,
    limit = 10,
    timeout = 60000,
    locale = 'en-US'
  }: {
    query: string;
    limit?: number;
    timeout?: number;
    locale?: string;
  }) => {
    console.log(`🔍 MCP Tool Called: google_search`);
    console.log(`📝 Parameters:`, {
      query,
      limit,
      timeout,
      locale
    });

    try {
      const searchOptions = {
        limit,
        timeout,
        locale,
        stateFile: './storage/browser-state.json',
        noSaveState: false,
        enableScraping: false,
        maxScrapingConcurrency: 3,
        scrapingTimeout: 10000,
      };

      const result = await googleSearch(query, searchOptions);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2)
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `❌ Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
        }],
      };
    }
  }
};