import { pino } from "pino";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

// Use system temporary directory for cross-platform compatibility
const logDir = path.join(os.tmpdir(), "google-search-logs");
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Create log file path
const logFilePath = path.join(logDir, "google-search.log");

// Create pino logger instance with simplified config for Next.js
const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    formatters: {
        level(label) {
            return { level: label };
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {} // Remove default fields like pid, hostname
});

// Add process exit handlers for cleanup only
process.on("SIGINT", () => {
    process.exit(0);
});

process.on("SIGTERM", () => {
    process.exit(0);
});

process.on("uncaughtException", (error) => {
    logger.error({ err: error }, "Uncaught exception");
    process.exit(1);
});

export default logger;