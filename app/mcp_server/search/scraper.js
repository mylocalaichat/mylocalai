const cheerio = require('cheerio');

// Simple logger fallback since the original logger uses ES6 modules
const logger = {
    info: (data, message) => console.log(`INFO: ${message}`, data),
    error: (data, message) => console.error(`ERROR: ${message}`, data),
    warn: (data, message) => console.warn(`WARN: ${message}`, data)
};

/**
 * Scrape text content from a URL using Cheerio
 * @param {string} url The URL to scrape
 * @param {number} timeout Request timeout in milliseconds (default: 10000)
 * @returns {Promise<{content: string, contentLength: number, error?: string}>} Scraped text content or error information
 */
async function scrapeUrl(url, timeout = 10000) {
    try {
        // Basic URL validation
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
            return {
                content: '',
                contentLength: 0,
                error: 'Invalid URL format'
            };
        }

        // Skip known non-scrapeable URLs
        const skipPatterns = [
            'youtube.com',
            'twitter.com',
            'facebook.com',
            'instagram.com',
            'linkedin.com',
            'pinterest.com',
            'reddit.com',
            'tiktok.com',
            '.pdf',
            '.doc',
            '.docx',
            '.ppt',
            '.pptx',
            '.xls',
            '.xlsx',
            '.zip',
            '.rar',
            '.tar',
            '.gz'
        ];

        const shouldSkip = skipPatterns.some(pattern => url.toLowerCase().includes(pattern));
        if (shouldSkip) {
            return {
                content: '',
                contentLength: 0,
                error: 'URL type not suitable for text scraping'
            };
        }

        logger.info({ url }, 'Starting to scrape URL');

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return {
                content: '',
                contentLength: 0,
                error: `HTTP ${response.status}: ${response.statusText}`
            };
        }

        // Check content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('text/html')) {
            return {
                content: '',
                contentLength: 0,
                error: `Unsupported content type: ${contentType}`
            };
        }

        const html = await response.text();

        // Load HTML into Cheerio
        const $ = cheerio.load(html);

        // Remove script and style elements
        $('script, style, nav, header, footer, aside, .advertisement, .ad, .ads, #advertisement, #ad, #ads').remove();

        // Extract text from main content areas first
        let content = '';

        // Try to find main content areas
        const mainSelectors = [
            'main',
            '[role="main"]',
            'article',
            '.content',
            '.main-content',
            '.post-content',
            '.entry-content',
            '.article-content',
            '#content',
            '#main',
            '.container'
        ];

        for (const selector of mainSelectors) {
            const mainElement = $(selector);
            if (mainElement.length > 0) {
                content = mainElement.text();
                break;
            }
        }

        // If no main content found, extract from body but with more filtering
        if (!content || content.trim().length < 100) {
            // Remove more noise elements
            $('.sidebar, .menu, .navigation, .breadcrumb, .share, .social, .comments, .related, .recommended').remove();

            content = $('body').text();
        }

        // Clean up the text
        content = content
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .replace(/\n\s*\n/g, '\n') // Remove empty lines
            .trim();

        // Limit content length to prevent huge responses (max 10000 characters)
        const maxLength = 10000;
        if (content.length > maxLength) {
            content = content.substring(0, maxLength) + '...';
        }

        logger.info({
            url,
            contentLength: content.length,
            originalLength: html.length
        }, 'Successfully scraped URL content');

        return {
            content,
            contentLength: content.length
        };

    } catch (error) {
        logger.error({ url, error }, 'Error scraping URL');

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                return {
                    content: '',
                    contentLength: 0,
                    error: 'Request timeout'
                };
            } else {
                return {
                    content: '',
                    contentLength: 0,
                    error: error.message
                };
            }
        }

        return {
            content: '',
            contentLength: 0,
            error: 'Unknown error occurred during scraping'
        };
    }
}

/**
 * Scrape multiple URLs concurrently with rate limiting
 * @param {string[]} urls Array of URLs to scrape
 * @param {number} maxConcurrent Maximum number of concurrent requests (default: 3)
 * @param {number} timeout Request timeout in milliseconds (default: 10000)
 * @returns {Promise<Array>} Array of scraped content results
 */
async function scrapeUrls(urls, maxConcurrent = 3, timeout = 10000) {
    const results = [];

    // Process URLs in batches to avoid overwhelming servers
    for (let i = 0; i < urls.length; i += maxConcurrent) {
        const batch = urls.slice(i, i + maxConcurrent);
        const batchPromises = batch.map(url => scrapeUrl(url, timeout));

        try {
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        } catch (error) {
            logger.error({ error, batch }, 'Error in batch scraping');
            // Add error results for failed batch
            batch.forEach(() => {
                results.push({
                    content: '',
                    contentLength: 0,
                    error: 'Batch processing failed'
                });
            });
        }

        // Add a small delay between batches to be respectful
        if (i + maxConcurrent < urls.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return results;
}

module.exports = {
    scrapeUrl,
    scrapeUrls
};