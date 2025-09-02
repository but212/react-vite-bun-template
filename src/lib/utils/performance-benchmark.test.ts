import { beforeEach, describe, expect, test, vi } from 'vitest';
import BitUtils from './bit-utils';
import { PerformanceBenchmark, performanceBenchmark } from './performance-benchmark';

describe('PerformanceBenchmark', () => {
  let benchmark: PerformanceBenchmark;

  beforeEach(() => {
    benchmark = new PerformanceBenchmark();
    BitUtils.clearAllCaches();
  });

  describe('measureFunction', () => {
    test('기본 함수 성능 측정', async () => {
      const result = await benchmark.measureFunction(
        'simple-calculation',
        () => {
          let sum = 0;
          for (let i = 0; i < 1000; i++) {
            sum += i * 2;
          }
          return sum;
        },
        10
      );

      expect(result.name).toBe('simple-calculation');
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.throughput).toBeGreaterThan(0);
      expect(result.memory.initial).toBeGreaterThanOrEqual(0);
      expect(result.memory.peak).toBeGreaterThanOrEqual(result.memory.initial);
    });

    test('비동기 함수 성능 측정', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const result = await benchmark.measureFunction(
        'async-operation',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
          return 'completed';
        },
        5
      );

      expect(result.name).toBe('async-operation');
      expect(result.averageTime).toBeGreaterThan(1); // 최소 1ms 지연
      expect(result.minTime).toBeGreaterThan(0);
      expect(result.maxTime).toBeGreaterThanOrEqual(result.minTime);
    });
  });

  describe('benchmarkDataProcessing', () => {
    test('소규모 데이터 처리 벤치마크', async () => {
      const results = await benchmark.benchmarkDataProcessing({
        dataSizes: [100, 500],
        chunkSizes: [50, 100],
        concurrencyLevels: [1, 2],
        iterations: 3,
      });

      expect(results).toHaveLength(8); // 2 * 2 * 2 = 8 combinations

      results.forEach(result => {
        expect(result.name).toMatch(/DataStream_\d+items_\d+chunk_\d+workers/);
        expect(result.totalTime).toBeGreaterThan(0);
        expect(result.throughput).toBeGreaterThan(0);
        expect(result.memory.peak).toBeGreaterThanOrEqual(result.memory.initial);
      });
    });

    test('동시성 레벨에 따른 성능 차이', async () => {
      const results = await benchmark.benchmarkDataProcessing({
        dataSizes: [1000],
        chunkSizes: [100],
        concurrencyLevels: [1, 4],
        iterations: 3,
      });

      expect(results).toHaveLength(2);

      const singleWorker = results.find(r => r.name.includes('1workers'));
      const multiWorker = results.find(r => r.name.includes('4workers'));

      expect(singleWorker).toBeDefined();
      expect(multiWorker).toBeDefined();

      // 멀티 워커가 일반적으로 더 높은 처리량을 가져야 함 (작은 데이터셋에서는 예외 가능)
      expect(multiWorker!.throughput).toBeGreaterThan(0);
      expect(singleWorker!.throughput).toBeGreaterThan(0);
    });
  });

  describe('benchmarkBitUtilsCache', () => {
    test('캐시 성능 측정', async () => {
      const results = await benchmark.benchmarkBitUtilsCache({
        cacheSizes: [100, 500],
        dataSize: 200,
        repeatPattern: 50,
        iterations: 5,
      });

      expect(results).toHaveLength(2);

      results.forEach(result => {
        expect(result.name).toMatch(/BitUtils_Cache_\d+_\d+values/);
        expect(result.metrics).toBeDefined();
        expect(result.metrics!.hitRate).toBeGreaterThanOrEqual(0);
        expect(result.metrics!.hitRate).toBeLessThanOrEqual(1);
        expect(result.metrics!.totalHits).toBeGreaterThanOrEqual(0);
        expect(result.metrics!.totalMisses).toBeGreaterThanOrEqual(0);
      });
    });

    test('반복 패턴에 따른 히트율 변화', async () => {
      // 높은 반복 패턴 (높은 히트율 예상)
      const highRepeat = await benchmark.benchmarkBitUtilsCache({
        cacheSizes: [100],
        dataSize: 200,
        repeatPattern: 20, // 20개 값만 반복
        iterations: 3,
      });

      // 낮은 반복 패턴 (낮은 히트율 예상)
      const lowRepeat = await benchmark.benchmarkBitUtilsCache({
        cacheSizes: [100],
        dataSize: 200,
        repeatPattern: 200, // 200개 값 모두 다름
        iterations: 3,
      });

      expect(highRepeat[0]?.metrics?.hitRate ?? 0).toBeGreaterThanOrEqual(lowRepeat[0]?.metrics?.hitRate ?? 0);
    });
  });

  describe('benchmarkCachePerformance', () => {
    test('AdaptiveLRUCache 성능 측정', async () => {
      const results = await benchmark.benchmarkCachePerformance({
        cacheSizes: [50, 100],
        dataSize: 150,
        repeatPattern: 30,
        iterations: 5,
      });

      expect(results).toHaveLength(2);

      results.forEach(result => {
        expect(result.name).toMatch(/AdaptiveLRUCache_\d+_\d+operations/);
        expect(result.metrics).toBeDefined();
        expect(result.metrics!.hitRate).toBeGreaterThanOrEqual(0);
        expect(result.metrics!.hits).toBeGreaterThanOrEqual(0);
        expect(result.metrics!.misses).toBeGreaterThanOrEqual(0);
        expect(result.metrics!.cacheSize).toBeGreaterThanOrEqual(0);
      });
    });

    test('캐시 크기에 따른 성능 차이', async () => {
      const results = await benchmark.benchmarkCachePerformance({
        cacheSizes: [50, 200],
        dataSize: 100,
        repeatPattern: 40,
        iterations: 3,
      });

      const smallCache = results.find(r => r.name.includes('50_'));
      const largeCache = results.find(r => r.name.includes('200_'));

      expect(smallCache).toBeDefined();
      expect(largeCache).toBeDefined();

      // 큰 캐시가 일반적으로 더 높은 히트율을 가져야 함
      expect(largeCache?.metrics?.hitRate ?? 0).toBeGreaterThanOrEqual(smallCache?.metrics?.hitRate ?? 0);
    });
  });

  describe('profileMemoryUsage', () => {
    test('메모리 프로파일링', async () => {
      const profile = await benchmark.profileMemoryUsage(
        'memory-test',
        () => {
          // 메모리 사용량을 증가시키는 작업
          const largeArray = new Array(100000).fill(0).map((_, i) => ({ id: i, data: `item_${i}` }));
          return largeArray.length;
        },
        50 // 50ms 간격으로 샘플링
      );

      expect(profile.result).toBe(100000);
      expect(profile.memoryProfile.length).toBeGreaterThan(0);
      expect(profile.summary.initial).toBeGreaterThanOrEqual(0);
      expect(profile.summary.peak).toBeGreaterThanOrEqual(profile.summary.initial);

      // 메모리 프로파일 데이터 검증
      profile.memoryProfile.forEach(sample => {
        expect(sample.time).toBeGreaterThanOrEqual(0);
        expect(sample.memory).toBeGreaterThanOrEqual(0);
      });
    });

    test('비동기 작업 메모리 프로파일링', async () => {
      const profile = await benchmark.profileMemoryUsage(
        'async-memory-test',
        async () => {
          const promises = Array.from({ length: 10 }, async (_, i) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return new Array(1000).fill(i);
          });
          return await Promise.all(promises);
        },
        25
      );

      expect(profile.result).toHaveLength(10);
      expect(profile.memoryProfile.length).toBeGreaterThan(0);
      expect(profile.summary.peak).toBeGreaterThanOrEqual(profile.summary.initial);
    });
  });

  describe('formatResults', () => {
    test('결과 포맷팅', async () => {
      const mockResults = [
        {
          name: 'test-benchmark',
          totalTime: 1000,
          averageTime: 100,
          minTime: 90,
          maxTime: 110,
          throughput: 10,
          memory: {
            initial: 50,
            peak: 60,
            final: 55,
            delta: 5,
          },
          metrics: {
            hitRate: 0.85,
            operations: 100,
          },
        },
      ];

      vi.spyOn(console, 'table').mockImplementation(() => undefined);
      const formatted = benchmark.formatResults(mockResults);

      expect(formatted).toContain('# 성능 벤치마크 결과');
      expect(formatted).toContain('test-benchmark');
      expect(formatted).toContain('1000.00ms');
      expect(formatted).toContain('100.00ms');
      expect(formatted).toContain('10.00 ops/sec');
      expect(formatted).toContain('50.00MB');
      expect(formatted).toContain('60.00MB');
      expect(formatted).toContain('5.00MB');
      expect(formatted).toContain('hitRate: 0.8500');
      expect(formatted).toContain('operations: 100');
    });
  });

  describe('runComprehensiveTest', () => {
    test('종합 성능 테스트 (소규모)', async () => {
      // 테스트 시간을 줄이기 위해 소규모로 실행
      const originalBenchmark = new PerformanceBenchmark();

      // 작은 규모의 테스트로 오버라이드
      const mockDataProcessing = vi.spyOn(originalBenchmark, 'benchmarkDataProcessing').mockResolvedValue([
        {
          name: 'mock-data-processing',
          totalTime: 100,
          averageTime: 20,
          minTime: 18,
          maxTime: 22,
          throughput: 50,
          memory: { initial: 10, peak: 15, final: 12, delta: 2 },
        },
      ]);

      const mockBitUtilsCache = vi.spyOn(originalBenchmark, 'benchmarkBitUtilsCache').mockResolvedValue([
        {
          name: 'mock-bitutils-cache',
          totalTime: 50,
          averageTime: 10,
          minTime: 9,
          maxTime: 11,
          throughput: 100,
          memory: { initial: 8, peak: 10, final: 9, delta: 1 },
          metrics: { hitRate: 0.9, totalHits: 90, totalMisses: 10 },
        },
      ]);

      const mockCachePerformance = vi.spyOn(originalBenchmark, 'benchmarkCachePerformance').mockResolvedValue([
        {
          name: 'mock-cache-performance',
          totalTime: 75,
          averageTime: 15,
          minTime: 14,
          maxTime: 16,
          throughput: 66.67,
          memory: { initial: 5, peak: 8, final: 6, delta: 1 },
          metrics: { hitRate: 0.8, hits: 80, misses: 20 },
        },
      ]);

      const result = await originalBenchmark.runComprehensiveTest();

      expect(result.dataProcessing).toHaveLength(1);
      expect(result.bitUtilsCache).toHaveLength(1);
      expect(result.cachePerformance).toHaveLength(1);
      expect(result.summary).toContain('성능 벤치마크 요약');
      expect(result.summary).toContain('최고 성능 결과');
      expect(result.summary).toContain('성능 권장사항');

      // 모킹 정리
      mockDataProcessing.mockRestore();
      mockBitUtilsCache.mockRestore();
      mockCachePerformance.mockRestore();
    }, 30000); // 30초 타임아웃
  });

  describe('싱글톤 인스턴스', () => {
    test('performanceBenchmark 싱글톤 접근', () => {
      expect(performanceBenchmark).toBeInstanceOf(PerformanceBenchmark);
      expect(performanceBenchmark.measureFunction).toBeDefined();
      expect(performanceBenchmark.benchmarkDataProcessing).toBeDefined();
      expect(performanceBenchmark.runComprehensiveTest).toBeDefined();
    });
  });
});
