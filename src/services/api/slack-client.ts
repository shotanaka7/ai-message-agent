import { fetch } from '@tauri-apps/plugin-http';
import type { SlackChannel, SlackMessage, SlackPaginatedResponse } from './api-types';

const BASE_URL = 'https://slack.com/api';

export class SlackClient {
  constructor(private botToken: string) {}

  private async request<T>(method: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}/${method}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${this.botToken}` },
    });
    const data = await response.json() as SlackPaginatedResponse<unknown> & T;
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }
    return data;
  }

  async getChannels(cursor?: string): Promise<SlackPaginatedResponse<SlackChannel>> {
    const params: Record<string, string> = {
      limit: '15',
      types: 'public_channel,private_channel,im,mpim',
    };
    if (cursor) params.cursor = cursor;
    return this.request('conversations.list', params);
  }

  async getHistory(
    channelId: string,
    oldest?: string,
    cursor?: string
  ): Promise<SlackPaginatedResponse<SlackMessage>> {
    const params: Record<string, string> = {
      channel: channelId,
      limit: '15',
    };
    if (oldest) params.oldest = oldest;
    if (cursor) params.cursor = cursor;
    return this.request('conversations.history', params);
  }

  async testAuth(): Promise<{ ok: boolean; team: string; user: string }> {
    return this.request('auth.test');
  }
}
