# DataStream API Reference

대용량 데이터 배열을 청크 단위로 효율적으로 처리하기 위한 DataStream 유틸리티 클래스입니다.

## 개요

DataStream은 메모리 효율적인 대용량 데이터 처리를 위한 고성능 스트리밍 유틸리티입니다. 비동기 청크 처리, 백프레셔 제어, 재시도 전략, 함수형 체이닝 등 실무에서 필요한 모든 기능을 제공합니다.

## 주요 기능

- **청크 기반 처리**: 메모리 사용량을 제어하면서 대용량 데이터 처리
- **동시성 제어**: 병렬 처리 수준을 조절하여 시스템 리소스 최적화
- **백프레셔 제어**: 메모리 압박 상황에서 자동으로 처리 속도 조절
- **재시도 전략**: 실패한 청크에 대한 지능적인 재시도 메커니즘
- **진행률 추적**: 실시간 처리 상황 모니터링
- **함수형 체이닝**: map, filter, reduce 등의 함수형 연산 지원

## 기본 사용법

```typescript
import { DataStream } from '@/lib/utils/data-stream';

// 기본 스트림 생성
const stream = new DataStream({
  chunkSize: 1000,
  concurrency: 4,
  onProgress: (progress, processed, total) => {
    console.log(`${(progress * 100).toFixed(1)}% 완료`);
  },
});

// 데이터 처리
const result = await stream.process(largeDataArray, async chunk => {
  return chunk.map(item => processItem(item));
});
```

## API 참조

### DataStreamOptions

스트림 동작을 제어하는 옵션 인터페이스입니다.

```typescript
interface DataStreamOptions {
  chunkSize?: number; // 청크 크기 (기본값: 1000)
  concurrency?: number; // 동시 처리 수준 (기본값: 4)
  onProgress?: ProgressCallback; // 진행률 콜백
  retryStrategy?: RetryStrategy; // 재시도 전략
  concurrencyStrategy?: ConcurrencyStrategy; // 동시성 전략
  memoryThreshold?: number; // 메모리 임계값 (MB)
  enableBackpressure?: boolean; // 백프레셔 활성화
}
```

### 주요 메서드

#### `process<T, R>(data: T[], processor: ChunkProcessor<T, R>): Promise<ProcessResult<R>>`

데이터 배열을 청크 단위로 처리합니다.

**매개변수:**

- `data`: 처리할 데이터 배열
- `processor`: 각 청크를 처리하는 비동기 함수

**반환값:**

- `ProcessResult<R>`: 처리 결과와 메타데이터

**예제:**

```typescript
const result = await stream.process(users, async userChunk => {
  return await Promise.all(userChunk.map(user => updateUserProfile(user)));
});

console.log(`처리된 아이템: ${result.totalProcessed}`);
console.log(`처리 시간: ${result.metrics.totalTime}ms`);
```

#### `chain<T>(data: T[]): StreamChain<T>`

함수형 체이닝을 위한 스트림 체인을 생성합니다.

**예제:**

```typescript
const processedData = await stream
  .chain(rawData)
  .filter(item => item.isValid)
  .map(item => ({
    ...item,
    processed: true,
    timestamp: Date.now(),
  }))
  .reduce((acc, item) => acc + item.value, 0);
```

### StreamChain 메서드

#### `map<U>(fn: (item: T) => U): StreamChain<U>`

각 아이템을 변환합니다.

#### `filter(predicate: (item: T) => boolean): StreamChain<T>`

조건에 맞는 아이템만 필터링합니다.

#### `reduce<U>(reducer: (acc: U, item: T) => U, initialValue: U): Promise<U>`

모든 아이템을 하나의 값으로 축약합니다.

#### `forEach(fn: (item: T) => void): Promise<void>`

각 아이템에 대해 부수 효과를 실행합니다.

#### `collect(): Promise<T[]>`

모든 변환된 아이템을 배열로 수집합니다.

## 고급 사용법

### 백프레셔 제어

```typescript
import { AdaptiveConcurrencyStrategy } from '@/lib/utils/data-stream';

const stream = new DataStream({
  enableBackpressure: true,
  memoryThreshold: 512, // 512MB
  concurrencyStrategy: new AdaptiveConcurrencyStrategy(8, 1024),
  onProgress: (progress, processed, total) => {
    console.log(`메모리 사용량 모니터링: ${progress * 100}%`);
  },
});
```

### 재시도 전략

```typescript
import { ExponentialBackoffRetryStrategy } from '@/lib/utils/retry-strategy';

const stream = new DataStream({
  retryStrategy: new ExponentialBackoffRetryStrategy(3, 1000, 2),
  onProgress: (progress, processed, total) => {
    if (progress < 1.0) {
      console.log(`재시도 중... ${processed}/${total}`);
    }
  },
});
```

### 복잡한 데이터 파이프라인

```typescript
// 대용량 로그 파일 처리 예제
const logProcessor = new DataStream({
  chunkSize: 5000,
  concurrency: 6,
  enableBackpressure: true,
});

const analytics = await logProcessor
  .chain(logEntries)
  .filter(entry => entry.level === 'ERROR')
  .map(entry => ({
    timestamp: new Date(entry.timestamp),
    message: entry.message,
    userId: extractUserId(entry.context),
  }))
  .reduce(
    (stats, entry) => {
      stats.errorCount++;
      stats.userErrors[entry.userId] = (stats.userErrors[entry.userId] || 0) + 1;
      return stats;
    },
    { errorCount: 0, userErrors: {} }
  );
```

## 성능 최적화

### 청크 크기 조정

```typescript
// 메모리 제약이 있는 환경
const memoryConstrainedStream = new DataStream({
  chunkSize: 100,
  concurrency: 2,
});

// 고성능 서버 환경
const highPerformanceStream = new DataStream({
  chunkSize: 10000,
  concurrency: 16,
});
```

### 메모리 사용량 모니터링

```typescript
const stream = new DataStream({
  onProgress: (progress, processed, total) => {
    const memoryUsage = process.memoryUsage();
    console.log(`진행률: ${(progress * 100).toFixed(1)}%`);
    console.log(`메모리 사용량: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
  },
});
```

## 에러 처리

```typescript
try {
  const result = await stream.process(data, async chunk => {
    // 일부 청크에서 실패할 수 있는 처리
    return await riskyProcessing(chunk);
  });

  if (result.errors.length > 0) {
    console.warn(`${result.errors.length}개 청크 처리 실패`);
    result.errors.forEach(error => {
      console.error(`청크 ${error.chunkIndex} 실패:`, error.error);
    });
  }
} catch (error) {
  console.error('스트림 처리 중 치명적 오류:', error);
}
```

## 타입 정의

### ProcessResult\<R\>

```typescript
interface ProcessResult<R> {
  results: R[];
  totalProcessed: number;
  errors: ChunkError[];
  metrics: StreamMetrics;
}
```

### StreamMetrics

```typescript
interface StreamMetrics {
  totalTime: number;
  averageChunkTime: number;
  throughput: number;
  memoryPeak: number;
  retryCount: number;
}
```

### ChunkError

```typescript
interface ChunkError {
  chunkIndex: number;
  error: Error;
  retryCount: number;
}
```

## 모범 사례

1. **적절한 청크 크기 선택**: 메모리와 성능의 균형을 고려
2. **백프레셔 활용**: 메모리 제약이 있는 환경에서 필수
3. **진행률 모니터링**: 사용자 경험 향상을 위한 실시간 피드백
4. **에러 처리**: 부분 실패에 대한 적절한 대응 전략 수립
5. **재시도 전략**: 네트워크 불안정성을 고려한 재시도 로직

## 관련 문서

- [Retry Strategy API](./retry-strategy.md)
- [Cache Strategy API](./cache-strategy.md)
- [Performance Benchmark API](./performance-benchmark.md)
