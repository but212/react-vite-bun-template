/**
 * @fileoverview
 * 대용량 데이터 배열을 청크 단위로 효율적으로 처리하기 위한 DataStream 유틸리티 클래스입니다.
 * 비동기 청크 처리, 메모리 사용 최적화, 진행률 콜백, 재시도, concurrency 제어, 백프레셔, 함수형 체이닝까지
 * 실무에서 대규모 데이터 처리에 특화된 기능을 제공합니다.
 *
 * @module DataStream
 *
 * @example
 * ```typescript
 * // 기본 사용법
 * const stream = new DataStream({ chunkSize: 100 });
 * const result = await stream.process(largeArray, async (chunk) => {
 *   return chunk.slice().map(item => processItem(item));
 * });
 *
 * // 함수형 체이닝
 * const processedData = await stream
 *   .chain(data)
 *   .filter(item => item.isValid)
 *   .map(item => transform(item))
 *   .collect();
 * ```
 */

import { createErrorMessage } from '../i18n';
import { ExponentialBackoffRetryStrategy, type RetryStrategy } from './retry-strategy';

/**
 * 처리 진행률 콜백 함수의 타입 정의입니다.
 * 데이터 처리 중 실시간으로 진행 상황을 모니터링할 수 있습니다.
 *
 * @param progress - 처리 진행률 (0.0 ~ 1.0 사이의 부동소수점, 1.0은 100% 완료)
 * @param processedItems - 현재까지 처리된 개별 아이템 수
 * @param totalItems - 처리해야 할 전체 아이템 수
 *
 * @example
 * ```typescript
 * const progressCallback: ProgressCallback = (progress, processed, total) => {
 *   console.log(`Progress: ${(progress * 100).toFixed(1)}% (${processed}/${total})`);
 *   // UI 진행률 바 업데이트
 *   updateProgressBar(progress);
 * };
 *
 * const stream = new DataStream({ onProgress: progressCallback });
 * ```
 */
export type ProgressCallback = (progress: number, processedItems: number, totalItems: number) => void;

/**
 * 백프레셔 제어 콜백 함수의 타입 정의입니다.
 * 메모리 사용량이 임계값을 초과할 때 처리 속도를 조절하거나 일시 중단할 수 있습니다.
 *
 * @param memoryUsage - 현재 메모리 사용량 (MB 단위)
 * @param activeWorkers - 현재 활성 상태인 워커 수
 * @returns 처리를 계속할지 여부를 나타내는 Promise<boolean>
 *          - `true`: 처리 계속
 *          - `false`: 처리 일시 중단
 *
 * @example
 * ```typescript
 * const backpressureCallback: BackpressureCallback = async (memoryUsage, activeWorkers) => {
 *   if (memoryUsage > 1024) { // 1GB 초과 시
 *     console.warn(`High memory usage: ${memoryUsage.toFixed(2)}MB`);
 *     // 메모리 정리 시도
 *     if (global.gc) global.gc();
 *     return false; // 처리 일시 중단
 *   }
 *   return true; // 처리 계속
 * };
 * ```
 */
export type BackpressureCallback = (memoryUsage: number, activeWorkers: number) => Promise<boolean>;

/**
 * 메모리 효율적인 청크 뷰 인터페이스입니다.
 * 원본 배열을 복사하지 않고 참조만으로 청크를 표현하여 메모리 사용량을 최소화합니다.
 *
 * @template T - 청크에 포함된 데이터 항목의 타입
 *
 * @example
 * ```typescript
 * // ChunkView 사용 예시
 * const processor: ChunkProcessor<number, number[]> = async (chunk: ChunkView<number>) => {
 *   const results: number[] = [];
 *
 *   // Iterator 사용
 *   for (const item of chunk) {
 *     results.push(item * 2);
 *   }
 *
 *   // 또는 배열로 변환
 *   const array = chunk.slice();
 *   return array.map(x => x * 2);
 * };
 * ```
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
 * ChunkView 인터페이스의 구현 클래스입니다.
 * 원본 배열의 특정 범위를 참조하여 메모리 효율적인 청크 뷰를 제공합니다.
 *
 * @template T - 청크에 포함된 데이터 항목의 타입
 * @internal
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
 * 각 청크를 비동기적으로 처리하고 결과를 반환하는 함수입니다.
 *
 * @template T - 입력 데이터 항목의 타입
 * @template R - 처리 결과의 타입 (void인 경우 결과 수집하지 않음)
 *
 * @param chunk - 처리할 청크 뷰 객체
 * @returns 처리 결과를 담은 Promise
 *
 * @example
 * ```typescript
 * // 숫자 배열을 처리하여 제곱값 배열 반환
 * const processor: ChunkProcessor<number, number[]> = async (chunk) => {
 *   const results: number[] = [];
 *   for (const num of chunk) {
 *     results.push(num * num);
 *   }
 *   return results;
 * };
 *
 * // 부작용만 수행하고 결과 반환하지 않음
 * const sideEffectProcessor: ChunkProcessor<User, void> = async (chunk) => {
 *   for (const user of chunk) {
 *     await sendEmail(user.email);
 *   }
 * };
 * ```
 */
export type ChunkProcessor<T, R = void> = (chunk: ChunkView<T>) => Promise<R>;

/**
 * 스트림 처리 메트릭 정보입니다.
 * 처리 성능, 메모리 사용량, 오류 통계 등 상세한 실행 정보를 제공합니다.
 *
 * @example
 * ```typescript
 * const { results, errors, metrics } = await stream.process(data, processor);
 *
 * console.log(`처리 완료: ${metrics.processedItems}/${metrics.totalItems}`);
 * console.log(`평균 청크 처리 시간: ${metrics.averageChunkTime.toFixed(2)}ms`);
 * console.log(`최대 메모리 사용량: ${metrics.maxMemoryUsage.toFixed(2)}MB`);
 * console.log(`재시도 횟수: ${metrics.totalRetries}`);
 *
 * if (metrics.pauseCount > 0) {
 *   console.log(`백프레셔로 인한 일시정지: ${metrics.pauseCount}회`);
 * }
 * ```
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
 * 성공한 결과, 발생한 오류, 처리 메트릭을 모두 포함하여 완전한 처리 상황을 제공합니다.
 *
 * @template R - 처리 결과의 타입
 *
 * @example
 * ```typescript
 * const result: ProcessResult<string[]> = await stream.process(data, processor);
 *
 * // 성공한 결과 처리
 * console.log(`성공한 청크 수: ${result.results.length}`);
 * result.results.forEach((chunkResult, index) => {
 *   console.log(`청크 ${index} 결과:`, chunkResult);
 * });
 *
 * // 오류 처리
 * if (result.errors.length > 0) {
 *   console.error(`실패한 청크 수: ${result.errors.length}`);
 *   result.errors.forEach(({ chunkIndex, error }) => {
 *     console.error(`청크 ${chunkIndex} 오류:`, error);
 *   });
 * }
 *
 * // 메트릭 분석
 * const successRate = (result.metrics.processedChunks / result.metrics.totalChunks) * 100;
 * console.log(`성공률: ${successRate.toFixed(1)}%`);
 * ```
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
 * 동시성 제어 전략 인터페이스입니다.
 * 데이터 크기와 시스템 상황에 따라 적절한 워커 수를 결정하고 백프레셔를 제어합니다.
 *
 * @example
 * ```typescript
 * // 고정 동시성 전략
 * class FixedConcurrency implements ConcurrencyStrategy {
 *   constructor(private readonly workerCount: number = 8) {}
 *
 *   getWorkerCount(totalItems: number): number {
 *     return this.workerCount;
 *   }
 *
 *   async shouldPause(activeWorkers: number, memoryUsage: number): Promise<boolean> {
 *     if (memoryUsage > 1024) {
 *       console.warn(`High memory usage (${memoryUsage.toFixed(2)}MB), pausing workers...`);
 *       return true;
 *     }
 *     return false;
 *   }
 * }
 *
 * // 적응형 동시성 전략
 * class SmartConcurrency implements ConcurrencyStrategy {
 *   getWorkerCount(totalItems: number): number {
 *     if (totalItems < 100) return 2;
 *     if (totalItems < 10000) return 4;
 *     return Math.min(8, Math.ceil(totalItems / 1000));
 *   }
 *
 *   async shouldPause(activeWorkers: number, memoryUsage: number): Promise<boolean> {
 *     // CPU 사용률과 메모리를 모두 고려
 *     return memoryUsage > 512 && activeWorkers > 4;
 *   }
 * }
 *
 * const stream = new DataStream({
 *   concurrencyStrategy: new FixedConcurrency(4)
 * });
 * ```
 */
export interface ConcurrencyStrategy {
  getWorkerCount(totalItems: number): number;
  shouldPause(activeWorkers: number, memoryUsage: number): Promise<boolean>;
}

/**
 * 적응형 동시성 제어 전략 클래스입니다.
 * 데이터 크기에 따라 워커 수를 자동 조절하고 메모리 임계값을 기반으로 백프레셔를 제어합니다.
 *
 * @example
 * ```typescript
 * // 기본 설정 사용
 * const strategy = new AdaptiveConcurrencyStrategy();
 *
 * // 커스텀 설정
 * const customStrategy = new AdaptiveConcurrencyStrategy(
 *   8,    // 최대 동시성
 *   1024, // 메모리 임계값 (MB)
 *   async (memoryUsage, activeWorkers) => {
 *     // 커스텀 백프레셔 로직
 *     if (memoryUsage > 2048) {
 *       await cleanup(); // 메모리 정리
 *       return false; // 일시 중단
 *     }
 *     return true;
 *   }
 * );
 *
 * const stream = new DataStream({ concurrencyStrategy: customStrategy });
 * ```
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
 * 청크 크기, 진행률 콜백, 재시도 전략, 동시성 제어 등 다양한 처리 옵션을 설정할 수 있습니다.
 *
 * @example
 * ```typescript
 * // 기본 옵션
 * const stream = new DataStream({
 *   chunkSize: 500,
 *   onProgress: (progress, processed, total) => {
 *     console.log(`${(progress * 100).toFixed(1)}% 완료`);
 *   }
 * });
 *
 * // 고급 옵션
 * const advancedStream = new DataStream({
 *   chunkSize: 1000,
 *   failFast: false, // 오류 발생해도 모든 청크 처리 시도
 *   retryStrategy: new ExponentialBackoffRetryStrategy(3, 1000, 2),
 *   concurrencyStrategy: new AdaptiveConcurrencyStrategy(8, 512),
 *   signal: abortController.signal,
 *   backpressureCallback: async (memory, workers) => {
 *     return memory < 1024; // 1GB 미만일 때만 계속
 *   }
 * });
 * ```
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
 * 함수형 스트림 체이닝을 위한 인터페이스입니다.
 * 지연 평가(lazy evaluation)를 통해 메모리 효율적인 데이터 변환 파이프라인을 구성할 수 있습니다.
 *
 * @template T - 스트림에서 처리되는 데이터 항목의 타입
 *
 * @example
 * ```typescript
 * // 복잡한 데이터 변환 파이프라인
 * const result = await stream
 *   .chain(users)
 *   .filter(user => user.isActive)
 *   .map(user => ({ ...user, fullName: `${user.firstName} ${user.lastName}` }))
 *   .filter(user => user.age >= 18)
 *   .collect();
 *
 * // 집계 연산
 * const totalAge = await stream
 *   .chain(users)
 *   .filter(user => user.isActive)
 *   .reduce((sum, user) => sum + user.age, 0);
 *
 * // 부작용 수행
 * await stream
 *   .chain(notifications)
 *   .filter(notif => notif.urgent)
 *   .forEach(async (notif) => {
 *     await sendPushNotification(notif);
 *   });
 * ```
 */
export interface StreamChain<T> {
  map<U>(mapper: (item: T) => U): StreamChain<U>;
  filter(predicate: (item: T) => boolean): StreamChain<T>;
  reduce<U>(reducer: (acc: U, item: T) => U, initialValue: U): Promise<U>;
  forEach(callback: (item: T) => void | Promise<void>): Promise<void>;
  collect(): Promise<T[]>;
}

/**
 * 변환 연산의 타입 정의입니다.
 * 스트림 체이닝에서 사용되는 map, filter 연산을 나타냅니다.
 *
 * @template T - 입력 데이터 타입
 * @template U - 출력 데이터 타입 (map 연산의 경우)
 * @internal
 */
type TransformOperation<T = unknown, U = unknown> =
  | { type: 'map'; fn: (item: T) => U }
  | { type: 'filter'; fn: (item: T) => boolean };

/**
 * 스트림 체인 구현 클래스입니다.
 * 지연 평가(lazy evaluation) 기반의 map/filter/reduce/forEach/collect 연산을 제공하여
 * 대용량 데이터도 메모리 효율적으로 처리할 수 있습니다.
 * 모든 변환 연산(map/filter)은 내부적으로 파이프라인에 저장되며, 실제 실행은 최종 집계 연산(collect, reduce, forEach)에서 한 번에 수행됩니다.
 *
 * @template T 현재 스트림에서 처리되는 데이터 항목의 타입
 * @internal
 *
 * @example
 * ```typescript
 * const stream = new DataStream();
 * // 체이닝 예시: 활성 사용자만 필터링, 이름 변환 후 수집
 * const activeUsers = await stream
 *   .chain(users)
 *   .filter(user => user.isActive)
 *   .map(user => ({ ...user, displayName: `${user.lastName} ${user.firstName}` }))
 *   .collect();
 * ```
 */
class StreamChainImpl<T> implements StreamChain<T> {
  /**
   * 스트림 인스턴스 (DataStream)
   * @internal
   */
  private readonly stream: DataStream<unknown>;
  /**
   * 원본 데이터 배열 (지연 변환 적용 전)
   * @internal
   */
  private readonly data: readonly unknown[];
  /**
   * map/filter 연산 파이프라인
   * @internal
   */
  private readonly operations: TransformOperation<unknown, unknown>[];

  /**
   * StreamChainImpl 생성자
   * @param stream DataStream 인스턴스
   * @param data 원본 데이터 배열
   * @param operations map/filter 연산 목록 (파이프라인)
   * @internal
   */
  constructor(
    stream: DataStream<unknown>,
    data: readonly unknown[],
    operations: TransformOperation<unknown, unknown>[] = []
  ) {
    this.stream = stream;
    this.data = data;
    this.operations = operations;
  }

  /**
   * map 변환 연산을 파이프라인에 추가합니다.
   * @template U 매핑 후 항목 타입
   * @param mapper 각 아이템에 적용할 매핑 함수
   * @returns 새로운 StreamChain<U> 인스턴스 (map 연산 추가됨)
   *
   * @example
   * ```typescript
   * const names = await stream.chain(users).map(u => u.name).collect();
   * ```
   */
  map<U>(mapper: (item: T) => U): StreamChain<U> {
    const newOperations = [...this.operations, { type: 'map' as const, fn: mapper as (item: unknown) => unknown }];
    return new StreamChainImpl<U>(this.stream, this.data, newOperations);
  }

  /**
   * filter 연산을 파이프라인에 추가합니다.
   * @param predicate 각 아이템에 적용할 필터링 조건 함수
   * @returns 새로운 StreamChain<T> 인스턴스 (filter 연산 추가됨)
   *
   * @example
   * ```typescript
   * const adults = await stream.chain(users).filter(u => u.age >= 18).collect();
   * ```
   */
  filter(predicate: (item: T) => boolean): StreamChain<T> {
    const newOperations = [
      ...this.operations,
      { type: 'filter' as const, fn: predicate as (item: unknown) => boolean },
    ];
    return new StreamChainImpl<T>(this.stream, this.data, newOperations);
  }

  /**
   * reduce(집계) 연산을 수행합니다. 파이프라인상의 변환 후 항목에 대해 누적 작업을 수행합니다.
   * @template U 누적값의 타입
   * @param reducer 누적 함수 (acc, item) => acc'
   * @param initialValue 누적의 초기값
   * @returns 집계 결과 Promise<U>
   *
   * @example
   * ```typescript
   * const sum = await stream.chain(numbers).reduce((acc, n) => acc + n, 0);
   * ```
   */
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

  /**
   * 각 항목에 대해 비동기 또는 동기 콜백을 실행합니다. (for side effects)
   * @param callback 각 항목에 수행할 콜백 함수
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await stream.chain(items).forEach(async item => {
   *   await doSomething(item);
   * });
   * ```
   */
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

  /**
   * 변환 파이프라인을 모두 적용한 결과 배열을 반환합니다.
   * 원본 데이터 순서가 유지됩니다.
   * @returns 변환된 결과 배열 Promise<T[]>
   *
   * @example
   * ```typescript
   * const result = await stream.chain(data).map(fn).filter(cond).collect();
   * ```
   */
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
   * 개별 아이템에 모든 변환 연산(map, filter 등)을 순서대로 적용합니다.
   * filter 조건에 통과하지 못하는 경우 null을 반환합니다.
   * @param item 변환할 원본 아이템
   * @returns 변환된 아이템 또는 null (필터 조건 미달시)
   * @internal
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
 * 메모리 사용량 모니터링 유틸리티 클래스입니다.
 * Node.js와 브라우저 환경에서 크로스 플랫폼으로 메모리 사용량을 측정합니다.
 *
 * @example
 * ```typescript
 * const monitor = new MemoryMonitor();
 * const currentUsage = monitor.getMemoryUsage();
 * console.log(`현재 메모리 사용량: ${currentUsage.toFixed(2)}MB`);
 *
 * // 메모리 사용량 모니터링 루프
 * setInterval(() => {
 *   const usage = monitor.getMemoryUsage();
 *   if (usage > 1024) {
 *     console.warn('높은 메모리 사용량 감지!');
 *   }
 * }, 5000);
 * ```
 *
 * @internal
 */
class MemoryMonitor {
  /**
   * 현재 메모리 사용량을 MB 단위로 반환합니다.
   * Node.js와 브라우저 환경을 모두 지원합니다.
   *
   * @returns 현재 메모리 사용량 (MB), 측정 불가능한 경우 0
   */
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
 * 비동기 청크 스트림 유틸리티 클래스입니다.
 * 대용량 데이터를 청크 단위로 나누어 병렬 처리하며, 메모리 효율성과 안정성을 보장합니다.
 *
 * @template T - 처리할 데이터 항목의 타입
 *
 * @example
 * ```typescript
 * // 기본 사용법
 * const stream = new DataStream<User>({
 *   chunkSize: 100,
 *   onProgress: (progress) => console.log(`${(progress * 100).toFixed(1)}% 완료`)
 * });
 *
 * const result = await stream.process(users, async (chunk) => {
 *   const processed = [];
 *   for (const user of chunk) {
 *     const validated = await validateUser(user);
 *     if (validated) processed.push(validated);
 *   }
 *   return processed;
 * });
 *
 * // 함수형 체이닝
 * const activeUsers = await stream
 *   .chain(users)
 *   .filter(user => user.status === 'active')
 *   .map(user => ({ ...user, lastSeen: new Date() }))
 *   .collect();
 *
 * // 오류 처리
 * const { results, errors, metrics } = result;
 * if (errors.length > 0) {
 *   console.error(`${errors.length}개 청크에서 오류 발생`);
 *   errors.forEach(({ chunkIndex, error }) => {
 *     console.error(`청크 ${chunkIndex}:`, error);
 *   });
 * }
 * ```
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

  /**
   * DataStream 인스턴스를 생성합니다.
   *
   * @param options - 스트림 처리 옵션
   * @throws {Error} chunkSize가 0 이하인 경우
   *
   * @example
   * ```typescript
   * // 기본 설정
   * const stream = new DataStream();
   *
   * // 커스텀 설정
   * const customStream = new DataStream({
   *   chunkSize: 500,
   *   failFast: false,
   *   onProgress: (progress) => updateUI(progress),
   *   retryStrategy: new ExponentialBackoffRetryStrategy(3),
   *   signal: abortController.signal
   * });
   * ```
   */
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
   * 함수형 스트림 체이닝을 시작합니다.
   * 지연 평가를 통해 메모리 효율적인 데이터 변환 파이프라인을 구성할 수 있습니다.
   *
   * @template U - 체이닝할 데이터의 타입 (T의 서브타입)
   * @param data - 체이닝할 데이터 배열
   * @returns 스트림 체인 객체
   *
   * @example
   * ```typescript
   * const processedData = await stream
   *   .chain(rawData)
   *   .filter(item => item.isValid)
   *   .map(item => transform(item))
   *   .collect();
   * ```
   */
  chain<U extends T>(data: readonly U[]): StreamChain<U> {
    return new StreamChainImpl<U>(this as DataStream<unknown>, data as readonly unknown[]);
  }

  /**
   * 데이터를 청크 단위로 병렬 비동기 처리합니다.
   * 진행률 추적, 재시도, 취소, 백프레셔, 이벤트루프 양보 등 프로덕션 환경에 필요한 모든 기능을 제공합니다.
   *
   * @template R - 처리 결과의 타입
   * @param data - 처리할 전체 데이터 배열 (readonly로 원본 데이터 보호)
   * @param processor - 각 청크를 처리하는 비동기 함수
   * @returns 처리 결과, 오류 정보, 메트릭을 포함한 ProcessResult
   *
   * @throws {TypeError} data가 배열이 아닌 경우
   * @throws {Error} chunkSize가 0 이하인 경우
   * @throws {DOMException} AbortSignal에 의해 취소된 경우 (브라우저)
   * @throws {Error} AbortSignal에 의해 취소된 경우 (Node.js)
   *
   * @example
   * ```typescript
   * // 기본 처리
   * const result = await stream.process(users, async (chunk) => {
   *   const processed = [];
   *   for (const user of chunk) {
   *     const enriched = await enrichUserData(user);
   *     processed.push(enriched);
   *   }
   *   return processed;
   * });
   *
   * // 부작용만 수행 (결과 반환하지 않음)
   * await stream.process(emails, async (chunk) => {
   *   for (const email of chunk) {
   *     await sendEmail(email);
   *   }
   * });
   *
   * // 취소 가능한 처리
   * const controller = new AbortController();
   * const stream = new DataStream({ signal: controller.signal });
   *
   * // 5초 후 취소
   * setTimeout(() => controller.abort(), 5000);
   *
   * try {
   *   const result = await stream.process(largeDataset, processor);
   * } catch (error) {
   *   if (error.name === 'AbortError') {
   *     console.log('처리가 취소되었습니다.');
   *   }
   * }
   * ```
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
