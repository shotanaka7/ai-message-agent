import { useEffect, useState } from "react";
import * as messageRepo from "../services/db/message-repository";
import * as sourceRepo from "../services/db/source-repository";
import type { Source } from "../types";

export function DashboardPage() {
  const [messageCount, setMessageCount] = useState(0);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [count, allSources] = await Promise.all([
          messageRepo.getMessageCount(),
          sourceRepo.getAllSources(),
        ]);
        setMessageCount(count);
        setSources(allSources);
      } catch {
        // DB未初期化の場合はスキップ
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Total Messages</p>
          <p className="text-3xl font-bold text-gray-800">{messageCount}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Connected Sources</p>
          <p className="text-3xl font-bold text-gray-800">{sources.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Active Sources</p>
          <p className="text-3xl font-bold text-gray-800">
            {sources.filter((s) => s.is_active).length}
          </p>
        </div>
      </div>

      {sources.length === 0 && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <p className="text-blue-800 font-medium">
            Settings から API キーを設定して、Chatwork/Slack と連携してください
          </p>
        </div>
      )}
    </div>
  );
}
