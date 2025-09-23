import { OllamaStatus, OllamaGenerateRequest, OllamaGenerateResponse, OllamaModel } from '../types';

export class OllamaService {
  private ollamaUrl: string;

  constructor() {
    this.ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
  }

  getOllamaUrl(): string {
    return this.ollamaUrl;
  }

  async checkOllamaStatus(): Promise<OllamaStatus> {
    try {
      // Check if Ollama is running
      const healthResponse = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!healthResponse.ok) {
        throw new Error('Ollama service not responding');
      }

      const data = await healthResponse.json();
      const models: OllamaModel[] = data.models || [];

      // Check if required model is available
      const requiredModel = 'llama3.1:8b';
      const hasRequiredModel = models.some(model =>
        model.name === requiredModel || model.name.startsWith('llama3.1')
      );

      if (!hasRequiredModel) {
        throw new Error(`Model ${requiredModel} not found. Available models: ${models.map(m => m.name).join(', ') || 'none'}`);
      }

      return { success: true, models };
    } catch (error) {
      if (error instanceof Error && (error.name === 'TypeError' || error.message.includes('fetch'))) {
        return {
          success: false,
          error: 'Connection failed',
          message: `🚫 **Ollama Not Running**

Please start Ollama first:

**macOS/Linux:**
\`\`\`bash
ollama serve
\`\`\`

**Then install the required model:**
\`\`\`bash
ollama pull llama3.1:8b
\`\`\`

**Check if it's running:**
\`\`\`bash
ollama list
\`\`\`

Make sure Ollama is running on ${this.ollamaUrl}`
        };
      } else if (error instanceof Error && error.message.includes('Model')) {
        return {
          success: false,
          error: 'Model not found',
          message: `🤖 **Model Not Available**

The required model (llama3.1:8b) is not installed.

**Install the model:**
\`\`\`bash
ollama pull llama3.1:8b
\`\`\`

**Alternative models you can try:**
\`\`\`bash
ollama pull llama3.1:latest
ollama pull llama3:latest
ollama pull llama2:latest
\`\`\`

${error.message}`
        };
      } else {
        return {
          success: false,
          error: 'Ollama error',
          message: `❌ **Ollama Error**

${error instanceof Error ? error.message : 'Unknown error'}

Please ensure Ollama is properly installed and running.`
        };
      }
    }
  }

  async generateResponse(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama HTTP error! status: ${response.status}, details: ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  async generateWithConversation(
    message: string,
    conversationHistory: string[],
    model: string = 'llama3.1:8b'
  ): Promise<string> {
    // Build prompt with conversation history
    const prompt = conversationHistory.length > 0
      ? `${conversationHistory.join('\n\n')}\n\nHuman: ${message}\n\nAssistant:`
      : `Human: ${message}\n\nAssistant:`;

    const request: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false
    };

    const response = await this.generateResponse(request);
    return response.response || 'No response received from Ollama';
  }
}