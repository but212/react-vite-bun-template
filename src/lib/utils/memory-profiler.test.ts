import { beforeEach, describe, expect, test } from 'vitest';
import { i18n } from '../i18n';
import { MemoryProfiler, memoryProfiler, profileMemory } from './memory-profiler';

describe('MemoryProfiler', () => {
  let profiler: MemoryProfiler;

  beforeEach(() => {
    profiler = new MemoryProfiler();
    i18n.setLocale('ko');
  });

  describe('getCurrentMemorySnapshot', () => {
    test('메모리 사용량 정보 반환', () => {
      const usage = profiler.getCurrentMemorySnapshot();

      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('total');
      expect(usage).toHaveProperty('percentage');
      expect(usage).toHaveProperty('timestamp');
      expect(typeof usage.used).toBe('number');
      expect(typeof usage.total).toBe('number');
      expect(typeof usage.percentage).toBe('number');
      expect(typeof usage.timestamp).toBe('number');
      expect(usage.used).toBeGreaterThanOrEqual(0);
      expect(usage.total).toBeGreaterThanOrEqual(0);
      expect(usage.percentage).toBeGreaterThanOrEqual(0);
      expect(usage.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('startProfiling', () => {
    test('프로파일링 시작', () => {
      expect(() => profiler.startProfiling()).not.toThrow();
      profiler.stopProfiling();
    });

    test('이미 실행 중일 때 에러 발생', () => {
      profiler.startProfiling();
      expect(() => profiler.startProfiling()).toThrow('메모리 프로파일링이 이미 실행 중입니다.');
      profiler.stopProfiling();
    });

    test('옵션 적용', () => {
      expect(() =>
        profiler.startProfiling({
          samplingInterval: 50,
          maxSamples: 100,
          forceGC: false,
        })
      ).not.toThrow();
      profiler.stopProfiling();
    });
  });

  describe('stopProfiling', () => {
    test('프로파일링 중지', () => {
      profiler.startProfiling();
      expect(() => profiler.stopProfiling()).not.toThrow();
    });

    test('실행 중이 아닐 때 에러 발생', () => {
      expect(() => profiler.stopProfiling()).toThrow('메모리 프로파일링이 실행되고 있지 않습니다.');
    });
  });

  describe('getProfile', () => {
    test('프로파일 결과 반환', async () => {
      profiler.startProfiling({ samplingInterval: 10 });

      // 짧은 시간 대기
      await new Promise(resolve => setTimeout(resolve, 50));

      profiler.stopProfiling();
      const profile = profiler.getProfile('test-profile');

      expect(profile.name).toBe('test-profile');
      expect(profile.startTime).toBeGreaterThan(0);
      expect(profile.endTime).toBeGreaterThan(profile.startTime);
      expect(profile.duration).toBeGreaterThan(0);
      expect(profile.initialMemory).toBeDefined();
      expect(profile.peakMemory).toBeDefined();
      expect(profile.finalMemory).toBeDefined();
      expect(typeof profile.memoryDelta).toBe('number');
      expect(Array.isArray(profile.samples)).toBe(true);
      expect(profile.samples.length).toBeGreaterThan(0);
    });

    test('실행 중일 때 에러 발생', () => {
      profiler.startProfiling();
      expect(() => profiler.getProfile('test')).toThrow('프로파일링이 아직 실행 중입니다.');
      profiler.stopProfiling();
    });

    test('데이터 없을 때 에러 발생', () => {
      expect(() => profiler.getProfile('test')).toThrow('프로파일링 데이터가 없습니다.');
    });
  });

  describe('profileFunction', () => {
    test('함수 실행 중 메모리 프로파일링', async () => {
      const testFunction = async () => {
        // 메모리 사용량을 증가시키는 작업
        const data = new Array(1000).fill(0).map((_, i) => ({ id: i, value: Math.random() }));
        await new Promise(resolve => setTimeout(resolve, 10));
        return data.length;
      };

      const result = await profiler.profileFunction('test-function', testFunction, {
        samplingInterval: 5,
      });

      expect(result.result).toBe(1000);
      expect(result.profile.name).toBe('test-function');
      expect(result.profile.duration).toBeGreaterThan(0);
      expect(result.profile.samples.length).toBeGreaterThan(0);
    });

    test('함수 실행 중 에러 발생 시 정리', async () => {
      const errorFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Test error');
      };

      await expect(profiler.profileFunction('error-function', errorFunction)).rejects.toThrow('Test error');
    });
  });

  describe('detectMemoryLeak', () => {
    test('메모리 누수 감지 - 충분한 샘플 없음', () => {
      profiler.startProfiling();
      profiler.stopProfiling();

      const detection = profiler.detectMemoryLeak(10, 20);
      expect(detection.isLeak).toBe(false);
      expect(detection.trend).toBe(0);
      expect(Array.isArray(detection.samples)).toBe(true);
    });

    test('메모리 누수 감지 - 정상 상태', async () => {
      profiler.startProfiling({ samplingInterval: 5 });
      await new Promise(resolve => setTimeout(resolve, 60));
      profiler.stopProfiling();

      const detection = profiler.detectMemoryLeak(100, 5); // 높은 임계값으로 설정
      expect(typeof detection.isLeak).toBe('boolean');
      expect(typeof detection.trend).toBe('number');
      expect(Array.isArray(detection.samples)).toBe(true);
    });
  });

  describe('formatProfile', () => {
    test('프로파일 결과 포맷팅', async () => {
      profiler.startProfiling({ samplingInterval: 10 });
      await new Promise(resolve => setTimeout(resolve, 30));
      profiler.stopProfiling();

      const profile = profiler.getProfile('format-test');
      const formatted = profiler.formatProfile(profile);

      expect(formatted).toContain('# 메모리 프로파일: format-test');
      expect(formatted).toContain('**실행 시간:**');
      expect(formatted).toContain('**초기 메모리:**');
      expect(formatted).toContain('**최대 메모리:**');
      expect(formatted).toContain('**최종 메모리:**');
      expect(formatted).toContain('**메모리 증가:**');
      expect(formatted).toContain('**샘플 수:**');
    });
  });

  describe('forceGarbageCollection', () => {
    test('가비지 컬렉션 실행 (사용 가능한 경우)', () => {
      // 에러가 발생하지 않아야 함
      expect(() => profiler.forceGarbageCollection()).not.toThrow();
    });
  });
});

describe('전역 인스턴스 및 헬퍼 함수', () => {
  test('memoryProfiler 전역 인스턴스', () => {
    expect(memoryProfiler).toBeInstanceOf(MemoryProfiler);
  });

  test('profileMemory 헬퍼 함수', async () => {
    const testFunction = () => {
      return Array.from({ length: 100 }, (_, i) => i * 2);
    };

    const result = await profileMemory('helper-test', testFunction, {
      samplingInterval: 10,
    });

    expect(result.result).toHaveLength(100);
    expect(result.profile.name).toBe('helper-test');
    expect(result.profile.duration).toBeGreaterThan(0);
  });
});

describe('통합 테스트', () => {
  test('메모리 집약적 작업 프로파일링', async () => {
    const memoryIntensiveTask = async () => {
      const arrays = [];

      // 여러 배열 생성으로 메모리 사용량 증가
      for (let i = 0; i < 5; i++) {
        const largeArray = new Array(10000).fill(0).map((_, idx) => ({
          id: idx,
          data: `item_${idx}_${i}`,
          timestamp: Date.now(),
        }));
        arrays.push(largeArray);

        // 짧은 대기
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      return arrays.length;
    };

    const result = await profileMemory('memory-intensive', memoryIntensiveTask, {
      samplingInterval: 5,
      maxSamples: 100,
    });

    expect(result.result).toBe(5);
    expect(result.profile.samples.length).toBeGreaterThan(1);
    expect(result.profile.duration).toBeGreaterThan(20); // 최소 25ms (5 * 5ms)

    // 메모리 사용량이 증가했을 가능성이 높음
    const formatted = memoryProfiler.formatProfile(result.profile);
    expect(formatted).toContain('메모리 프로파일: memory-intensive');
  });

  test('연속 프로파일링', async () => {
    const task1 = () => new Array(1000).fill(0);
    const task2 = () => new Array(2000).fill(1);

    const result1 = await profileMemory('task-1', task1);
    const result2 = await profileMemory('task-2', task2);

    expect(result1.result).toHaveLength(1000);
    expect(result2.result).toHaveLength(2000);
    expect(result1.profile.name).toBe('task-1');
    expect(result2.profile.name).toBe('task-2');
  });
});
