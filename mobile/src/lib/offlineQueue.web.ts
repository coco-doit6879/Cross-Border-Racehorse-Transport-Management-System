import type { OfflineEvent } from '@/types/domain';

type QueuedItem = {
  event: OfflineEvent;
  ownerId: string;
  createdAt: number;
};

const STORAGE_KEY = 'cbrt_mobile_offline_events_v1';

function getStored(): QueuedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStored(items: QueuedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Local storage full or unavailable
  }
}

export function newEventId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueOfflineEvent(event: OfflineEvent, ownerId: string) {
  if (!ownerId) throw new Error('Cần đăng nhập để lưu sự kiện.');
  const items = getStored();
  const existingIndex = items.findIndex((i) => i.event.event_id === event.event_id);
  const entry: QueuedItem = { event, ownerId, createdAt: Date.now() };
  if (existingIndex >= 0) {
    items[existingIndex] = entry;
  } else {
    items.push(entry);
  }
  saveStored(items);
}

export async function listOfflineEvents(ownerId: string): Promise<OfflineEvent[]> {
  const items = getStored();
  return items
    .filter((item) => ownerId && item.ownerId === ownerId)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((item) => item.event);
}

export async function removeOfflineEvents(ids: string[]) {
  if (!ids.length) return;
  const idSet = new Set(ids);
  const items = getStored().filter((i) => !idSet.has(i.event.event_id));
  saveStored(items);
}
