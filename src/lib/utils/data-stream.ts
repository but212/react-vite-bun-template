/**
 * @fileoverview
 * 대용량 데이터 배열을 청크 단위로 효율적으로 처리하기 위한 DataStream 유틸리티 클래스입니다.
 * 비동기 청크 처리, 메모리 사용 최적화, 진행률 콜백, 재시도, concurrency 제어, 백프레셔, 함수형 체이닝까지 실무에서 대규모 데이터 처리에 특화된 기능을 제공합니다.
 *
 * @module DataStream
 */

import { createErrorMessage } from '../i18n';

/**
 * 처리 진행률 콜백 함수의 타입 정의입니다.
 *
 * @param progress - 처리 진행률(0.0 ~ 1.0 사이의 부동소수점, 1.0은 100% 완료)
 * @param processedItems - 처리된 아이템 수
 * @param totalItems - 전체 아이템 수
 */
export type ProgressCallback = (progress: number, processedItems: number, totalItems: number) => void;

/**
 * 백프레셔 제어 콜백 함수의 타입 정의입니다.
 *
 * @param memoryUsage - 현재 메모리 사용량 (MB)
 * @param activeWorkers - 현재 활성 워커 수
 * @returns 처리를 계속할지 여부
 */
export type BackpressureCallback = (memoryUsage: number, activeWorkers: number) => Promise<boolean>;

/**
 * 메모리 효율적인 청크 뷰 인터페이스입니다.
 * 원본 배열을 복사하지 않고 참조만으로 청크를 표현합니다.
 */
export interface ChunkView<T> {
  readonly data: readonly T[];
  readonly start: number;
  readonly end: number;
  readonly length: number;
  [Symbol.iterator](): Iterator<T>;
  slice(): T[];
}

/**
 * ChunkView 구현 클래스
 */
class ChunkViewImpl<T> implements ChunkView<T> {
  public readonly data: readonly T[];
  public readonly start: number;
  public readonly end: number;

  constructor(data: readonly T[], start: number, end: number) {
    this.data = data;
    this.start = start;
    this.end = end;
  }

  get length(): number {
    return this.end - this.start;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let i = this.start; i < this.end; i++) {
      const item = this.data[i];
      if (item !== undefined) {
        yield item;
      }
    }
  }

  slice(): T[] {
    return this.data.slice(this.start, this.end) as T[];
  }
}

/**
 * 청크 처리 함수의 타입 정의입니다.
 * @template T - 입력 데이터의 타입
 * @template R - 처리 결과의 타입
 */
export type ChunkProcessor<T, R = void> = (chunk: ChunkView<T>) => Promise<R>;

/**
 * 스트림 처리 메트릭 정보입니다.
 */
export interface StreamMetrics {
  /** 총 청크 수 */
  totalChunks: number;
  /** 처리된 청크 수 */
  processedChunks: number;
  /** 실패한 청크 수 */
  failedChunks: number;
  /** 평균 청크 처리 시간 (ms) */
  averageChunkTime: number;
  /** 총 처리 시간 (ms) */
  totalTime: number;
  /** 처리된 아이템 수 */
  processedItems: number;
  /** 전체 아이템 수 */
  totalItems: number;
  /** 최대 메모리 사용량 (MB) */
  maxMemoryUsage: number;
  /** 실제 사용된 동시성 수 */
  concurrencyUsed: number;
  /** 총 재시도 횟수 */
  totalRetries: number;
  /** 최대 동시 실행 워커 수 */
  maxConcurrent: number;
  /** 백프레셔로 인한 일시정지 횟수 */
  pauseCount: number;
  /** 백프레셔로 인한 총 대기 시간 (ms) */
  throttledTimeMs: number;
}

/**
 * 처리 결과와 오류 정보를 담는 인터페이스입니다.
 * @template R - 처리 결과의 타입
 */
export interface ProcessResult<R> {
  /** 성공적으로 처리된 결과들 */
  results: R[];
  /** 처리 중 발생한 오류들 */
  errors: Array<{
    chunkIndex: number;
    error: unknown;
  }>;
  /** 처리 메트릭 정보 */
  metrics: StreamMetrics;
}

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
 *
 * const stream = new DataStream({ retryStrategy: new SimpleRetry() });
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

/**
 * 동시성 제어 전략 인터페이스
 * @example
 * // 항상 8개의 워커를 사용하고, 메모리 사용량이 1GB를 넘으면 일시 중지하는 전략
 * class FixedConcurrency implements ConcurrencyStrategy {
 *   getWorkerCount(totalItems: number): number {
 *     return 8;
 *   }
 *   async shouldPause(activeWorkers: number, memoryUsage: number): Promise<boolean> {
 *     if (memoryUsage > 1024) {
 *       console.warn(`High memory usage (${memoryUsage.toFixed(2)}MB), pausing workers...`);
 *       return true;
 *     }
 *     return false;
 *   }
 * }
 *
 * const stream = new DataStream({ concurrencyStrategy: new FixedConcurrency() });
 */
export interface ConcurrencyStrategy {
  getWorkerCount(totalItems: number): number;
  shouldPause(activeWorkers: number, memoryUsage: number): Promise<boolean>;
}

/**
 * 적응형 동시성 제어 전략
 */
export class AdaptiveConcurrencyStrategy implements ConcurrencyStrategy {
  private readonly maxConcurrency: number;
  private readonly memoryThreshold: number;
  private readonly backpressureCallback?: BackpressureCallback;

  constructor(
    maxConcurrency: number = 4,
    memoryThreshold: number = 512, // MB
    backpressureCallback?: BackpressureCallback
  ) {
    this.maxConcurrency = maxConcurrency;
    this.memoryThreshold = memoryThreshold;
    this.backpressureCallback = backpressureCallback;
  }

  getWorkerCount(totalItems: number): number {
    // 작은 데이터셋에는 낮은 동시성 사용
    if (totalItems < 100) return Math.min(2, this.maxConcurrency);
    if (totalItems < 1000) return Math.min(4, this.maxConcurrency);
    return this.maxConcurrency;
  }

  async shouldPause(activeWorkers: number, memoryUsage: number): Promise<boolean> {
    if (memoryUsage > this.memoryThreshold) {
      if (this.backpressureCallback) {
        return !(await this.backpressureCallback(memoryUsage, activeWorkers));
      }
      return true; // 기본적으로 메모리 임계값 초과 시 일시정지
    }
    return false;
  }
}

/**
 * DataStream 클래스의 생성자 옵션입니다.
 */
export interface DataStreamOptions {
  chunkSize?: number;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
  retryStrategy?: RetryStrategy;
  concurrencyStrategy?: ConcurrencyStrategy;
  backpressureCallback?: BackpressureCallback;
  /**
   * true일 경우, 첫 오류 발생 시 즉시 처리를 중단합니다.
   * false일 경우, 오류가 발생해도 모든 청크 처리를 시도하고 모든 오류를 수집합니다.
   *
   * 주의: retryStrategy가 제공되면 기본값이 false가 됩니다.
   * failFast가 true여도 개별 청크에 대한 재시도는 수행되며, 최종 실패 시에만 전체 처리가 중단됩니다.
   *
   * @defaultValue retryStrategy가 제공되지 않으면 true, 제공되면 false
   */
  failFast?: boolean;
  /**
   * failFast 모드에서도 개별 청크에 대한 재시도를 수행할지 여부입니다.
   * true일 경우, failFast 모드에서도 청크별 재시도를 수행하고 최종 실패 시에만 전체 중단합니다.
   * false일 경우, failFast 모드에서는 재시도 없이 즉시 실패합니다.
   * @defaultValue false
   */
  retryInFailFast?: boolean;
}

/**
 * 함수형 스트림 체이닝을 위한 인터페이스
 */
export interface StreamChain<T> {
  map<U>(mapper: (item: T) => U): StreamChain<U>;
  filter(predicate: (item: T) => boolean): StreamChain<T>;
  reduce<U>(reducer: (acc: U, item: T) => U, initialValue: U): Promise<U>;
  forEach(callback: (item: T) => void | Promise<void>): Promise<void>;
  collect(): Promise<T[]>;
}

/**
 * 변환 연산의 타입 정의
 */
type TransformOperation<T = unknown, U = unknown> =
  | { type: 'map'; fn: (item: T) => U }
  | { type: 'filter'; fn: (item: T) => boolean };

/**
 * 스트림 체인 구현 클래스 - 지연 평가(lazy evaluation)를 사용하여 메모리 효율성을 개선
 */
class StreamChainImpl<T> implements StreamChain<T> {
  private readonly stream: DataStream<unknown>;
  private readonly data: readonly unknown[];
  private readonly operations: TransformOperation<unknown, unknown>[];

  constructor(
    stream: DataStream<unknown>,
    data: readonly unknown[],
    operations: TransformOperation<unknown, unknown>[] = []
  ) {
    this.stream = stream;
    this.data = data;
    this.operations = operations;
  }

  map<U>(mapper: (item: T) => U): StreamChain<U> {
    const newOperations = [...this.operations, { type: 'map' as const, fn: mapper as (item: unknown) => unknown }];
    return new StreamChainImpl<U>(this.stream, this.data, newOperations);
  }

  filter(predicate: (item: T) => boolean): StreamChain<T> {
    const newOperations = [
      ...this.operations,
      { type: 'filter' as const, fn: predicate as (item: unknown) => boolean },
    ];
    return new StreamChainImpl<T>(this.stream, this.data, newOperations);
  }

  async reduce<U>(reducer: (acc: U, item: T) => U, initialValue: U): Promise<U> {
    let accumulator = initialValue;

    await this.stream.process(this.data, async chunk => {
      for (const rawItem of chunk) {
        const transformedItem = this.applyTransformationsToItem(rawItem as T);
        if (transformedItem !== null) {
          accumulator = reducer(accumulator, transformedItem);
        }
      }
    });

    return accumulator;
  }

  async forEach(callback: (item: T) => void | Promise<void>): Promise<void> {
    await this.stream.process(this.data, async chunk => {
      for (const rawItem of chunk) {
        const transformedItem = this.applyTransformationsToItem(rawItem as T);
        if (transformedItem !== null) {
          await callback(transformedItem);
        }
      }
    });
  }

  async collect(): Promise<T[]> {
    // process()의 청크-인덱스 정렬 기능을 활용하여 순서 보장
    const { results: chunks } = await this.stream.process(this.data, async chunk => {
      const transformedItems: T[] = [];
      for (const rawItem of chunk) {
        const transformedItem = this.applyTransformationsToItem(rawItem as T);
        if (transformedItem !== null) {
          transformedItems.push(transformedItem);
        }
      }
      return transformedItems;
    });

    return chunks.flat();
  }

  /**
   * 개별 아이템에 지연 변환을 적용합니다.
   * 연산들을 추가된 순서대로 적용합니다.
   */
  private applyTransformationsToItem(item: T): T | null {
    let currentItem: unknown = item;

    // 모든 연산을 순서대로 적용
    for (const operation of this.operations) {
      if (operation.type === 'filter') {
        if (!operation.fn(currentItem)) {
          return null; // 필터 조건을 만족하지 않으면 제외
        }
      } else if (operation.type === 'map') {
        currentItem = operation.fn(currentItem);
      }
    }

    return currentItem as T;
  }
}

/**
 * 메모리 사용량 모니터링 유틸리티
 */
class MemoryMonitor {
  getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      // Node.js 환경
      const usage = process.memoryUsage();
      return usage.heapUsed / 1024 / 1024; // MB 단위
    } else if (typeof performance !== 'undefined' && 'memory' in performance) {
      // 브라우저 환경 (Chrome)
      const memory = (performance as { memory: { usedJSHeapSize: number } }).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB 단위
    }
    return 0; // 메모리 정보를 얻을 수 없는 경우
  }
}

/**
 * 비동기 청크 스트림 유틸리티 - robust한 대용량 처리용
 *
 * @typeParam T - 데이터 항목 타입
 */
export class DataStream<T> {
  private readonly chunkSize: number;
  private readonly onProgress?: ProgressCallback;
  private readonly signal?: AbortSignal;
  private readonly retryStrategy: RetryStrategy;
  private readonly concurrencyStrategy: ConcurrencyStrategy;
  private readonly memoryMonitor: MemoryMonitor;
  private readonly failFast: boolean;
  private readonly retryInFailFast: boolean;

  constructor(options: DataStreamOptions = {}) {
    if (options.chunkSize !== undefined && options.chunkSize <= 0) {
      throw new Error(createErrorMessage('dataStream', 'invalidChunkSize'));
    }
    this.chunkSize = options.chunkSize ?? 1024;
    this.onProgress = options.onProgress;
    this.signal = options.signal;
    this.failFast = options.failFast ?? !options.retryStrategy;
    this.retryInFailFast = options.retryInFailFast ?? false;

    // 레거시 옵션 지원하면서 새로운 전략 패턴 우선 사용
    this.retryStrategy = options.retryStrategy ?? new ExponentialBackoffRetryStrategy();

    this.concurrencyStrategy =
      options.concurrencyStrategy ??
      new AdaptiveConcurrencyStrategy(undefined, undefined, options.backpressureCallback);

    this.memoryMonitor = new MemoryMonitor();
  }

  /**
   * 함수형 스트림 체이닝 시작
   */
  chain<U extends T>(data: readonly U[]): StreamChain<U> {
    return new StreamChainImpl<U>(this as DataStream<unknown>, data as readonly unknown[]);
  }

  /**
   * 데이터를 청크 단위로 병렬 비동기 처리(진행률/재시도/취소/백프레셔/이벤트루프 양보 포함)
   *
   * @param data 전체 데이터 배열 (readonly로 원본 데이터 보호)
   * @param processor 각 청크를 처리하는 함수
   * @returns 처리 결과와 오류 정보
   */
  public async process<R>(data: readonly T[], processor: ChunkProcessor<T, R>): Promise<ProcessResult<R>> {
    this.signal?.throwIfAborted();

    if (!Array.isArray(data)) throw new TypeError(createErrorMessage('dataStream', 'notArray'));

    const startTime = performance.now();
    let maxMemoryUsage = 0;

    // 내부 AbortController: 한 워커에서 오류 발생 시 다른 모든 워커를 즉시 중단시키기 위함 (failFast 모드).
    const internalController = new AbortController();
    const internalSignal = internalController.signal;

    const totalChunks = Math.ceil(data.length / this.chunkSize);
    const concurrency = this.concurrencyStrategy.getWorkerCount(data.length);
    const processedItems = { count: 0 }; // 여러 워커가 안전하게 접근하도록 객체로 래핑 (참조 전달).
    let chunkIndex = 0; // 원자적으로 증가시켜 각 워커가 고유한 청크를 가져가도록 함.
    const results = new Map<number, R>(); // 청크가 순서대로 처리되지 않으므로, Map을 사용해 인덱스 기반으로 결과를 저장.
    const errors: Array<{ chunkIndex: number; error: unknown }> = [];
    const chunkTimes: number[] = [];
    let activeWorkerCount = 0;

    // 확장된 메트릭 추적 변수들
    let totalRetries = 0;
    let maxConcurrent = 0;
    let pauseCount = 0;
    let throttledTimeMs = 0;

    // 단일 청크 처리 로직: 재시도, 결과/오류 저장, 진행률 업데이트를 담당.
    const processSingleChunk = async (chunkIndex: number) => {
      // 청크 처리 시작 전 중단 신호 확인
      this.signal?.throwIfAborted();

      const start = chunkIndex * this.chunkSize;
      const end = Math.min(start + this.chunkSize, data.length);
      const chunk = new ChunkViewImpl(data, start, end);
      const chunkStartTime = performance.now();

      try {
        let result: R;
        if (this.failFast && !this.retryInFailFast) {
          // failFast이고 재시도를 하지 않는 경우
          if (internalSignal?.aborted) throw new Error('Operation cancelled by another worker');
          this.signal?.throwIfAborted();
          result = await processor(chunk);
          this.signal?.throwIfAborted();
        } else {
          // failFast이지만 재시도를 하거나, failFast가 아닌 경우
          let attempts = 0;
          while (true) {
            this.signal?.throwIfAborted();
            if (internalSignal?.aborted) throw new Error('Operation cancelled by another worker');

            try {
              result = await processor(chunk);
              break; // 성공 시 루프 탈출
            } catch (e) {
              attempts++;
              if (!this.retryStrategy.shouldRetry(attempts, e) || internalSignal?.aborted) {
                throw e; // 재시도 불가 시 오류 던지기
              }
              totalRetries++; // 실제 재시도가 수행될 때만 카운트
              const delay = this.retryStrategy.getDelay(attempts);
              await new Promise(res => setTimeout(res, delay));
            }
          }
        }

        // 성공 처리
        if (result !== undefined) {
          results.set(chunkIndex, result);
        }
        processedItems.count += chunk.length;
        chunkTimes.push(performance.now() - chunkStartTime);

        if (this.onProgress) {
          const progress = data.length === 0 ? 1 : Math.min(1, processedItems.count / data.length);
          this.onProgress(progress, processedItems.count, data.length);
        }
      } catch (err) {
        // 실패 처리
        if (!internalSignal.aborted) {
          errors.push({ chunkIndex, error: err });
          if (this.failFast) {
            internalController.abort();
          }
        }
      }
    };

    // 동시성 제어를 위한 워커 함수. 풀(Pool)의 일부로 동작.
    const worker = async () => {
      while (true) {
        // 워커 루프 시작 시 외부 중단 신호 확인
        this.signal?.throwIfAborted();

        // 외부(사용자) 또는 내부(failFast) 신호에 의해 중단되었는지 확인.
        if (internalSignal.aborted) break;

        // 백프레셔: 메모리 사용량이 임계값을 넘으면 잠시 대기.
        const currentMemoryUsage = this.memoryMonitor.getMemoryUsage();
        maxMemoryUsage = Math.max(maxMemoryUsage, currentMemoryUsage);

        if (await this.concurrencyStrategy.shouldPause(activeWorkerCount, currentMemoryUsage)) {
          pauseCount++; // 일시정지 횟수 추적
          const pauseStart = performance.now();
          await new Promise(resolve => setTimeout(resolve, 100)); // 과도한 확인을 피하기 위해 잠시 대기.
          throttledTimeMs += performance.now() - pauseStart; // 대기 시간 누적
          continue;
        }

        // 경쟁 상태를 피하며 다음 처리할 청크 인덱스를 원자적으로 가져옴.
        const myIndex = chunkIndex++;
        if (myIndex >= totalChunks) break; // 모든 청크가 할당되었으면 워커 종료.

        activeWorkerCount++;
        maxConcurrent = Math.max(maxConcurrent, activeWorkerCount); // 최대 동시 실행 워커 수 추적
        try {
          await processSingleChunk(myIndex);

          // 긴 작업으로 인한 이벤트 루프 블로킹을 방지. UI 렌더링, GC 등을 위해 다른 작업에 실행 기회를 양보.
          if ((myIndex + 1) % 10 === 0) {
            if (typeof setImmediate !== 'undefined') {
              await new Promise(resolve => setImmediate(resolve));
            } else {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
        } catch {
          // processSingleChunk 내부에서 모든 오류를 처리하므로, worker의 catch 블록은 비워둡니다.
          // failFast:true인 경우, internalController가 중단 신호를 보내 루프가 종료됩니다.
          // failFast:false인 경우, 오류는 errors 배열에 수집되고 이 워커는 다음 작업을 계속합니다.
        } finally {
          activeWorkerCount--;
        }
      }
    };

    // 워커 풀을 생성하고 모든 워커가 작업을 마칠 때까지 기다림.
    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    // 외부 AbortSignal에 의해 중단된 경우, 표준 AbortError를 던짐.
    if (this.signal?.aborted) {
      if (typeof DOMException !== 'undefined') {
        throw new DOMException(createErrorMessage('dataStream', 'operationAborted'), 'AbortError');
      } else {
        // Node.js 환경이나 DOMException이 없는 환경에서의 폴백
        const error = new Error(createErrorMessage('dataStream', 'operationAborted'));
        error.name = 'AbortError';
        throw error;
      }
    }

    const endTime = performance.now();
    const metrics: StreamMetrics = {
      totalChunks,
      processedChunks: chunkTimes.length,
      failedChunks: errors.length,
      averageChunkTime: chunkTimes.length > 0 ? chunkTimes.reduce((a, b) => a + b, 0) / chunkTimes.length : 0,
      totalTime: endTime - startTime,
      processedItems: processedItems.count,
      totalItems: data.length,
      maxMemoryUsage,
      concurrencyUsed: concurrency,
      totalRetries,
      maxConcurrent,
      pauseCount,
      throttledTimeMs,
    };

    // 오류 발생 여부와 관계없이 수집된 결과와 오류, 메트릭을 일관된 구조로 반환.
    // `failFast: true`인 경우, 첫 오류 시점에서 처리가 중단되었을 수 있음.

    // 결과가 있는 경우에만 ProcessResult 반환
    // Map에 저장된 결과를 원래 순서대로 정렬하여 배열로 변환.
    const sortedResults: R[] = [];
    if (results.size > 0) {
      // `totalChunks`를 기준으로 순회하여 순서를 보장.
      for (let i = 0; i < totalChunks; i++) {
        if (results.has(i)) {
          const result = results.get(i);
          if (result !== undefined) {
            sortedResults.push(result);
          }
        }
      }
    }

    return {
      results: sortedResults,
      errors,
      metrics,
    };
  }
}
