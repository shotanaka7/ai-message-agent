// Claude Messages API type definitions

export interface ClaudeToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

export interface ClaudeContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: string;
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  tools?: ClaudeToolDefinition[];
  tool_choice?: { type: 'auto' | 'any' | 'tool'; name?: string };
  system?: string;
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ClaudeResponseContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  usage: { input_tokens: number; output_tokens: number };
}

export interface ClaudeResponseContentBlock {
  type: 'text' | 'tool_use';
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

export interface ClaudeApiError {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}
