# Math Engine API Reference

고성능 수학 연산을 위한 통합 엔진입니다. 벡터, 행렬, 통계 연산을 하나의 인터페이스로 제공합니다.

## 개요

MathEngine은 벡터 연산, 행렬 연산, 통계 계산을 통합하여 제공하는 고성능 수학 라이브러리입니다. 내부적으로 전문화된 엔진들(VectorEngine, MatrixEngine, StatisticsEngine)을 조합하여 최적의 성능을 제공합니다.

## 주요 기능

- **벡터 연산**: 고속 벡터 덧셈, 내적, 크기 계산, 정규화
- **행렬 연산**: 행렬 곱셈, 덧셈, 전치, 행렬식 계산
- **통계 연산**: 평균, 분산, 중앙값, 상관관계 분석
- **성능 최적화**: SIMD 지원, GPU 가속, 적응형 정밀도
- **메모리 관리**: 캐싱 전략, 청크 기반 처리

## 기본 사용법

```typescript
import { MathEngine } from '@/lib/utils/math-engine';

// 엔진 생성
const mathEngine = new MathEngine({
  precision: 'float64',
  cacheSize: 10000,
  enableSIMD: true,
  enableGPU: true
});

// 벡터 연산
const vector1 = mathEngine.vectorFromArray([1, 2, 3]);
const vector2 = mathEngine.vectorFromArray([4, 5, 6]);
const dotProduct = await mathEngine.dotProduct(vector1, vector2); // 32

// 행렬 연산
const matrix1 = mathEngine.createMatrix([1, 2, 3, 4], 2, 2);
const matrix2 = mathEngine.createMatrix([5, 6, 7, 8], 2, 2);
const result = await mathEngine.multiplyMatrices(matrix1, matrix2);

// 통계 연산
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const stats = await mathEngine.statistics(data);
console.log(stats.mean); // 5.5
```

## API 참조

### 생성자 옵션

#### `MathEngineOptions`

```typescript
interface MathEngineOptions {
  precision?: 'float32' | 'float64' | 'adaptive';  // 계산 정밀도
  cacheSize?: number;                              // 캐시 크기 (기본값: 5000)
  chunkSize?: number;                              // 청크 크기
  enableSIMD?: boolean;                            // SIMD 최적화 활성화
  enableGPU?: boolean;                             // GPU 가속 활성화
}
```

### 벡터 연산

#### `fastSqrt(x: number): number`

고속 제곱근 계산 (Newton-Raphson 방법 사용).

#### `fastPow(base: number, exp: number): number`

고속 거듭제곱 계산 (지수 분해 방법 사용).

#### `createVector(length: number): Vector`

지정된 길이의 영벡터를 생성합니다.

#### `vectorFromArray(data: number[]): Vector`

배열에서 벡터를 생성합니다.

#### `addVectors(a: Vector, b: Vector): Promise<Vector>`

두 벡터를 더합니다.

**예제:**

```typescript
const v1 = mathEngine.vectorFromArray([1, 2, 3]);
const v2 = mathEngine.vectorFromArray([4, 5, 6]);
const sum = await mathEngine.addVectors(v1, v2); // [5, 7, 9]
```

#### `dotProduct(a: Vector, b: Vector): Promise<number>`

두 벡터의 내적을 계산합니다.

#### `magnitude(vector: Vector): number`

벡터의 크기(노름)를 계산합니다.

#### `normalize(vector: Vector): Vector`

벡터를 정규화합니다 (단위벡터로 변환).

### 행렬 연산

#### `createMatrix(data: number[], rows: number, cols: number, precision?: 'float32' | 'float64'): Matrix`

데이터 배열에서 행렬을 생성합니다.

**예제:**

```typescript
// 2x2 행렬 생성
const matrix = mathEngine.createMatrix([1, 2, 3, 4], 2, 2);
// [[1, 2],
//  [3, 4]]
```

#### `createEmptyMatrix(rows: number, cols: number): Matrix`

영행렬을 생성합니다.

#### `createIdentityMatrix(size: number): Matrix`

단위행렬을 생성합니다.

#### `multiplyMatrices(a: Matrix, b: Matrix): Promise<Matrix>`

두 행렬을 곱합니다.

**예제:**

```typescript
const a = mathEngine.createMatrix([1, 2, 3, 4], 2, 2);
const b = mathEngine.createMatrix([5, 6, 7, 8], 2, 2);
const product = await mathEngine.multiplyMatrices(a, b);
// [[19, 22],
//  [43, 50]]
```

#### `addMatrices(a: Matrix, b: Matrix): Promise<Matrix>`

두 행렬을 더합니다.

#### `transpose(matrix: Matrix): Matrix`

행렬을 전치합니다.

#### `determinant(matrix: Matrix): number`

정사각행렬의 행렬식을 계산합니다.

### 통계 연산

#### `statistics(data: number[]): Promise<StatisticsResult>`

데이터의 종합적인 통계 정보를 계산합니다.

**반환값:**

```typescript
interface StatisticsResult {
  mean: number;      // 평균
  median: number;    // 중앙값
  mode: number[];    // 최빈값들
  variance: number;  // 분산
  stdDev: number;    // 표준편차
  min: number;       // 최솟값
  max: number;       // 최댓값
  count: number;     // 데이터 개수
}
```

#### `basicStatistics(data: number[]): Omit<StatisticsResult, 'median' | 'mode'>`

기본 통계 정보를 빠르게 계산합니다 (중앙값, 최빈값 제외).

#### `quantile(data: number[], q: number): number`

분위수를 계산합니다.

**예제:**

```typescript
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const q1 = mathEngine.quantile(data, 0.25); // 1사분위수
const median = mathEngine.quantile(data, 0.5); // 중앙값
const q3 = mathEngine.quantile(data, 0.75); // 3사분위수
```

#### `correlation(x: number[], y: number[]): number`

두 데이터 세트 간의 피어슨 상관계수를 계산합니다.

#### `histogram(data: number[], bins: number = 10): { bins: number[], counts: number[] }`

히스토그램을 생성합니다.

## 고급 사용법

### 성능 최적화

```typescript
// 고성능 설정
const highPerformanceEngine = new MathEngine({
  precision: 'float32',    // 더 빠른 계산
  cacheSize: 50000,        // 큰 캐시
  chunkSize: 10000,        // 큰 청크
  enableSIMD: true,        // SIMD 최적화
  enableGPU: true          // GPU 가속
});

// 메모리 효율적 설정
const memoryEfficientEngine = new MathEngine({
  precision: 'adaptive',   // 적응형 정밀도
  cacheSize: 1000,         // 작은 캐시
  chunkSize: 1000,         // 작은 청크
  enableSIMD: false,       // SIMD 비활성화
  enableGPU: false         // GPU 비활성화
});
```

### 대용량 데이터 처리

```typescript
// 대용량 벡터 연산
const largeVector1 = mathEngine.createVector(1000000);
const largeVector2 = mathEngine.createVector(1000000);

// 청크 단위로 처리되어 메모리 효율적
const result = await mathEngine.addVectors(largeVector1, largeVector2);

// 대용량 통계 분석
const bigData = new Array(1000000).fill(0).map(() => Math.random());
const stats = await mathEngine.statistics(bigData);
```

### 복합 연산 예제

```typescript
// 머신러닝 기본 연산
async function linearRegression(X: number[][], y: number[]) {
  const engine = new MathEngine({ precision: 'float64' });
  
  // X를 행렬로 변환
  const xMatrix = engine.createMatrix(X.flat(), X.length, X[0].length);
  
  // X^T 계산
  const xTranspose = engine.transpose(xMatrix);
  
  // X^T * X 계산
  const xtx = await engine.multiplyMatrices(xTranspose, xMatrix);
  
  // y 벡터 생성
  const yVector = engine.vectorFromArray(y);
  
  // 계수 계산 로직...
  return { coefficients: [], rSquared: 0 };
}

// 데이터 분석 파이프라인
async function analyzeDataset(data: number[][]) {
  const engine = new MathEngine();
  
  const results = await Promise.all(
    data.map(async (column, index) => {
      const stats = await engine.statistics(column);
      return {
        column: index,
        ...stats,
        histogram: engine.histogram(column, 20)
      };
    })
  );
  
  // 상관관계 매트릭스 계산
  const correlations = [];
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const corr = engine.correlation(data[i], data[j]);
      correlations.push({ i, j, correlation: corr });
    }
  }
  
  return { columnStats: results, correlations };
}
```

### 엔진 정보 및 디버깅

#### `getEngineInfo(): { vectorEngine, matrixEngine, statisticsEngine }`

내부 엔진들의 상태 정보를 반환합니다.

**예제:**

```typescript
const info = mathEngine.getEngineInfo();
console.log('Vector cache size:', info.vectorEngine.getCacheSize());
console.log('Matrix precision:', info.matrixEngine.getPrecision());
console.log('Statistics chunk size:', info.statisticsEngine.getChunkSize());
```

## 타입 정의

### Vector

```typescript
interface Vector {
  data: Float32Array | Float64Array;
  length: number;
}
```

### Matrix

```typescript
interface Matrix {
  data: Float32Array | Float64Array;
  rows: number;
  cols: number;
  precision: 'float32' | 'float64';
}
```

### StatisticsResult

```typescript
interface StatisticsResult {
  mean: number;
  median: number;
  mode: number[];
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
}
```

## 성능 벤치마크

### 벡터 연산 성능

| 연산 | 크기 | 시간 (ms) | 처리량 (ops/sec) |
|-------|------|-----------|------------------|
|  덧셈  | 10K | 0.5 | 20M |
|  내적  | 10K | 0.3 | 33M |
| 정규화 | 10K | 0.8 | 12.5M |

### 행렬 연산 성능

| 연산 | 크기 | 시간 (ms) | 메모리 (MB) |
|------|------|-----------|-------------|
| 곱셈 | 100x100 | 2.1 | 0.4 |
| 곱셈 | 500x500 | 125 | 9.5 |
| 곱셈 | 1000x1000 | 980 | 38 |

## 모범 사례

### 1. 적절한 정밀도 선택

```typescript
// 과학 계산: 높은 정밀도
const scientificEngine = new MathEngine({ precision: 'float64' });

// 게임/그래픽스: 빠른 계산
const gameEngine = new MathEngine({ precision: 'float32' });

// 일반적인 용도: 적응형
const generalEngine = new MathEngine({ precision: 'adaptive' });
```

### 2. 메모리 관리

```typescript
// 대용량 데이터 처리 시 청크 크기 조정
const bigDataEngine = new MathEngine({
  chunkSize: 50000,  // 큰 청크로 처리 효율성 향상
  cacheSize: 100000  // 충분한 캐시 공간 확보
});
```

### 3. 에러 처리

```typescript
try {
  const result = await mathEngine.multiplyMatrices(a, b);
} catch (error) {
  if (error.message.includes('dimension mismatch')) {
    console.error('행렬 차원이 맞지 않습니다');
  } else {
    console.error('행렬 연산 실패:', error);
  }
}
```

## 관련 문서

- [Vector Engine API](./vector-engine.md)
- [Matrix Engine API](./matrix-engine.md)
- [Statistics Engine API](./statistics-engine.md)
- [Performance Benchmark API](./performance-benchmark.md)
