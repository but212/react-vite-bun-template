# Performance Benchmark API Reference

애플리케이션 성능 측정 및 벤치마킹을 위한 종합적인 도구입니다.

## 개요

Performance Benchmark는 함수 실행 시간, 메모리 사용량, 처리량 등을 정확하게 측정하여 성능 최적화에 필요한 데이터를 제공합니다. 다양한 벤치마크 시나리오를 지원하며 상세한 성능 리포트를 생성합니다.

## 주요 기능

- **함수 성능 측정**: 실행 시간, 메모리 사용량, 처리량 측정
- **데이터 처리 벤치마크**: 다양한 데이터 크기와 청크 크기에 대한 성능 분석
- **비교 벤치마크**: 여러 구현체 간의 성능 비교
- **메모리 프로파일링**: 힙 사용량, 가비지 컬렉션 추적
- **통계 분석**: 평균, 최소, 최대, 표준편차 등 상세 통계

## 기본 사용법

```typescript
import { PerformanceBenchmark } from '@/lib/utils/performance-benchmark';

const benchmark = new PerformanceBenchmark();

// 함수 성능 측정
const result = await benchmark.measureFunction(
  'array-sort',
  () => {
    const arr = Array.from({ length: 10000 }, () => Math.random());
    return arr.sort((a, b) => a - b);
  },
  10 // 10회 반복
);

console.log(`평균 실행 시간: ${result.averageTime}ms`);
console.log(`처리량: ${result.throughput} ops/sec`);
```

## API 참조

### PerformanceBenchmark 클래스

#### `measureFunction<T>(name: string, fn: () => T | Promise<T>, iterations: number): Promise<BenchmarkResult>`

함수의 성능을 측정합니다.

**매개변수:**

- `name`: 벤치마크 이름
- `fn`: 측정할 함수
- `iterations`: 반복 횟수

**반환값:**

```typescript
interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
  memory: {
    initial: number;
    peak: number;
    final: number;
  };
}
```

**예제:**

```typescript
// 동기 함수 측정
const syncResult = await benchmark.measureFunction(
  'fibonacci',
  () => fibonacci(30),
  5
);

// 비동기 함수 측정
const asyncResult = await benchmark.measureFunction(
  'api-call',
  async () => {
    const response = await fetch('/api/data');
    return response.json();
  },
  3
);
```

#### `benchmarkDataProcessing(options: DataProcessingBenchmarkOptions): Promise<DataProcessingBenchmarkResult>`

데이터 처리 성능을 종합적으로 벤치마킹합니다.

**옵션:**

```typescript
interface DataProcessingBenchmarkOptions {
  dataSizes: number[];          // 테스트할 데이터 크기들
  chunkSizes: number[];         // 테스트할 청크 크기들
  concurrencyLevels: number[];  // 테스트할 동시성 수준들
  iterations: number;           // 각 조합당 반복 횟수
  processor?: (chunk: any[]) => Promise<any[]>; // 커스텀 프로세서
}
```

**예제:**

```typescript
const dataResults = await benchmark.benchmarkDataProcessing({
  dataSizes: [1000, 10000, 100000],
  chunkSizes: [100, 500, 1000],
  concurrencyLevels: [1, 2, 4, 8],
  iterations: 3,
  processor: async (chunk) => {
    return chunk.map(item => item * 2);
  }
});

// 최적 설정 찾기
const optimal = dataResults.results.reduce((best, current) => 
  current.throughput > best.throughput ? current : best
);
```

#### `compareImplementations<T>(implementations: Implementation<T>[], testData: any, iterations: number): Promise<ComparisonResult<T>>`

여러 구현체의 성능을 비교합니다.

**예제:**

```typescript
const implementations = [
  {
    name: 'native-sort',
    fn: (arr: number[]) => [...arr].sort((a, b) => a - b)
  },
  {
    name: 'quick-sort',
    fn: (arr: number[]) => quickSort([...arr])
  },
  {
    name: 'merge-sort',
    fn: (arr: number[]) => mergeSort([...arr])
  }
];

const testArray = Array.from({ length: 10000 }, () => Math.random());
const comparison = await benchmark.compareImplementations(
  implementations,
  testArray,
  5
);

// 결과 분석
comparison.results.forEach(result => {
  console.log(`${result.name}: ${result.averageTime}ms`);
});
```

## 고급 사용법

### 메모리 집약적 작업 벤치마킹

```typescript
const memoryBenchmark = await benchmark.measureFunction(
  'large-array-processing',
  () => {
    // 대용량 배열 생성 및 처리
    const largeArray = new Array(1000000).fill(0).map((_, i) => ({
      id: i,
      value: Math.random(),
      processed: false
    }));
    
    return largeArray
      .filter(item => item.value > 0.5)
      .map(item => ({ ...item, processed: true }))
      .sort((a, b) => a.value - b.value);
  },
  3
);

console.log(`메모리 피크: ${memoryBenchmark.memory.peak}MB`);
console.log(`메모리 증가: ${memoryBenchmark.memory.peak - memoryBenchmark.memory.initial}MB`);
```

### 알고리즘 성능 비교

```typescript
// 다양한 정렬 알고리즘 비교
async function benchmarkSortingAlgorithms() {
  const sizes = [1000, 5000, 10000, 50000];
  const results = [];

  for (const size of sizes) {
    const testData = Array.from({ length: size }, () => Math.random());
    
    const comparison = await benchmark.compareImplementations([
      { name: 'Array.sort', fn: (arr) => [...arr].sort((a, b) => a - b) },
      { name: 'QuickSort', fn: (arr) => quickSort([...arr]) },
      { name: 'MergeSort', fn: (arr) => mergeSort([...arr]) },
      { name: 'HeapSort', fn: (arr) => heapSort([...arr]) }
    ], testData, 5);
    
    results.push({ size, comparison });
  }
  
  return results;
}
```

### 비동기 작업 성능 측정

```typescript
// 동시성 수준에 따른 API 호출 성능
async function benchmarkApiCalls() {
  const concurrencyLevels = [1, 2, 4, 8, 16];
  const results = [];

  for (const concurrency of concurrencyLevels) {
    const result = await benchmark.measureFunction(
      `api-calls-concurrency-${concurrency}`,
      async () => {
        const promises = Array.from({ length: concurrency }, () =>
          fetch('/api/test').then(r => r.json())
        );
        return Promise.all(promises);
      },
      10
    );
    
    results.push({
      concurrency,
      averageTime: result.averageTime,
      throughput: result.throughput
    });
  }
  
  return results;
}
```

### 실시간 성능 모니터링

```typescript
class PerformanceMonitor {
  private benchmark = new PerformanceBenchmark();
  private metrics: Map<string, BenchmarkResult[]> = new Map();

  async trackOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const result = await this.benchmark.measureFunction(name, operation, 1);
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const history = this.metrics.get(name)!;
    history.push(result);
    
    // 최근 100개 결과만 유지
    if (history.length > 100) {
      history.shift();
    }
    
    // 성능 저하 감지
    if (history.length >= 10) {
      const recent = history.slice(-10);
      const older = history.slice(-20, -10);
      
      const recentAvg = recent.reduce((sum, r) => sum + r.averageTime, 0) / recent.length;
      const olderAvg = older.reduce((sum, r) => sum + r.averageTime, 0) / older.length;
      
      if (recentAvg > olderAvg * 1.5) {
        console.warn(`Performance degradation detected for ${name}: ${recentAvg}ms vs ${olderAvg}ms`);
      }
    }
    
    return await operation();
  }

  getMetrics(name: string) {
    return this.metrics.get(name) || [];
  }
}
```

## 벤치마크 리포트 생성

```typescript
class BenchmarkReporter {
  static generateReport(results: BenchmarkResult[]): string {
    let report = '# Performance Benchmark Report\n\n';
    
    results.forEach(result => {
      report += `## ${result.name}\n`;
      report += `- **Iterations**: ${result.iterations}\n`;
      report += `- **Average Time**: ${result.averageTime.toFixed(2)}ms\n`;
      report += `- **Min Time**: ${result.minTime.toFixed(2)}ms\n`;
      report += `- **Max Time**: ${result.maxTime.toFixed(2)}ms\n`;
      report += `- **Throughput**: ${result.throughput.toFixed(0)} ops/sec\n`;
      report += `- **Memory Peak**: ${result.memory.peak.toFixed(1)}MB\n\n`;
    });
    
    return report;
  }
  
  static generateCSV(results: BenchmarkResult[]): string {
    const headers = ['name', 'averageTime', 'minTime', 'maxTime', 'throughput', 'memoryPeak'];
    const rows = results.map(r => [
      r.name,
      r.averageTime,
      r.minTime,
      r.maxTime,
      r.throughput,
      r.memory.peak
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}
```

## 성능 최적화 가이드

### 1. 벤치마크 기반 최적화

```typescript
// 최적화 전후 비교
async function optimizeFunction() {
  const original = (data: number[]) => {
    return data.filter(x => x > 0).map(x => x * 2).sort((a, b) => a - b);
  };
  
  const optimized = (data: number[]) => {
    const result = [];
    for (const x of data) {
      if (x > 0) result.push(x * 2);
    }
    return result.sort((a, b) => a - b);
  };
  
  const testData = Array.from({ length: 100000 }, () => Math.random() - 0.5);
  
  const comparison = await benchmark.compareImplementations([
    { name: 'original', fn: original },
    { name: 'optimized', fn: optimized }
  ], testData, 10);
  
  return comparison;
}
```

### 2. 메모리 사용량 최적화

```typescript
// 메모리 효율적인 구현 찾기
const memoryTests = await Promise.all([
  benchmark.measureFunction('array-concat', () => {
    let result = [];
    for (let i = 0; i < 10000; i++) {
      result = result.concat([i]);
    }
    return result;
  }, 3),
  
  benchmark.measureFunction('array-push', () => {
    const result = [];
    for (let i = 0; i < 10000; i++) {
      result.push(i);
    }
    return result;
  }, 3)
]);

// 메모리 사용량 비교
memoryTests.forEach(test => {
  console.log(`${test.name}: ${test.memory.peak}MB`);
});
```

## 모범 사례

1. **충분한 반복 횟수**: 신뢰할 수 있는 결과를 위해 최소 5-10회 반복
2. **워밍업**: JIT 컴파일러 최적화를 위한 사전 실행
3. **격리된 환경**: 다른 프로세스의 영향을 최소화
4. **일관된 조건**: 동일한 하드웨어와 환경에서 측정
5. **통계적 유의성**: 표준편차와 신뢰구간 고려

## 관련 문서

- [Memory Profiler API](./memory-profiler.md)
- [Data Stream API](./data-stream.md)
- [Math Engine API](./math-engine.md)
