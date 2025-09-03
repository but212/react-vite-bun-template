/**
 * @fileoverview
 * 재시도 전략을 정의하는 인터페이스와 구현을 제공합니다.
 * 기본적으로 지수 백오프(Exponential Backoff) 재시도 전략을 포함합니다.
 *
 * @module RetryStrategy
 */

/**
 * 재시도 전략 인터페이스
 * @example
 * // 5번 재시도하고, 매번 1초씩 기다리는 간단한 재시도 전략
 * class SimpleRetry implements RetryStrategy {
 *   shouldRetry(attempt: number, error: unknown): boolean {
 *     console.log(`Attempt ${attempt} failed:`, error);
 *     return attempt <= 5;
 *   }
 *   getDelay(attempt: number): number {
 *     return 1000; // 1초 고정 지연
 *   }
 * }
 */
export interface RetryStrategy {
  shouldRetry(attempt: number, error: unknown): boolean;
  getDelay(attempt: number): number;
}

/**
 * 기본 지수 백오프 재시도 전략
 */
export class ExponentialBackoffRetryStrategy implements RetryStrategy {
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly backoffFactor: number;
  private readonly jitter: number;

  constructor(maxRetries: number = 3, baseDelay: number = 200, backoffFactor: number = 2, jitter: number = 0.2) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.backoffFactor = backoffFactor;
    this.jitter = jitter;
  }

  shouldRetry(attempt: number, _error: unknown): boolean {
    return attempt <= this.maxRetries;
  }

  getDelay(attempt: number): number {
    const baseDelay = this.baseDelay * Math.pow(this.backoffFactor, attempt - 1);
    const jitterAmount = baseDelay * this.jitter;
    const jitter = Math.random() * jitterAmount * 2 - jitterAmount;
    return Math.max(0, baseDelay + jitter);
  }
}
