/**
 * RN Transport — queues events and flushes them to the backend in batches.
 * Mirrors the web SDK transport pattern but uses fetch (available in RN).
 */

import { RNEvent, RNSDKConfig } from './types';

const DEFAULT_FLUSH_INTERVAL = 5000;
const DEFAULT_MAX_BATCH      = 50;
const MAX_RETRIES            = 3;
const RETRY_DELAY_MS         = 1000;

export class RNTransport {
  private queue:       RNEvent[]       = [];
  private flushTimer:  ReturnType<typeof setInterval> | null = null;
  private retryCount   = 0;

  constructor(
    private readonly config:       RNSDKConfig,
    private readonly getSessionId: () => string,
    private readonly getAnonId:    () => string
  ) {}

  push(event: RNEvent): void {
    this.queue.push(event);
    if (this.queue.length >= (this.config.maxBatchSize ?? DEFAULT_MAX_BATCH)) {
      void this.flush();
    }
  }

  startAutoFlush(): void {
    const interval = this.config.flushInterval ?? DEFAULT_FLUSH_INTERVAL;
    this.flushTimer = setInterval(() => void this.flush(), interval);
  }

  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async flush(): Promise<void> {
    if (!this.queue.length) return;
    const batch = this.queue.splice(0, this.config.maxBatchSize ?? DEFAULT_MAX_BATCH);
    await this.send(batch);
  }

  flushSync(): void {
    // Best-effort synchronous flush using sendBeacon or fire-and-forget fetch
    if (!this.queue.length) return;
    const batch = this.queue.splice(0);
    const payload = this.buildPayload(batch);
    fetch(`${this.config.endpoint}/api/v1/ingest/batch`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    }).catch(() => {});
  }

  private buildPayload(events: RNEvent[]) {
    return {
      sessionId:   this.getSessionId(),
      anonymousId: this.getAnonId(),
      apiKey:      this.config.apiKey,
      events:      events.map((e) => ({
        type:       e.type,
        timestamp:  e.timestamp,
        elapsedMs:  e.elapsedMs,
        x:          e.x,
        y:          e.y,
        screenName: e.screenName,
        value:      e.value,
        metadata:   e.metadata,
      })),
    };
  }

  private async send(events: RNEvent[]): Promise<void> {
    const payload = this.buildPayload(events);
    try {
      const res = await fetch(`${this.config.endpoint}/api/v1/ingest/batch`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (res.ok) {
        this.retryCount = 0;
      } else {
        this.requeueWithRetry(events);
      }
    } catch {
      this.requeueWithRetry(events);
    }
  }

  private requeueWithRetry(events: RNEvent[]): void {
    if (this.retryCount >= MAX_RETRIES) {
      this.retryCount = 0;
      return; // drop after max retries
    }
    this.retryCount++;
    setTimeout(() => {
      this.queue.unshift(...events);
      void this.flush();
    }, RETRY_DELAY_MS * this.retryCount);
  }
}
