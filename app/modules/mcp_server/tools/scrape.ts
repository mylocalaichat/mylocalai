import { z } from "zod";
import { scrapeUrl } from "../app/api/scrape/scrape";

export const scrapeTool = {
  name: "scrape_url",
  description: "Scrape content from a URL using Playwright browser automation",
  inputSchema: {
    url: z.string().url(),
    options: z.object({
      timeout: z.number().optional(),
      locale: z.string().optional(),
      stateFile: z.string().optional(),
      noSaveState: z.boolean().optional(),
    }).optional(),
    saveToFile: z.boolean().optional(),
    outputPath: z.string().optional(),
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
    try {
      const scrapeOptions = {
        timeout: options.timeout || 60000,
        locale: options.locale || 'en-US',
        stateFile: options.stateFile || './browser-state.json',
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