import type { StorageSchema } from "../types/storage.ts";

interface AlarmInfo {
  readonly name: string;
  readonly delayInMinutes?: number;
  readonly periodInMinutes?: number;
  readonly scheduledTime: number;
}

interface NotificationRecord {
  readonly id: string;
  readonly options: chrome.notifications.NotificationOptions;
}

type MessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) => boolean | void;

type AlarmListener = (alarm: chrome.alarms.Alarm) => void;

interface InstalledDetails {
  readonly reason: string;
  readonly previousVersion?: string;
}

type InstalledListener = (details: InstalledDetails) => void;

export interface ChromeMockHandle {
  readonly getStorageData: () => Record<string, unknown>;
  readonly setStorageData: (data: Partial<StorageSchema>) => void;
  readonly simulateMessage: (
    message: unknown,
    sender?: chrome.runtime.MessageSender,
  ) => Promise<unknown>;
  readonly getAlarms: () => ReadonlyMap<string, AlarmInfo>;
  readonly fireAlarm: (name: string) => void;
  readonly getNotifications: () => readonly NotificationRecord[];
  readonly triggerInstalled: (
    details: InstalledDetails,
  ) => void;
  readonly reset: () => void;
}

export function installMockChrome(): ChromeMockHandle {
  const storage = new Map<string, unknown>();
  const alarms = new Map<string, AlarmInfo>();
  const notifications: NotificationRecord[] = [];
  let messageListeners: MessageListener[] = [];
  let alarmListeners: AlarmListener[] = [];
  let installedListeners: InstalledListener[] = [];

  const mockChrome = {
    storage: {
      local: {
        get: async (keys: readonly string[]): Promise<Record<string, unknown>> => {
          const result: Record<string, unknown> = {};
          for (const key of keys) {
            if (storage.has(key)) {
              result[key] = storage.get(key);
            }
          }
          return result;
        },
        set: async (items: Record<string, unknown>): Promise<void> => {
          for (const [key, value] of Object.entries(items)) {
            storage.set(key, value);
          }
        },
      },
    },
    runtime: {
      onMessage: {
        addListener: (listener: MessageListener): void => {
          messageListeners.push(listener);
        },
        removeListener: (listener: MessageListener): void => {
          messageListeners = messageListeners.filter((l) => l !== listener);
        },
        hasListener: (listener: MessageListener): boolean =>
          messageListeners.includes(listener),
      },
      sendMessage: async (_message: unknown): Promise<unknown> => undefined,
      onInstalled: {
        addListener: (listener: InstalledListener): void => {
          installedListeners.push(listener);
        },
        removeListener: (listener: InstalledListener): void => {
          installedListeners = installedListeners.filter((l) => l !== listener);
        },
      },
    },
    alarms: {
      create: async (
        name: string,
        info: chrome.alarms.AlarmCreateInfo,
      ): Promise<void> => {
        alarms.set(name, {
          name,
          delayInMinutes: info.delayInMinutes,
          periodInMinutes: info.periodInMinutes,
          scheduledTime: Date.now() + (info.delayInMinutes ?? 0) * 60_000,
        });
      },
      clear: async (name: string): Promise<boolean> => alarms.delete(name),
      get: async (name: string): Promise<chrome.alarms.Alarm | undefined> => {
        const info = alarms.get(name);
        if (!info) return undefined;
        return {
          name: info.name,
          scheduledTime: info.scheduledTime,
          periodInMinutes: info.periodInMinutes,
        };
      },
      getAll: async (): Promise<chrome.alarms.Alarm[]> =>
        [...alarms.values()].map((info) => ({
          name: info.name,
          scheduledTime: info.scheduledTime,
          periodInMinutes: info.periodInMinutes,
        })),
      onAlarm: {
        addListener: (listener: AlarmListener): void => {
          alarmListeners.push(listener);
        },
        removeListener: (listener: AlarmListener): void => {
          alarmListeners = alarmListeners.filter((l) => l !== listener);
        },
      },
    },
    notifications: {
      create: (
        id: string,
        options: chrome.notifications.NotificationOptions,
      ): void => {
        notifications.push({ id, options });
      },
    },
    tabs: {
      query: async (
        _queryInfo: Record<string, unknown>,
      ): Promise<chrome.tabs.Tab[]> => [],
    },
  };

  // Cast required: globalThis.chrome is a complex union that cannot be satisfied
  // by a test mock without covering every Chrome API surface
  (globalThis as Record<string, unknown>)["chrome"] = mockChrome;

  const handle: ChromeMockHandle = {
    getStorageData: (): Record<string, unknown> => Object.fromEntries(storage),
    setStorageData: (data: Partial<StorageSchema>): void => {
      for (const [key, value] of Object.entries(data)) {
        storage.set(key, value);
      }
    },
    simulateMessage: (
      message: unknown,
      sender: chrome.runtime.MessageSender = {},
    ): Promise<unknown> =>
      new Promise((resolve) => {
        for (const listener of messageListeners) {
          const isAsync = listener(message, sender, (response) => {
            resolve(response);
          });
          if (isAsync) return;
        }
        resolve(undefined);
      }),
    getAlarms: (): ReadonlyMap<string, AlarmInfo> => new Map(alarms),
    fireAlarm: (name: string): void => {
      const info = alarms.get(name);
      if (!info) return;
      const alarm: chrome.alarms.Alarm = {
        name: info.name,
        scheduledTime: info.scheduledTime,
        periodInMinutes: info.periodInMinutes,
      };
      for (const listener of alarmListeners) {
        listener(alarm);
      }
    },
    getNotifications: (): readonly NotificationRecord[] => [...notifications],
    triggerInstalled: (details: InstalledDetails): void => {
      for (const listener of installedListeners) {
        listener(details);
      }
    },
    reset: (): void => {
      storage.clear();
      alarms.clear();
      notifications.length = 0;
      messageListeners = [];
      alarmListeners = [];
      installedListeners = [];
    },
  };

  return handle;
}
