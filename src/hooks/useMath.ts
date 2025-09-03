import { useCallback, useMemo, useRef } from 'react';
import {
  MathEngine,
  type MathEngineOptions,
  type Matrix,
  type StatisticsResult,
  type Vector,
} from '../lib/utils/math-engine';
import { VectorEngine } from '../lib/utils/vector-engine';
import { MatrixEngine } from '../lib/utils/matrix-engine';
import { StatisticsEngine } from '../lib/utils/statistics-engine';

export interface UseMathOptions extends MathEngineOptions {
  /**
   * 엔진 인스턴스를 재사용할지 여부
   * @default true
   */
  reuseInstance?: boolean;
}

export interface UseMathReturn {
  // 벡터 연산
  fastSqrt: (x: number) => number;
  fastPow: (base: number, exp: number) => number;
  addVectors: (a: Vector, b: Vector) => Promise<Vector>;
  dotProduct: (a: Vector, b: Vector) => Promise<number>;
  magnitude: (vector: Vector) => number;
  normalize: (vector: Vector) => Vector;
  createVector: (length: number) => Vector;
  vectorFromArray: (data: number[]) => Vector;

  // 행렬 연산
  createMatrix: (data: number[], rows: number, cols: number, precision?: 'float32' | 'float64') => Matrix;
  createEmptyMatrix: (rows: number, cols: number) => Matrix;
  createIdentityMatrix: (size: number) => Matrix;
  multiplyMatrices: (a: Matrix, b: Matrix) => Promise<Matrix>;
  addMatrices: (a: Matrix, b: Matrix) => Promise<Matrix>;
  transpose: (matrix: Matrix) => Matrix;
  determinant: (matrix: Matrix) => number;

  // 통계 연산
  statistics: (data: number[]) => Promise<StatisticsResult>;
  basicStatistics: (data: number[]) => Omit<StatisticsResult, 'median' | 'mode'>;
  quantile: (data: number[], q: number) => number;
  correlation: (x: number[], y: number[]) => number;
  histogram: (data: number[], bins?: number) => { bins: number[]; counts: number[] };

  // 엔진 정보
  getEngineInfo: () => {
    vectorEngine: VectorEngine;
    matrixEngine: MatrixEngine;
    statisticsEngine: StatisticsEngine;
  };

  // 엔진 인스턴스 (고급 사용자용)
  engine: MathEngine;
}

/**
 * MathEngine을 React 컴포넌트에서 사용하기 위한 훅
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const math = useMath({
 *     precision: 'float64',
 *     cacheSize: 10000,
 *     enableSIMD: true
 *   });
 *
 *   const handleCalculation = useCallback(async () => {
 *     const vector1 = math.vectorFromArray([1, 2, 3]);
 *     const vector2 = math.vectorFromArray([4, 5, 6]);
 *     const result = await math.dotProduct(vector1, vector2);
 *     console.log('Dot product:', result);
 *   }, [math]);
 *
 *   return (
 *     <button onClick={handleCalculation}>
 *       Calculate
 *     </button>
 *   );
 * }
 * ```
 */
export function useMath(options: UseMathOptions = {}): UseMathReturn {
  const { reuseInstance = true, ...engineOptions } = options;

  // 엔진 인스턴스를 메모이제이션하여 재사용
  const engineRef = useRef<MathEngine | null>(null);

  const engine = useMemo(() => {
    if (reuseInstance && engineRef.current) {
      return engineRef.current;
    }

    const newEngine = new MathEngine(engineOptions);
    if (reuseInstance) {
      engineRef.current = newEngine;
    }

    return newEngine;
  }, [
    reuseInstance,
    engineOptions.precision,
    engineOptions.cacheSize,
    engineOptions.chunkSize,
    engineOptions.enableSIMD,
    engineOptions.enableGPU,
  ]);

  // 벡터 연산 메서드들을 useCallback으로 최적화
  const fastSqrt = useCallback((x: number) => engine.fastSqrt(x), [engine]);
  const fastPow = useCallback((base: number, exp: number) => engine.fastPow(base, exp), [engine]);
  const addVectors = useCallback((a: Vector, b: Vector) => engine.addVectors(a, b), [engine]);
  const dotProduct = useCallback((a: Vector, b: Vector) => engine.dotProduct(a, b), [engine]);
  const magnitude = useCallback((vector: Vector) => engine.magnitude(vector), [engine]);
  const normalize = useCallback((vector: Vector) => engine.normalize(vector), [engine]);
  const createVector = useCallback((length: number) => engine.createVector(length), [engine]);
  const vectorFromArray = useCallback((data: number[]) => engine.vectorFromArray(data), [engine]);

  // 행렬 연산 메서드들
  const createMatrix = useCallback(
    (data: number[], rows: number, cols: number, precision?: 'float32' | 'float64') =>
      engine.createMatrix(data, rows, cols, precision),
    [engine]
  );
  const createEmptyMatrix = useCallback((rows: number, cols: number) => engine.createEmptyMatrix(rows, cols), [engine]);
  const createIdentityMatrix = useCallback((size: number) => engine.createIdentityMatrix(size), [engine]);
  const multiplyMatrices = useCallback((a: Matrix, b: Matrix) => engine.multiplyMatrices(a, b), [engine]);
  const addMatrices = useCallback((a: Matrix, b: Matrix) => engine.addMatrices(a, b), [engine]);
  const transpose = useCallback((matrix: Matrix) => engine.transpose(matrix), [engine]);
  const determinant = useCallback((matrix: Matrix) => engine.determinant(matrix), [engine]);

  // 통계 연산 메서드들
  const statistics = useCallback((data: number[]) => engine.statistics(data), [engine]);
  const basicStatistics = useCallback((data: number[]) => engine.basicStatistics(data), [engine]);
  const quantile = useCallback((data: number[], q: number) => engine.quantile(data, q), [engine]);
  const correlation = useCallback((x: number[], y: number[]) => engine.correlation(x, y), [engine]);
  const histogram = useCallback((data: number[], bins = 10) => engine.histogram(data, bins), [engine]);

  // 엔진 정보
  const getEngineInfo = useCallback(() => engine.getEngineInfo(), [engine]);

  return {
    // 벡터 연산
    fastSqrt,
    fastPow,
    addVectors,
    dotProduct,
    magnitude,
    normalize,
    createVector,
    vectorFromArray,

    // 행렬 연산
    createMatrix,
    createEmptyMatrix,
    createIdentityMatrix,
    multiplyMatrices,
    addMatrices,
    transpose,
    determinant,

    // 통계 연산
    statistics,
    basicStatistics,
    quantile,
    correlation,
    histogram,

    // 엔진 정보
    getEngineInfo,

    // 엔진 인스턴스
    engine,
  };
}

export default useMath;
