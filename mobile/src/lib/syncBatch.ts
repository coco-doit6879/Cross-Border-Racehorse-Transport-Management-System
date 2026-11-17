import type { OfflineEvent } from '@/types/domain';

// Server accepts ≤100 events and ≤8 MB per sync request; health logs may carry a photo.
const MAX_EVENTS = 100;
const MAX_BYTES = 6_000_000;

export function takeSyncBatch(events: OfflineEvent[]): OfflineEvent[] {
  const batch: OfflineEvent[] = [];
  let bytes = 0;
  for (const event of events) {
    const size = JSON.stringify(event).length;
    if (batch.length && (batch.length >= MAX_EVENTS || bytes + size > MAX_BYTES)) break;
    batch.push(event);
    bytes += size;
  }
  return batch;
}
