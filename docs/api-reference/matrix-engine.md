# MatrixEngine API 참조

고성능 행렬 연산을 위한 전용 엔진입니다. 블록 기반 병렬 처리와 적응형 캐싱을 통해 대규모 행렬 연산을 효율적으로 수행합니다.

## 주요 특징

- **블록 기반 병렬 처리**: 대형 행렬을 블록으로 분할하여 병렬 연산
- **적응형 정밀도**: float32/float64 자동 선택 또는 수동 지정
- **LRU 캐싱**: 행렬 연산 결과 캐싱으로 성능 최적화
- **메모리 효율성**: TypedArray 사용으로 메모리 사용량 최소화

## 기본 사용법

```typescript
import { MatrixEngine } from '@/lib/utils/matrix-engine';

// 엔진 초기화
const engine = new MatrixEngine({
  precision: 'adaptive',
  cacheSize: 1000,
  chunkSize: 2048,
  enableGPU: true,
});

// 행렬 생성
const matrixA = engine.createMatrix([1, 2, 3, 4], 2, 2);
const matrixB = engine.createMatrix([5, 6, 7, 8], 2, 2);

// 행렬 곱셈
const product = await engine.multiplyMatrices(matrixA, matrixB);

// 행렬 덧셈
const sum = await engine.addMatrices(matrixA, matrixB);

// 전치 행렬
const transposed = engine.transpose(matrixA);

// 행렬식 계산 (2x2, 3x3만 지원)
const det = engine.determinant(matrixA);
```

## API 참조

### MatrixEngineOptions

```typescript
interface MatrixEngineOptions {
  precision?: 'float32' | 'float64' | 'adaptive'; // 계산 정밀도
  cacheSize?: number; // 캐시 크기 (기본값: 500)
  chunkSize?: number; // 청크 크기 (기본값: 1024)
  enableGPU?: boolean; // GPU 가속 활성화
}
```

### Matrix 인터페이스

```typescript
interface Matrix {
  data: Float32Array | Float64Array; // 행렬 데이터
  rows: number; // 행 수
  cols: number; // 열 수
  precision: 'float32' | 'float64'; // 데이터 정밀도
}
```

## 행렬 생성 메서드

### `createMatrix(data: number[], rows: number, cols: number, precision?: 'float32' | 'float64'): Matrix`

주어진 데이터로 행렬을 생성합니다.

**매개변수:**

- `data`: 행렬 데이터 배열 (길이는 rows × cols와 일치해야 함)
- `rows`: 행 수
- `cols`: 열 수
- `precision`: 선택적 정밀도 지정

**예시:**

```typescript
const matrix = engine.createMatrix([1, 2, 3, 4, 5, 6], 2, 3);
// 2×3 행렬:
// [1, 2, 3]
// [4, 5, 6]
```

### `createEmptyMatrix(rows: number, cols: number): Matrix`

지정된 크기의 영행렬을 생성합니다.

**예시:**

```typescript
const zeroMatrix = engine.createEmptyMatrix(3, 3);
// 3×3 영행렬 생성
```

### `createIdentityMatrix(size: number): Matrix`

지정된 크기의 단위행렬을 생성합니다.

**예시:**

```typescript
const identity = engine.createIdentityMatrix(3);
// 3×3 단위행렬:
// [1, 0, 0]
// [0, 1, 0]
// [0, 0, 1]
```

## 행렬 연산 메서드

### `multiplyMatrices(a: Matrix, b: Matrix): Promise<Matrix>`

두 행렬의 곱셈을 수행합니다. 블록 기반 병렬 처리로 대형 행렬도 효율적으로 처리합니다.

**조건:** `a.cols === b.rows`

**예시:**

```typescript
const a = engine.createMatrix([1, 2, 3, 4], 2, 2);
const b = engine.createMatrix([5, 6, 7, 8], 2, 2);
const result = await engine.multiplyMatrices(a, b);
// 결과: [19, 22, 43, 50]
```

### `addMatrices(a: Matrix, b: Matrix): Promise<Matrix>`

두 행렬의 덧셈을 수행합니다.

**조건:** `a.rows === b.rows && a.cols === b.cols`

**예시:**

```typescript
const a = engine.createMatrix([1, 2, 3, 4], 2, 2);
const b = engine.createMatrix([5, 6, 7, 8], 2, 2);
const result = await engine.addMatrices(a, b);
// 결과: [6, 8, 10, 12]
```

### `transpose(matrix: Matrix): Matrix`

행렬의 전치를 계산합니다.

**예시:**

```typescript
const matrix = engine.createMatrix([1, 2, 3, 4, 5, 6], 2, 3);
const transposed = engine.transpose(matrix);
// 원본: 2×3, 결과: 3×2
// [1, 4]
// [2, 5]
// [3, 6]
```

### `determinant(matrix: Matrix): number`

정사각 행렬의 행렬식을 계산합니다. 현재 2×2와 3×3 행렬만 지원합니다.

**조건:** `matrix.rows === matrix.cols && matrix.rows <= 3`

**예시:**

```typescript
// 2×2 행렬
const matrix2x2 = engine.createMatrix([1, 2, 3, 4], 2, 2);
const det2x2 = engine.determinant(matrix2x2); // -2

// 3×3 행렬
const matrix3x3 = engine.createMatrix([1, 2, 3, 4, 5, 6, 7, 8, 9], 3, 3);
const det3x3 = engine.determinant(matrix3x3); // 0
```

## 성능 최적화

### 캐싱 전략

MatrixEngine은 행렬 연산 결과를 자동으로 캐싱합니다:

```typescript
// 동일한 연산은 캐시에서 즉시 반환
const result1 = await engine.multiplyMatrices(a, b); // 계산 수행
const result2 = await engine.multiplyMatrices(a, b); // 캐시에서 반환
```

### 블록 기반 처리

대형 행렬은 자동으로 블록으로 분할되어 병렬 처리됩니다:

```typescript
const engine = new MatrixEngine({
  chunkSize: 4096, // 블록 크기 조정
});

// 1000×1000 행렬도 효율적으로 처리
const largeMatrix = engine.createEmptyMatrix(1000, 1000);
```

### 정밀도 선택

연산 특성에 따라 정밀도를 조정할 수 있습니다:

```typescript
// 고정밀도 필요시
const highPrecision = new MatrixEngine({ precision: 'float64' });

// 성능 우선시
const fastEngine = new MatrixEngine({ precision: 'float32' });

// 자동 선택
const adaptiveEngine = new MatrixEngine({ precision: 'adaptive' });
```

## 오류 처리

```typescript
try {
  // 차원 불일치 오류
  const incompatible = await engine.multiplyMatrices(
    engine.createMatrix([1, 2], 1, 2),
    engine.createMatrix([1, 2], 1, 2)
  );
} catch (error) {
  console.error('행렬 차원이 곱셈에 호환되지 않습니다');
}

try {
  // 지원하지 않는 행렬식 크기
  const large = engine.createEmptyMatrix(4, 4);
  const det = engine.determinant(large);
} catch (error) {
  console.error('현재 2x2와 3x3 행렬만 지원됩니다');
}
```

## 메모리 관리

```typescript
// 대용량 행렬 처리 시 메모리 사용량 모니터링
const engine = new MatrixEngine({
  cacheSize: 100, // 캐시 크기 제한
  chunkSize: 1024, // 청크 크기 조정
});

// 필요시 캐시 수동 정리 (내부 메서드)
// engine.matrixCache.clear();
```

## 타입 정의

```typescript
// 행렬 타입
type MatrixData = Float32Array | Float64Array;
type Precision = 'float32' | 'float64' | 'adaptive';

// 블록 처리 결과
interface BlockResult {
  data: number[];
  row: number;
  col: number;
  resultRows: number;
  resultCols: number;
}
```
