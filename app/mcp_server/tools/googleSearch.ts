import { z } from "zod";
import { googleSearch, getGoogleSearchPageHtml } from "../search/search";

export const googleSearchTool = {
  name: "google_search",
  description: "Search Google and return parsed results or raw HTML",
  inputSchema: {
    query: z.string().min(1),
  },
  handler: async ({ query, options = {}, returnHtml = false, saveToFile = false, outputPath }: {
    query: string;
    options?: {
      limit?: number;
      timeout?: number;
      locale?: string;
      stateFile?: string;
      noSaveState?: boolean;
    };
    returnHtml?: boolean;
    saveToFile?: boolean;
    outputPath?: string;
  }) => {
    try {
      const searchOptions = {
        limit: options.limit || 10,
        timeout: options.timeout || 60000,
        locale: options.locale || 'en-US',
        stateFile: options.stateFile || './storage/browser-state.json',
        noSaveState: options.noSaveState || false,
      };

      let result;
      if (returnHtml) {
        result = await getGoogleSearchPageHtml(query, searchOptions, saveToFile, outputPath);
      } else {
        result = await googleSearch(query, searchOptions);
      }

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