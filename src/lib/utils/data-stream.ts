/**
 * @fileoverview
 * 대용량 데이터 배열을 청크 단위로 효율적으로 처리하기 위한 DataStream 유틸리티 클래스입니다.
 * 비동기 청크 처리, 메모리 사용 최적화, 진행률 콜백, 재시도, concurrency 제어, 백프레셔, 함수형 체이닝까지 실무에서 대규모 데이터 처리에 특화된 기능을 제공합니다.
 *
 * @module DataStream
 */

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

  shouldRetry(attempt: number, error: unknown): boolean {
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
  concurrency?: number;
  signal?: AbortSignal;
  retryStrategy?: RetryStrategy;
  concurrencyStrategy?: ConcurrencyStrategy;
  backpressureCallback?: BackpressureCallback;
  /**
   * true일 경우, 첫 오류 발생 시 즉시 처리를 중단합니다.
   * false일 경우, 오류가 발생해도 모든 청크 처리를 시도하고 모든 오류를 수집합니다.
   * @defaultValue true
   */
  failFast?: boolean;
  /**
   * 청크 처리 실패 시 최대 재시도 횟수입니다.
   * @defaultValue 0 (재시도 없음)
   * @deprecated retryStrategy 사용 권장
   */
  retryCount?: number;
  /**
   * 재시도 간 지연(ms), 지수 백오프에 사용.
   * @defaultValue 200
   * @deprecated retryStrategy 사용 권장
   */
  retryDelay?: number;
  /**
   * 지수 백오프의 증가율입니다.
   * @defaultValue 2
   * @deprecated retryStrategy 사용 권장
   */
  retryBackoffFactor?: number;
  /**
   * 재시도 지연에 추가할 무작위성 비율(0.0 ~ 1.0).
   * 여러 클라이언트의 동시 재시도 시 부하 분산에 도움이 됩니다.
   * @defaultValue 0.2 (20%)
   * @deprecated retryStrategy 사용 권장
   */
  retryJitter?: number;
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
 * 스트림 체인 구현 클래스
 */
class StreamChainImpl<T> implements StreamChain<T> {
  private readonly stream: DataStream<any>;
  private readonly data: readonly T[];
  private readonly transformations: Array<(data: readonly any[]) => readonly any[]>;

  constructor(
    stream: DataStream<any>,
    data: readonly T[],
    transformations: Array<(data: readonly any[]) => readonly any[]> = []
  ) {
    this.stream = stream;
    this.data = data;
    this.transformations = transformations;
  }

  map<U>(mapper: (item: T) => U): StreamChain<U> {
    const newTransformations = [...this.transformations, (data: readonly T[]) => data.map(mapper)];
    return new StreamChainImpl<U>(this.stream, this.data as readonly any[], newTransformations);
  }

  filter(predicate: (item: T) => boolean): StreamChain<T> {
    const newTransformations = [...this.transformations, (data: readonly T[]) => data.filter(predicate)];
    return new StreamChainImpl<T>(this.stream, this.data, newTransformations);
  }

  async reduce<U>(reducer: (acc: U, item: T) => U, initialValue: U): Promise<U> {
    const transformedData = this.applyTransformations();
    let accumulator = initialValue;

    await this.stream.process(transformedData, async chunk => {
      for (const item of chunk) {
        accumulator = reducer(accumulator, item);
      }
    });

    return accumulator;
  }

  async forEach(callback: (item: T) => void | Promise<void>): Promise<void> {
    const transformedData = this.applyTransformations();

    await this.stream.process(transformedData, async chunk => {
      for (const item of chunk) {
        await callback(item);
      }
    });
  }

  async collect(): Promise<T[]> {
    const transformedData = this.applyTransformations();
    const results: T[] = [];

    await this.stream.process(transformedData, async chunk => {
      results.push(...chunk.slice());
    });

    return results;
  }

  private applyTransformations(): readonly T[] {
    return this.transformations.reduce((data, transform) => transform(data), this.data) as readonly T[];
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
    } else if (typeof performance !== 'undefined' && (performance as any).memory) {
      // 브라우저 환경 (Chrome)
      const memory = (performance as any).memory;
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

  constructor(options: DataStreamOptions = {}) {
    this.chunkSize = options.chunkSize ?? 1024;
    this.onProgress = options.onProgress;
    this.signal = options.signal;
    this.failFast = options.failFast ?? true;

    // 레거시 옵션 지원하면서 새로운 전략 패턴 우선 사용
    this.retryStrategy =
      options.retryStrategy ??
      new ExponentialBackoffRetryStrategy(
        options.retryCount ?? 0,
        options.retryDelay ?? 200,
        options.retryBackoffFactor ?? 2,
        options.retryJitter ?? 0.2
      );

    this.concurrencyStrategy =
      options.concurrencyStrategy ??
      new AdaptiveConcurrencyStrategy(
        options.concurrency ?? 4,
        512, // 기본 메모리 임계값 512MB
        options.backpressureCallback
      );

    this.memoryMonitor = new MemoryMonitor();
  }

  /**
   * 함수형 스트림 체이닝 시작
   */
  chain<U extends T>(data: readonly U[]): StreamChain<U> {
    return new StreamChainImpl<U>(this, data);
  }

  /**
   * 내부: 지정된 청크를 processor로 처리(재시도 포함)
   */
  private async processChunkWithRetry<R>(
    chunk: ChunkView<T>,
    processor: ChunkProcessor<T, R>,
    internalSignal?: AbortSignal
  ): Promise<R> {
    let attempts = 0;
    while (true) {
      // 외부 중단 신호 확인
      this.signal?.throwIfAborted();
      // 내부 중단 신호는 조용히 처리 (다른 워커의 오류로 인한 것)
      if (internalSignal?.aborted) {
        throw new Error('Operation cancelled by another worker');
      }

      try {
        return await processor(chunk);
      } catch (e) {
        attempts++;
        if (!this.retryStrategy.shouldRetry(attempts, e)) throw e;

        const delay = this.retryStrategy.getDelay(attempts);
        await new Promise(res => setTimeout(res, delay));
      }
    }
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

    if (!Array.isArray(data)) throw new TypeError('Data must be an array');

    const startTime = performance.now();
    let maxMemoryUsage = 0;

    // 내부 AbortController로 워커 간 즉각적인 오류 전파
    const internalController = new AbortController();
    const internalSignal = internalController.signal;

    const totalChunks = Math.ceil(data.length / this.chunkSize);
    const concurrency = this.concurrencyStrategy.getWorkerCount(data.length);
    const processedItems = { count: 0 }; // 객체로 래핑하여 race condition 방지
    let chunkIndex = 0;
    const results = new Map<number, R>(); // sparse array 대신 Map 사용
    const errors: Array<{ chunkIndex: number; error: unknown }> = [];
    const chunkTimes: number[] = [];
    let activeWorkerCount = 0;

    // 단일 청크 처리 로직
    const processSingleChunk = async (chunkIndex: number) => {
      const start = chunkIndex * this.chunkSize;
      const end = Math.min(start + this.chunkSize, data.length);
      const chunk = new ChunkViewImpl(data, start, end);

      const chunkStartTime = performance.now();
      try {
        const result = await this.processChunkWithRetry(chunk, processor, internalSignal);

        if (result !== undefined) {
          results.set(chunkIndex, result);
        }

        processedItems.count += chunk.length;
        if (this.onProgress) {
          const progress = data.length === 0 ? 1 : Math.min(1, processedItems.count / data.length);
          this.onProgress(progress, processedItems.count, data.length);
        }

        chunkTimes.push(performance.now() - chunkStartTime);
      } catch (err) {
        if (!internalSignal.aborted) {
          errors.push({ chunkIndex, error: err });
          if (this.failFast) {
            internalController.abort();
          }
        }
        // failFast 모드에서는 오류 발생 시 즉시 반환하여 루프 중단에 기여
        if (this.failFast) {
          throw err; // worker의 catch 블록으로 전파
        }
      }
    };

    // 동시 워커 풀 구현
    const worker = async () => {
      while (true) {
        // 외부 또는 내부 신호에 의해 중단되었는지 확인
        if (internalSignal.aborted) break;

        // 백프레셔 확인
        const currentMemoryUsage = this.memoryMonitor.getMemoryUsage();
        maxMemoryUsage = Math.max(maxMemoryUsage, currentMemoryUsage);

        if (await this.concurrencyStrategy.shouldPause(activeWorkerCount, currentMemoryUsage)) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 대기
          continue;
        }

        // 다음 청크 인덱스 가져오기
        const myIndex = chunkIndex++;
        if (myIndex >= totalChunks) break;

        activeWorkerCount++;
        try {
          await processSingleChunk(myIndex);

          // 10청크마다 이벤트루프 양보 (GC/UI 응답성 보장)
          if ((myIndex + 1) % 10 === 0) {
            await new Promise(resolve => setImmediate(resolve));
          }
        } catch (err) {
          // processSingleChunk에서 failFast:true로 오류가 전파된 경우 루프 중단
          if (this.failFast) {
            break;
          }
          // failFast:false인 경우, 오류는 이미 수집되었으므로 계속 진행
        } finally {
          activeWorkerCount--;
        }
      }
    };

    // 워커 풀 생성 및 실행
    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    if (this.signal?.aborted) {
      throw new DOMException('This operation was aborted', 'AbortError');
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
    };

    // 오류가 있더라도 항상 결과를 반환하고, 오류는 errors 배열에 포함
    // failFast: true인 경우, 첫 번째 오류 발생 시점에서 처리가 중단되었을 것

    // 결과가 있는 경우에만 ProcessResult 반환
    // Map을 정렬된 배열로 변환
    const sortedResults: R[] = [];
    if (results.size > 0) {
      for (let i = 0; i < totalChunks; i++) {
        if (results.has(i)) {
          sortedResults.push(results.get(i)!);
        }
      }
    }

    return {
      results: sortedResults,
      errors,
      metrics,
    };
  }

  /**
   * 결과를 수집하지 않는 단순한 처리 메서드 (기존 호환성 유지)
   * @deprecated `process` 메서드가 이제 항상 `ProcessResult`를 반환하므로 이 메서드는 더 이상 필요하지 않습니다. `process`를 대신 사용하세요.
   */
  public async processVoid(data: readonly T[], processor: ChunkProcessor<T, void>): Promise<ProcessResult<void>> {
    return this.process(data, processor);
  }
}
