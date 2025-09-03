# Memory Profiler API Reference

메모리 사용량 모니터링 및 프로파일링을 위한 도구입니다.

## 개요

Memory Profiler는 애플리케이션의 메모리 사용 패턴을 분석하고 메모리 누수를 감지하는 도구입니다. 실시간 모니터링과 상세한 메모리 분석 리포트를 제공합니다.

## 주요 기능

- **실시간 메모리 모니터링**: 힙 사용량, RSS 메모리 추적
- **메모리 누수 감지**: 비정상적인 메모리 증가 패턴 탐지
- **가비지 컬렉션 분석**: GC 이벤트와 성능 영향 분석
- **메모리 스냅샷**: 특정 시점의 메모리 상태 캡처
- **임계값 알림**: 메모리 사용량이 임계값을 초과할 때 알림

## 기본 사용법

```typescript
import { MemoryProfiler } from '@/lib/utils/memory-profiler';

const profiler = new MemoryProfiler({
  sampleInterval: 1000, // 1초마다 샘플링
  maxSamples: 1000, // 최대 1000개 샘플 저장
  thresholds: {
    warning: 100 * 1024 * 1024, // 100MB 경고
    critical: 500 * 1024 * 1024, // 500MB 위험
  },
});

// 프로파일링 시작
profiler.start();

// 메모리 집약적 작업 실행
await performMemoryIntensiveTask();

// 프로파일링 중지 및 결과 분석
const report = profiler.stop();
console.log('메모리 피크:', report.peak);
console.log('평균 사용량:', report.average);
```

## API 참조

### MemoryProfiler 클래스

#### 생성자 옵션

```typescript
interface MemoryProfilerOptions {
  sampleInterval?: number; // 샘플링 간격 (ms)
  maxSamples?: number; // 최대 샘플 수
  thresholds?: {
    warning?: number; // 경고 임계값 (bytes)
    critical?: number; // 위험 임계값 (bytes)
  };
  onThresholdExceeded?: (level: 'warning' | 'critical', usage: MemoryUsage) => void;
}
```

#### 주요 메서드

##### `start(): void`

메모리 프로파일링을 시작합니다.

##### `stop(): MemoryReport`

프로파일링을 중지하고 분석 결과를 반환합니다.

```typescript
interface MemoryReport {
  duration: number; // 프로파일링 기간 (ms)
  samples: MemoryUsage[]; // 메모리 샘플들
  peak: MemoryUsage; // 최대 메모리 사용량
  average: MemoryUsage; // 평균 메모리 사용량
  leakDetection: LeakAnalysis; // 메모리 누수 분석
  gcEvents: GCEvent[]; // 가비지 컬렉션 이벤트
}
```

##### `takeSnapshot(): MemorySnapshot`

현재 메모리 상태의 스냅샷을 생성합니다.

##### `detectLeaks(): LeakAnalysis`

메모리 누수 패턴을 분석합니다.

## 고급 사용법

### 메모리 누수 감지

```typescript
const profiler = new MemoryProfiler({
  sampleInterval: 500,
  onThresholdExceeded: (level, usage) => {
    console.warn(`메모리 ${level} 임계값 초과:`, usage.heapUsed);

    if (level === 'critical') {
      // 긴급 조치: 가비지 컬렉션 강제 실행
      if (global.gc) {
        global.gc();
      }
    }
  },
});

// 의심스러운 코드 블록 모니터링
profiler.start();

for (let i = 0; i < 1000; i++) {
  // 메모리 누수가 의심되는 작업
  await processLargeData();
}

const report = profiler.stop();

if (report.leakDetection.isLeaking) {
  console.error('메모리 누수 감지됨!');
  console.error('누수율:', report.leakDetection.leakRate, 'MB/s');
}
```

### 함수별 메모리 사용량 측정

```typescript
async function profileFunction<T>(
  fn: () => Promise<T>,
  name: string
): Promise<{ result: T; memoryUsage: MemoryUsage }> {
  const profiler = new MemoryProfiler();

  profiler.start();
  const result = await fn();
  const report = profiler.stop();

  console.log(`${name} 메모리 사용량:`, {
    peak: report.peak.heapUsed,
    average: report.average.heapUsed,
    duration: report.duration,
  });

  return { result, memoryUsage: report.peak };
}

// 사용 예제
const { result, memoryUsage } = await profileFunction(async () => {
  const largeArray = new Array(1000000).fill(0);
  return largeArray.map(x => x * 2);
}, 'large-array-processing');
```

### 메모리 사용량 비교

```typescript
class MemoryComparator {
  async compareImplementations<T>(implementations: Array<{ name: string; fn: () => Promise<T> }>) {
    const results = [];

    for (const impl of implementations) {
      // 가비지 컬렉션으로 초기 상태 정리
      if (global.gc) global.gc();

      const profiler = new MemoryProfiler();
      profiler.start();

      await impl.fn();

      const report = profiler.stop();
      results.push({
        name: impl.name,
        peakMemory: report.peak.heapUsed,
        averageMemory: report.average.heapUsed,
        duration: report.duration,
      });
    }

    return results.sort((a, b) => a.peakMemory - b.peakMemory);
  }
}

// 사용 예제
const comparator = new MemoryComparator();
const results = await comparator.compareImplementations([
  {
    name: 'array-concat',
    fn: async () => {
      let result = [];
      for (let i = 0; i < 100000; i++) {
        result = result.concat([i]);
      }
      return result;
    },
  },
  {
    name: 'array-push',
    fn: async () => {
      const result = [];
      for (let i = 0; i < 100000; i++) {
        result.push(i);
      }
      return result;
    },
  },
]);
```

### 장기간 메모리 모니터링

```typescript
class LongTermMemoryMonitor {
  private profiler: MemoryProfiler;
  private reports: MemoryReport[] = [];

  constructor() {
    this.profiler = new MemoryProfiler({
      sampleInterval: 5000, // 5초마다
      maxSamples: 720, // 1시간분 데이터
      onThresholdExceeded: (level, usage) => {
        this.handleThresholdExceeded(level, usage);
      },
    });
  }

  start() {
    this.profiler.start();

    // 1시간마다 리포트 생성
    setInterval(
      () => {
        const report = this.profiler.stop();
        this.reports.push(report);
        this.analyzeReport(report);
        this.profiler.start(); // 재시작
      },
      60 * 60 * 1000
    );
  }

  private analyzeReport(report: MemoryReport) {
    // 메모리 사용량 트렌드 분석
    if (this.reports.length >= 3) {
      const recent = this.reports.slice(-3);
      const trend = this.calculateTrend(recent);

      if (trend > 0.1) {
        // 10% 이상 증가 트렌드
        console.warn('메모리 사용량 증가 트렌드 감지');
      }
    }
  }

  private calculateTrend(reports: MemoryReport[]): number {
    const averages = reports.map(r => r.average.heapUsed);
    const first = averages[0];
    const last = averages[averages.length - 1];
    return (last - first) / first;
  }
}
```

## 실제 사용 사례

### 웹 서버 메모리 모니터링

```typescript
// Express.js 미들웨어
function memoryMonitoringMiddleware() {
  const profiler = new MemoryProfiler({
    sampleInterval: 1000,
    thresholds: {
      warning: 200 * 1024 * 1024, // 200MB
      critical: 400 * 1024 * 1024, // 400MB
    },
  });

  return (req: Request, res: Response, next: NextFunction) => {
    const requestProfiler = new MemoryProfiler();
    requestProfiler.start();

    res.on('finish', () => {
      const report = requestProfiler.stop();

      if (report.peak.heapUsed > 50 * 1024 * 1024) {
        // 50MB 이상
        console.warn(`High memory request: ${req.path}`, {
          peak: report.peak.heapUsed,
          duration: report.duration,
        });
      }
    });

    next();
  };
}
```

### 배치 작업 메모리 관리

```typescript
async function processBatchWithMemoryControl<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  batchSize: number = 100
) {
  const profiler = new MemoryProfiler({
    thresholds: {
      warning: 300 * 1024 * 1024, // 300MB
    },
    onThresholdExceeded: () => {
      // 메모리 압박 시 가비지 컬렉션 실행
      if (global.gc) global.gc();
    },
  });

  profiler.start();

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    await Promise.all(batch.map(processor));

    // 배치마다 메모리 체크
    const snapshot = profiler.takeSnapshot();
    if (snapshot.heapUsed > 250 * 1024 * 1024) {
      // 250MB 초과 시
      console.log('메모리 정리 실행...');
      if (global.gc) global.gc();

      // 잠시 대기하여 GC가 완료되도록 함
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const report = profiler.stop();
  return report;
}
```

## 타입 정의

### MemoryUsage

```typescript
interface MemoryUsage {
  rss: number; // Resident Set Size
  heapTotal: number; // 할당된 힙 메모리
  heapUsed: number; // 사용 중인 힙 메모리
  external: number; // V8 외부 메모리
  arrayBuffers: number; // ArrayBuffer 메모리
}
```

### LeakAnalysis

```typescript
interface LeakAnalysis {
  isLeaking: boolean; // 누수 여부
  leakRate: number; // 누수율 (MB/s)
  confidence: number; // 신뢰도 (0-1)
  suspiciousPatterns: string[]; // 의심스러운 패턴들
}
```

### GCEvent

```typescript
interface GCEvent {
  timestamp: number; // 발생 시간
  type: string; // GC 타입
  duration: number; // 소요 시간 (ms)
  memoryBefore: number; // GC 전 메모리
  memoryAfter: number; // GC 후 메모리
}
```

## 모범 사례

1. **적절한 샘플링 간격**: 너무 짧으면 오버헤드, 너무 길면 정확도 저하
2. **임계값 설정**: 애플리케이션 특성에 맞는 적절한 임계값 설정
3. **정기적인 모니터링**: 장기간 실행되는 애플리케이션의 메모리 패턴 추적
4. **가비지 컬렉션 최적화**: GC 이벤트 분석을 통한 성능 최적화
5. **메모리 누수 조기 감지**: 작은 누수라도 조기에 발견하여 대응

## 관련 문서

- [Performance Benchmark API](./performance-benchmark.md)
- [Data Stream API](./data-stream.md)
- [Async Utilities API](./async.md)
