// src/lib/utils/statistics-engine.ts
import BitUtils from './bit-utils';
import { DataStream } from './data-stream';

export interface StatisticsResult {
  mean: number;
  variance: number;
  stddev: number;
  min: number;
  max: number;
  median: number;
  mode: number[];
  count: number;
}

export interface StatisticsEngineOptions {
  chunkSize?: number;
}

/**
 * 통계 계산 전용 엔진
 */
export class StatisticsEngine {
  private dataStream: DataStream<number>;
  private options: Required<StatisticsEngineOptions>;

  constructor(options: StatisticsEngineOptions = {}) {
    this.options = {
      chunkSize: options.chunkSize ?? 1024,
      ...options,
    };

    this.dataStream = new DataStream({
      chunkSize: this.options.chunkSize,
    });
  }

  /**
   * 통계 함수들 (스트리밍 처리)
   */
  async statistics(data: number[]): Promise<StatisticsResult> {
    // 빈 데이터 검증
    if (data.length === 0) {
      throw new Error('빈 데이터셋입니다');
    }

    // 온라인 알고리즘으로 평균, 분산 계산 (메모리 효율적)
    let mean = 0;
    let m2 = 0;
    let min = Infinity;
    let max = -Infinity;
    let count = 0;

    const frequencyMap = new Map<number, number>();
    const sortedData: number[] = [];

    const chunks = Array.from({ length: Math.ceil(data.length / this.options.chunkSize) }, (_, i) =>
      data.slice(i * this.options.chunkSize, (i + 1) * this.options.chunkSize)
    );

    // DataStream은 number[] 타입을 기대하므로 인덱스 배열을 사용
    const chunkIndices = Array.from({ length: chunks.length }, (_, i) => i);

    await this.dataStream.process(chunkIndices, async chunk => {
      const indices = chunk.slice();

      for (const index of indices) {
        const chunkData = chunks[index];
        if (!chunkData) continue;

        for (const value of chunkData) {
          count++;
          const delta = value - mean;
          mean += delta / count;
          const delta2 = value - mean;
          m2 += delta * delta2;

          min = Math.min(min, value);
          max = Math.max(max, value);

          // 빈도 계산
          frequencyMap.set(value, (frequencyMap.get(value) || 0) + 1);
          sortedData.push(value);
        }
      }
      return undefined; // void 반환
    });

    // 중앙값 계산
    sortedData.sort((a, b) => a - b);
    const median =
      count % 2 === 0
        ? ((sortedData[count / 2 - 1] ?? 0) + (sortedData[count / 2] ?? 0)) / 2
        : (sortedData[Math.floor(count / 2)] ?? 0);

    // 최빈값 계산
    let maxFreq = 0;
    const modes: number[] = [];
    for (const [value, freq] of frequencyMap) {
      if (freq > maxFreq) {
        maxFreq = freq;
        modes.length = 0;
        modes.push(value);
      } else if (freq === maxFreq) {
        modes.push(value);
      }
    }

    const variance = count > 1 ? m2 / (count - 1) : 0;

    return {
      mean,
      variance,
      stddev: Math.sqrt(variance),
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
      median,
      mode: modes,
      count,
    };
  }

  /**
   * 기본 통계 (빠른 계산)
   */
  basicStatistics(data: number[]): Omit<StatisticsResult, 'median' | 'mode'> {
    if (data.length === 0) {
      throw new Error('빈 데이터셋입니다');
    }

    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    for (const value of data) {
      sum += value;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }

    const mean = sum / data.length;
    let variance = 0;

    for (const value of data) {
      variance += Math.pow(value - mean, 2);
    }

    variance = variance / (data.length - 1);

    return {
      mean,
      variance,
      stddev: Math.sqrt(variance),
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
      count: data.length,
    };
  }

  /**
   * 분위수 계산
   */
  quantile(data: number[], q: number): number {
    if (q < 0 || q > 1) {
      throw new Error('분위수는 0과 1 사이여야 합니다');
    }

    const sorted = [...data].sort((a, b) => a - b);
    const index = q * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sorted[lower] ?? 0;
    }

    const lowerValue = sorted[lower] ?? 0;
    const upperValue = sorted[upper] ?? 0;
    const weight = index - lower;

    return lowerValue + weight * (upperValue - lowerValue);
  }

  /**
   * 상관계수 계산
   */
  correlation(x: number[], y: number[]): number {
    if (x.length !== y.length) {
      throw new Error('두 데이터셋의 길이가 같아야 합니다');
    }

    if (x.length < 2) {
      throw new Error('최소 2개의 데이터 포인트가 필요합니다');
    }

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * (y[i] ?? 0), 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) {
      return 0; // 분산이 0인 경우
    }

    return numerator / denominator;
  }

  /**
   * 히스토그램 생성
   */
  histogram(data: number[], bins: number = 10): { bins: number[]; counts: number[] } {
    if (data.length === 0) {
      throw new Error('빈 데이터셋입니다');
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / bins;

    const binEdges: number[] = [];
    const counts: number[] = new Array(bins).fill(0);

    // 구간 경계 생성
    for (let i = 0; i <= bins; i++) {
      binEdges.push(min + i * binWidth);
    }

    // 데이터를 구간에 할당
    for (const value of data) {
      let binIndex = Math.floor((value - min) / binWidth);
      if (binIndex >= bins) binIndex = bins - 1; // 최대값 처리
      if (binIndex >= 0 && binIndex < counts.length) {
        counts[binIndex] = (counts[binIndex] ?? 0) + 1;
      }
    }

    return {
      bins: binEdges.slice(0, -1), // 마지막 경계 제거
      counts,
    };
  }

  // ===========================================
  // 헬퍼 메서드들
  // ===========================================

  private hashArray(arr: number[]): string {
    // BitUtils로 배열 해시
    return BitUtils.popCount(arr.reduce((acc, val) => acc ^ Math.floor(val * 1000), 0)).toString();
  }
}
