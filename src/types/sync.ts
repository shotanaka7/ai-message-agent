export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncState {
  id: string;
  source_id: string;
  last_synced_at: string | null;
  last_message_id: string | null;
  cursor: string | null;
  status: SyncStatus;
  error_message: string | null;
}

export interface SyncProgress {
  sourceId: string;
  sourceName: string;
  status: SyncStatus;
  fetched: number;
  hasMore: boolean;
  lastSyncedAt: string | null;
  errorMessage: string | null;
}
