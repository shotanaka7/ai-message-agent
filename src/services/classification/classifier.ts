import { ClaudeClient } from '../api/claude-client';
import { BatchProcessor } from './batch-processor';
import * as messageRepo from '../db/message-repository';
import * as projectRepo from '../db/project-repository';
import * as classificationJobRepo from '../db/classification-job-repository';
import type {
  ClassificationProgress,
  ClassificationResult,
  ClassificationJobStatus,
} from '../../types';
import { CONFIDENCE_THRESHOLD } from '../../types';

export class Classifier {
  private batchProcessor: BatchProcessor | null = null;
  private _isRunning = false;
  private cancelled = false;

  onProgress?: (progress: ClassificationProgress) => void;
  onComplete?: (jobId: string, totalClassified: number) => void;
  onError?: (jobId: string, error: Error) => void;

  constructor(private apiKey: string) {}

  get isRunning(): boolean {
    return this._isRunning;
  }

  async classifyUnclassified(limit = 200): Promise<string> {
    if (this._isRunning) throw new Error('Classification already in progress');

    this._isRunning = true;

    const messages = await messageRepo.getUnclassifiedMessages(limit);
    const projects = await projectRepo.getAllProjects();

    if (messages.length === 0) {
      this._isRunning = false;
      throw new Error('No unclassified messages found');
    }

    const jobId = crypto.randomUUID();
    await classificationJobRepo.createJob(jobId, messages.length);

    const client = new ClaudeClient(this.apiKey);
    this.batchProcessor = new BatchProcessor(client);

    const totalBatches = Math.ceil(messages.length / 20);
    let totalClassified = 0;

    this.emitProgress(jobId, 'running', messages.length, 0, 0, totalBatches, null);

    try {
      await classificationJobRepo.updateJobStatus(jobId, 'running');

      await this.batchProcessor.processBatches(messages, projects, {
        onBatchComplete: async (batchIndex, result) => {
          const applied = await this.applyClassifications(result.classifications);
          totalClassified += applied;
          await classificationJobRepo.updateJobProcessed(jobId, totalClassified);
          this.emitProgress(jobId, 'running', messages.length, totalClassified, batchIndex + 1, totalBatches, null);
        },
        onBatchError: (batchIndex, error) => {
          console.error(`Batch ${batchIndex} failed:`, error);
        },
        onProgress: () => {},
      });

      await classificationJobRepo.completeJob(jobId);
      this.onComplete?.(jobId, totalClassified);
      this.emitProgress(jobId, 'completed', messages.length, totalClassified, totalBatches, totalBatches, null);

      return jobId;
    } catch (error) {
      const err = error as Error;
      await classificationJobRepo.failJob(jobId, err.message);
      this.onError?.(jobId, err);
      this.emitProgress(jobId, 'failed', messages.length, totalClassified, 0, totalBatches, err.message);
      throw err;
    } finally {
      this._isRunning = false;
      this.batchProcessor = null;
    }
  }

  async classifyAll(batchLimit = 200): Promise<{ totalClassified: number; rounds: number }> {
    if (this._isRunning) throw new Error('Classification already in progress');

    this._isRunning = true;

    const totalUnclassified = await messageRepo.getUnclassifiedCount();
    if (totalUnclassified === 0) {
      this._isRunning = false;
      throw new Error('No unclassified messages found');
    }

    const jobId = crypto.randomUUID();
    await classificationJobRepo.createJob(jobId, totalUnclassified);

    const client = new ClaudeClient(this.apiKey);
    const totalBatchesEstimate = Math.ceil(totalUnclassified / 20);
    let grandTotalClassified = 0;
    let batchesDone = 0;
    let rounds = 0;

    this.emitProgress(jobId, 'running', totalUnclassified, 0, 0, totalBatchesEstimate, null);

    try {
      await classificationJobRepo.updateJobStatus(jobId, 'running');

      while (true) {
        const messages = await messageRepo.getUnclassifiedMessages(batchLimit);
        if (messages.length === 0) break;

        const projects = await projectRepo.getAllProjects();
        this.batchProcessor = new BatchProcessor(client);
        rounds++;

        await this.batchProcessor.processBatches(messages, projects, {
          onBatchComplete: async (_batchIndex, result) => {
            const applied = await this.applyClassifications(result.classifications);
            grandTotalClassified += applied;
            batchesDone++;
            await classificationJobRepo.updateJobProcessed(jobId, grandTotalClassified);
            this.emitProgress(jobId, 'running', totalUnclassified, grandTotalClassified, batchesDone, totalBatchesEstimate, null);
          },
          onBatchError: (_batchIndex, error) => {
            console.error(`Round ${rounds} batch failed:`, error);
            batchesDone++;
          },
          onProgress: () => {},
        });

        this.batchProcessor = null;

        if (this.cancelled) break;
      }

      await classificationJobRepo.completeJob(jobId);
      this.onComplete?.(jobId, grandTotalClassified);
      this.emitProgress(jobId, 'completed', totalUnclassified, grandTotalClassified, totalBatchesEstimate, totalBatchesEstimate, null);

      return { totalClassified: grandTotalClassified, rounds };
    } catch (error) {
      const err = error as Error;
      await classificationJobRepo.failJob(jobId, err.message);
      this.onError?.(jobId, err);
      this.emitProgress(jobId, 'failed', totalUnclassified, grandTotalClassified, batchesDone, totalBatchesEstimate, err.message);
      throw err;
    } finally {
      this._isRunning = false;
      this.batchProcessor = null;
      this.cancelled = false;
    }
  }

  cancel(): void {
    this.cancelled = true;
    this.batchProcessor?.cancel();
  }

  private async applyClassifications(results: ClassificationResult[]): Promise<number> {
    let applied = 0;
    for (const result of results) {
      if (result.project_id && result.confidence >= CONFIDENCE_THRESHOLD) {
        await messageRepo.updateClassification(
          result.message_id,
          result.project_id,
          'auto',
          result.confidence
        );
        applied++;
      }
    }
    return applied;
  }

  private emitProgress(
    jobId: string, status: ClassificationJobStatus, total: number, processed: number,
    currentBatch: number, totalBatches: number, errorMessage: string | null
  ): void {
    this.onProgress?.({
      jobId,
      status,
      totalMessages: total,
      processedMessages: processed,
      currentBatch,
      totalBatches,
      errorMessage,
    });
  }
}
