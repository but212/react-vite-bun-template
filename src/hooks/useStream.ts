import { useCallback, useMemo, useRef } from 'react';
import {
  DataStream,
  type ChunkProcessor,
  type DataStreamOptions,
  type ProcessResult,
  type ProgressCallback,
  type StreamChain,
} from '../lib/utils/data-stream';

/**
 * useStream 훅의 옵션 인터페이스입니다.
 * DataStreamOptions를 확장하여 React 환경에 특화된 추가 옵션을 제공합니다.
 *
 * @template T - 처리할 데이터 항목의 타입
 *
 * @example
 * ```typescript
 * const options: UseStreamOptions<User> = {
 *   chunkSize: 100,
 *   reuseInstance: true,
 *   onProgress: (progress, processed, total) => {
 *     console.log(`${(progress * 100).toFixed(1)}% 완료`);
 *   },
 *   retryStrategy: new ExponentialBackoffRetryStrategy(3, 1000, 2),
 *   concurrencyStrategy: new AdaptiveConcurrencyStrategy(8, 512)
 * };
 * ```
 */
export interface UseStreamOptions<_T> extends DataStreamOptions {
  /**
   * 스트림 인스턴스를 재사용할지 여부입니다.
   *
   * @remarks
   * - `true`: 동일한 옵션으로 생성된 스트림 인스턴스를 재사용하여 메모리 효율성을 높입니다.
   * - `false`: 매번 새로운 스트림 인스턴스를 생성합니다.
   * - 옵션이 변경되면 자동으로 새 인스턴스가 생성됩니다.
   *
   * @default true
   */
  reuseInstance?: boolean;
}

/**
 * useStream 훅이 반환하는 객체의 인터페이스입니다.
 * 대용량 데이터 처리를 위한 다양한 메서드와 유틸리티를 제공합니다.
 *
 * @template T - 처리할 데이터 항목의 타입
 *
 * @example
 * ```typescript
 * const {
 *   process,
 *   chain,
 *   filter,
 *   map,
 *   reduce,
 *   forEach,
 *   stream
 * } = useStream<User>();
 * ```
 */
export interface UseStreamReturn<T> {
  /**
   * 데이터를 청크 단위로 병렬 비동기 처리하는 메인 메서드입니다.
   *
   * @template R - 처리 결과의 타입
   * @param data - 처리할 전체 데이터 배열 (readonly로 원본 데이터 보호)
   * @param processor - 각 청크를 처리하는 비동기 함수
   * @returns 처리 결과, 오류 정보, 메트릭을 포함한 ProcessResult
   *
   * @example
   * ```typescript
   * const result = await process(users, async (chunk) => {
   *   return chunk.slice().map(user => validateUser(user));
   * });
   * ```
   */
  process: <R>(data: readonly T[], processor: ChunkProcessor<T, R>) => Promise<ProcessResult<R>>;

  /**
   * 함수형 스트림 체이닝을 시작하는 메서드입니다.
   * 지연 평가를 통해 메모리 효율적인 데이터 변환 파이프라인을 구성할 수 있습니다.
   *
   * @template U - 체이닝할 데이터의 타입 (T의 서브타입)
   * @param data - 체이닝할 데이터 배열
   * @returns 스트림 체인 객체
   *
   * @example
   * ```typescript
   * const result = await chain(users)
   *   .filter(user => user.isActive)
   *   .map(user => user.email)
   *   .collect();
   * ```
   */
  chain: <U extends T>(data: readonly U[]) => StreamChain<U>;

  /**
   * 내부 DataStream 인스턴스입니다.
   * 고급 사용자가 직접 스트림 API에 접근할 때 사용합니다.
   *
   * @remarks
   * 일반적으로는 훅에서 제공하는 래핑된 메서드들을 사용하는 것을 권장합니다.
   *
   * @example
   * ```typescript
   * // 고급 사용법
   * const customResult = await stream.process(data, customProcessor);
   * ```
   */
  stream: DataStream<T>;

  /**
   * 진행률 콜백과 함께 데이터를 처리하는 메서드입니다.
   * 기존 스트림 설정을 유지하면서 임시로 진행률 콜백을 추가할 수 있습니다.
   *
   * @template R - 처리 결과의 타입
   * @param data - 처리할 전체 데이터 배열
   * @param processor - 각 청크를 처리하는 비동기 함수
   * @param onProgress - 진행률 콜백 함수 (선택사항)
   * @returns 처리 결과, 오류 정보, 메트릭을 포함한 ProcessResult
   *
   * @example
   * ```typescript
   * const result = await processWithProgress(
   *   users,
   *   async (chunk) => processChunk(chunk),
   *   (progress, processed, total) => {
   *     setProgress(progress * 100);
   *   }
   * );
   * ```
   */
  processWithProgress: <R>(
    data: readonly T[],
    processor: ChunkProcessor<T, R>,
    onProgress?: ProgressCallback
  ) => Promise<ProcessResult<R>>;

  /**
   * 조건에 맞는 항목들만 필터링하는 편의 메서드입니다.
   * 내부적으로 함수형 체이닝을 사용하여 메모리 효율적으로 처리합니다.
   *
   * @template U - 필터링할 데이터의 타입 (T의 서브타입)
   * @param data - 필터링할 데이터 배열
   * @param predicate - 각 항목에 적용할 필터링 조건 함수
   * @returns 필터링된 항목들의 배열
   *
   * @example
   * ```typescript
   * const activeUsers = await filter(users, user => user.isActive);
   * const adultUsers = await filter(users, user => user.age >= 18);
   * ```
   */
  filter: <U extends T>(data: readonly U[], predicate: (item: U) => boolean) => Promise<U[]>;

  /**
   * 각 항목을 변환하는 편의 메서드입니다.
   * 내부적으로 함수형 체이닝을 사용하여 메모리 효율적으로 처리합니다.
   *
   * @template U - 변환할 데이터의 타입 (T의 서브타입)
   * @template R - 변환 결과의 타입
   * @param data - 변환할 데이터 배열
   * @param mapper - 각 항목에 적용할 변환 함수
   * @returns 변환된 항목들의 배열
   *
   * @example
   * ```typescript
   * const userNames = await map(users, user => user.name);
   * const userEmails = await map(users, user => user.email.toLowerCase());
   * ```
   */
  map: <U extends T, R>(data: readonly U[], mapper: (item: U) => R) => Promise<R[]>;

  /**
   * 배열을 단일 값으로 집계하는 편의 메서드입니다.
   * 내부적으로 함수형 체이닝을 사용하여 메모리 효율적으로 처리합니다.
   *
   * @template U - 집계할 데이터의 타입 (T의 서브타입)
   * @template R - 집계 결과의 타입
   * @param data - 집계할 데이터 배열
   * @param reducer - 누적 함수 (acc, item) => acc'
   * @param initialValue - 누적의 초기값
   * @returns 집계된 결과값
   *
   * @example
   * ```typescript
   * const totalAge = await reduce(users, (sum, user) => sum + user.age, 0);
   * const usersByCity = await reduce(users, (acc, user) => {
   *   acc[user.city] = (acc[user.city] || 0) + 1;
   *   return acc;
   * }, {} as Record<string, number>);
   * ```
   */
  reduce: <U extends T, R>(data: readonly U[], reducer: (acc: R, item: U) => R, initialValue: R) => Promise<R>;

  /**
   * 각 항목에 대해 부작용을 수행하는 편의 메서드입니다.
   * 내부적으로 함수형 체이닝을 사용하여 메모리 효율적으로 처리합니다.
   *
   * @template U - 처리할 데이터의 타입 (T의 서브타입)
   * @param data - 처리할 데이터 배열
   * @param callback - 각 항목에 적용할 콜백 함수 (동기/비동기 모두 지원)
   * @returns void Promise (모든 항목 처리 완료 시 resolve)
   *
   * @example
   * ```typescript
   * // 동기 콜백
   * await forEach(users, user => {
   *   console.log(`Processing user: ${user.name}`);
   * });
   *
   * // 비동기 콜백
   * await forEach(users, async user => {
   *   await sendWelcomeEmail(user.email);
   * });
   * ```
   */
  forEach: <U extends T>(data: readonly U[], callback: (item: U) => void | Promise<void>) => Promise<void>;
}

/**
 * DataStream을 React 컴포넌트에서 사용하기 위한 커스텀 훅입니다.
 *
 * 대용량 데이터를 청크 단위로 효율적으로 처리하며, 진행률 추적, 재시도, 취소,
 * 백프레셔, 함수형 체이닝 등 프로덕션 환경에 필요한 모든 기능을 제공합니다.
 *
 * @template T - 처리할 데이터 항목의 타입
 * @param options - 스트림 처리 옵션 (UseStreamOptions)
 * @returns 스트림 처리를 위한 메서드들과 유틸리티 (UseStreamReturn)
 *
 * @remarks
 * ### 주요 특징
 * - **메모리 효율성**: 청크 단위 처리로 대용량 데이터도 안전하게 처리
 * - **병렬 처리**: 적응형 동시성 제어로 최적의 성능 제공
 * - **오류 복구**: 지수 백오프 재시도 전략으로 일시적 오류 극복
 * - **진행률 추적**: 실시간 진행률 모니터링 및 UI 업데이트
 * - **취소 지원**: AbortController를 통한 안전한 작업 취소
 * - **백프레셔**: 메모리 사용량 기반 자동 속도 조절
 * - **함수형 체이닝**: map, filter, reduce 등 함수형 프로그래밍 지원
 * - **타입 안전성**: 완전한 TypeScript 지원과 제네릭 타입
 *
 * ### 성능 최적화
 * - 스트림 인스턴스 재사용으로 메모리 효율성 향상
 * - useCallback을 통한 불필요한 리렌더링 방지
 * - 지연 평가 기반 함수형 체이닝으로 메모리 사용량 최소화
 *
 * ### 사용 시나리오
 * - 대용량 데이터 변환 및 처리
 * - API 배치 요청 처리
 * - 파일 업로드/다운로드 진행률 추적
 * - 데이터 검증 및 정제
 * - 실시간 데이터 스트리밍 처리
 *
 * @example
 * ```tsx
 * function DataProcessor() {
 *   const stream = useStream<User>({
 *     chunkSize: 100,
 *     onProgress: (progress, processed, total) => {
 *       console.log(`Progress: ${(progress * 100).toFixed(1)}%`);
 *     }
 *   });
 *
 *   const handleProcessUsers = useCallback(async () => {
 *     const result = await stream.process(users, async (chunk) => {
 *       const processed = [];
 *       for (const user of chunk) {
 *         const validated = await validateUser(user);
 *         if (validated) processed.push(validated);
 *       }
 *       return processed;
 *     });
 *
 *     console.log(`Processed ${result.results.length} chunks`);
 *     if (result.errors.length > 0) {
 *       console.error(`${result.errors.length} chunks failed`);
 *     }
 *   }, [stream]);
 *
 *   return (
 *     <button onClick={handleProcessUsers}>
 *       Process Users
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function StreamChaining() {
 *   const stream = useStream<Product>();
 *
 *   const handleChainedProcessing = useCallback(async () => {
 *     // 함수형 체이닝 사용
 *     const activeProducts = await stream
 *       .chain(products)
 *       .filter(product => product.isActive)
 *       .map(product => ({ ...product, lastUpdated: new Date() }))
 *       .collect();
 *
 *     console.log(`Found ${activeProducts.length} active products`);
 *   }, [stream]);
 *
 *   const handleSimpleFilter = useCallback(async () => {
 *     // 편의 메서드 사용
 *     const expensiveProducts = await stream.filter(
 *       products,
 *       product => product.price > 100
 *     );
 *
 *     console.log(`Found ${expensiveProducts.length} expensive products`);
 *   }, [stream]);
 *
 *   return (
 *     <div>
 *       <button onClick={handleChainedProcessing}>
 *         Process with Chaining
 *       </button>
 *       <button onClick={handleSimpleFilter}>
 *         Simple Filter
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function AdvancedStreamProcessor() {
 *   const stream = useStream<DataItem>({
 *     chunkSize: 500,
 *     failFast: false,
 *     retryStrategy: new ExponentialBackoffRetryStrategy(3, 1000, 2),
 *     concurrencyStrategy: new AdaptiveConcurrencyStrategy(8, 512),
 *     backpressureCallback: async (memoryUsage, activeWorkers) => {
 *       if (memoryUsage > 1024) {
 *         console.warn(`High memory usage: ${memoryUsage.toFixed(2)}MB`);
 *         return false; // 일시정지
 *       }
 *       return true; // 계속 진행
 *     }
 *   });
 *
 *   const handleAdvancedProcessing = useCallback(async () => {
 *     const controller = new AbortController();
 *
 *     // 10초 후 자동 취소
 *     setTimeout(() => controller.abort(), 10000);
 *
 *     try {
 *       const result = await stream.processWithProgress(
 *         largeDataset,
 *         async (chunk) => {
 *           // 복잡한 처리 로직
 *           return await processChunkWithAPI(chunk);
 *         },
 *         (progress, processed, total) => {
 *           setProgress(progress);
 *           setProcessedCount(processed);
 *         }
 *       );
 *
 *       console.log('Processing completed:', result.metrics);
 *     } catch (error) {
 *       if (error.name === 'AbortError') {
 *         console.log('Processing was cancelled');
 *       }
 *     }
 *   }, [stream]);
 *
 *   return (
 *     <button onClick={handleAdvancedProcessing}>
 *       Advanced Processing
 *     </button>
 *   );
 * }
 * ```
 */
export function useStream<T>(options: UseStreamOptions<T> = {}): UseStreamReturn<T> {
  const { reuseInstance = true, ...streamOptions } = options;

  /**
   * 스트림 인스턴스를 메모이제이션하여 재사용하기 위한 ref입니다.
   * reuseInstance 옵션이 true일 때 동일한 옵션으로 생성된 인스턴스를 재사용합니다.
   */
  const streamRef = useRef<DataStream<T> | null>(null);

  /**
   * DataStream 인스턴스를 생성하고 메모이제이션합니다.
   * 옵션이 변경될 때만 새로운 인스턴스를 생성하여 성능을 최적화합니다.
   */
  const stream = useMemo(() => {
    // 재사용 옵션이 활성화되고 기존 인스턴스가 있으면 재사용
    if (reuseInstance && streamRef.current) {
      return streamRef.current;
    }

    // 새로운 스트림 인스턴스 생성
    const newStream = new DataStream<T>(streamOptions);

    // 재사용 옵션이 활성화되면 ref에 저장
    if (reuseInstance) {
      streamRef.current = newStream;
    }

    return newStream;
  }, [
    reuseInstance,
    streamOptions.chunkSize,
    streamOptions.failFast,
    streamOptions.retryInFailFast,
    streamOptions.retryStrategy,
    streamOptions.concurrencyStrategy,
    streamOptions.backpressureCallback,
    streamOptions.signal,
    streamOptions.onProgress,
  ]);

  /**
   * 데이터를 청크 단위로 병렬 비동기 처리하는 메인 메서드입니다.
   * useCallback으로 최적화되어 불필요한 리렌더링을 방지합니다.
   */
  const process = useCallback(
    <R>(data: readonly T[], processor: ChunkProcessor<T, R>) => stream.process(data, processor),
    [stream]
  );

  /**
   * 함수형 스트림 체이닝을 시작하는 메서드입니다.
   * 지연 평가를 통해 메모리 효율적인 데이터 변환 파이프라인을 구성합니다.
   */
  const chain = useCallback(<U extends T>(data: readonly U[]) => stream.chain(data), [stream]);

  /**
   * 진행률 콜백과 함께 데이터를 처리하는 메서드입니다.
   * 기존 스트림 설정을 유지하면서 임시로 진행률 콜백을 추가할 수 있습니다.
   */
  const processWithProgress = useCallback(
    <R>(data: readonly T[], processor: ChunkProcessor<T, R>, onProgress?: ProgressCallback) => {
      if (onProgress) {
        // 임시로 진행률 콜백을 설정한 새 스트림 생성
        const tempStream = new DataStream<T>({
          ...streamOptions,
          onProgress,
        });
        return tempStream.process(data, processor);
      }
      return stream.process(data, processor);
    },
    [stream, streamOptions]
  );

  /**
   * 조건에 맞는 항목들만 필터링하는 편의 메서드입니다.
   * 내부적으로 함수형 체이닝을 사용하여 메모리 효율적으로 처리합니다.
   */
  const filter = useCallback(
    async <U extends T>(data: readonly U[], predicate: (item: U) => boolean): Promise<U[]> => {
      return stream.chain(data).filter(predicate).collect();
    },
    [stream]
  );

  /**
   * 각 항목을 변환하는 편의 메서드입니다.
   * 내부적으로 함수형 체이닝을 사용하여 메모리 효율적으로 처리합니다.
   */
  const map = useCallback(
    async <U extends T, R>(data: readonly U[], mapper: (item: U) => R): Promise<R[]> => {
      return stream.chain(data).map(mapper).collect();
    },
    [stream]
  );

  /**
   * 배열을 단일 값으로 집계하는 편의 메서드입니다.
   * 내부적으로 함수형 체이닝을 사용하여 메모리 효율적으로 처리합니다.
   */
  const reduce = useCallback(
    async <U extends T, R>(data: readonly U[], reducer: (acc: R, item: U) => R, initialValue: R): Promise<R> => {
      return stream.chain(data).reduce(reducer, initialValue);
    },
    [stream]
  );

  /**
   * 각 항목에 대해 부작용을 수행하는 편의 메서드입니다.
   * 내부적으로 함수형 체이닝을 사용하여 메모리 효율적으로 처리합니다.
   */
  const forEach = useCallback(
    async <U extends T>(data: readonly U[], callback: (item: U) => void | Promise<void>): Promise<void> => {
      return stream.chain(data).forEach(callback);
    },
    [stream]
  );

  return {
    // 메인 처리 메서드
    process,

    // 함수형 체이닝
    chain,

    // 스트림 인스턴스
    stream,

    // 편의 메서드들
    processWithProgress,
    filter,
    map,
    reduce,
    forEach,
  };
}

export default useStream;
