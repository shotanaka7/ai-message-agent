interface QueuedRequest<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  priority: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
}

export class SyncQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private processing = false;
  private lastRequestTime = 0;

  constructor(private config: RateLimitConfig) {}

  async enqueue<T>(execute: () => Promise<T>, priority = 10): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        id: crypto.randomUUID(),
        execute: execute as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        priority,
      });
      this.queue.sort((a, b) => a.priority - b.priority);
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const now = Date.now();
    const minInterval = (60 * 1000) / this.config.requestsPerMinute;
    const waitTime = Math.max(0, this.lastRequestTime + minInterval - now);

    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const request = this.queue.shift()!;
    this.lastRequestTime = Date.now();

    try {
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      request.reject(error as Error);
    } finally {
      this.processing = false;
      this.processNext();
    }
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue.forEach(req => req.reject(new Error('Queue cleared')));
    this.queue = [];
  }
}
