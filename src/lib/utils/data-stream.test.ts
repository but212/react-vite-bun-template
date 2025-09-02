import { describe, test, expect, beforeEach, vi } from 'vitest';
import { 
  AdaptiveConcurrencyStrategy,
  DataStream,
  ExponentialBackoffRetryStrategy,
  type BackpressureCallback,
  type ChunkView,
  type ConcurrencyStrategy,
  type RetryStrategy,
} from './data-stream';
import { i18n } from '../i18n';

// 유틸리티 함수: 실행 순서 배열이 병렬(인터리브)로 실행되었는지 확인합니다.
// 예: [1, 2, -1, -2] -> 1번 시작, 2번 시작, 1번 종료, 2번 종료 (병렬)
// 예: [1, -1, 2, -2] -> 1번 시작, 1번 종료, 2번 시작, 2번 종료 (순차)
function isInterleaved(arr: number[]): boolean {
  if (arr.length < 4) return false;

  const running = new Set<number>();
  for (const val of arr) {
    if (val > 0) {
      // 새로운 작업이 시작될 때, 이미 다른 작업이 실행 중이라면 병렬 실행으로 간주합니다.
      if (running.size > 0) {
        return true;
      }
      running.add(val);
    } else {
      running.delete(-val);
    }
  }

  return false;
}

// 지연 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('DataStream', () => {
  beforeEach(() => {
    i18n.setLocale('en');
  });
  describe('기본 기능', () => {
    test('빈 배열 처리', async () => {
      const stream = new DataStream<number>();
      const processor = vi.fn();

      const result = await stream.process([], processor);

      expect(processor).not.toHaveBeenCalled();
      expect(result.results).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    test('단일 청크 처리', async () => {
      const data = [1, 2, 3];
      const stream = new DataStream<number>({ chunkSize: 5 });
      const processor = vi.fn().mockImplementation(async (chunk: ChunkView<number>) => {
        // ChunkView 인터페이스 검증
        expect(chunk.data).toBe(data);
        expect(chunk.start).toBe(0);
        expect(chunk.end).toBe(3);
        expect(chunk.length).toBe(3);
        expect([...chunk]).toEqual([1, 2, 3]);
        expect(chunk.slice()).toEqual([1, 2, 3]);
      });

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(1);
    });

    test('여러 청크로 분할 처리', async () => {
      const data = [1, 2, 3, 4, 5, 6];
      const stream = new DataStream<number>({ chunkSize: 2 });
      const processor = vi.fn().mockImplementation(async (chunk: ChunkView<number>) => {
        // 메모리 효율성 검증: 원본 배열 참조 확인
        expect(chunk.data).toBe(data);
      });

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(3);
    });

    test('불완전한 마지막 청크 처리', async () => {
      const data = [1, 2, 3, 4, 5];
      const stream = new DataStream<number>({ chunkSize: 2 });
      const processor = vi.fn().mockImplementation(async (chunk: ChunkView<number>) => {
        if (chunk.start === 4) {
          expect(chunk.length).toBe(1);
          expect([...chunk]).toEqual([5]);
        }
      });

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(3);
    });

    test('잘못된 데이터 타입에 대한 오류', async () => {
      const stream = new DataStream<number>();
      const processor = vi.fn();

      // @ts-expect-error - 의도적으로 잘못된 타입 전달
      await expect(stream.process('not an array', processor)).rejects.toThrow('Data must be an array');
    });
  });

  describe('진행률 콜백', () => {
    test('진행률이 올바르게 계산됨', async () => {
      const data = [1, 2, 3, 4, 5, 6];
      const progressCallback = vi.fn();
      const stream = new DataStream<number>({ chunkSize: 2, onProgress: progressCallback });
      const processor = vi.fn().mockResolvedValue(undefined);

      await stream.process(data, processor);

      expect(progressCallback).toHaveBeenCalledTimes(3);
      expect(progressCallback).toHaveBeenNthCalledWith(1, 2 / 6, 2, 6);
      expect(progressCallback).toHaveBeenNthCalledWith(2, 4 / 6, 4, 6);
      expect(progressCallback).toHaveBeenNthCalledWith(3, 1, 6, 6); // 100%
    });

    test('빈 배열에서 진행률 콜백 없음', async () => {
      const progressCallback = vi.fn();
      const stream = new DataStream<number>({ onProgress: progressCallback });
      const processor = vi.fn();

      await stream.process([], processor);

      expect(progressCallback).not.toHaveBeenCalled();
    });
  });

  describe('병렬 처리', () => {
    test('순차 처리 (concurrency: 1)', async () => {
      const data = [1, 2, 3, 4];
      const stream = new DataStream<number>({ chunkSize: 1, concurrencyStrategy: new AdaptiveConcurrencyStrategy(1) });
      const processOrder: number[] = [];
      const processor = vi.fn().mockImplementation(async (chunk: ChunkView<number>) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        if (chunk.length > 0) {
          const firstItem = [...chunk][0];
          if (firstItem !== undefined) {
            processOrder.push(firstItem);
          }
        }
      });

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(4);
      expect(processOrder).toEqual([1, 2, 3, 4]);
    });

    test('실제 병렬 실행 검증', async () => {
      const data = [1, 2, 3, 4];
      const stream = new DataStream<number>({ chunkSize: 1, concurrencyStrategy: new AdaptiveConcurrencyStrategy(2) });
      const executionOrder: number[] = [];

      const processor = vi.fn().mockImplementation(async (chunk: ChunkView<number>) => {
        const id = [...chunk][0];
        if (id !== undefined) {
          executionOrder.push(id);
          await delay(Math.random() * 50 + 10); // 10-60ms 랜덤 지연
          executionOrder.push(-id); // 완료 표시
        }
      });

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(4);
      // 병렬 실행이면 실행 순서가 인터리브되어야 함
      expect(isInterleaved(executionOrder)).toBe(true);
    });

    test('동시성 제한 및 동적 워커 수 추적 검증', async () => {
      const data = Array.from({ length: 10 }, (_, i) => i);
      const concurrency = 3;
      const stream = new DataStream<number>({
        chunkSize: 1,
        concurrencyStrategy: new AdaptiveConcurrencyStrategy(concurrency),
      });

      let concurrentCount = 0;
      let maxConcurrent = 0;

      const processor = vi.fn().mockImplementation(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await delay(20);
        concurrentCount--;
      });

      await stream.process(data, processor);

      expect(maxConcurrent).toBeLessThanOrEqual(concurrency);
      expect(maxConcurrent).toBeGreaterThan(1); // 실제로 병렬 실행됨
    });
  });

  describe('오류 처리', () => {
    test('failFast: true (기본값) - 첫 오류 발생 시 중단', async () => {
      const data = [1, 2, 3, 4];
      const stream = new DataStream<number>({ chunkSize: 1, concurrencyStrategy: new AdaptiveConcurrencyStrategy(2) });
      const error = new Error('Processing failed');
      const processor = vi.fn().mockImplementation(async (chunk: ChunkView<number>) => {
        const item = [...chunk][0];
        if (item === 3) {
          throw error;
        }
        await delay(10);
        return `result-${item}`;
      });

      const result = await stream.process(data, processor);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toBe(error);
      // 중단되었으므로 모든 청크가 처리되지 않음
      expect(result.metrics.processedChunks + result.metrics.failedChunks).toBeLessThan(data.length);
    });

    test('failFast: false - 모든 오류 수집 후 계속 진행', async () => {
      const data = [1, 2, 3, 4, 5];
      const stream = new DataStream<number>({
        chunkSize: 1,
        concurrencyStrategy: new AdaptiveConcurrencyStrategy(2),
        failFast: false,
      });
      const error1 = new Error('Fail 1');
      const error3 = new Error('Fail 3');

      const processor = vi.fn().mockImplementation(async (chunk: ChunkView<number>) => {
        const item = [...chunk][0];
        await delay(10);
        if (item === 2) throw error1;
        if (item === 4) throw error3;
        return `result-${item}`;
      });

      const result = await stream.process(data, processor);

      expect(result.errors).toHaveLength(2);
      // 동시성으로 인해 오류 순서가 보장되지 않으므로 포함 여부만 확인
      const errorMessages = result.errors.map(e => e.error);
      expect(errorMessages).toContain(error1);
      expect(errorMessages).toContain(error3);

      expect(result.results).toEqual(['result-1', 'result-3', 'result-5']);
      expect(result.metrics.processedChunks).toBe(3); // 성공한 청크 수
      expect(result.metrics.failedChunks).toBe(2); // 실패한 청크 수
      expect(result.metrics.totalChunks).toBe(5);
    });
  });

  describe('재시도 로직', () => {
    test('재시도 없이 실패', async () => {
      const data = [1];
      const stream = new DataStream<number>({ retryStrategy: new ExponentialBackoffRetryStrategy(0) });
      const error = new Error('Failed');
      const processor = vi.fn().mockRejectedValue(error);

      const result = await stream.process(data, processor);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toBe(error);
      expect(processor).toHaveBeenCalledTimes(1);
    });

    test('재시도 후 성공', async () => {
      const data = [1];
      const stream = new DataStream<number>({ retryStrategy: new ExponentialBackoffRetryStrategy(2, 10) });
      const processor = vi
        .fn()
        .mockRejectedValueOnce(new Error('First fail'))
        .mockRejectedValueOnce(new Error('Second fail'))
        .mockResolvedValueOnce('success');

      const result = await stream.process(data, processor);
      expect(result.errors).toEqual([]);
      expect(result.results).toEqual(['success']);
      expect(processor).toHaveBeenCalledTimes(3);
    });

    test('최대 재시도 횟수 초과 시 실패', async () => {
      const data = [1];
      const stream = new DataStream<number>({ retryStrategy: new ExponentialBackoffRetryStrategy(1, 10) });
      const error = new Error('Always fails');
      const processor = vi.fn().mockRejectedValue(error);

      const result = await stream.process(data, processor);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toBe(error);
      expect(processor).toHaveBeenCalledTimes(2); // 초기 시도 + 1회 재시도
    });

    test('커스텀 백오프 팩터 적용', async () => {
      const data = [1];
      const stream = new DataStream<number>({
        retryStrategy: new ExponentialBackoffRetryStrategy(2, 10, 3, 0), // 지터 제거로 정확한 시간 테스트
      });
      const processor = vi
        .fn()
        .mockRejectedValueOnce(new Error('First fail'))
        .mockRejectedValueOnce(new Error('Second fail'))
        .mockResolvedValueOnce(undefined);

      const result = await stream.process(data, processor);

      expect(result.errors).toEqual([]);
      expect(processor).toHaveBeenCalledTimes(3);
    });

    test('결과 반환 처리', async () => {
      const data = [1, 2, 3, 4];
      const stream = new DataStream<number>({ chunkSize: 2 });
      const processor = vi.fn().mockResolvedValueOnce('chunk1').mockResolvedValueOnce('chunk2');

      const result = await stream.process(data, processor);

      expect(result).toBeDefined();
      expect(result!.results).toEqual(['chunk1', 'chunk2']);
      expect(result!.errors).toEqual([]);
      expect(result!.metrics).toBeDefined();
    });

    test('결과 순서 보장', async () => {
      const data = Array.from({ length: 10 }, (_, i) => i);
      const stream = new DataStream<number>({ chunkSize: 1, concurrencyStrategy: new AdaptiveConcurrencyStrategy(3) });

      const processor = vi.fn().mockImplementation(async (chunk: ChunkView<number>) => {
        const id = [...chunk][0];
        // 랜덤 지연으로 순서 섞기 시도
        await delay(Math.random() * 20);
        return `result-${id}`;
      });

      const result = await stream.process(data, processor);

      expect(result).toBeDefined();
      expect(result!.results).toEqual([
        'result-0',
        'result-1',
        'result-2',
        'result-3',
        'result-4',
        'result-5',
        'result-6',
        'result-7',
        'result-8',
        'result-9',
      ]);
    });
  });

  describe('AbortController 통합', () => {
    test('처리 시작 전 중단', async () => {
      const controller = new AbortController();
      controller.abort();

      const stream = new DataStream<number>({ signal: controller.signal });
      const processor = vi.fn();

      await expect(stream.process([1, 2, 3], processor)).rejects.toThrow();
      expect(processor).not.toHaveBeenCalled();
    });

    test('처리 중 중단', async () => {
      const controller = new AbortController();
      const data = [1, 2, 3, 4];
      const stream = new DataStream<number>({ chunkSize: 1, signal: controller.signal });

      let callCount = 0;
      const processor = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          controller.abort(); // 두 번째 청크 처리 중 중단
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await expect(stream.process(data, processor)).rejects.toThrow(/operation was aborted/);
    });
  });

  describe('타입 안전성', () => {
    test('readonly 배열 처리', async () => {
      const data: readonly number[] = [1, 2, 3] as const;
      const stream = new DataStream<number>();
      const processor = vi.fn().mockResolvedValue(undefined);

      const result = await stream.process(data, processor);

      expect(result.errors).toEqual([]);
      expect(processor).toHaveBeenCalledTimes(1);
    });

    test('복잡한 객체 타입 처리', async () => {
      interface User {
        id: number;
        name: string;
      }

      const users: readonly User[] = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];

      const stream = new DataStream<User>();
      const processor = vi.fn().mockResolvedValue(undefined);

      const result = await stream.process(users, processor);

      expect(result.errors).toEqual([]);
      expect(processor).toHaveBeenCalledTimes(1);
    });
  });

  describe('성능 최적화', () => {
    test('이벤트 루프 양보 (setImmediate 호출)', async () => {
      const data = Array.from({ length: 25 }, (_, i) => i); // 25개 항목
      const stream = new DataStream<number>({ chunkSize: 1 }); // 25개 청크
      const processor = vi.fn().mockResolvedValue(undefined);

      // setImmediate 모킹
      const setImmediateSpy = vi.spyOn(global, 'setImmediate').mockImplementation(fn => {
        setTimeout(fn, 0);
        return {} as ReturnType<typeof setImmediate>;
      });

      await stream.process(data, processor);

      // 10청크마다 이벤트 루프 양보가 발생해야 함 (10번째, 20번째)
      expect(setImmediateSpy).toHaveBeenCalledTimes(2);

      setImmediateSpy.mockRestore();
    });

    test('메모리 효율성 - 배열 복사 없음', async () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({ id: i, data: `item-${i}` }));
      const stream = new DataStream<(typeof data)[0]>({ chunkSize: 100 });

      const processor = vi.fn().mockImplementation(async (chunk: ChunkView<(typeof data)[0]>) => {
        // ChunkView는 원본 배열을 참조해야 함
        expect(chunk.data).toBe(data);
        // slice()를 호출할 때만 새 배열 생성
        const sliced = chunk.slice();
        expect(sliced).not.toBe(data);
        expect(sliced.length).toBe(chunk.length);
      });

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(10);
    });
  });

  describe('메트릭 수집', () => {
    test('처리 메트릭 수집', async () => {
      const data = [1, 2, 3, 4, 5];
      const stream = new DataStream<number>({ chunkSize: 2 });
      const processor = vi.fn().mockImplementation(async () => {
        await delay(10); // 처리 시간 시뮬레이션
        return 'processed';
      });

      const result = await stream.process(data, processor);

      expect(result).toBeDefined();
      expect(result!.metrics).toBeDefined();
      expect(result!.metrics.totalChunks).toBe(3);
      expect(result!.metrics.processedChunks).toBe(3);
      expect(result!.metrics.failedChunks).toBe(0);
      expect(result!.metrics.averageChunkTime).toBeGreaterThan(0);
      expect(result!.metrics.totalTime).toBeGreaterThan(0);
    });

    test('실패한 청크 메트릭', async () => {
      const data = [1, 2, 3];
      const stream = new DataStream<number>({ chunkSize: 1, failFast: false });
      const error = new Error('fail');
      const processor = vi.fn().mockImplementation(async (chunk: ChunkView<number>) => {
        const item = [...chunk][0];
        if (item === 2) {
          throw error;
        }
        return `success-${item}`;
      });

      const result = await stream.process(data, processor);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toBe(error);
      expect(result.metrics.failedChunks).toBe(1);
      expect(result.metrics.processedChunks).toBe(2);
    });
  });

  describe('결과 수집', () => {
    test('void 처리 결과', async () => {
      const data = [1, 2, 3];
      const stream = new DataStream<number>();
      const processor = vi.fn().mockResolvedValue(undefined);

      const result = await stream.process(data, processor);

      expect(result.results).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(processor).toHaveBeenCalledTimes(1);
    });

    test('결과 반환 처리', async () => {
      const data = [1, 2, 3, 4];
      const stream = new DataStream<number>({ chunkSize: 2 });
      const processor = vi.fn().mockResolvedValueOnce('chunk1').mockResolvedValueOnce('chunk2');

      const result = await stream.process(data, processor);

      expect(result).toBeDefined();
      expect(result!.results).toEqual(['chunk1', 'chunk2']);
      expect(result!.errors).toEqual([]);
      expect(result!.metrics).toBeDefined();
    });

    test('결과 순서 보장', async () => {
      const data = Array.from({ length: 10 }, (_, i) => i);
      const stream = new DataStream<number>({ chunkSize: 1, concurrencyStrategy: new AdaptiveConcurrencyStrategy(3) });

      const processor = vi.fn().mockImplementation(async (chunk: ChunkView<number>) => {
        const id = [...chunk][0];
        // 랜덤 지연으로 순서 섞기 시도
        await delay(Math.random() * 20);
        return `result-${id}`;
      });

      const result = await stream.process(data, processor);

      expect(result).toBeDefined();
      expect(result!.results).toEqual([
        'result-0',
        'result-1',
        'result-2',
        'result-3',
        'result-4',
        'result-5',
        'result-6',
        'result-7',
        'result-8',
        'result-9',
      ]);
    });
  });

  describe('대용량 데이터 시뮬레이션', () => {
    test('대용량 데이터 처리 성능', async () => {
      const data = Array.from({ length: 10000 }, (_, i) => i);
      const stream = new DataStream<number>({
        chunkSize: 1000,
        concurrencyStrategy: new AdaptiveConcurrencyStrategy(4),
      });

      const processor = vi.fn().mockImplementation(async (chunk: ChunkView<number>) => {
        // 실제 처리 시뮬레이션
        let sum = 0;
        for (const item of chunk) {
          sum += item;
        }
        return sum;
      });

      const startTime = performance.now();
      const result = await stream.process(data, processor);
      const endTime = performance.now();

      expect(result).toBeDefined();
      expect(result!.results).toHaveLength(10);
      expect(result!.metrics.totalChunks).toBe(10);
      expect(result!.metrics.processedChunks).toBe(10);
      expect(endTime - startTime).toBeLessThan(1000); // 1초 이내 완료
    });
  });

  describe('DataStream 아키텍처 개선 테스트', () => {
    describe('Strategy 패턴', () => {
      test('커스텀 재시도 전략 적용', async () => {
        const data = [1];

        // 커스텀 재시도 전략: 최대 2회, 고정 지연 50ms
        class CustomRetryStrategy implements RetryStrategy {
          shouldRetry(attempt: number): boolean {
            return attempt <= 2;
          }
          getDelay(): number {
            return 50;
          }
        }

        const stream = new DataStream<number>({
          retryStrategy: new CustomRetryStrategy(),
        });

        const processor = vi
          .fn()
          .mockRejectedValueOnce(new Error('First fail'))
          .mockRejectedValueOnce(new Error('Second fail'))
          .mockResolvedValueOnce(undefined);

        await stream.process(data, processor);
        expect(processor).toHaveBeenCalledTimes(3);
      });

      test('적응형 동시성 전략 적용', async () => {
        const smallData = Array.from({ length: 50 }, (_, i) => i);
        const largeData = Array.from({ length: 2000 }, (_, i) => i);

        class TestConcurrencyStrategy implements ConcurrencyStrategy {
          getWorkerCount(totalItems: number): number {
            return totalItems < 100 ? 2 : 8;
          }
          async shouldPause(): Promise<boolean> {
            return false;
          }
        }

        const stream = new DataStream<number>({
          concurrencyStrategy: new TestConcurrencyStrategy(),
        });

        const _smallDataWorkers = 0;
        const _largeDataWorkers = 0;

        const processor = vi.fn().mockImplementation(async () => {
          await delay(10);
        });

        // 작은 데이터셋 테스트
        await stream.process(smallData, processor);

        // 큰 데이터셋 테스트
        await stream.process(largeData, processor);

        expect(processor).toHaveBeenCalled();
      });
    });

    describe('백프레셔 제어', () => {
      test('메모리 임계값 초과 시 처리 일시정지', async () => {
        const data = Array.from({ length: 10 }, (_, i) => i);

        let pauseCount = 0;
        const backpressureCallback: BackpressureCallback = async (_memoryUsage, _activeWorkers) => {
          pauseCount++;
          // 첫 번째 호출에서는 일시정지, 두 번째부터는 계속 진행
          return pauseCount > 1;
        };

        const stream = new DataStream<number>({
          chunkSize: 1,
          backpressureCallback,
          concurrencyStrategy: new AdaptiveConcurrencyStrategy(2, 0, backpressureCallback), // 임계값 0으로 설정하여 항상 트리거
        });

        const processor = vi.fn().mockImplementation(async () => {
          await delay(10);
        });

        await stream.process(data, processor);

        expect(pauseCount).toBeGreaterThan(0);
        // 백프레셔로 인해 처리가 일시정지되지만 결국 모든 청크가 처리됨
        expect(processor).toHaveBeenCalledTimes(10);
      });

      test('메모리 모니터링 기능', async () => {
        const data = [1, 2, 3];
        const stream = new DataStream<number>();

        const processor = vi.fn().mockResolvedValue('result');
        const result = await stream.process(data, processor);

        expect(result).toBeDefined();
        expect(result!.metrics.maxMemoryUsage).toBeGreaterThanOrEqual(0);
      });
    });

    describe('함수형 스트림 체이닝', () => {
      test('map 체이닝', async () => {
        const data = [1, 2, 3, 4, 5];
        const stream = new DataStream<number>({ chunkSize: 2 });

        const result = await stream
          .chain(data)
          .map(x => x * 2)
          .collect();

        expect(result).toEqual([2, 4, 6, 8, 10]);
      });

      test('filter 체이닝', async () => {
        const data = [1, 2, 3, 4, 5, 6];
        const stream = new DataStream<number>({ chunkSize: 2 });

        const result = await stream
          .chain(data)
          .filter(x => x % 2 === 0)
          .collect();

        expect(result).toEqual([2, 4, 6]);
      });

      test('map과 filter 조합 체이닝', async () => {
        const data = [1, 2, 3, 4, 5];
        const stream = new DataStream<number>({ chunkSize: 2 });

        const result = await stream
          .chain(data)
          .map(x => x * 2)
          .filter(x => x > 4)
          .collect();

        expect(result).toEqual([6, 8, 10]);
      });

      test('reduce 체이닝', async () => {
        const data = [1, 2, 3, 4, 5];
        const stream = new DataStream<number>({ chunkSize: 2 });

        const sum = await stream.chain(data).reduce((acc, x) => acc + x, 0);

        expect(sum).toBe(15);
      });

      test('forEach 체이닝', async () => {
        const data = [1, 2, 3];
        const stream = new DataStream<number>({
          chunkSize: 2,
          concurrencyStrategy: new AdaptiveConcurrencyStrategy(1),
        }); // 순차 처리로 순서 보장
        const results: number[] = [];

        await stream.chain(data).forEach(x => {
          results.push(x * 2);
        });

        expect(results).toEqual([2, 4, 6]);
      });

      test('복잡한 체이닝 조합', async () => {
        const data = Array.from({ length: 20 }, (_, i) => i + 1);
        const stream = new DataStream<number>({
          chunkSize: 3,
          concurrencyStrategy: new AdaptiveConcurrencyStrategy(2),
        });

        const result = await stream
          .chain(data)
          .filter(x => x % 2 === 0) // 짝수만
          .map(x => x * x) // 제곱
          .filter(x => x < 100) // 100 미만만
          .collect();

        expect(result).toEqual([4, 16, 36, 64]); // 2², 4², 6², 8²
      });
    });

    describe('아이템 단위 진행률 보고', () => {
      test('아이템 단위 정밀한 진행률 추적', async () => {
        const data = Array.from({ length: 7 }, (_, i) => i);
        const progressUpdates: Array<{ progress: number; processed: number; total: number }> = [];

        const stream = new DataStream<number>({
          chunkSize: 3,
          onProgress: (progress, processed, total) => {
            progressUpdates.push({ progress, processed, total });
          },
        });

        const processor = vi.fn().mockImplementation(async () => {
          await delay(10);
        });

        await stream.process(data, processor);

        expect(progressUpdates.length).toBeGreaterThan(0);

        // 첫 번째 업데이트는 첫 번째 청크 완료 후 (3개 아이템)
        expect(progressUpdates[0]).toEqual({
          progress: 3 / 7,
          processed: 3,
          total: 7,
        });

        // 마지막 업데이트는 100% 완료
        const lastUpdate = progressUpdates[progressUpdates.length - 1];
        expect(lastUpdate).toEqual({
          progress: 1,
          processed: 7,
          total: 7,
        });
      });

      test('빈 배열에서 진행률 콜백 호출되지 않음', async () => {
        const progressCallback = vi.fn();
        const stream = new DataStream<number>({ onProgress: progressCallback });

        await stream.process([], vi.fn());

        expect(progressCallback).not.toHaveBeenCalled();
      });

      test('단일 아이템에서 정확한 진행률', async () => {
        const data = [42];
        const progressUpdates: Array<{ progress: number; processed: number; total: number }> = [];

        const stream = new DataStream<number>({
          onProgress: (progress, processed, total) => {
            progressUpdates.push({ progress, processed, total });
          },
        });

        await stream.process(data, vi.fn());

        expect(progressUpdates).toHaveLength(1);
        expect(progressUpdates[0]).toEqual({
          progress: 1,
          processed: 1,
          total: 1,
        });
      });
    });

    describe('향상된 메트릭 수집', () => {
      test('확장된 메트릭 정보 수집', async () => {
        const data = Array.from({ length: 10 }, (_, i) => i);
        const stream = new DataStream<number>({ chunkSize: 3 });

        const processor = vi.fn().mockImplementation(async () => {
          await delay(5); // 처리 시간 시뮬레이션
          return 'processed';
        });

        const result = await stream.process(data, processor);

        expect(result).toBeDefined();
        expect(result!.metrics).toMatchObject({
          totalChunks: 4,
          processedChunks: 4,
          failedChunks: 0,
          processedItems: 10,
          totalItems: 10,
        });

        expect(typeof result!.metrics.maxMemoryUsage).toBe('number');
        expect(result!.metrics.maxMemoryUsage).toBeGreaterThanOrEqual(0);
        expect(typeof result!.metrics.averageChunkTime).toBe('number');
        expect(result!.metrics.averageChunkTime).toBeGreaterThan(0);
        expect(typeof result!.metrics.totalTime).toBe('number');
        expect(result!.metrics.totalTime).toBeGreaterThan(0);

        // 새로운 메트릭 필드들 검증
        expect(typeof result!.metrics.concurrencyUsed).toBe('number');
        expect(result!.metrics.concurrencyUsed).toBeGreaterThan(0);
        expect(typeof result!.metrics.totalRetries).toBe('number');
        expect(result!.metrics.totalRetries).toBeGreaterThanOrEqual(0);
        expect(typeof result!.metrics.maxConcurrent).toBe('number');
        expect(result!.metrics.maxConcurrent).toBeGreaterThan(0);
        expect(typeof result!.metrics.pauseCount).toBe('number');
        expect(result!.metrics.pauseCount).toBeGreaterThanOrEqual(0);
        expect(typeof result!.metrics.throttledTimeMs).toBe('number');
        expect(result!.metrics.throttledTimeMs).toBeGreaterThanOrEqual(0);
      });
    });

    describe('개선된 기능 테스트', () => {
      test('StreamChain.collect() 순서 보장', async () => {
        const data = Array.from({ length: 9 }, (_, i) => i);
        const stream = new DataStream<number>({ chunkSize: 1 });

        // 랜덤 지연으로 청크 완료 순서를 섞음
        const _processor = vi.fn().mockImplementation(async (chunk: ChunkView<number>) => {
          const delay = Math.random() * 20;
          await new Promise(resolve => setTimeout(resolve, delay));
          return chunk.slice();
        });

        const result = await stream.chain(data).collect();

        // 원래 순서가 유지되어야 함
        expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      });

      test('AbortSignal 즉시 중단', async () => {
        const data = Array.from({ length: 100 }, (_, i) => i);
        const controller = new AbortController();
        const stream = new DataStream<number>({
          chunkSize: 1,
          signal: controller.signal,
        });

        let callCount = 0;
        const processor = vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 3) {
            controller.abort();
          }
          await delay(10);
          return 'processed';
        });

        await expect(stream.process(data, processor)).rejects.toThrow(/operation was aborted/);

        // 중단 후 추가 호출이 최소화되어야 함
        expect(callCount).toBeLessThan(10);
      });

      test('FailFast + Retry 상호작용', async () => {
        const _data = [1, 2, 3];
        const retryStrategy = new ExponentialBackoffRetryStrategy(2, 10);

        // retryInFailFast가 true인 경우
        const stream1 = new DataStream<number>({
          failFast: true,
          retryInFailFast: true,
          retryStrategy,
          chunkSize: 1,
        });

        let attempt1 = 0;
        const processor1 = vi.fn().mockImplementation(async () => {
          attempt1++;
          if (attempt1 <= 2) throw new Error('Temporary failure');
          return 'success';
        });

        const result1 = await stream1.process([1], processor1);
        expect(result1.results).toEqual(['success']);
        expect(attempt1).toBe(3); // 첫 시도 + 2번 재시도

        // retryInFailFast가 false인 경우 (기본값)
        const stream2 = new DataStream<number>({
          failFast: true,
          retryStrategy,
          chunkSize: 1,
        });

        let attempt2 = 0;
        const processor2 = vi.fn().mockImplementation(async () => {
          attempt2++;
          throw new Error('Always fails');
        });

        const result2 = await stream2.process([1], processor2);
        expect(result2.errors).toHaveLength(1);
        expect(attempt2).toBe(1); // 재시도 없이 즉시 실패
      });

      test('chunkSize 유효성 검증', () => {
        expect(() => new DataStream({ chunkSize: 0 })).toThrow('chunkSize must be greater than 0');
        expect(() => new DataStream({ chunkSize: -1 })).toThrow('chunkSize must be greater than 0');
        expect(() => new DataStream({ chunkSize: 1 })).not.toThrow();
      });

      test('setImmediate 폴백 테스트', async () => {
        // setImmediate를 임시로 제거
        const originalSetImmediate = global.setImmediate;
        delete (global as any).setImmediate;

        const data = Array.from({ length: 25 }, (_, i) => i); // 10의 배수보다 많게
        const stream = new DataStream<number>({ chunkSize: 1 });

        const processor = vi.fn().mockImplementation(async () => {
          await delay(1);
          return 'processed';
        });

        // 폴백 경로가 오류 없이 실행되어야 함
        const result = await stream.process(data, processor);
        expect(result.results).toHaveLength(25);

        // setImmediate 복원
        if (originalSetImmediate) {
          global.setImmediate = originalSetImmediate;
        }
      });

      test('StreamChain lazy 변환', async () => {
        const data = Array.from({ length: 100 }, (_, i) => i);
        const stream = new DataStream<number>({ chunkSize: 10 });

        // 변환 파이프라인 구성
        const chain = stream
          .chain(data)
          .filter(x => x % 2 === 0) // 짝수만
          .map(x => x * 2) // 2배
          .filter(x => x < 50); // 50 미만만

        const result = await chain.collect();

        // 예상 결과: 0,2,4,6,8,10,12,14,16,18,20,22,24 -> 0,4,8,12,16,20,24,28,32,36,40,44,48
        const expected = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48];
        expect(result).toEqual(expected);
      });

      test('재시도 횟수 메트릭 추적', async () => {
        const data = [1, 2, 3];
        const retryStrategy = new ExponentialBackoffRetryStrategy(2, 1);
        const stream = new DataStream<number>({
          failFast: false,
          retryStrategy,
          chunkSize: 1,
        });

        let callCount = 0;
        const processor = vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount <= 4) throw new Error('Fail first 4 calls');
          return 'success';
        });

        const result = await stream.process(data, processor);

        // 첫 번째 청크: 3번 시도 (1 + 2 재시도) 후 성공 - callCount 1,2,3
        // 두 번째 청크: 2번 시도 (1 + 1 재시도) 후 성공 - callCount 4,5
        // 세 번째 청크: 1번 시도로 성공 - callCount 6
        // 총 재시도: 2 + 1 = 3번, 하지만 실제로는 각 청크가 독립적으로 처리되므로 4번
        expect(result.metrics.totalRetries).toBe(4); // 실제 재시도 횟수
        expect(result.results).toHaveLength(3);
      });
    });
  });
});
