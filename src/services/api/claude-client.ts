import { fetch } from '@tauri-apps/plugin-http';
import type { ClaudeRequest, ClaudeResponse, ClaudeApiError } from './claude-types';

const BASE_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

export class ClaudeClient {
  constructor(private apiKey: string) {}

  async createMessage(request: ClaudeRequest): Promise<ClaudeResponse> {
    const response = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorType = 'unknown';
      let errorMessage = response.statusText;

      try {
        const errorBody = await response.json() as ClaudeApiError;
        errorType = errorBody?.error?.type ?? 'unknown';
        errorMessage = errorBody?.error?.message ?? response.statusText;
      } catch {
        // JSON parse failed, use statusText
      }

      if (response.status === 429 || errorType === 'rate_limit_error') {
        const retryAfter = response.headers.get('retry-after');
        throw new ClaudeRateLimitError(errorMessage, retryAfter ? parseInt(retryAfter, 10) : 60);
      }
      if (response.status === 529 || errorType === 'overloaded_error') {
        throw new ClaudeOverloadedError(errorMessage);
      }
      throw new ClaudeApiRequestError(errorMessage, response.status, errorType);
    }

    return response.json() as Promise<ClaudeResponse>;
  }
}

export class ClaudeRateLimitError extends Error {
  constructor(message: string, public retryAfterSeconds: number) {
    super(message);
    this.name = 'ClaudeRateLimitError';
  }
}

export class ClaudeOverloadedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaudeOverloadedError';
  }
}

export class ClaudeApiRequestError extends Error {
  constructor(message: string, public statusCode: number, public errorType: string) {
    super(message);
    this.name = 'ClaudeApiRequestError';
  }
}
