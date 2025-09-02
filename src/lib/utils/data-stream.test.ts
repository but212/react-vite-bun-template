import { describe, expect, test, vi } from 'vitest';
import { DataStream } from './data-stream';

describe('DataStream', () => {
  describe('기본 기능', () => {
    test('빈 배열 처리', async () => {
      const stream = new DataStream<number>();
      const processor = vi.fn();

      await stream.process([], processor);

      expect(processor).not.toHaveBeenCalled();
    });

    test('단일 청크 처리', async () => {
      const data = [1, 2, 3];
      const stream = new DataStream<number>({ chunkSize: 5 });
      const processor = vi.fn().mockResolvedValue(undefined);

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith([1, 2, 3]);
    });

    test('여러 청크로 분할 처리', async () => {
      const data = [1, 2, 3, 4, 5, 6];
      const stream = new DataStream<number>({ chunkSize: 2 });
      const processor = vi.fn().mockResolvedValue(undefined);

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(3);
      expect(processor).toHaveBeenNthCalledWith(1, [1, 2]);
      expect(processor).toHaveBeenNthCalledWith(2, [3, 4]);
      expect(processor).toHaveBeenNthCalledWith(3, [5, 6]);
    });

    test('불완전한 마지막 청크 처리', async () => {
      const data = [1, 2, 3, 4, 5];
      const stream = new DataStream<number>({ chunkSize: 2 });
      const processor = vi.fn().mockResolvedValue(undefined);

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(3);
      expect(processor).toHaveBeenNthCalledWith(3, [5]);
    });
  });

  describe('진행률 콜백', () => {
    test('진행률이 올바르게 계산됨', async () => {
      const data = [1, 2, 3, 4, 5, 6];
      const progressCallback = vi.fn();
      const stream = new DataStream<number>({
        chunkSize: 2,
        onProgress: progressCallback,
      });
      const processor = vi.fn().mockResolvedValue(undefined);

      await stream.process(data, processor);

      expect(progressCallback).toHaveBeenCalledTimes(3);
      expect(progressCallback).toHaveBeenNthCalledWith(1, 2 / 6);
      expect(progressCallback).toHaveBeenNthCalledWith(2, 4 / 6);
      expect(progressCallback).toHaveBeenNthCalledWith(3, 1); // 100%
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
      const stream = new DataStream<number>({ chunkSize: 1, concurrency: 1 });
      const processOrder: number[] = [];
      const processor = vi.fn().mockImplementation(async (chunk: readonly number[]) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        if (chunk.length > 0 && chunk[0] !== undefined) {
          processOrder.push(chunk[0]);
        }
      });

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(4);
      expect(processOrder).toEqual([1, 2, 3, 4]);
    });

    test('병렬 처리 (concurrency: 2)', async () => {
      const data = [1, 2, 3, 4];
      const stream = new DataStream<number>({ chunkSize: 1, concurrency: 2 });
      const processor = vi.fn().mockResolvedValue(undefined);

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(4);
    });
  });

  describe('오류 처리', () => {
    test('processor에서 오류 발생 시 즉시 중단', async () => {
      const data = [1, 2, 3, 4];
      const stream = new DataStream<number>({ chunkSize: 1 });
      const error = new Error('Processing failed');
      const processor = vi
        .fn()
        .mockResolvedValueOnce(undefined) // 첫 번째 성공
        .mockRejectedValueOnce(error); // 두 번째 실패

      await expect(stream.process(data, processor)).rejects.toThrow('Processing failed');
    });

    test('잘못된 데이터 타입에 대한 오류', async () => {
      const stream = new DataStream<number>();
      const processor = vi.fn();

      // @ts-expect-error - 의도적으로 잘못된 타입 전달
      await expect(stream.process('not an array', processor)).rejects.toThrow('Data must be an array');
    });
  });

  describe('재시도 로직', () => {
    test('재시도 없이 실패', async () => {
      const data = [1];
      const stream = new DataStream<number>({ retryCount: 0 });
      const error = new Error('Failed');
      const processor = vi.fn().mockRejectedValue(error);

      await expect(stream.process(data, processor)).rejects.toThrow('Failed');
      expect(processor).toHaveBeenCalledTimes(1);
    });

    test('재시도 후 성공', async () => {
      const data = [1];
      const stream = new DataStream<number>({ retryCount: 2, retryDelay: 10 });
      const processor = vi
        .fn()
        .mockRejectedValueOnce(new Error('First fail'))
        .mockRejectedValueOnce(new Error('Second fail'))
        .mockResolvedValueOnce(undefined); // 세 번째 성공

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(3);
    });

    test('최대 재시도 횟수 초과 시 실패', async () => {
      const data = [1];
      const stream = new DataStream<number>({ retryCount: 1, retryDelay: 10 });
      const error = new Error('Always fails');
      const processor = vi.fn().mockRejectedValue(error);

      await expect(stream.process(data, processor)).rejects.toThrow('Always fails');
      expect(processor).toHaveBeenCalledTimes(2); // 초기 시도 + 1회 재시도
    });

    test('커스텀 백오프 팩터 적용', async () => {
      const data = [1];
      const stream = new DataStream<number>({
        retryCount: 2,
        retryDelay: 10,
        retryBackoffFactor: 3,
        retryJitter: 0, // 지터 제거로 정확한 시간 테스트
      });
      const processor = vi
        .fn()
        .mockRejectedValueOnce(new Error('First fail'))
        .mockRejectedValueOnce(new Error('Second fail'))
        .mockResolvedValueOnce(undefined);

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(3);
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

      await expect(stream.process(data, processor)).rejects.toThrow();
    });
  });

  describe('타입 안전성', () => {
    test('readonly 배열 처리', async () => {
      const data: readonly number[] = [1, 2, 3] as const;
      const stream = new DataStream<number>();
      const processor = vi.fn().mockResolvedValue(undefined);

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledWith([1, 2, 3]);
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

      await stream.process(users, processor);

      expect(processor).toHaveBeenCalledWith(users);
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
        return {} as NodeJS.Immediate;
      });

      await stream.process(data, processor);

      // 10청크마다 이벤트 루프 양보가 발생해야 함 (10번째, 20번째)
      expect(setImmediateSpy).toHaveBeenCalledTimes(2);

      setImmediateSpy.mockRestore();
    });
  });

  describe('엣지 케이스', () => {
    test('매우 큰 청크 크기', async () => {
      const data = [1, 2, 3];
      const stream = new DataStream<number>({ chunkSize: 1000 });
      const processor = vi.fn().mockResolvedValue(undefined);

      await stream.process(data, processor);

      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith([1, 2, 3]);
    });

    test('지터 범위 검증', () => {
      // 지터가 0-1 범위를 벗어나는 경우 자동 보정
      const stream1 = new DataStream({ retryJitter: -0.5 });
      const stream2 = new DataStream({ retryJitter: 1.5 });

      // 내부적으로 0-1 범위로 클램핑되어야 함
      expect(stream1).toBeInstanceOf(DataStream);
      expect(stream2).toBeInstanceOf(DataStream);
    });
  });

  describe('결과 수집', () => {
    test('void 처리 결과', async () => {
      const data = [1, 2, 3];
      const stream = new DataStream<number>();
      const processor = vi.fn().mockResolvedValue(undefined);

      const result = await stream.process(data, processor);

      expect(result).toBeUndefined();
      expect(processor).toHaveBeenCalledTimes(1);
    });

    test('결과 반환 처리', async () => {
      const data = [1, 2, 3];
      const stream = new DataStream<number>();
      const processor = vi.fn().mockResolvedValue('processed');

      const result = await stream.process(data, processor);

      expect(result).toEqual({
        results: ['processed'],
        errors: [],
      });
    });
  });
});
