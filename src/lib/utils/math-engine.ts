// src/lib/utils/math-engine-refactored.ts
import { VectorEngine, type Vector, type VectorEngineOptions } from './vector-engine';
import { MatrixEngine, type Matrix, type MatrixEngineOptions } from './matrix-engine';
import { StatisticsEngine, type StatisticsResult, type StatisticsEngineOptions } from './statistics-engine';

export interface MathEngineOptions {
  precision?: 'float32' | 'float64' | 'adaptive';
  cacheSize?: number;
  chunkSize?: number;
  enableSIMD?: boolean;
  enableGPU?: boolean;
}

/**
 * 리팩토링된 수학 엔진 - 전문화된 엔진들을 조합
 */
export class MathEngine {
  private vectorEngine: VectorEngine;
  private matrixEngine: MatrixEngine;
  private statisticsEngine: StatisticsEngine;

  constructor(options: MathEngineOptions = {}) {
    const vectorOptions: VectorEngineOptions = {
      precision: options.precision,
      cacheSize: Math.floor((options.cacheSize ?? 5000) * 0.4), // 40% for vectors
      chunkSize: options.chunkSize,
      enableSIMD: options.enableSIMD,
    };

    const matrixOptions: MatrixEngineOptions = {
      precision: options.precision,
      cacheSize: Math.floor((options.cacheSize ?? 5000) * 0.5), // 50% for matrices
      chunkSize: options.chunkSize,
      enableGPU: options.enableGPU,
    };

    const statisticsOptions: StatisticsEngineOptions = {
      chunkSize: options.chunkSize,
    };

    this.vectorEngine = new VectorEngine(vectorOptions);
    this.matrixEngine = new MatrixEngine(matrixOptions);
    this.statisticsEngine = new StatisticsEngine(statisticsOptions);
  }

  // ===========================================
  // 벡터 연산 위임
  // ===========================================

  /**
   * 빠른 제곱근 (BitUtils 활용)
   */
  fastSqrt(x: number): number {
    return this.vectorEngine.fastSqrt(x);
  }

  /**
   * 빠른 거듭제곱 (BitUtils 활용)
   */
  fastPow(base: number, exp: number): number {
    return this.vectorEngine.fastPow(base, exp);
  }

  /**
   * 대용량 벡터 덧셈
   */
  async addVectors(a: Vector, b: Vector): Promise<Vector> {
    return this.vectorEngine.addVectors(a, b);
  }

  /**
   * 벡터 내적
   */
  async dotProduct(a: Vector, b: Vector): Promise<number> {
    return this.vectorEngine.dotProduct(a, b);
  }

  /**
   * 벡터 크기 (노름)
   */
  magnitude(vector: Vector): number {
    return this.vectorEngine.magnitude(vector);
  }

  /**
   * 벡터 정규화
   */
  normalize(vector: Vector): Vector {
    return this.vectorEngine.normalize(vector);
  }

  /**
   * 벡터 생성
   */
  createVector(length: number): Vector {
    return this.vectorEngine.createVector(length);
  }

  /**
   * 배열에서 벡터 생성
   */
  vectorFromArray(data: number[]): Vector {
    return this.vectorEngine.fromArray(data);
  }

  // ===========================================
  // 행렬 연산 위임
  // ===========================================

  /**
   * 행렬 생성
   */
  createMatrix(data: number[], rows: number, cols: number, precision?: 'float32' | 'float64'): Matrix {
    return this.matrixEngine.createMatrix(data, rows, cols, precision);
  }

  /**
   * 빈 행렬 생성
   */
  createEmptyMatrix(rows: number, cols: number): Matrix {
    return this.matrixEngine.createEmptyMatrix(rows, cols);
  }

  /**
   * 단위 행렬 생성
   */
  createIdentityMatrix(size: number): Matrix {
    return this.matrixEngine.createIdentityMatrix(size);
  }

  /**
   * 행렬 곱셈 (캐시 + 청크 처리)
   */
  async multiplyMatrices(a: Matrix, b: Matrix): Promise<Matrix> {
    return this.matrixEngine.multiplyMatrices(a, b);
  }

  /**
   * 행렬 덧셈
   */
  async addMatrices(a: Matrix, b: Matrix): Promise<Matrix> {
    return this.matrixEngine.addMatrices(a, b);
  }

  /**
   * 행렬 전치
   */
  transpose(matrix: Matrix): Matrix {
    return this.matrixEngine.transpose(matrix);
  }

  /**
   * 행렬식 계산
   */
  determinant(matrix: Matrix): number {
    return this.matrixEngine.determinant(matrix);
  }

  // ===========================================
  // 통계 연산 위임
  // ===========================================

  /**
   * 통계 함수들 (스트리밍 처리)
   */
  async statistics(data: number[]): Promise<StatisticsResult> {
    return this.statisticsEngine.statistics(data);
  }

  /**
   * 기본 통계 (빠른 계산)
   */
  basicStatistics(data: number[]): Omit<StatisticsResult, 'median' | 'mode'> {
    return this.statisticsEngine.basicStatistics(data);
  }

  /**
   * 분위수 계산
   */
  quantile(data: number[], q: number): number {
    return this.statisticsEngine.quantile(data, q);
  }

  /**
   * 상관계수 계산
   */
  correlation(x: number[], y: number[]): number {
    return this.statisticsEngine.correlation(x, y);
  }

  /**
   * 히스토그램 생성
   */
  histogram(data: number[], bins: number = 10): { bins: number[]; counts: number[] } {
    return this.statisticsEngine.histogram(data, bins);
  }

  // ===========================================
  // 편의 메서드들
  // ===========================================

  /**
   * 전체 엔진 상태 정보
   */
  getEngineInfo(): {
    vectorEngine: VectorEngine;
    matrixEngine: MatrixEngine;
    statisticsEngine: StatisticsEngine;
  } {
    return {
      vectorEngine: this.vectorEngine,
      matrixEngine: this.matrixEngine,
      statisticsEngine: this.statisticsEngine,
    };
  }
}

// 기존 호환성을 위한 타입 및 인터페이스 재출력
export type { Vector, Matrix, StatisticsResult };
export type { VectorEngineOptions, MatrixEngineOptions, StatisticsEngineOptions };

export default MathEngine;
