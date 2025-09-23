// Types for the chat application

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'api' | 'system';
  timestamp: Date;
}

export interface StatusUpdate {
  icon: string;
  message: string;
  isLoading: boolean;
}

export interface DebugEvent {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  functionName?: string;
  args?: any;
  timestamp: number;
}

export interface OllamaStatus {
  success: boolean;
  models?: any[];
  error?: string;
  message?: string;
}

export interface OllamaModel {
  name: string;
  size?: number;
  modified_at?: string;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
}

export interface OllamaGenerateResponse {
  response?: string;
  model?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface ConversationData {
  id: string;
  title?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SavedMessage {
  id: string;
  content: string;
  sender: 'user' | 'api' | 'system';
  timestamp: Date;
}