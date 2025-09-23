import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import path from "path";

// Global checkpointer instance for conversation memory persistence
let globalCheckpointer: SqliteSaver | null = null;

export function getCheckpointer(): SqliteSaver {
    if (!globalCheckpointer) {
        // Store SQLite database in the storage folder
        const dbPath = path.join(process.cwd(), "storage", "langraph_conversations.db");
        globalCheckpointer = SqliteSaver.fromConnString(dbPath);
    }
    return globalCheckpointer;
}