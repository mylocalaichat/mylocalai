/**
 * Search result interface
 */
export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    content?: string; // Scraped text content from the URL
    contentError?: string; // Error message if scraping failed
    contentLength?: number; // Length of scraped content
}

/**
 * Search response interface
 */
export interface SearchResponse {
    query: string;
    results: SearchResult[];
}

/**
 * Command line options interface
 */
export interface CommandOptions {
    limit?: number;
    timeout?: number;
    headless?: boolean; // Deprecated, but kept for compatibility
    stateFile?: string;
    noSaveState?: boolean;
    locale?: string; // Search result language, default is Chinese (zh-CN)
    enableScraping?: boolean; // Whether to scrape content from search result URLs
    maxScrapingConcurrency?: number; // Maximum concurrent scraping requests
    scrapingTimeout?: number; // Timeout for individual scraping requests in milliseconds
}

/**
 * HTML response interface - used to get the raw search page HTML
 */
export interface HtmlResponse {
    query: string;    // Search query
    html: string;     // Page HTML content (cleaned, without CSS and JavaScript)
    url: string;      // Search result page URL
    savedPath?: string; // Optional, if HTML is saved to a file, this is the path
    screenshotPath?: string; // Optional, path to saved webpage screenshot
    originalHtmlLength?: number; // Original HTML length (including CSS and JavaScript)
}