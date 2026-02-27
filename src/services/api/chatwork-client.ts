import { fetch } from '@tauri-apps/plugin-http';
import type { ChatworkRoom, ChatworkMessage } from './api-types';

const BASE_URL = 'https://api.chatwork.com/v2';

export class ChatworkClient {
  constructor(private apiToken: string) {}

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'X-ChatworkToken': this.apiToken },
    });
    if (!response.ok) {
      throw new Error(`Chatwork API error: ${response.status} ${response.statusText}`);
    }
    // 204 No Content: Chatwork returns this when no messages are available
    if (response.status === 204) {
      return [] as unknown as T;
    }
    return response.json() as Promise<T>;
  }

  async getRooms(): Promise<ChatworkRoom[]> {
    return this.request<ChatworkRoom[]>('/rooms');
  }

  async getMessages(roomId: number, force: 0 | 1 = 0): Promise<ChatworkMessage[]> {
    return this.request<ChatworkMessage[]>(`/rooms/${roomId}/messages`, {
      force: String(force),
    });
  }

  async getMe(): Promise<{ account_id: number; name: string }> {
    return this.request('/me');
  }
}
