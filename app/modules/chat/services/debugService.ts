import { DebugEvent } from '../types';

export class DebugService {
  private debugCallback?: (debugData: DebugEvent) => void;

  setDebugCallback(callback: (debugData: DebugEvent) => void) {
    this.debugCallback = callback;
  }

  addDebugEvent(
    type: 'info' | 'success' | 'error' | 'warning',
    message: string,
    details: any = null,
    functionName: string | null = null,
    args: any = null
  ) {
    const debugEvent: DebugEvent = {
      type,
      message,
      details,
      functionName,
      args,
      timestamp: Date.now()
    };

    if (this.debugCallback) {
      this.debugCallback(debugEvent);
    }

    // Also log to console for debugging
    console.log(`[${type.toUpperCase()}] ${message}`, {
      details,
      functionName,
      args,
      timestamp: debugEvent.timestamp
    });
  }

  logStatusCheck(url: string, endpoint: string) {
    this.addDebugEvent(
      'info',
      'Checking Ollama status',
      { url: `${url}${endpoint}` },
      'checkOllamaStatus',
      { endpoint }
    );
  }

  logStatusCheckSuccess(modelsFound: number, models: string[]) {
    this.addDebugEvent(
      'success',
      'Ollama status check successful',
      { modelsFound, models },
      'checkOllamaStatus',
      { availableModels: modelsFound }
    );
  }

  logStatusCheckError(status: number, statusText: string, url: string) {
    this.addDebugEvent(
      'error',
      'Ollama status check failed',
      { status, statusText },
      'checkOllamaStatus',
      { url }
    );
  }

  logApiRequest(url: string, method: string, model: string, promptLength: number) {
    this.addDebugEvent(
      'info',
      'Making API call to Ollama',
      { url, method },
      'fetch',
      { model, promptLength }
    );
  }

  logApiRequestError(status: number, statusText: string, error: string, url: string) {
    this.addDebugEvent(
      'error',
      `API request failed with status ${status}`,
      { status, statusText, error },
      'fetch',
      { url }
    );
  }

  logApiResponse(
    responseLength: number,
    modelUsed: string,
    responseText: string,
    totalDuration?: number,
    loadDuration?: number,
    promptEvalCount?: number,
    evalCount?: number
  ) {
    this.addDebugEvent(
      'success',
      'API response received successfully',
      {
        responseLength,
        modelUsed,
        totalDuration,
        loadDuration,
        promptEvalCount,
        evalCount
      },
      'fetch',
      {
        responseText: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')
      }
    );
  }
}