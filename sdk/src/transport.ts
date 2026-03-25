import { SDKEvent, SDKConfig, BatchPayload } from './types';

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

export class Transport {
  private queue: SDKEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private config: SDKConfig;
  private getSessionId: () => string;
  private getAnonymousId: () => string;
  private isOnline = true;

  constructor(
    config: SDKConfig,
    getSessionId: () => string,
    getAnonymousId: () => string
  ) {
    this.config = config;
    this.getSessionId = getSessionId;
    this.getAnonymousId = getAnonymousId;

    // Monitor online/offline state
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flush();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  push(event: SDKEvent): void {
    this.queue.push(event);

    const maxBatch = this.config.maxBatchSize ?? 50;
    if (this.queue.length >= maxBatch) {
      this.flush();
    }
  }

  startAutoFlush(): void {
    const interval = this.config.flushInterval ?? 5000;
    this.flushTimer = setInterval(() => this.flush(), interval);
  }

  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /** Flush synchronously via sendBeacon (for unload) */
  flushSync(): void {
    if (this.queue.length === 0) return;

    const events = this.queue.splice(0);
    const payload = this.buildPayload(events);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        `${this.config.endpoint}/api/v1/ingest/batch`,
        new Blob([JSON.stringify(payload)], { type: 'application/json' })
      );
    }
  }

  async flush(): Promise<void> {
    if (!this.isOnline || this.queue.length === 0) return;

    const maxBatch = this.config.maxBatchSize ?? 50;
    const events = this.queue.splice(0, maxBatch);

    await this.sendWithRetry(events, 0);
  }

  private async sendWithRetry(events: SDKEvent[], attempt: number): Promise<void> {
    const payload = this.buildPayload(events);

    try {
      const res = await fetch(`${this.config.endpoint}/api/v1/ingest/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok && attempt < MAX_RETRIES) {
        await this.delay(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
        await this.sendWithRetry(events, attempt + 1);
      }
      // On final failure, drop the batch — avoids memory leak
    } catch {
      if (attempt < MAX_RETRIES) {
        await this.delay(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
        await this.sendWithRetry(events, attempt + 1);
      }
    }
  }

  private buildPayload(events: SDKEvent[]): BatchPayload {
    return {
      sessionId: this.getSessionId(),
      anonymousId: this.getAnonymousId(),
      apiKey: this.config.apiKey,
      events,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
