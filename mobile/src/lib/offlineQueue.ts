import * as SQLite from 'expo-sqlite';

import type { OfflineEvent } from '@/types/domain';

type QueuedRow = { event_id: string; event_type: OfflineEvent['event_type']; payload: string };
const databasePromise = SQLite.openDatabaseAsync('cbrt-driver.db');

async function database() {
  const db = await databasePromise;
  await db.execAsync('CREATE TABLE IF NOT EXISTS offline_events (event_id TEXT PRIMARY KEY NOT NULL, event_type TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL)');
  return db;
}

export function newEventId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueOfflineEvent(event: OfflineEvent, ownerId: string) {
  if (!ownerId) throw new Error('Cần đăng nhập để lưu sự kiện.');
  const db = await database();
  await db.runAsync(
    'INSERT OR REPLACE INTO offline_events (event_id, event_type, payload, created_at) VALUES (?, ?, ?, ?)',
    event.event_id, event.event_type, JSON.stringify({ ...event.payload, _queueOwner: ownerId }), Date.now(),
  );
}

export async function listOfflineEvents(ownerId: string): Promise<OfflineEvent[]> {
  const db = await database();
  const rows = await db.getAllAsync<QueuedRow>('SELECT event_id, event_type, payload FROM offline_events ORDER BY created_at');
  // Legacy records without a known account stay quarantined, never attributed
  // to whichever driver happens to log in next.
  return rows.map((row) => ({ event_id: row.event_id, event_type: row.event_type, payload: JSON.parse(row.payload) }))
    .filter(event => ownerId && event.payload._queueOwner === ownerId)
    .map(event => { const { _queueOwner, ...payload } = event.payload; return { ...event, payload }; });
}

export async function removeOfflineEvents(ids: string[]) {
  if (!ids.length) return;
  const db = await database();
  for (const id of ids) await db.runAsync('DELETE FROM offline_events WHERE event_id = ?', id);
}
