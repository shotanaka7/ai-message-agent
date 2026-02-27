import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ApiKeys {
  chatworkToken: string;
  slackBotToken: string;
  anthropicApiKey: string;
}

interface AppState {
  apiKeys: ApiKeys;
  setApiKey: (key: keyof ApiKeys, value: string) => void;
  setApiKeys: (keys: Partial<ApiKeys>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiKeys: {
        chatworkToken: '',
        slackBotToken: '',
        anthropicApiKey: '',
      },
      setApiKey: (key, value) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [key]: value },
        })),
      setApiKeys: (keys) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, ...keys },
        })),
    }),
    {
      name: 'ai-message-agent-settings',
    }
  )
);
