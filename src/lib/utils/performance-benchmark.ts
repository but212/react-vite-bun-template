/**
 * 성능 벤치마크 및 프로파일링 도구
 * 대용량 데이터 처리, 메모리 사용량, 캐시 히트율 등을 측정하고 분석합니다.
 */

import BitUtils from './bit-utils';
import { AdaptiveLRUCache } from './cache-strategy';
import { DataStream } from './data-stream';

/**
 * 벤치마크 결과 인터페이스
 */
export interface BenchmarkResult {
  /** 벤치마크 이름 */
  name: string;
  /** 총 실행 시간 (ms) */
  totalTime: number;
  /** 평균 실행 시간 (ms) */
  averageTime: number;
  /** 최소 실행 시간 (ms) */
  minTime: number;
  /** 최대 실행 시간 (ms) */
  maxTime: number;
  /** 초당 처리량 (ops/sec) */
  throughput: number;
  /** 메모리 사용량 정보 */
  memory: MemoryUsage;
  /** 추가 메트릭 */
  metrics?: Record<string, number>;
}

/**
 * 메모리 사용량 정보
 */
export interface MemoryUsage {
  /** 시작 시 메모리 사용량 (MB) */
  initial: number;
  /** 최대 메모리 사용량 (MB) */
  peak: number;
  /** 종료 시 메모리 사용량 (MB) */
  final: number;
  /** 메모리 증가량 (MB) */
  delta: number;
}

/**
 * 대용량 데이터 처리 벤치마크 옵션
 */
export interface DataProcessingBenchmarkOptions {
  /** 데이터 크기 배열 */
  dataSizes: number[];
  /** 청크 크기 배열 */
  chunkSizes: number[];
  /** 동시성 레벨 배열 */
  concurrencyLevels: number[];
  /** 반복 횟수 */
  iterations: number;
}

/**
 * 캐시 성능 벤치마크 옵션
 */
export interface CacheBenchmarkOptions {
  /** 캐시 크기 배열 */
  cacheSizes: number[];
  /** 테스트 데이터 크기 */
  dataSize: number;
  /** 반복 패턴 (히트율 조절) */
  repeatPattern: number;
  /** 반복 횟수 */
  iterations: number;
}

/**
 * 메모리 모니터링 클래스
 */
class MemoryMonitor {
  private initialMemory: number = 0;
  private peakMemory: number = 0;

  /**
   * 현재 메모리 사용량을 반환합니다 (MB 단위)
   */
  getCurrentMemory(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      // Node.js 환경
      const usage = process.memoryUsage();
      return usage.heapUsed / 1024 / 1024;
    } else if (typeof performance !== 'undefined' && 'memory' in performance) {
      // 브라우저 환경 (Chrome)
      const memory = (performance as { memory: { usedJSHeapSize: number } }).memory;
      return memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  /**
   * 메모리 모니터링을 시작합니다
   */
  start(): void {
    this.initialMemory = this.getCurrentMemory();
    this.peakMemory = this.initialMemory;
  }

  /**
   * 메모리 사용량을 업데이트합니다
   */
  update(): void {
    const current = this.getCurrentMemory();
    this.peakMemory = Math.max(this.peakMemory, current);
  }

  /**
   * 메모리 사용량 결과를 반환합니다
   */
  getResult(): MemoryUsage {
    const final = this.getCurrentMemory();
    return {
      initial: this.initialMemory,
      peak: this.peakMemory,
      final,
      delta: final - this.initialMemory,
    };
  }
}

/**
 * 성능 벤치마크 클래스
 */
export class PerformanceBenchmark {
  private memoryMonitor = new MemoryMonitor();

  /**
   * 함수의 성능을 측정합니다
   */
  async measureFunction<T>(name: string, fn: () => Promise<T> | T, iterations: number = 100): Promise<BenchmarkResult> {
    const times: number[] = [];
    this.memoryMonitor.start();

    // 워밍업
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await fn();
    }

    // 실제 측정
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
      this.memoryMonitor.update();
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = 1000 / averageTime; // ops/sec

    return {
      name,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      throughput,
      memory: this.memoryMonitor.getResult(),
    };
  }

  /**
   * 대용량 데이터 처리 성능을 벤치마크합니다
   */
  async benchmarkDataProcessing(options: DataProcessingBenchmarkOptions): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const dataSize of options.dataSizes) {
      for (const chunkSize of options.chunkSizes) {
        for (const concurrency of options.concurrencyLevels) {
          const testData = Array.from({ length: dataSize }, (_, i) => i);

          const result = await this.measureFunction(
            `DataStream_${dataSize}items_${chunkSize}chunk_${concurrency}workers`,
            async () => {
              const stream = new DataStream({
                chunkSize,
                concurrencyStrategy: {
                  getWorkerCount: () => concurrency,
                  shouldPause: async () => false,
                },
              });

              return await stream.process(testData, async chunk => {
                // 간단한 처리 시뮬레이션
                let sum = 0;
                for (const item of chunk) {
                  sum += (item as number) * 2;
                }
                return sum;
              });
            },
            options.iterations
          );

          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * BitUtils 캐시 성능을 벤치마크합니다
   */
  async benchmarkBitUtilsCache(options: CacheBenchmarkOptions): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const cacheSize of options.cacheSizes) {
      // 캐시 초기화
      BitUtils.clearAllCaches();

      const testValues = Array.from({ length: options.dataSize }, () => Math.floor(Math.random() * 1000000));

      const result = await this.measureFunction(
        `BitUtils_Cache_${cacheSize}_${options.dataSize}values`,
        () => {
          // 반복 패턴으로 캐시 히트율 조절
          const repeatCount = Math.min(options.repeatPattern, testValues.length);
          const valuesToTest = testValues.slice(0, repeatCount);

          valuesToTest.forEach((value: number) => {
            BitUtils.popCount(value);
            BitUtils.isPowerOfTwo(value);
            BitUtils.countLeadingZeros(value);
            BitUtils.countTrailingZeros(value);
          });
        },
        options.iterations
      );

      // 캐시 통계 추가
      const cacheStats = BitUtils.getCacheStats();
      result.metrics = {
        hitRate: cacheStats.combinedHitRate,
        powerOfTwoHits: cacheStats.powerOfTwoCache.hits,
        popCountHits: cacheStats.popCountCache.hits,
        totalHits: cacheStats.powerOfTwoCache.hits + cacheStats.popCountCache.hits,
        totalMisses: cacheStats.powerOfTwoCache.misses + cacheStats.popCountCache.misses,
      };

      results.push(result);
    }

    return results;
  }

  /**
   * 일반 캐시 성능을 벤치마크합니다
   */
  async benchmarkCachePerformance(options: CacheBenchmarkOptions): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const cacheSize of options.cacheSizes) {
      const cache = new AdaptiveLRUCache<number, string>(cacheSize);

      const result = await this.measureFunction(
        `AdaptiveLRUCache_${cacheSize}_${options.dataSize}operations`,
        () => {
          // 캐시 읽기/쓰기 패턴 시뮬레이션
          for (let i = 0; i < options.dataSize; i++) {
            const key = i % options.repeatPattern; // 반복 패턴으로 히트율 조절

            const value = cache.get(key);
            if (value === undefined) {
              cache.set(key, `value_${key}`);
            }
          }
        },
        options.iterations
      );

      // 캐시 통계 추가
      const cacheStats = cache.getStats();
      result.metrics = {
        hitRate: cacheStats.hitRate,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        evictions: cacheStats.evictions,
        cacheSize: cacheStats.cacheSize,
      };

      results.push(result);
    }

    return results;
  }

  /**
   * 메모리 사용량 프로파일링
   */
  async profileMemoryUsage<T>(
    name: string,
    fn: () => Promise<T> | T,
    samplingInterval: number = 100
  ): Promise<{
    result: T;
    memoryProfile: Array<{ time: number; memory: number }>;
    summary: MemoryUsage;
  }> {
    const memoryProfile: Array<{ time: number; memory: number }> = [];
    const startTime = performance.now();
    this.memoryMonitor.start();

    // 메모리 샘플링 시작
    const samplingTimer = setInterval(() => {
      const currentTime = performance.now() - startTime;
      const currentMemory = this.memoryMonitor.getCurrentMemory();
      memoryProfile.push({ time: currentTime, memory: currentMemory });
      this.memoryMonitor.update();
    }, samplingInterval);

    try {
      const result = await fn();

      // 함수 실행 후 최소 한 번의 샘플링을 보장
      await new Promise(resolve => setTimeout(resolve, samplingInterval));

      return {
        result,
        memoryProfile,
        summary: this.memoryMonitor.getResult(),
      };
    } finally {
      clearInterval(samplingTimer);
    }
  }

  /**
   * 벤치마크 결과를 포맷팅합니다
   */
  formatResults(results: BenchmarkResult[]): string {
    let output = '# 성능 벤치마크 결과\n\n';

    results.forEach((result, index) => {
      output += `## ${index + 1}. ${result.name}\n\n`;
      output += `- **총 실행 시간**: ${result.totalTime.toFixed(2)}ms\n`;
      output += `- **평균 실행 시간**: ${result.averageTime.toFixed(2)}ms\n`;
      output += `- **최소/최대 시간**: ${result.minTime.toFixed(2)}ms / ${result.maxTime.toFixed(2)}ms\n`;
      output += `- **처리량**: ${result.throughput.toFixed(2)} ops/sec\n`;
      output += '- **메모리 사용량**:\n';
      output += `  - 초기: ${result.memory.initial.toFixed(2)}MB\n`;
      output += `  - 최대: ${result.memory.peak.toFixed(2)}MB\n`;
      output += `  - 증가량: ${result.memory.delta.toFixed(2)}MB\n`;

      if (result.metrics) {
        output += '- **추가 메트릭**:\n';
        Object.entries(result.metrics).forEach(([key, value]) => {
          output += `  - ${key}: ${typeof value === 'number' ? value.toFixed(4) : value}\n`;
        });
      }

      output += '\n';
    });

    return output;
  }

  /**
   * 종합 성능 테스트 실행
   */
  async runComprehensiveTest(): Promise<{
    dataProcessing: BenchmarkResult[];
    bitUtilsCache: BenchmarkResult[];
    cachePerformance: BenchmarkResult[];
    summary: string;
  }> {
    // eslint-disable-next-line no-console
    console.log('🚀 종합 성능 벤치마크 시작...');

    // 1. 대용량 데이터 처리 벤치마크
    // eslint-disable-next-line no-console
    console.log('📊 대용량 데이터 처리 성능 측정...');
    const dataProcessing = await this.benchmarkDataProcessing({
      dataSizes: [1000, 10000, 100000],
      chunkSizes: [100, 500, 1000],
      concurrencyLevels: [1, 2, 4],
      iterations: 5,
    });

    // 2. BitUtils 캐시 벤치마크
    // eslint-disable-next-line no-console
    console.log('🔧 BitUtils 캐시 성능 측정...');
    const bitUtilsCache = await this.benchmarkBitUtilsCache({
      cacheSizes: [100, 500, 1000],
      dataSize: 1000,
      repeatPattern: 100,
      iterations: 10,
    });

    // 3. 일반 캐시 성능 벤치마크
    // eslint-disable-next-line no-console
    console.log('💾 캐시 성능 측정...');
    const cachePerformance = await this.benchmarkCachePerformance({
      cacheSizes: [100, 500, 1000],
      dataSize: 2000,
      repeatPattern: 200,
      iterations: 10,
    });

    const summary = this.generateSummary(dataProcessing, bitUtilsCache, cachePerformance);

    // eslint-disable-next-line no-console
    console.log('✅ 벤치마크 완료!');
    return {
      dataProcessing,
      bitUtilsCache,
      cachePerformance,
      summary,
    };
  }

  /**
   * 벤치마크 결과 요약 생성
   */
  private generateSummary(
    dataProcessing: BenchmarkResult[],
    bitUtilsCache: BenchmarkResult[],
    cachePerformance: BenchmarkResult[]
  ): string {
    const bestDataProcessing = dataProcessing.reduce((best, current) =>
      current.throughput > best.throughput ? current : best
    );

    const bestCacheHitRate = bitUtilsCache.reduce((best, current) =>
      (current.metrics?.hitRate || 0) > (best.metrics?.hitRate || 0) ? current : best
    );

    return `
# 성능 벤치마크 요약

## 🏆 최고 성능 결과

### 데이터 처리
- **최고 처리량**: ${bestDataProcessing.throughput.toFixed(2)} ops/sec
- **구성**: ${bestDataProcessing.name}
- **메모리 효율성**: ${bestDataProcessing.memory.delta.toFixed(2)}MB 증가

### 캐시 성능
- **최고 히트율**: ${((bestCacheHitRate.metrics?.hitRate || 0) * 100).toFixed(2)}%
- **구성**: ${bestCacheHitRate.name}

## 📈 성능 권장사항

1. **대용량 데이터 처리**: 청크 크기 ${bestDataProcessing.name.match(/\d+chunk/)?.[0]} 권장
2. **캐시 최적화**: ${bestCacheHitRate.name.match(/\d+/)?.[0]} 크기 캐시 권장
3. **메모리 관리**: 최대 ${Math.max(...dataProcessing.map(r => r.memory.peak)).toFixed(2)}MB 메모리 사용량 확인됨

## 🔍 상세 분석

총 ${dataProcessing.length + bitUtilsCache.length + cachePerformance.length}개 테스트 완료
- 데이터 처리: ${dataProcessing.length}개 테스트
- BitUtils 캐시: ${bitUtilsCache.length}개 테스트  
- 일반 캐시: ${cachePerformance.length}개 테스트
`;
  }
}

// 싱글톤 인스턴스
export const performanceBenchmark = new PerformanceBenchmark();
