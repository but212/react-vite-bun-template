# StatisticsEngine API 참조

대용량 데이터셋의 통계 분석을 위한 전용 엔진입니다. 스트리밍 처리와 온라인 알고리즘을 통해 메모리 효율적인 통계 계산을 제공합니다.

## 주요 특징

- **온라인 알고리즘**: 메모리 효율적인 평균/분산 계산
- **스트리밍 처리**: 대용량 데이터셋을 청크 단위로 처리
- **포괄적 통계**: 기본 통계부터 고급 분석까지 지원
- **분위수 계산**: 정확한 백분위수 및 분위수 계산
- **상관관계 분석**: 두 변수 간의 선형 상관관계 측정
- **히스토그램 생성**: 데이터 분포 시각화를 위한 구간별 빈도

## 기본 사용법

```typescript
import { StatisticsEngine } from '@/lib/utils/statistics-engine';

// 엔진 초기화
const engine = new StatisticsEngine({
  chunkSize: 2048
});

// 샘플 데이터
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 전체 통계 계산
const stats = await engine.statistics(data);
console.log(stats);
// {
//   mean: 5.5,
//   variance: 9.17,
//   stddev: 3.03,
//   min: 1,
//   max: 10,
//   median: 5.5,
//   mode: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
//   count: 10
// }

// 빠른 기본 통계
const basicStats = engine.basicStatistics(data);

// 분위수 계산
const q75 = engine.quantile(data, 0.75); // 75번째 백분위수

// 상관계수 계산
const correlation = engine.correlation([1, 2, 3], [2, 4, 6]); // 1.0

// 히스토그램 생성
const histogram = engine.histogram(data, 5);
```

## API 참조

### StatisticsEngineOptions

```typescript
interface StatisticsEngineOptions {
  chunkSize?: number;  // 청크 크기 (기본값: 1024)
}
```

### StatisticsResult

```typescript
interface StatisticsResult {
  mean: number;      // 평균
  variance: number;  // 분산
  stddev: number;    // 표준편차
  min: number;       // 최솟값
  max: number;       // 최댓값
  median: number;    // 중앙값
  mode: number[];    // 최빈값들
  count: number;     // 데이터 개수
}
```

## 통계 계산 메서드

### `statistics(data: number[]): Promise<StatisticsResult>`

전체 통계를 계산합니다. 대용량 데이터에 최적화된 스트리밍 처리를 사용합니다.

**특징:**

- 온라인 알고리즘으로 메모리 효율적 계산
- 청크 기반 병렬 처리
- 모든 주요 통계 지표 포함

**예시:**

```typescript
const largeData = Array.from({ length: 1000000 }, () => Math.random() * 100);
const stats = await engine.statistics(largeData);

console.log(`평균: ${stats.mean.toFixed(2)}`);
console.log(`표준편차: ${stats.stddev.toFixed(2)}`);
console.log(`범위: ${stats.min} - ${stats.max}`);
```

### `basicStatistics(data: number[]): Omit<StatisticsResult, 'median' | 'mode'>`

기본 통계만 빠르게 계산합니다. 중앙값과 최빈값은 제외됩니다.

**용도:** 빠른 개요가 필요한 경우

**예시:**

```typescript
const quickStats = engine.basicStatistics([1, 2, 3, 4, 5]);
// { mean: 3, variance: 2.5, stddev: 1.58, min: 1, max: 5, count: 5 }
```

### `quantile(data: number[], q: number): number`

지정된 분위수를 계산합니다.

**매개변수:**

- `data`: 데이터 배열
- `q`: 분위수 (0.0 ~ 1.0)

**예시:**

```typescript
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const q25 = engine.quantile(data, 0.25);  // 1사분위수: 3.25
const q50 = engine.quantile(data, 0.50);  // 중앙값: 5.5
const q75 = engine.quantile(data, 0.75);  // 3사분위수: 7.75
const q95 = engine.quantile(data, 0.95);  // 95번째 백분위수: 9.55
```

### `correlation(x: number[], y: number[]): number`

두 변수 간의 피어슨 상관계수를 계산합니다.

**반환값:** -1.0 ~ 1.0 사이의 상관계수

- 1.0: 완전한 양의 상관관계
- 0.0: 상관관계 없음
- -1.0: 완전한 음의 상관관계

**조건:** `x.length === y.length && x.length >= 2`

**예시:**

```typescript
// 완전한 양의 상관관계
const perfect = engine.correlation([1, 2, 3, 4], [2, 4, 6, 8]); // 1.0

// 완전한 음의 상관관계
const negative = engine.correlation([1, 2, 3, 4], [4, 3, 2, 1]); // -1.0

// 상관관계 없음
const random = engine.correlation([1, 3, 2, 4], [2, 1, 4, 3]); // ~0.0
```

### `histogram(data: number[], bins: number = 10): { bins: number[]; counts: number[] }`

데이터의 히스토그램을 생성합니다.

**매개변수:**

- `data`: 데이터 배열
- `bins`: 구간 수 (기본값: 10)

**반환값:**

- `bins`: 각 구간의 시작값들
- `counts`: 각 구간의 빈도

**예시:**

```typescript
const data = [1, 1, 2, 2, 2, 3, 3, 4, 5, 5, 5, 5];
const hist = engine.histogram(data, 5);

console.log('구간:', hist.bins);     // [1, 1.8, 2.6, 3.4, 4.2]
console.log('빈도:', hist.counts);   // [2, 3, 2, 1, 4]

// 시각화 예시
hist.bins.forEach((bin, i) => {
  const count = hist.counts[i] || 0;
  const bar = '█'.repeat(count);
  console.log(`${bin.toFixed(1)}: ${bar} (${count})`);
});
```

## 실제 사용 사례

### 대용량 데이터 분석

```typescript
// 100만 개 데이터 포인트 처리
const bigData = Array.from({ length: 1000000 }, () => 
  Math.random() * 1000 + Math.random() * 100
);

const engine = new StatisticsEngine({ chunkSize: 10000 });
const stats = await engine.statistics(bigData);

console.log(`데이터 포인트: ${stats.count.toLocaleString()}`);
console.log(`평균: ${stats.mean.toFixed(2)}`);
console.log(`표준편차: ${stats.stddev.toFixed(2)}`);
```

### 데이터 품질 검사

```typescript
function analyzeDataQuality(data: number[]) {
  const stats = engine.basicStatistics(data);
  
  // 이상치 탐지 (3-sigma 규칙)
  const outlierThreshold = stats.mean + 3 * stats.stddev;
  const outliers = data.filter(x => Math.abs(x - stats.mean) > outlierThreshold);
  
  // 분포 분석
  const q25 = engine.quantile(data, 0.25);
  const q75 = engine.quantile(data, 0.75);
  const iqr = q75 - q25;
  
  return {
    basic: stats,
    outliers: outliers.length,
    iqr,
    skewness: (stats.mean - stats.median) / stats.stddev
  };
}
```

### A/B 테스트 분석

```typescript
async function compareGroups(groupA: number[], groupB: number[]) {
  const [statsA, statsB] = await Promise.all([
    engine.statistics(groupA),
    engine.statistics(groupB)
  ]);
  
  // 효과 크기 계산 (Cohen's d)
  const pooledStd = Math.sqrt(
    ((groupA.length - 1) * statsA.variance + (groupB.length - 1) * statsB.variance) /
    (groupA.length + groupB.length - 2)
  );
  
  const effectSize = (statsA.mean - statsB.mean) / pooledStd;
  
  return {
    groupA: statsA,
    groupB: statsB,
    difference: statsA.mean - statsB.mean,
    effectSize,
    interpretation: Math.abs(effectSize) > 0.8 ? 'Large' : 
                   Math.abs(effectSize) > 0.5 ? 'Medium' : 'Small'
  };
}
```

### 시계열 데이터 분석

```typescript
function analyzeTimeSeries(values: number[], timestamps: number[]) {
  // 기본 통계
  const stats = engine.basicStatistics(values);
  
  // 트렌드 분석 (시간과 값의 상관관계)
  const trend = engine.correlation(timestamps, values);
  
  // 변동성 분석
  const returns = values.slice(1).map((val, i) => 
    (val - values[i]) / values[i]
  );
  const volatility = engine.basicStatistics(returns).stddev;
  
  // 분포 분석
  const histogram = engine.histogram(values, 20);
  
  return {
    summary: stats,
    trend: trend > 0.1 ? 'Increasing' : trend < -0.1 ? 'Decreasing' : 'Stable',
    volatility,
    distribution: histogram
  };
}
```

## 오류 처리

```typescript
try {
  // 빈 데이터셋 오류
  const emptyStats = await engine.statistics([]);
} catch (error) {
  console.error('빈 데이터셋입니다');
}

try {
  // 잘못된 분위수 오류
  const invalidQuantile = engine.quantile([1, 2, 3], 1.5);
} catch (error) {
  console.error('분위수는 0과 1 사이여야 합니다');
}

try {
  // 길이 불일치 오류
  const correlation = engine.correlation([1, 2], [1, 2, 3]);
} catch (error) {
  console.error('두 데이터셋의 길이가 같아야 합니다');
}
```

## 성능 최적화

### 청크 크기 조정

```typescript
// 메모리 제한 환경
const memoryOptimized = new StatisticsEngine({ chunkSize: 512 });

// 고성능 환경
const performanceOptimized = new StatisticsEngine({ chunkSize: 8192 });
```

### 적절한 메서드 선택

```typescript
// 빠른 개요만 필요한 경우
const quick = engine.basicStatistics(data);

// 전체 분석이 필요한 경우
const complete = await engine.statistics(data);

// 특정 분위수만 필요한 경우
const median = engine.quantile(data, 0.5);
```

## 타입 정의

```typescript
// 히스토그램 결과
interface HistogramResult {
  bins: number[];     // 구간 시작값들
  counts: number[];   // 각 구간의 빈도
}

// 기본 통계 결과 (중앙값, 최빈값 제외)
type BasicStatistics = Omit<StatisticsResult, 'median' | 'mode'>;
```
