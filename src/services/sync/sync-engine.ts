import { SyncQueue } from './sync-queue';
import { ChatworkClient } from '../api/chatwork-client';
import { SlackClient } from '../api/slack-client';
import { normalizeChatworkMessage, normalizeSlackMessage } from '../../lib/message-normalizer';
import * as messageRepo from '../db/message-repository';
import * as syncStateRepo from '../db/sync-state-repository';
import type { Source, SyncProgress } from '../../types';

export class SyncEngine {
  private chatworkQueue: SyncQueue;
  private slackQueue: SyncQueue;
  private _isRunning = false;

  onProgress?: (progress: SyncProgress) => void;
  onComplete?: (sourceId: string, newMessages: number) => void;
  onError?: (sourceId: string, error: Error) => void;

  constructor(
    private chatworkClient: ChatworkClient | null,
    private slackClient: SlackClient | null,
  ) {
    this.chatworkQueue = new SyncQueue({ requestsPerMinute: 20 });
    this.slackQueue = new SyncQueue({ requestsPerMinute: 1 });
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  async syncSource(source: Source): Promise<number> {
    const syncState = await syncStateRepo.getSyncState(source.id);
    await syncStateRepo.updateSyncStatus(source.id, 'syncing');

    this.onProgress?.({
      sourceId: source.id,
      sourceName: source.name,
      status: 'syncing',
      fetched: 0,
      hasMore: true,
      lastSyncedAt: syncState?.last_synced_at || null,
      errorMessage: null,
    });

    try {
      let newMessageCount: number;

      if (source.source_type === 'chatwork') {
        if (!this.chatworkClient) throw new Error('Chatwork client not configured');
        newMessageCount = await this.syncChatwork(source, syncState?.last_message_id || null);
      } else {
        if (!this.slackClient) throw new Error('Slack client not configured');
        newMessageCount = await this.syncSlack(source, syncState?.last_message_id || null);
      }

      await syncStateRepo.updateSyncStatus(source.id, 'idle');
      await syncStateRepo.updateLastSynced(source.id);
      this.onComplete?.(source.id, newMessageCount);
      return newMessageCount;
    } catch (error) {
      const err = error as Error;
      const contextMessage = `[${source.source_type}] ${source.name}: ${err.message}`;
      const contextError = new Error(contextMessage);
      await syncStateRepo.updateSyncStatus(source.id, 'error', contextMessage);
      this.onError?.(source.id, contextError);
      throw contextError;
    }
  }

  private async syncChatwork(source: Source, lastMessageId: string | null): Promise<number> {
    const roomId = Number(source.external_id);
    const force = lastMessageId ? 0 : 1;

    const messages = await this.chatworkQueue.enqueue(
      () => this.chatworkClient!.getMessages(roomId, force as 0 | 1)
    );

    if (!messages || messages.length === 0) return 0;

    const normalized = messages.map(msg => normalizeChatworkMessage(msg, source));
    const inserted = await messageRepo.upsertMessages(normalized);

    const lastId = messages[messages.length - 1].message_id;
    await syncStateRepo.updateLastMessageId(source.id, lastId);

    return inserted;
  }

  private async syncSlack(source: Source, lastMessageId: string | null): Promise<number> {
    let totalInserted = 0;
    let cursor: string | undefined = undefined;

    do {
      let response;
      try {
        response = await this.slackQueue.enqueue(
          () => this.slackClient!.getHistory(source.external_id, lastMessageId || undefined, cursor)
        );
      } catch (e) {
        const msg = (e as Error).message;
        // Skip inaccessible channels (bot not a member, DM not accessible, etc.)
        if (msg.includes('channel_not_found') || msg.includes('not_in_channel')) {
          return 0;
        }
        throw e;
      }

      if (response.messages && response.messages.length > 0) {
        const normalized = response.messages.map(msg =>
          normalizeSlackMessage(msg, source)
        );
        const inserted = await messageRepo.upsertMessages(normalized);
        totalInserted += inserted;

        const latestTs = response.messages[0].ts;
        await syncStateRepo.updateLastMessageId(source.id, latestTs);
      }

      cursor = response.response_metadata?.next_cursor || undefined;

      this.onProgress?.({
        sourceId: source.id,
        sourceName: source.name,
        status: 'syncing',
        fetched: totalInserted,
        hasMore: !!cursor,
        lastSyncedAt: null,
        errorMessage: null,
      });
    } while (cursor);

    return totalInserted;
  }

  async syncAll(sources: Source[]): Promise<void> {
    this._isRunning = true;
    const activeSources = sources.filter(s => s.is_active);

    const promises = activeSources.map(source =>
      this.syncSource(source).catch(err => {
        console.error(`Sync failed for ${source.name}:`, err);
      })
    );

    await Promise.allSettled(promises);
    this._isRunning = false;
  }

  stop(): void {
    this._isRunning = false;
    this.chatworkQueue.clear();
    this.slackQueue.clear();
  }
}
