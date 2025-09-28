import { z } from "zod";
import { scrapeUrl } from "../scrape/scrape";

export const scrapeTool = {
  name: "scrape_url",
  description: "Scrape content from a URL using Playwright browser automation",
  inputSchema: {
    url: z.string().url(),
  },
  handler: async ({ url, options = {}, saveToFile = false, outputPath }: {
    url: string;
    options?: {
      timeout?: number;
      locale?: string;
      stateFile?: string;
      noSaveState?: boolean;
    };
    saveToFile?: boolean;
    outputPath?: string;
  }) => {
    console.log(`🔍 MCP Tool Called: scrape_url`);
    console.log(`📝 Parameters:`, {
      url,
      options,
      saveToFile,
      outputPath
    });

    try {
      const scrapeOptions = {
        timeout: options.timeout || 60000,
        locale: options.locale || 'en-US',
        stateFile: options.stateFile || './storage/browser-state.json',
        noSaveState: options.noSaveState || false,
      };

      const result = await scrapeUrl(url, scrapeOptions, saveToFile, outputPath);

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
          text: `❌ Scrape failed: ${error instanceof Error ? error.message : "Unknown error"}`
        }],
      };
    }
  }
};