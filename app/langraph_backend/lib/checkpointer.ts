import { MemorySaver } from "@langchain/langgraph";

// Global checkpointer instance for conversation memory persistence
let globalCheckpointer: MemorySaver | null = null;

export function getCheckpointer(): MemorySaver {
    if (!globalCheckpointer) {
        globalCheckpointer = new MemorySaver();
    }
    return globalCheckpointer;
}