import type { SourceType } from './source';

export interface SearchFilter {
  query?: string;
  sourceTypes?: SourceType[];
  sourceIds?: string[];
  projectIds?: string[];
  senderNames?: string[];
  dateFrom?: string;
  dateTo?: string;
  isUnclassified?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  messages: SearchResultMessage[];
  totalCount: number;
  query: SearchFilter;
  executionTimeMs: number;
}

export interface SearchResultMessage {
  id: string;
  body: string;
  body_plain: string;
  highlighted_body?: string;
  sender_name: string;
  sent_at: string;
  source_type: SourceType;
  source_name: string;
  project_id: string | null;
  project_name: string | null;
  project_color: string | null;
}
