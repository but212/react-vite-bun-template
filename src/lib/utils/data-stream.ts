/**
 * @fileoverview
 * 대용량 데이터 배열을 청크 단위로 효율적으로 처리하기 위한 DataStream 유틸리티 클래스입니다.
 * 비동기 청크 처리, 메모리 사용 최적화, 진행률 콜백, 재시도, concurrency 제어까지 실무에서 대규모 데이터 처리에 특화된 기능을 제공합니다.
 *
 * @module DataStream
 */

/**
 * 처리 진행률 콜백 함수의 타입 정의입니다.
 *
 * @param progress - 처리 진행률(0.0 ~ 1.0 사이의 부동소수점, 1.0은 100% 완료)
 */
export type ProgressCallback = (progress: number) => void;

/**
 * 청크 처리 함수의 타입 정의입니다.
 * @template T - 입력 데이터의 타입
 * @template R - 처리 결과의 타입
 */
export type ChunkProcessor<T, R = void> = (chunk: readonly T[]) => Promise<R>;

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
}

/**
 * DataStream 클래스의 생성자 옵션입니다.
 */
export interface DataStreamOptions {
  chunkSize?: number;
  onProgress?: ProgressCallback;
  concurrency?: number;
  signal?: AbortSignal;
  /**
   * 청크 처리 실패 시 최대 재시도 횟수입니다.
   * @defaultValue 0 (재시도 없음)
   */
  retryCount?: number;
  /**
   * 재시도 간 지연(ms), 지수 백오프에 사용.
   * @defaultValue 200
   */
  retryDelay?: number;
  /**
   * 지수 백오프의 증가율입니다.
   * @defaultValue 2
   */
  retryBackoffFactor?: number;
  /**
   * 재시도 지연에 추가할 무작위성 비율(0.0 ~ 1.0).
   * 여러 클라이언트의 동시 재시도 시 부하 분산에 도움이 됩니다.
   * @defaultValue 0.2 (20%)
   */
  retryJitter?: number;
}

/**
 * 비동기 청크 스트림 유틸리티 - robust한 대용량 처리용
 *
 * @typeParam T - 데이터 항목 타입
 */
export class DataStream<T> {
  private readonly chunkSize: number;
  private readonly onProgress?: ProgressCallback;
  private readonly concurrency: number;
  private readonly signal?: AbortSignal;
  private readonly retryCount: number;
  private readonly retryDelay: number;
  private readonly retryBackoffFactor: number;
  private readonly retryJitter: number;

  constructor(options: DataStreamOptions = {}) {
    this.chunkSize = options.chunkSize ?? 1024;
    this.onProgress = options.onProgress;
    this.concurrency = options.concurrency ?? 1;
    this.signal = options.signal;
    this.retryCount = options.retryCount ?? 0;
    this.retryDelay = options.retryDelay ?? 200;
    this.retryBackoffFactor = options.retryBackoffFactor ?? 2;
    this.retryJitter = Math.max(0, Math.min(1, options.retryJitter ?? 0.2));
  }

  /**
   * 내부: 지정된 청크를 processor로 처리(재시도 포함)
   */
  private async processChunkWithRetry<R>(
    chunk: readonly T[],
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
        if (attempts > this.retryCount) throw e;

        // 지터가 포함된 지수 백오프 계산
        const baseDelay = this.retryDelay * Math.pow(this.retryBackoffFactor, attempts - 1);
        const jitterAmount = baseDelay * this.retryJitter;
        const jitter = Math.random() * jitterAmount * 2 - jitterAmount;
        const finalDelay = Math.max(0, baseDelay + jitter);

        await new Promise(res => setTimeout(res, finalDelay));
      }
    }
  }

  /**
   * 데이터를 청크 단위로 병렬 비동기 처리(진행률/재시도/취소/이벤트루프 양보 포함)
   *
   * @param data 전체 데이터 배열 (readonly로 원본 데이터 보호)
   * @param processor 각 청크를 처리하는 함수
   * @returns 처리 결과와 오류 정보
   */
  public async process<R = void>(
    data: readonly T[],
    processor: ChunkProcessor<T, R>
  ): Promise<R extends void ? void : ProcessResult<R>> {
    this.signal?.throwIfAborted();

    if (!Array.isArray(data)) throw new TypeError('Data must be an array');

    // 내부 AbortController로 워커 간 즉각적인 오류 전파
    const internalController = new AbortController();
    const internalSignal = internalController.signal;

    const totalChunks = Math.ceil(data.length / this.chunkSize);
    const processedItems = { count: 0 }; // 객체로 래핑하여 race condition 방지
    let chunkIndex = 0;
    const results: R[] = [];
    const errors: Array<{ chunkIndex: number; error: unknown }> = [];

    // 동시 워커 풀 구현
    const worker = async () => {
      while (true) {
        // 외부 및 내부 중단 신호 확인
        this.signal?.throwIfAborted();
        if (internalSignal.aborted) {
          // 내부 중단 신호는 다른 워커의 오류로 인한 것이므로 조용히 종료
          break;
        }

        const myIndex = chunkIndex++;
        if (myIndex >= totalChunks) break;

        const start = myIndex * this.chunkSize;
        const end = Math.min(start + this.chunkSize, data.length);
        const chunk = data.slice(start, end);

        try {
          const result = await this.processChunkWithRetry(chunk, processor, internalSignal);

          // 결과가 void가 아닌 경우에만 수집
          if (result !== undefined) {
            results[myIndex] = result;
          }

          // 원자적 진행률 업데이트
          processedItems.count += chunk.length;
          if (this.onProgress) {
            const progress = data.length === 0 ? 1 : Math.min(1, processedItems.count / data.length);
            this.onProgress(progress);
          }
        } catch (err) {
          // 내부 중단 신호로 인한 오류가 아닌 경우에만 오류로 처리
          if (!internalSignal.aborted) {
            errors.push({ chunkIndex: myIndex, error: err });
            // 첫 번째 오류 발생 시 다른 워커들에게 즉시 중단 신호 전송
            if (errors.length === 1) {
              internalController.abort();
            }
          }
          break;
        }

        // 10청크마다 이벤트루프 양보 (GC/UI 응답성 보장)
        if ((myIndex + 1) % 10 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    };

    // 워커 풀 생성 및 실행
    const workers = Array.from({ length: this.concurrency }, () => worker());
    await Promise.all(workers);

    // void 타입인 경우 오류만 확인하고 undefined 반환
    if (errors.length > 0) {
      // 첫 번째 오류를 던지되, 모든 오류 정보를 포함
      const firstError = errors[0]?.error;
      if (firstError instanceof Error && errors.length > 1) {
        firstError.message += ` (and ${errors.length - 1} more errors)`;
      }
      throw firstError;
    }

    // 타입에 따라 적절한 반환값 제공
    return (results.length > 0 ? { results, errors } : undefined) as R extends void ? void : ProcessResult<R>;
  }

  /**
   * 결과를 수집하지 않는 단순한 처리 메서드 (기존 호환성 유지)
   */
  public async processVoid(data: readonly T[], processor: ChunkProcessor<T, void>): Promise<void> {
    await this.process(data, processor);
  }
}
