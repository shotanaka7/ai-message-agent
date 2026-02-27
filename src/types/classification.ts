export type ClassificationJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ClassificationJob {
  id: string;
  status: ClassificationJobStatus;
  total_messages: number;
  processed: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ClassificationResult {
  message_id: string;
  project_id: string | null;
  suggested_project_name: string | null;
  confidence: number;
  reasoning: string;
}

export interface ClassificationBatchResult {
  classifications: ClassificationResult[];
  usage: { input_tokens: number; output_tokens: number };
}

export interface ClassificationProgress {
  jobId: string;
  status: ClassificationJobStatus;
  totalMessages: number;
  processedMessages: number;
  currentBatch: number;
  totalBatches: number;
  errorMessage: string | null;
}

export const CONFIDENCE_THRESHOLD = 0.7;
export const BATCH_SIZE = 20;
