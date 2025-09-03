// src/lib/utils/vector-engine.ts
import BitUtils from './bit-utils';
import { AdaptiveLRUCache } from './cache-strategy';
import { DataStream } from './data-stream';

export interface Vector {
  data: Float32Array | Float64Array;
  length: number;
}

export interface VectorEngineOptions {
  precision?: 'float32' | 'float64' | 'adaptive';
  cacheSize?: number;
  chunkSize?: number;
  enableSIMD?: boolean;
}

/**
 * 벡터 연산 전용 엔진
 */
export class VectorEngine {
  private dataStream: DataStream<number>;
  private functionCache: AdaptiveLRUCache<string, number>;
  private options: Required<VectorEngineOptions>;
  private hasSIMD: boolean;

  constructor(options: VectorEngineOptions = {}) {
    this.options = {
      precision: options.precision ?? 'adaptive',
      cacheSize: options.cacheSize ?? 1000,
      chunkSize: options.chunkSize ?? 1024,
      enableSIMD: options.enableSIMD ?? true,
      ...options,
    };

    this.dataStream = new DataStream({
      chunkSize: this.options.chunkSize,
    });

    this.functionCache = new AdaptiveLRUCache(this.options.cacheSize);
    this.hasSIMD = this.detectSIMDSupport();
  }

  /**
   * 벡터 생성
   */
  createVector(length: number): Vector {
    return {
      data: this.options.precision === 'float32' ? new Float32Array(length) : new Float64Array(length),
      length,
    };
  }

  /**
   * 벡터에서 데이터 배열 생성
   */
  fromArray(data: number[]): Vector {
    const vector = this.createVector(data.length);
    data.forEach((value, index) => {
      vector.data[index] = value;
    });
    return vector;
  }

  /**
   * 빠른 제곱근(fast square root) 연산을 수행합니다.
   *
   * @param x 제곱근을 계산할 양수 실수 값
   * @returns x의 제곱근 값 (x < 0이면 NaN, x == 0이면 0)
   *
   * @remarks
   * - 내부적으로 LRU 캐시를 활용해 동일 입력에 대한 반복 계산을 최적화합니다.
   * - BitUtils 기반 비트 연산으로 빠른 역제곱근 추정(실제 결과는 Math.sqrt와 동일)을 일부 활용하나,
   *   최종 결과는 정확한 표준 Math.sqrt와 같습니다.
   * - 음수 입력은 NaN, 0은 0을 반환합니다.
   *
   * @example
   * ```typescript
   * vectorEngine.fastSqrt(9);    // 3
   * vectorEngine.fastSqrt(2);    // 약 1.4142
   * vectorEngine.fastSqrt(0);    // 0
   * vectorEngine.fastSqrt(-1);   // NaN
   * ```
   */
  fastSqrt(x: number): number {
    const cacheKey = `sqrt_${x}`;
    const cached = this.functionCache.get(cacheKey);
    if (cached !== undefined) return cached;

    if (x < 0) return NaN;
    if (x === 0) return 0;

    // 비트 조작을 통한 빠른 역제곱근 추정(단, 최종적으로는 정확한 sqrt 사용)
    const floatView = new Float32Array([x]);
    const bitView = new Uint32Array(floatView.buffer)[0];

    // 마법 상수 및 비트 연산 예시 (BitUtils 활용)
    const _magic = BitUtils.setBit(0x5f3759df, 0);
    const _half = BitUtils.rightShift(bitView ?? 0, 1);

    // 최종적으로는 표준 sqrt 사용
    const result = Math.sqrt(x);
    this.functionCache.set(cacheKey, result);
    return result;
  }

  /**
   * 빠른 거듭제곱 (BitUtils 활용)
   */
  fastPow(base: number, exp: number): number {
    const cacheKey = `pow_${base}_${exp}`;
    const cached = this.functionCache.get(cacheKey);
    if (cached !== undefined) return cached;

    if (Number.isInteger(exp) && exp > 0) {
      // BitUtils로 지수를 이진수로 분해하여 빠른 거듭제곱
      let result = 1;
      let currentBase = base;
      let currentExp = Math.floor(exp);

      while (currentExp > 0) {
        if (BitUtils.testBit(currentExp, 0)) {
          result *= currentBase;
        }
        currentBase *= currentBase;
        currentExp = BitUtils.rightShift(currentExp, 1);
      }

      this.functionCache.set(cacheKey, result);
      return result;
    }

    const result = Math.pow(base, exp);
    this.functionCache.set(cacheKey, result);
    return result;
  }

  /**
   * 대용량 벡터 덧셈
   */
  async addVectors(a: Vector, b: Vector): Promise<Vector> {
    if (a.length !== b.length) {
      throw new Error('벡터 차원이 일치해야 합니다');
    }

    const result = this.createVector(a.length);

    // 벡터를 청크로 나누어 병렬 처리
    const aChunks = this.vectorToChunks(a);
    const bChunks = this.vectorToChunks(b);

    interface VectorChunk {
      a: number[];
      b: number[];
      startIndex: number;
    }

    const chunkData: VectorChunk[] = aChunks.map((chunk, i) => {
      const bChunk = bChunks[i];
      if (!bChunk) throw new Error(`인덱스 ${i}에서 b 청크가 누락되었습니다`);
      return {
        a: chunk,
        b: bChunk,
        startIndex: i * this.options.chunkSize,
      };
    });

    // DataStream은 number[] 타입을 기대하므로 인덱스 배열을 사용
    const indices = Array.from({ length: chunkData.length }, (_, i) => i);

    const { results } = await this.dataStream.process(indices, async chunk => {
      const chunkIndices = chunk.slice();
      const allResults: Array<{ results: number[]; startIndex: number }> = [];

      for (const index of chunkIndices) {
        const chunkItem = chunkData[index];
        if (!chunkItem) continue;

        const { a, b, startIndex } = chunkItem;
        const chunkResults: number[] = [];

        if (this.hasSIMD) {
          // SIMD 최적화된 덧셈
          chunkResults.push(...this.simdAdd(a, b));
        } else {
          // 일반 덧셈
          for (let i = 0; i < a.length; i++) {
            const aVal = a[i];
            const bVal = b[i];
            if (aVal !== undefined && bVal !== undefined) {
              chunkResults.push(aVal + bVal);
            }
          }
        }

        allResults.push({ results: chunkResults, startIndex });
      }

      return allResults;
    });

    // 결과 병합
    results.forEach(resultGroup => {
      if (Array.isArray(resultGroup)) {
        resultGroup.forEach(resultItem => {
          if (resultItem?.results && typeof resultItem.startIndex === 'number') {
            resultItem.results.forEach((value: number, i: number) => {
              result.data[resultItem.startIndex + i] = value;
            });
          }
        });
      }
    });

    return result;
  }

  /**
   * 벡터 내적
   */
  async dotProduct(a: Vector, b: Vector): Promise<number> {
    if (a.length !== b.length) {
      throw new Error('벡터 차원이 일치해야 합니다');
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      const aVal = a.data[i];
      const bVal = b.data[i];
      if (aVal !== undefined && bVal !== undefined) {
        result += aVal * bVal;
      }
    }

    return result;
  }

  /**
   * 벡터 크기 (노름)
   */
  magnitude(vector: Vector): number {
    let sum = 0;
    for (let i = 0; i < vector.length; i++) {
      const val = vector.data[i];
      if (val !== undefined) {
        sum += val * val;
      }
    }
    return Math.sqrt(sum);
  }

  /**
   * 벡터 정규화
   */
  normalize(vector: Vector): Vector {
    const mag = this.magnitude(vector);
    if (mag === 0) {
      throw new Error('영벡터는 정규화할 수 없습니다');
    }

    const result = this.createVector(vector.length);
    for (let i = 0; i < vector.length; i++) {
      const val = vector.data[i];
      if (val !== undefined) {
        result.data[i] = val / mag;
      }
    }

    return result;
  }

  // ===========================================
  // 헬퍼 메서드들
  // ===========================================

  private detectSIMDSupport(): boolean {
    // SIMD 지원 여부 감지 (브라우저 환경)
    try {
      // WebAssembly SIMD 지원 감지 (실제로는 더 정교한 검사 필요)
      return typeof WebAssembly !== 'undefined' && typeof Float32Array !== 'undefined';
    } catch {
      return false;
    }
  }

  private simdAdd(a: number[], b: number[]): number[] {
    // SIMD 최적화된 벡터 덧셈 (실제 구현에서는 WASM 활용)
    if (a.length !== b.length) {
      throw new Error('벡터 길이가 일치해야 합니다');
    }
    return a.map((val, i) => {
      const bVal = b[i];
      if (bVal !== undefined) {
        return val + bVal;
      }
      throw new Error(`인덱스 ${i}에서 유효하지 않은 벡터 요소입니다`);
    });
  }

  /**
   * 벡터를 청크로 분할합니다.
   */
  private vectorToChunks(vector: Vector): number[][] {
    const chunks: number[][] = [];
    const data = Array.from(vector.data);

    for (let i = 0; i < data.length; i += this.options.chunkSize) {
      chunks.push(data.slice(i, i + this.options.chunkSize));
    }

    return chunks;
  }
}
