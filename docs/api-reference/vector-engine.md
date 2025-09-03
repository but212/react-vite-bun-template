# Vector Engine API Reference

고성능 벡터 연산을 위한 전문화된 엔진입니다.

## 개요

Vector Engine은 수치 계산에서 핵심적인 벡터 연산들을 최적화된 방식으로 제공합니다. SIMD 명령어 활용, 메모리 효율적인 처리, 캐싱 전략을 통해 고성능을 달성합니다.

## 주요 기능

- **기본 벡터 연산**: 덧셈, 뺄셈, 스칼라 곱셈
- **고급 연산**: 내적, 외적, 벡터 크기 계산
- **정규화**: 단위벡터 변환
- **SIMD 최적화**: 병렬 처리를 통한 성능 향상
- **메모리 관리**: 효율적인 메모리 할당과 재사용

## 기본 사용법

```typescript
import { VectorEngine } from '@/lib/utils/vector-engine';

const engine = new VectorEngine({
  precision: 'float64',
  cacheSize: 1000,
  enableSIMD: true
});

// 벡터 생성
const v1 = engine.vectorFromArray([1, 2, 3]);
const v2 = engine.vectorFromArray([4, 5, 6]);

// 벡터 덧셈
const sum = await engine.addVectors(v1, v2); // [5, 7, 9]

// 내적 계산
const dot = await engine.dotProduct(v1, v2); // 32

// 벡터 크기
const magnitude = engine.magnitude(v1); // √14 ≈ 3.74

// 정규화
const normalized = engine.normalize(v1); // 단위벡터
```

## API 참조

### VectorEngineOptions - API 참조

```typescript
interface VectorEngineOptions {
  precision?: 'float32' | 'float64';  // 계산 정밀도
  cacheSize?: number;                 // 캐시 크기
  chunkSize?: number;                 // 청크 크기
  enableSIMD?: boolean;               // SIMD 최적화
}
```

### 벡터 생성

#### `createVector(length: number): Vector`

지정된 길이의 영벡터를 생성합니다.

#### `vectorFromArray(data: number[]): Vector`

배열에서 벡터를 생성합니다.

#### `createRandomVector(length: number, min?: number, max?: number): Vector`

랜덤 벡터를 생성합니다.

### 기본 연산

#### `addVectors(a: Vector, b: Vector): Promise<Vector>`

두 벡터를 더합니다.

#### `subtractVectors(a: Vector, b: Vector): Promise<Vector>`

벡터 뺄셈을 수행합니다.

#### `scalarMultiply(vector: Vector, scalar: number): Vector`

벡터에 스칼라를 곱합니다.

### 고급 연산

#### `dotProduct(a: Vector, b: Vector): Promise<number>`

두 벡터의 내적을 계산합니다.

#### `crossProduct(a: Vector, b: Vector): Vector`

3차원 벡터의 외적을 계산합니다.

#### `magnitude(vector: Vector): number`

벡터의 크기(노름)를 계산합니다.

#### `normalize(vector: Vector): Vector`

벡터를 정규화하여 단위벡터로 만듭니다.

## 고급 사용법

### 대용량 벡터 처리

```typescript
// 백만 개 요소를 가진 벡터 처리
const largeEngine = new VectorEngine({
  precision: 'float32',
  chunkSize: 100000,
  enableSIMD: true
});

const bigVector1 = largeEngine.createRandomVector(1000000);
const bigVector2 = largeEngine.createRandomVector(1000000);

// 청크 단위로 처리되어 메모리 효율적
const result = await largeEngine.addVectors(bigVector1, bigVector2);
```

### 벡터 연산 체이닝

```typescript
class VectorCalculator {
  constructor(private engine: VectorEngine) {}

  async calculateWeightedSum(
    vectors: Vector[],
    weights: number[]
  ): Promise<Vector> {
    let result = this.engine.createVector(vectors[0].length);
    
    for (let i = 0; i < vectors.length; i++) {
      const weighted = this.engine.scalarMultiply(vectors[i], weights[i]);
      result = await this.engine.addVectors(result, weighted);
    }
    
    return result;
  }

  async calculateCosineDistance(a: Vector, b: Vector): Promise<number> {
    const normA = this.engine.normalize(a);
    const normB = this.engine.normalize(b);
    const dot = await this.engine.dotProduct(normA, normB);
    return 1 - dot; // 코사인 거리
  }
}
```

### 머신러닝 벡터 연산

```typescript
// k-means 클러스터링에서 사용되는 벡터 연산
class KMeansVectorOps {
  constructor(private engine: VectorEngine) {}

  async calculateCentroid(points: Vector[]): Promise<Vector> {
    if (points.length === 0) {
      throw new Error('빈 점 집합입니다');
    }

    let sum = this.engine.createVector(points[0].length);
    
    for (const point of points) {
      sum = await this.engine.addVectors(sum, point);
    }
    
    return this.engine.scalarMultiply(sum, 1 / points.length);
  }

  async findNearestCentroid(
    point: Vector,
    centroids: Vector[]
  ): Promise<{ index: number; distance: number }> {
    let minDistance = Infinity;
    let nearestIndex = 0;

    for (let i = 0; i < centroids.length; i++) {
      const diff = await this.engine.subtractVectors(point, centroids[i]);
      const distance = this.engine.magnitude(diff);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    return { index: nearestIndex, distance: minDistance };
  }
}
```

## 성능 최적화

### SIMD 활용

```typescript
// SIMD 최적화 활성화
const optimizedEngine = new VectorEngine({
  enableSIMD: true,
  precision: 'float32' // SIMD는 float32에서 더 효과적
});

// 대용량 벡터 연산에서 성능 향상 확인
const performanceTest = async () => {
  const size = 1000000;
  const v1 = optimizedEngine.createRandomVector(size);
  const v2 = optimizedEngine.createRandomVector(size);
  
  const start = performance.now();
  await optimizedEngine.dotProduct(v1, v2);
  const end = performance.now();
  
  console.log(`SIMD 내적 계산 시간: ${end - start}ms`);
};
```

### 메모리 효율성

```typescript
// 메모리 사용량 최적화
const memoryEfficientEngine = new VectorEngine({
  precision: 'float32',  // 메모리 사용량 절반
  cacheSize: 500,        // 적절한 캐시 크기
  chunkSize: 10000       // 청크 기반 처리
});

// 인플레이스 연산으로 메모리 절약
class InPlaceVectorOps {
  static addInPlace(target: Vector, source: Vector): void {
    for (let i = 0; i < target.length; i++) {
      target.data[i] += source.data[i];
    }
  }

  static scalarMultiplyInPlace(vector: Vector, scalar: number): void {
    for (let i = 0; i < vector.length; i++) {
      vector.data[i] *= scalar;
    }
  }
}
```

## 타입 정의

### Vector

```typescript
interface Vector {
  data: Float32Array | Float64Array;
  length: number;
}
```

### VectorEngineOptions

```typescript
interface VectorEngineOptions {
  precision?: 'float32' | 'float64';
  cacheSize?: number;
  chunkSize?: number;
  enableSIMD?: boolean;
}
```

## 성능 벤치마크

### 연산별 성능 (1M 요소)

| 연산 | SIMD 비활성화 | SIMD 활성화 | 성능 향상 |
|------|---------------|-------------|-----------|
| 덧셈 | 15ms | 4ms | 3.75x |
| 내적 | 12ms | 3ms | 4x |
| 정규화 | 20ms | 6ms | 3.33x |

### 메모리 사용량

| 정밀도 | 1M 요소 메모리 | 10M 요소 메모리 |
|--------|----------------|-----------------|
| float32 | 4MB | 40MB |
| float64 | 8MB | 80MB |

## 모범 사례

1. **적절한 정밀도 선택**: 과학 계산은 float64, 일반적인 용도는 float32
2. **SIMD 활용**: 대용량 데이터 처리 시 SIMD 활성화
3. **메모리 관리**: 큰 벡터 처리 시 청크 크기 조정
4. **캐시 최적화**: 반복적인 연산에서 캐시 크기 증가
5. **인플레이스 연산**: 메모리 제약이 있을 때 인플레이스 연산 활용

## 관련 문서

- [Math Engine API](./math-engine.md)
- [Matrix Engine API](./matrix-engine.md)
- [Statistics Engine API](./statistics-engine.md)
