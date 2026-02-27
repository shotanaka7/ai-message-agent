import { useState, useCallback } from "react";
import { useAppStore } from "../store/app-store";
import { useSyncStore } from "../store/sync-store";
import { ChatworkClient } from "../services/api/chatwork-client";
import { SlackClient } from "../services/api/slack-client";
import { SyncEngine } from "../services/sync/sync-engine";
import * as sourceRepo from "../services/db/source-repository";
import * as syncStateRepo from "../services/db/sync-state-repository";
import type { ChatworkRoom, SlackChannel } from "../services/api/api-types";
import type { Source } from "../types";

export function SettingsPage() {
  const { apiKeys, setApiKey } = useAppStore();
  const { setGlobalSyncing, setProgress } = useSyncStore();

  const [chatworkRooms, setChatworkRooms] = useState<ChatworkRoom[]>([]);
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const fetchChatworkRooms = useCallback(async () => {
    if (!apiKeys.chatworkToken) {
      setError("Chatwork API Token を入力してください");
      return;
    }
    setError("");
    setStatus("Chatwork ルームを取得中...");
    try {
      const client = new ChatworkClient(apiKeys.chatworkToken);
      const rooms = await client.getRooms();
      setChatworkRooms(rooms);
      setStatus(`${rooms.length} ルームを取得しました`);

      // ソースとして保存
      for (const room of rooms) {
        await sourceRepo.upsertSource({
          id: crypto.randomUUID(),
          source_type: "chatwork",
          external_id: String(room.room_id),
          name: room.name,
          metadata: JSON.stringify({ type: room.type, icon_path: room.icon_path }),
          is_active: 1,
        });
      }

      // sync_states を初期化
      const allSources = await sourceRepo.getAllSources();
      setSources(allSources);
      for (const source of allSources) {
        await syncStateRepo.upsertSyncState(source.id);
      }
    } catch (e) {
      setError(`Chatwork API エラー: ${(e as Error).message}`);
      setStatus("");
    }
  }, [apiKeys.chatworkToken]);

  const fetchSlackChannels = useCallback(async () => {
    if (!apiKeys.slackBotToken) {
      setError("Slack Bot Token を入力してください");
      return;
    }
    setError("");
    setStatus("Slack チャンネルを取得中...");
    try {
      const client = new SlackClient(apiKeys.slackBotToken);
      const allChannels: SlackChannel[] = [];
      let cursor: string | undefined;

      do {
        const response = await client.getChannels(cursor);
        if (response.channels) {
          allChannels.push(...response.channels);
        }
        cursor = response.response_metadata?.next_cursor || undefined;
      } while (cursor);

      setSlackChannels(allChannels);
      setStatus(`${allChannels.length} チャンネル/DMを取得しました`);

      for (const ch of allChannels) {
        await sourceRepo.upsertSource({
          id: crypto.randomUUID(),
          source_type: "slack",
          external_id: ch.id,
          name: ch.name || `DM (${ch.id})`,
          metadata: JSON.stringify({ is_private: ch.is_private, num_members: ch.num_members }),
          is_active: 1,
        });
      }

      const allSources = await sourceRepo.getAllSources();
      setSources(allSources);
      for (const source of allSources) {
        await syncStateRepo.upsertSyncState(source.id);
      }
    } catch (e) {
      setError(`Slack API エラー: ${(e as Error).message}`);
      setStatus("");
    }
  }, [apiKeys.slackBotToken]);

  const runSync = useCallback(async () => {
    const allSources = await sourceRepo.getActiveSources();
    if (allSources.length === 0) {
      setError("同期するソースがありません。先にルーム/チャンネルを取得してください。");
      return;
    }

    setError("");
    setGlobalSyncing(true);
    setStatus("同期中...");

    const chatworkClient = apiKeys.chatworkToken
      ? new ChatworkClient(apiKeys.chatworkToken)
      : null;
    const slackClient = apiKeys.slackBotToken
      ? new SlackClient(apiKeys.slackBotToken)
      : null;

    const engine = new SyncEngine(chatworkClient, slackClient);

    engine.onProgress = (progress) => {
      setProgress(progress.sourceId, progress);
      setStatus(`${progress.sourceName}: ${progress.fetched} メッセージ取得`);
    };

    engine.onComplete = (_sourceId, newMessages) => {
      setStatus((prev) => `${prev} (+ ${newMessages} new)`);
    };

    engine.onError = (sourceId, err) => {
      setError((prev) => `${prev}\n${sourceId}: ${err.message}`);
    };

    try {
      await engine.syncAll(allSources);
      setStatus("同期完了");
    } catch {
      setError("同期中にエラーが発生しました");
    } finally {
      setGlobalSyncing(false);
    }
  }, [apiKeys, setGlobalSyncing, setProgress]);

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Settings</h2>

      {/* API Keys */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">API Keys</h3>

        <div className="space-y-4">
          {([
            { key: "chatworkToken" as const, label: "Chatwork API Token", placeholder: "Enter Chatwork API Token..." },
            { key: "slackBotToken" as const, label: "Slack Token (Bot or User)", placeholder: "xoxb-... or xoxp-..." },
            { key: "anthropicApiKey" as const, label: "Anthropic API Key", placeholder: "sk-ant-..." },
          ]).map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {label}
              </label>
              <input
                type="password"
                value={apiKeys[key]}
                onChange={(e) => setApiKey(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Source Management */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Sources</h3>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={fetchChatworkRooms}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Chatwork ルーム取得
          </button>
          <button
            onClick={fetchSlackChannels}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Slack チャンネル取得
          </button>
          <button
            onClick={runSync}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            同期を実行
          </button>
        </div>

        {chatworkRooms.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">
              Chatwork Rooms ({chatworkRooms.length})
            </p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {chatworkRooms.map((room) => (
                <div
                  key={room.room_id}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded text-sm"
                >
                  <span className="text-green-600 font-medium">{room.name}</span>
                  <span className="text-xs text-gray-400">({room.type})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {slackChannels.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">
              Slack Channels ({slackChannels.length})
            </p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {slackChannels.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded text-sm"
                >
                  <span className="text-purple-600 font-medium">{ch.name || `DM (${ch.id})`}</span>
                  <span className="text-xs text-gray-400">
                    {ch.is_private ? "private" : "public"}
                    {ch.num_members ? ` / ${ch.num_members}人` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sources.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">
              Registered Sources ({sources.length})
            </p>
            <div className="space-y-1">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        source.source_type === "chatwork"
                          ? "bg-green-100 text-green-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {source.source_type}
                    </span>
                    <span>{source.name}</span>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      source.is_active ? "bg-green-400" : "bg-gray-300"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Status */}
      {(status || error) && (
        <section className="space-y-2">
          {status && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              {status}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 whitespace-pre-wrap">
              {error}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
