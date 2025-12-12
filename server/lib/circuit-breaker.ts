import pRetry, { AbortError } from "p-retry";

export interface CircuitBreakerOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  onRetry?: (error: unknown, attempt: number) => void;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 10000,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: CircuitBreakerOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return pRetry(
    async () => {
      try {
        return await fn();
      } catch (error: any) {
        if (isNonRetryableError(error)) {
          throw new AbortError(error.message);
        }
        throw error;
      }
    },
    {
      retries: opts.retries,
      minTimeout: opts.minTimeout,
      maxTimeout: opts.maxTimeout,
      onFailedAttempt: (error) => {
        const attempt = error.attemptNumber;
        const retriesLeft = error.retriesLeft;
        console.log(
          `[circuit-breaker] Attempt ${attempt} failed. ${retriesLeft} retries left.`
        );
        if (opts.onRetry) {
          opts.onRetry(error, attempt);
        }
      },
    }
  );
}

function isNonRetryableError(error: any): boolean {
  if (error.status === 400 || error.status === 401 || error.status === 403) {
    return true;
  }

  if (error.code === "invalid_api_key" || error.code === "insufficient_quota") {
    return true;
  }

  const message = error.message?.toLowerCase() || "";
  if (
    message.includes("invalid api key") ||
    message.includes("api key") ||
    message.includes("authentication") ||
    message.includes("quota exceeded")
  ) {
    return true;
  }

  return false;
}

export function logHeapUsage(context: string = "general"): void {
  const usage = process.memoryUsage();
  const rssMB = Math.round(usage.rss / 1024 / 1024);
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);

  console.log(
    `[heap-monitor][${context}] RSS: ${rssMB}MB, Heap: ${heapUsedMB}/${heapTotalMB}MB`
  );

  if (rssMB > 500) {
    console.warn(`[heap-monitor] WARNING: RSS exceeds 500MB (${rssMB}MB)`);
  }
}

export function getMemoryStats(): {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  warning: boolean;
} {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024),
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
    warning: usage.rss > 500 * 1024 * 1024,
  };
}
