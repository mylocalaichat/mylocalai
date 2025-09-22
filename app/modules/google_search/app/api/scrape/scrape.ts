import { chromium, devices, BrowserContextOptions, Browser } from "playwright";
import { CommandOptions, HtmlResponse } from "../search/types";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import logger from "../search/logger";

// Fingerprint configuration interface
interface FingerprintConfig {
  deviceName: string;
  locale: string;
  timezoneId: string;
  colorScheme: "dark" | "light";
  reducedMotion: "reduce" | "no-preference";
  forcedColors: "active" | "none";
}

// Saved state file interface
interface SavedState {
  fingerprint?: FingerprintConfig;
  googleDomain?: string;
}

/**
 * Get actual configuration of the host machine
 * @param userLocale User-specified locale settings (if any)
 * @returns Fingerprint configuration based on the host machine
 */
function getHostMachineConfig(userLocale?: string): FingerprintConfig {
  // Get system locale settings
  const systemLocale = userLocale || process.env.LANG || "en-US";

  // Get system timezone
  // Node.js doesn't directly provide timezone info, but can infer through timezone offset
  const timezoneOffset = new Date().getTimezoneOffset();
  let timezoneId = "America/New_York"; // Default to New York timezone

  // Roughly infer timezone based on timezone offset
  // Timezone offset is in minutes, difference from UTC, negative values indicate eastern zones
  if (timezoneOffset <= -480 && timezoneOffset > -600) {
    // UTC+8 (China, Singapore, Hong Kong, etc.)
    timezoneId = "Asia/Shanghai";
  } else if (timezoneOffset <= -540) {
    // UTC+9 (Japan, South Korea, etc.)
    timezoneId = "Asia/Tokyo";
  } else if (timezoneOffset <= -420 && timezoneOffset > -480) {
    // UTC+7 (Thailand, Vietnam, etc.)
    timezoneId = "Asia/Bangkok";
  } else if (timezoneOffset <= 0 && timezoneOffset > -60) {
    // UTC+0 (UK, etc.)
    timezoneId = "Europe/London";
  } else if (timezoneOffset <= 60 && timezoneOffset > 0) {
    // UTC-1 (Some parts of Europe)
    timezoneId = "Europe/Berlin";
  } else if (timezoneOffset <= 300 && timezoneOffset > 240) {
    // UTC-5 (US Eastern)
    timezoneId = "America/New_York";
  }

  // Detect system color scheme
  // Node.js cannot directly get system color scheme, use reasonable defaults
  // Can infer based on time: use dark mode at night, light mode during day
  const hour = new Date().getHours();
  const colorScheme =
    hour >= 19 || hour < 7 ? ("dark" as const) : ("light" as const);

  // Use reasonable defaults for other settings
  const reducedMotion = "no-preference" as const; // Most users don't enable reduced motion
  const forcedColors = "none" as const; // Most users don't enable forced colors

  // Choose an appropriate device name
  // Select appropriate browser based on operating system
  const platform = os.platform();
  let deviceName = "Desktop Chrome"; // Default to Chrome

  if (platform === "darwin") {
    // macOS
    deviceName = "Desktop Safari";
  } else if (platform === "win32") {
    // Windows
    deviceName = "Desktop Edge";
  } else if (platform === "linux") {
    // Linux
    deviceName = "Desktop Firefox";
  }

  // We use Chrome
  deviceName = "Desktop Chrome";

  return {
    deviceName,
    locale: systemLocale,
    timezoneId,
    colorScheme,
    reducedMotion,
    forcedColors,
  };
}

/**
 * Scrape content from a specific URL
 * @param url URL to scrape
 * @param options Scraping options
 * @param saveToFile Whether to save HTML to file (optional)
 * @param outputPath HTML output file path (optional)
 * @returns Response object containing HTML content
 */
export async function scrapeUrl(
  url: string,
  options: CommandOptions = {},
  saveToFile: boolean = false,
  outputPath?: string
): Promise<HtmlResponse> {
  // Set default options
  const {
    timeout = 60000,
    stateFile = "./browser-state.json",
    noSaveState = false,
    locale = "en-US", // Default to English
  } = options;

  // Always use headless mode for scraping
  let useHeadless = true;

  logger.info({ url, options }, "Initializing browser to scrape URL...");

  // Check if state file exists
  let storageState: string | undefined = undefined;
  let savedState: SavedState = {};

  // Fingerprint configuration file path
  const fingerprintFile = stateFile.replace(".json", "-fingerprint.json");

  if (fs.existsSync(stateFile)) {
    logger.info(
      { stateFile },
      "Found browser state file, will use saved state"
    );
    storageState = stateFile;

    // Try to load saved fingerprint config
    if (fs.existsSync(fingerprintFile)) {
      try {
        const fingerprintData = fs.readFileSync(fingerprintFile, "utf8");
        savedState = JSON.parse(fingerprintData);
        logger.info("Loaded saved browser fingerprint configuration");
      } catch (e) {
        logger.warn({ error: e }, "Cannot load fingerprint configuration file, will create new fingerprint");
      }
    }
  } else {
    logger.info(
      { stateFile },
      "Browser state file not found, will create new browser session and fingerprint"
    );
  }

  // Only use desktop device list
  const deviceList = [
    "Desktop Chrome",
    "Desktop Edge",
    "Desktop Firefox",
    "Desktop Safari",
  ];

  // Get random device configuration or use saved configuration
  const getDeviceConfig = (): [string, any] => {
    if (
      savedState.fingerprint?.deviceName &&
      devices[savedState.fingerprint.deviceName]
    ) {
      // Use saved device configuration
      return [
        savedState.fingerprint.deviceName,
        devices[savedState.fingerprint.deviceName],
      ];
    } else {
      // Randomly select a device
      const randomDevice =
        deviceList[Math.floor(Math.random() * deviceList.length)];
      return [randomDevice, devices[randomDevice]];
    }
  };

  // Define function to perform scraping
  async function performScraping(headless: boolean): Promise<HtmlResponse> {
    let browser: Browser;

    // Initialize browser
    browser = await chromium.launch({
      headless,
      timeout: timeout * 2, // Increase browser startup timeout
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-site-isolation-trials",
        "--disable-web-security",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--hide-scrollbars",
        "--mute-audio",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-component-extensions-with-background-pages",
        "--disable-extensions",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--disable-renderer-backgrounding",
        "--enable-features=NetworkService,NetworkServiceInProcess",
        "--force-color-profile=srgb",
        "--metrics-recording-only",
      ],
      ignoreDefaultArgs: ["--enable-automation"],
    });

    logger.info("Browser started successfully!");

    // Get device configuration - use saved or randomly generated
    const [deviceName, deviceConfig] = getDeviceConfig();

    // Create browser context options
    let contextOptions: BrowserContextOptions = {
      ...deviceConfig,
    };

    // If there is saved fingerprint configuration, use it; otherwise use actual host machine settings
    if (savedState.fingerprint) {
      contextOptions = {
        ...contextOptions,
        locale: savedState.fingerprint.locale,
        timezoneId: savedState.fingerprint.timezoneId,
        colorScheme: savedState.fingerprint.colorScheme,
        reducedMotion: savedState.fingerprint.reducedMotion,
        forcedColors: savedState.fingerprint.forcedColors,
      };
      logger.info("Using saved browser fingerprint configuration");
    } else {
      // Get actual settings of host machine
      const hostConfig = getHostMachineConfig(locale);

      // If need to use different device type, re-get device configuration
      if (hostConfig.deviceName !== deviceName) {
        logger.info(
          { deviceType: hostConfig.deviceName },
          "Using device type based on host machine settings"
        );
        // Use new device configuration
        contextOptions = { ...devices[hostConfig.deviceName] };
      }

      contextOptions = {
        ...contextOptions,
        locale: hostConfig.locale,
        timezoneId: hostConfig.timezoneId,
        colorScheme: hostConfig.colorScheme,
        reducedMotion: hostConfig.reducedMotion,
        forcedColors: hostConfig.forcedColors,
      };

      // Save newly generated fingerprint configuration
      savedState.fingerprint = hostConfig;
      logger.info(
        {
          locale: hostConfig.locale,
          timezone: hostConfig.timezoneId,
          colorScheme: hostConfig.colorScheme,
          deviceType: hostConfig.deviceName,
        },
        "Generated new browser fingerprint configuration based on host machine"
      );
    }

    // Add common options - ensure using desktop configuration
    contextOptions = {
      ...contextOptions,
      permissions: ["geolocation", "notifications"],
      acceptDownloads: true,
      isMobile: false, // Force desktop mode
      hasTouch: false, // Disable touch functionality
      javaScriptEnabled: true,
    };

    if (storageState) {
      logger.info("Loading saved browser state...");
    }

    const context = await browser.newContext(
      storageState ? { ...contextOptions, storageState } : contextOptions
    );

    // Set additional browser properties to avoid detection
    await context.addInitScript(() => {
      // Override navigator properties
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en", "zh-CN"],
      });

      // Override window properties
      // @ts-ignore - Ignore error about chrome property not existing
      window.chrome = {
        runtime: {},
        loadTimes: function () {},
        csi: function () {},
        app: {},
      };

      // Add WebGL fingerprint randomization
      if (typeof WebGLRenderingContext !== "undefined") {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (
          parameter: number
        ) {
          // Randomize UNMASKED_VENDOR_WEBGL and UNMASKED_RENDERER_WEBGL
          if (parameter === 37445) {
            return "Intel Inc.";
          }
          if (parameter === 37446) {
            return "Intel Iris OpenGL Engine";
          }
          return getParameter.call(this, parameter);
        };
      }
    });

    const page = await context.newPage();

    // Set additional page properties
    await page.addInitScript(() => {
      // Simulate real screen dimensions and color depth
      Object.defineProperty(window.screen, "width", { get: () => 1920 });
      Object.defineProperty(window.screen, "height", { get: () => 1080 });
      Object.defineProperty(window.screen, "colorDepth", { get: () => 24 });
      Object.defineProperty(window.screen, "pixelDepth", { get: () => 24 });
    });

    try {
      logger.info({ url }, "Accessing URL...");

      // Access the URL
      const response = await page.goto(url, {
        timeout,
        waitUntil: "networkidle",
      });

      if (!response) {
        throw new Error("Failed to load page");
      }

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      // Get current page URL (in case of redirects)
      const finalUrl = page.url();
      logger.info({ url: finalUrl }, "Page loaded successfully, preparing to extract HTML...");

      // Add additional wait time to ensure page is fully loaded and stable
      logger.info("Waiting for page to stabilize...");
      await page.waitForTimeout(1000); // Wait 1 second for page to fully stabilize

      // Wait for network idle again to ensure all async operations complete
      await page.waitForLoadState("networkidle", { timeout });

      // Get page HTML content
      const fullHtml = await page.content();

      // Remove CSS and JavaScript content, keep only pure HTML
      // Remove all <style> tags and their content
      let html = fullHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
      // Remove all <link rel="stylesheet"> tags
      html = html.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
      // Remove all <script> tags and their content
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

      logger.info({
        originalLength: fullHtml.length,
        cleanedLength: html.length
      }, "Successfully obtained and cleaned page HTML content");

      // If needed, save HTML to file and take screenshot
      let savedFilePath: string | undefined = undefined;
      let screenshotPath: string | undefined = undefined;

      if (saveToFile) {
        // Generate default filename (if not provided)
        if (!outputPath) {
          // Ensure directory exists
          const outputDir = "./scraped-html";
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          // Generate filename: domain-timestamp.html
          const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\./g, "-");
          const urlObj = new URL(url);
          const sanitizedDomain = urlObj.hostname.replace(/[^a-zA-Z0-9]/g, "_");
          outputPath = `${outputDir}/${sanitizedDomain}-${timestamp}.html`;
        }

        // Ensure file directory exists
        const fileDir = path.dirname(outputPath);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        // Write HTML file
        fs.writeFileSync(outputPath, html, "utf8");
        savedFilePath = outputPath;
        logger.info({ path: outputPath }, "Cleaned HTML content saved to file");

        // Save webpage screenshot
        // Generate screenshot filename (based on HTML filename but with .png extension)
        const screenshotFilePath = outputPath.replace(/\.html$/, '.png');

        // Take screenshot of entire page
        logger.info("Taking webpage screenshot...");
        await page.screenshot({
          path: screenshotFilePath,
          fullPage: true
        });

        screenshotPath = screenshotFilePath;
        logger.info({ path: screenshotFilePath }, "Webpage screenshot saved");
      }

      try {
        // Save browser state (unless user specified not to save)
        if (!noSaveState) {
          logger.info({ stateFile }, "Saving browser state...");

          // Ensure directory exists
          const stateDir = path.dirname(stateFile);
          if (!fs.existsSync(stateDir)) {
            fs.mkdirSync(stateDir, { recursive: true });
          }

          // Save state
          await context.storageState({ path: stateFile });
          logger.info("Browser state saved successfully!");

          // Save fingerprint configuration
          try {
            fs.writeFileSync(
              fingerprintFile,
              JSON.stringify(savedState, null, 2),
              "utf8"
            );
            logger.info({ fingerprintFile }, "Fingerprint configuration saved");
          } catch (fingerprintError) {
            logger.error({ error: fingerprintError }, "Error occurred while saving fingerprint configuration");
          }
        } else {
          logger.info("Not saving browser state according to user settings");
        }
      } catch (error) {
        logger.error({ error }, "Error occurred while saving browser state");
      }

      // Close browser
      logger.info("Closing browser...");
      await browser.close();

      // Return HTML response
      return {
        query: url, // Use URL as query for consistency
        html,
        url: finalUrl,
        savedPath: savedFilePath,
        screenshotPath: screenshotPath,
        originalHtmlLength: fullHtml.length
      };
    } catch (error) {
      logger.error({ error }, "Error occurred during URL scraping process");

      try {
        // Try to save browser state even if error occurred
        if (!noSaveState) {
          logger.info({ stateFile }, "Saving browser state...");
          const stateDir = path.dirname(stateFile);
          if (!fs.existsSync(stateDir)) {
            fs.mkdirSync(stateDir, { recursive: true });
          }
          await context.storageState({ path: stateFile });

          // Save fingerprint configuration
          try {
            fs.writeFileSync(
              fingerprintFile,
              JSON.stringify(savedState, null, 2),
              "utf8"
            );
            logger.info({ fingerprintFile }, "Fingerprint configuration saved");
          } catch (fingerprintError) {
            logger.error({ error: fingerprintError }, "Error occurred while saving fingerprint configuration");
          }
        }
      } catch (stateError) {
        logger.error({ error: stateError }, "Error occurred while saving browser state");
      }

      // Close browser
      logger.info("Closing browser...");
      await browser.close();

      // Return error information
      throw new Error(`Failed to scrape URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Execute scraping in headless mode
  return performScraping(useHeadless);
}