// src/lib/utils/vector-engine.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { VectorEngine } from './vector-engine';

describe('VectorEngine Edge Cases', () => {
  let engine: VectorEngine;

  beforeEach(() => {
    engine = new VectorEngine();
  });

  describe('벡터 덧셈 엣지케이스', () => {
    it('null 벡터 처리', async () => {
      const validVector = engine.fromArray([1, 2, 3]);

      await expect(engine.addVectors(null as any, validVector)).rejects.toThrow('벡터가 null 또는 undefined입니다');

      await expect(engine.addVectors(validVector, undefined as any)).rejects.toThrow(
        '벡터가 null 또는 undefined입니다'
      );
    });

    it('빈 벡터 처리', async () => {
      const emptyA = engine.fromArray([]);
      const emptyB = engine.fromArray([]);

      await expect(engine.addVectors(emptyA, emptyB)).rejects.toThrow('빈 벡터는 연산할 수 없습니다');
    });

    it('차원 불일치 상세 오류 메시지', async () => {
      const vectorA = engine.fromArray([1, 2, 3]);
      const vectorB = engine.fromArray([1, 2, 3, 4, 5]);

      await expect(engine.addVectors(vectorA, vectorB)).rejects.toThrow('벡터 차원이 일치하지 않습니다: 3 vs 5');
    });

    it('매우 큰 차원 차이', async () => {
      const smallVector = engine.fromArray([1]);
      const largeVector = engine.fromArray(new Array(10000).fill(1));

      await expect(engine.addVectors(smallVector, largeVector)).rejects.toThrow(
        '벡터 차원이 일치하지 않습니다: 1 vs 10000'
      );
    });
  });

  describe('벡터 내적 엣지케이스', () => {
    it('null 벡터 처리', async () => {
      const validVector = engine.fromArray([1, 2, 3]);

      await expect(engine.dotProduct(null as any, validVector)).rejects.toThrow('벡터가 null 또는 undefined입니다');

      await expect(engine.dotProduct(validVector, undefined as any)).rejects.toThrow(
        '벡터가 null 또는 undefined입니다'
      );
    });

    it('빈 벡터 처리', async () => {
      const emptyA = engine.fromArray([]);
      const emptyB = engine.fromArray([]);

      await expect(engine.dotProduct(emptyA, emptyB)).rejects.toThrow('빈 벡터는 연산할 수 없습니다');
    });

    it('차원 불일치 처리', async () => {
      const vectorA = engine.fromArray([1, 2]);
      const vectorB = engine.fromArray([1, 2, 3, 4]);

      await expect(engine.dotProduct(vectorA, vectorB)).rejects.toThrow('벡터 차원이 일치하지 않습니다: 2 vs 4');
    });
  });

  describe('벡터 크기 계산 엣지케이스', () => {
    it('null 벡터 처리', () => {
      expect(() => engine.magnitude(null as any)).toThrow('벡터가 null 또는 undefined입니다');

      expect(() => engine.magnitude(undefined as any)).toThrow('벡터가 null 또는 undefined입니다');
    });

    it('빈 벡터의 크기는 0', () => {
      const emptyVector = engine.fromArray([]);
      expect(engine.magnitude(emptyVector)).toBe(0);
    });

    it('무한대 값이 포함된 벡터', () => {
      const infiniteVector = engine.fromArray([Infinity, 1, 2]);
      const magnitude = engine.magnitude(infiniteVector);
      expect(magnitude).toBe(Infinity);
    });

    it('NaN 값이 포함된 벡터', () => {
      const nanVector = engine.fromArray([NaN, 1, 2]);
      const magnitude = engine.magnitude(nanVector);
      expect(magnitude).toBeNaN();
    });
  });

  describe('벡터 정규화 엣지케이스', () => {
    it('null 벡터 처리', () => {
      expect(() => engine.normalize(null as any)).toThrow('벡터가 null 또는 undefined입니다');

      expect(() => engine.normalize(undefined as any)).toThrow('벡터가 null 또는 undefined입니다');
    });

    it('빈 벡터 처리', () => {
      const emptyVector = engine.fromArray([]);
      expect(() => engine.normalize(emptyVector)).toThrow('빈 벡터는 정규화할 수 없습니다');
    });

    it('영벡터 정규화', () => {
      const zeroVector = engine.fromArray([0, 0, 0]);
      expect(() => engine.normalize(zeroVector)).toThrow('영벡터는 정규화할 수 없습니다');
    });

    it('무한대 크기 벡터 정규화', () => {
      const infiniteVector = engine.fromArray([Infinity, 0, 0]);
      expect(() => engine.normalize(infiniteVector)).toThrow('벡터 크기가 유한하지 않습니다');
    });

    it('매우 작은 벡터 정규화', () => {
      const tinyVector = engine.fromArray([1e-100, 1e-100, 1e-100]);
      const normalized = engine.normalize(tinyVector);
      const magnitude = engine.magnitude(normalized);
      expect(magnitude).toBeCloseTo(1, 10);
    });

    it('매우 큰 벡터 정규화', () => {
      const largeVector = engine.fromArray([1e100, 1e100, 1e100]);
      const normalized = engine.normalize(largeVector);
      const magnitude = engine.magnitude(normalized);
      expect(magnitude).toBeCloseTo(1, 10);
    });
  });

  describe('특수 값 처리', () => {
    it('음수 값이 포함된 벡터 연산', async () => {
      const vectorA = engine.fromArray([-1, -2, -3]);
      const vectorB = engine.fromArray([1, 2, 3]);

      const sum = await engine.addVectors(vectorA, vectorB);
      expect(Array.from(sum.data)).toEqual([0, 0, 0]);

      const dot = await engine.dotProduct(vectorA, vectorB);
      expect(dot).toBe(-14); // (-1*1) + (-2*2) + (-3*3) = -14
    });

    it('소수점 값이 포함된 벡터 연산', async () => {
      const vectorA = engine.fromArray([0.1, 0.2, 0.3]);
      const vectorB = engine.fromArray([0.4, 0.5, 0.6]);

      const sum = await engine.addVectors(vectorA, vectorB);
      expect(sum.data[0]).toBeCloseTo(0.5, 10);
      expect(sum.data[1]).toBeCloseTo(0.7, 10);
      expect(sum.data[2]).toBeCloseTo(0.9, 10);
    });

    it('단일 요소 벡터 연산', async () => {
      const vectorA = engine.fromArray([5]);
      const vectorB = engine.fromArray([3]);

      const sum = await engine.addVectors(vectorA, vectorB);
      expect(Array.from(sum.data)).toEqual([8]);

      const dot = await engine.dotProduct(vectorA, vectorB);
      expect(dot).toBe(15);

      const magnitude = engine.magnitude(vectorA);
      expect(magnitude).toBe(5);

      const normalized = engine.normalize(vectorA);
      expect(Array.from(normalized.data)).toEqual([1]);
    });
  });
});
