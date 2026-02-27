import { ClaudeClient, ClaudeRateLimitError, ClaudeOverloadedError } from '../api/claude-client';
import { buildClassificationTool, buildSystemPrompt, buildUserMessage } from './prompt-builder';
import { parseClassificationResponse } from './result-parser';
import type { Project, Message, ClassificationBatchResult } from '../../types';
import { BATCH_SIZE } from '../../types';
import type { ClaudeRequest } from '../api/claude-types';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 5000;
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export interface BatchProcessorCallbacks {
  onBatchComplete: (batchIndex: number, result: ClassificationBatchResult) => void;
  onBatchError: (batchIndex: number, error: Error) => void;
  onProgress: (processed: number, total: number) => void;
}

export class BatchProcessor {
  private cancelled = false;

  constructor(
    private client: ClaudeClient,
    private model: string = DEFAULT_MODEL,
  ) {}

  async processBatches(
    messages: Message[],
    projects: Project[],
    callbacks: BatchProcessorCallbacks
  ): Promise<ClassificationBatchResult[]> {
    const batches = this.createBatches(messages, BATCH_SIZE);
    const results: ClassificationBatchResult[] = [];
    let totalProcessed = 0;

    const projectIds = projects.map(p => p.id);
    const tool = buildClassificationTool(projectIds);
    const systemPrompt = buildSystemPrompt();

    for (let i = 0; i < batches.length; i++) {
      if (this.cancelled) break;

      const batch = batches[i];
      const userMessage = buildUserMessage(projects, batch);

      const request: ClaudeRequest = {
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [userMessage],
        tools: [tool],
        tool_choice: { type: 'tool', name: 'classify_messages' },
      };

      try {
        const result = await this.executeWithRetry(request, batch.map(m => m.id));
        results.push(result);
        totalProcessed += batch.length;
        callbacks.onBatchComplete(i, result);
        callbacks.onProgress(totalProcessed, messages.length);
      } catch (error) {
        callbacks.onBatchError(i, error as Error);
        totalProcessed += batch.length;
        callbacks.onProgress(totalProcessed, messages.length);
      }
    }

    return results;
  }

  cancel(): void {
    this.cancelled = true;
  }

  private async executeWithRetry(
    request: ClaudeRequest,
    expectedMessageIds: string[],
    attempt = 0
  ): Promise<ClassificationBatchResult> {
    try {
      const response = await this.client.createMessage(request);
      return parseClassificationResponse(response, expectedMessageIds);
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;

      if (error instanceof ClaudeRateLimitError) {
        const waitMs = error.retryAfterSeconds * 1000;
        console.warn(`Rate limited. Waiting ${waitMs}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
        await this.sleep(waitMs);
        return this.executeWithRetry(request, expectedMessageIds, attempt + 1);
      }

      if (error instanceof ClaudeOverloadedError) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`API overloaded. Backoff ${backoffMs}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
        await this.sleep(backoffMs);
        return this.executeWithRetry(request, expectedMessageIds, attempt + 1);
      }

      throw error;
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
