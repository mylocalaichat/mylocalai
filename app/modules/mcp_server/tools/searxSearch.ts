import { z } from "zod";

export const searxSearchTool = {
  name: "search_searx_for_url",
  description: "Search the web using SearX metasearch engine to get relevant URLs",
  inputSchema: {
    query: z.string().min(1),
  },
  handler: async ({ query }: { query: string }) => {
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
          type: "text" as const,
          text: JSON.stringify(searchResult, null, 2)
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