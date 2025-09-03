// src/lib/utils/math-engine-refactored.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import MathEngine from './math-engine';

describe('리팩토링된 MathEngine', () => {
  let engine: MathEngine;

  beforeEach(() => {
    engine = new MathEngine({
      precision: 'float64',
      cacheSize: 1000,
      chunkSize: 256,
      enableSIMD: true,
      enableGPU: false,
    });
  });

  describe('벡터 연산', () => {
    it('벡터 생성이 정확해야 함', () => {
      const vector = engine.createVector(5);
      expect(vector.length).toBe(5);
      expect(vector.data.length).toBe(5);
    });

    it('배열에서 벡터 생성이 정확해야 함', () => {
      const data = [1, 2, 3, 4, 5];
      const vector = engine.vectorFromArray(data);

      expect(vector.length).toBe(5);
      expect(Array.from(vector.data)).toEqual(data);
    });

    it('벡터 덧셈이 정확해야 함', async () => {
      const a = engine.vectorFromArray([1, 2, 3]);
      const b = engine.vectorFromArray([4, 5, 6]);

      const result = await engine.addVectors(a, b);
      const expected = [5, 7, 9];

      expect(Array.from(result.data)).toEqual(expected);
    });

    it('벡터 내적이 정확해야 함', async () => {
      const a = engine.vectorFromArray([1, 2, 3]);
      const b = engine.vectorFromArray([4, 5, 6]);

      const result = await engine.dotProduct(a, b);
      expect(result).toBe(32); // 1*4 + 2*5 + 3*6 = 32
    });

    it('벡터 크기 계산이 정확해야 함', () => {
      const vector = engine.vectorFromArray([3, 4]);
      const magnitude = engine.magnitude(vector);

      expect(magnitude).toBeCloseTo(5, 10); // sqrt(3^2 + 4^2) = 5
    });

    it('벡터 정규화가 정확해야 함', () => {
      const vector = engine.vectorFromArray([3, 4]);
      const normalized = engine.normalize(vector);
      const magnitude = engine.magnitude(normalized);

      expect(magnitude).toBeCloseTo(1, 10);
    });

    it('크기가 다른 벡터는 오류를 발생시켜야 함', async () => {
      const a = engine.vectorFromArray([1, 2]);
      const b = engine.vectorFromArray([1, 2, 3]);

      await expect(engine.addVectors(a, b)).rejects.toThrow('벡터 차원이 일치하지 않습니다');
    });
  });

  describe('행렬 연산', () => {
    it('행렬 생성이 정확해야 함', () => {
      const matrix = engine.createMatrix([1, 2, 3, 4], 2, 2);

      expect(matrix.rows).toBe(2);
      expect(matrix.cols).toBe(2);
      expect(Array.from(matrix.data)).toEqual([1, 2, 3, 4]);
    });

    it('단위 행렬 생성이 정확해야 함', () => {
      const identity = engine.createIdentityMatrix(3);
      const expected = [1, 0, 0, 0, 1, 0, 0, 0, 1];

      expect(Array.from(identity.data)).toEqual(expected);
    });

    it('행렬 곱셈이 정확해야 함', async () => {
      const a = engine.createMatrix([1, 2, 3, 4], 2, 2);
      const b = engine.createMatrix([5, 6, 7, 8], 2, 2);

      const result = await engine.multiplyMatrices(a, b);

      expect(result.rows).toBe(2);
      expect(result.cols).toBe(2);

      // 행렬 곱셈 결과: [[19, 22], [43, 50]]
      const expected = [19, 22, 43, 50];
      const actual = Array.from(result.data);

      for (let i = 0; i < expected.length; i++) {
        const actualValue = actual[i];
        const expectedValue = expected[i];
        if (actualValue !== undefined && expectedValue !== undefined) {
          expect(actualValue).toBeCloseTo(expectedValue, 10);
        }
      }
    });

    it('행렬 덧셈이 정확해야 함', async () => {
      const a = engine.createMatrix([1, 2, 3, 4], 2, 2);
      const b = engine.createMatrix([5, 6, 7, 8], 2, 2);

      const result = await engine.addMatrices(a, b);
      const expected = [6, 8, 10, 12];

      expect(Array.from(result.data)).toEqual(expected);
    });

    it('행렬 전치가 정확해야 함', () => {
      const matrix = engine.createMatrix([1, 2, 3, 4, 5, 6], 2, 3);
      const transposed = engine.transpose(matrix);

      expect(transposed.rows).toBe(3);
      expect(transposed.cols).toBe(2);
      expect(Array.from(transposed.data)).toEqual([1, 4, 2, 5, 3, 6]);
    });

    it('2x2 행렬식 계산이 정확해야 함', () => {
      const matrix = engine.createMatrix([1, 2, 3, 4], 2, 2);
      const det = engine.determinant(matrix);

      expect(det).toBe(-2); // 1*4 - 2*3 = -2
    });

    it('호환되지 않는 행렬 차원은 오류를 발생시켜야 함', async () => {
      const a = engine.createMatrix([1, 2, 3, 4], 2, 2);
      const b = engine.createMatrix([1, 2, 3], 3, 1);

      await expect(engine.multiplyMatrices(a, b)).rejects.toThrow('행렬 차원이 곱셈에 호환되지 않습니다');
    });
  });

  describe('통계 함수', () => {
    it('기본 통계가 정확해야 함', async () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const stats = await engine.statistics(data);

      expect(stats.mean).toBeCloseTo(5.5, 10);
      expect(stats.count).toBe(10);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(10);
      expect(stats.median).toBe(5.5);
    });

    it('기본 통계 (빠른 계산)가 정확해야 함', () => {
      const data = [1, 2, 3, 4, 5];
      const stats = engine.basicStatistics(data);

      expect(stats.mean).toBe(3);
      expect(stats.count).toBe(5);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(5);
    });

    it('분위수 계산이 정확해야 함', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const q25 = engine.quantile(data, 0.25);
      const q50 = engine.quantile(data, 0.5);
      const q75 = engine.quantile(data, 0.75);

      expect(q25).toBeCloseTo(3.25, 2);
      expect(q50).toBeCloseTo(5.5, 2);
      expect(q75).toBeCloseTo(7.75, 2);
    });

    it('상관계수 계산이 정확해야 함', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];

      const correlation = engine.correlation(x, y);
      expect(correlation).toBeCloseTo(1, 10); // 완전 양의 상관관계
    });

    it('히스토그램 생성이 정확해야 함', () => {
      const data = [1, 1, 2, 2, 2, 3, 3, 4, 5];
      const histogram = engine.histogram(data, 5);

      expect(histogram.bins.length).toBe(5);
      expect(histogram.counts.length).toBe(5);
      expect(histogram.counts.reduce((sum, count) => sum + count, 0)).toBe(data.length);
    });

    it('빈 데이터는 오류를 발생시켜야 함', async () => {
      await expect(engine.statistics([])).rejects.toThrow('빈 데이터셋입니다');
    });
  });

  describe('수학 함수', () => {
    it('fastSqrt는 정확한 제곱근을 반환해야 함', () => {
      expect(engine.fastSqrt(4)).toBeCloseTo(2, 10);
      expect(engine.fastSqrt(9)).toBeCloseTo(3, 10);
      expect(engine.fastSqrt(16)).toBeCloseTo(4, 10);
    });

    it('fastPow는 정확한 거듭제곱을 반환해야 함', () => {
      expect(engine.fastPow(2, 3)).toBeCloseTo(8, 10);
      expect(engine.fastPow(3, 4)).toBeCloseTo(81, 10);
      expect(engine.fastPow(5, 2)).toBeCloseTo(25, 10);
    });

    it('음수 제곱근은 NaN을 반환해야 함', () => {
      expect(engine.fastSqrt(-1)).toBeNaN();
    });

    it('0의 제곱근은 0을 반환해야 함', () => {
      expect(engine.fastSqrt(0)).toBe(0);
    });
  });

  describe('엔진 정보', () => {
    it('엔진 정보를 반환해야 함', () => {
      const info = engine.getEngineInfo();

      expect(info.vectorEngine).toBeDefined();
      expect(info.matrixEngine).toBeDefined();
      expect(info.statisticsEngine).toBeDefined();
    });
  });

  describe('엣지 케이스', () => {
    it('1x1 행렬 곱셈이 정확해야 함', async () => {
      const a = engine.createMatrix([5], 1, 1);
      const b = engine.createMatrix([3], 1, 1);

      const result = await engine.multiplyMatrices(a, b);
      expect(result.data[0]).toBe(15);
    });

    it('단일 요소 벡터 덧셈이 정확해야 함', async () => {
      const a = engine.vectorFromArray([5]);
      const b = engine.vectorFromArray([3]);

      const result = await engine.addVectors(a, b);
      expect(result.data[0]).toBe(8);
    });

    it('단일 값 통계가 정확해야 함', async () => {
      const data = [42];
      const stats = await engine.statistics(data);

      expect(stats.mean).toBe(42);
      expect(stats.median).toBe(42);
      expect(stats.min).toBe(42);
      expect(stats.max).toBe(42);
      expect(stats.count).toBe(1);
      expect(stats.variance).toBe(0);
    });
  });
});
