// src/lib/utils/matrix-engine.ts
import BitUtils from './bit-utils';
import { AdaptiveLRUCache } from './cache-strategy';
import { DataStream } from './data-stream';

export interface Matrix {
  data: Float32Array | Float64Array;
  rows: number;
  cols: number;
  precision: 'float32' | 'float64';
}

export interface MatrixEngineOptions {
  precision?: 'float32' | 'float64' | 'adaptive';
  cacheSize?: number;
  chunkSize?: number;
  enableGPU?: boolean;
}

/**
 * 행렬 연산 전용 엔진
 */
export class MatrixEngine {
  private dataStream: DataStream<number>;
  private matrixCache: AdaptiveLRUCache<string, Matrix>;
  private options: Required<MatrixEngineOptions>;

  constructor(options: MatrixEngineOptions = {}) {
    this.options = {
      precision: options.precision ?? 'adaptive',
      cacheSize: options.cacheSize ?? 500,
      chunkSize: options.chunkSize ?? 1024,
      enableGPU: options.enableGPU ?? false,
      ...options,
    };

    this.dataStream = new DataStream({
      chunkSize: this.options.chunkSize,
    });

    this.matrixCache = new AdaptiveLRUCache(this.options.cacheSize);
  }

  /**
   * 행렬 생성
   */
  createMatrix(data: number[], rows: number, cols: number, precision?: 'float32' | 'float64'): Matrix {
    if (data.length !== rows * cols) {
      throw new Error('데이터 크기가 행렬 차원과 일치하지 않습니다');
    }

    const targetPrecision = precision ?? (this.options.precision === 'adaptive' ? 'float64' : this.options.precision);

    return {
      data: targetPrecision === 'float32' ? new Float32Array(data) : new Float64Array(data),
      rows,
      cols,
      precision: targetPrecision,
    };
  }

  /**
   * 빈 행렬 생성
   */
  createEmptyMatrix(rows: number, cols: number): Matrix {
    const targetPrecision = this.options.precision === 'adaptive' ? 'float64' : this.options.precision;

    return {
      data: targetPrecision === 'float32' ? new Float32Array(rows * cols) : new Float64Array(rows * cols),
      rows,
      cols,
      precision: targetPrecision,
    };
  }

  /**
   * 단위 행렬 생성
   */
  createIdentityMatrix(size: number): Matrix {
    const matrix = this.createEmptyMatrix(size, size);
    for (let i = 0; i < size; i++) {
      matrix.data[i * size + i] = 1;
    }
    return matrix;
  }

  /**
   * 행렬 곱셈 (캐시 + 청크 처리)
   */
  async multiplyMatrices(a: Matrix, b: Matrix): Promise<Matrix> {
    if (a.cols !== b.rows) {
      throw new Error('행렬 차원이 곱셈에 호환되지 않습니다');
    }

    const cacheKey = `matmul_${this.matrixHash(a)}_${this.matrixHash(b)}`;
    const cached = this.matrixCache.get(cacheKey);
    if (cached) return cached;

    const result = this.createEmptyMatrix(a.rows, b.cols);

    // 행렬을 블록으로 나누어 병렬 처리
    const blockSize = Math.floor(Math.sqrt(this.options.chunkSize));
    const blocks = this.createMatrixBlocks(a, b, blockSize);

    // DataStream은 number[] 타입을 기대하므로 인덱스 배열을 사용
    const blockIndices = Array.from({ length: blocks.length }, (_, i) => i);

    const { results } = await this.dataStream.process(blockIndices, async chunk => {
      const indices = chunk.slice();
      const blockResults: Array<{
        data: number[];
        row: number;
        col: number;
        blockSize: number;
      }> = [];

      for (const index of indices) {
        const block = blocks[index];
        if (!block) continue;

        const result = this.computeMatrixBlock(block.aBlock, block.bBlock, block.resultRow, block.resultCol);
        blockResults.push(result);
      }

      return blockResults;
    });

    // 블록 결과들을 최종 행렬에 조합
    results.forEach(blockGroup => {
      if (Array.isArray(blockGroup)) {
        blockGroup.forEach(blockResult => {
          if (blockResult) {
            this.mergeBlockResult(result, blockResult);
          }
        });
      }
    });

    this.matrixCache.set(cacheKey, result);
    return result;
  }

  /**
   * 행렬 덧셈
   */
  async addMatrices(a: Matrix, b: Matrix): Promise<Matrix> {
    if (a.rows !== b.rows || a.cols !== b.cols) {
      throw new Error('행렬 차원이 일치해야 합니다');
    }

    const result = this.createEmptyMatrix(a.rows, a.cols);

    for (let i = 0; i < a.data.length; i++) {
      const aVal = a.data[i];
      const bVal = b.data[i];
      if (aVal !== undefined && bVal !== undefined) {
        result.data[i] = aVal + bVal;
      }
    }

    return result;
  }

  /**
   * 행렬 전치
   */
  transpose(matrix: Matrix): Matrix {
    const result = this.createEmptyMatrix(matrix.cols, matrix.rows);

    for (let i = 0; i < matrix.rows; i++) {
      for (let j = 0; j < matrix.cols; j++) {
        const sourceIndex = i * matrix.cols + j;
        const targetIndex = j * matrix.rows + i;
        const value = matrix.data[sourceIndex];
        if (value !== undefined) {
          result.data[targetIndex] = value;
        }
      }
    }

    return result;
  }

  /**
   * 행렬식 계산 (2x2, 3x3만 지원)
   */
  determinant(matrix: Matrix): number {
    if (matrix.rows !== matrix.cols) {
      throw new Error('정사각 행렬만 행렬식을 계산할 수 있습니다');
    }

    if (matrix.rows === 2) {
      const [a, b, c, d] = Array.from(matrix.data);
      return (a ?? 0) * (d ?? 0) - (b ?? 0) * (c ?? 0);
    }

    if (matrix.rows === 3) {
      const data = Array.from(matrix.data);
      const [a, b, c, d, e, f, g, h, i] = data;
      return (
        (a ?? 0) * ((e ?? 0) * (i ?? 0) - (f ?? 0) * (h ?? 0)) -
        (b ?? 0) * ((d ?? 0) * (i ?? 0) - (f ?? 0) * (g ?? 0)) +
        (c ?? 0) * ((d ?? 0) * (h ?? 0) - (e ?? 0) * (g ?? 0))
      );
    }

    throw new Error('현재 2x2와 3x3 행렬만 지원됩니다');
  }

  // ===========================================
  // 헬퍼 메서드들
  // ===========================================

  private matrixHash(matrix: Matrix): string {
    // BitUtils로 해시 생성
    let hash = 0;
    for (let i = 0; i < Math.min(matrix.data.length, 32); i++) {
      const value = matrix.data[i];
      if (value !== undefined) {
        hash = BitUtils.rotateLeft(hash, 1);
        hash ^= Math.floor(value * 1000);
      }
    }
    return hash.toString(36);
  }

  /**
   * 행렬을 블록으로 분할합니다.
   */
  private createMatrixBlocks(
    a: Matrix,
    b: Matrix,
    blockSize: number
  ): Array<{
    aBlock: number[];
    bBlock: number[];
    resultRow: number;
    resultCol: number;
  }> {
    const blocks: Array<{
      aBlock: number[];
      bBlock: number[];
      resultRow: number;
      resultCol: number;
    }> = [];

    for (let i = 0; i < a.rows; i += blockSize) {
      for (let j = 0; j < b.cols; j += blockSize) {
        for (let k = 0; k < a.cols; k += blockSize) {
          const aBlock = this.extractMatrixBlock(a, i, k, blockSize, blockSize);
          const bBlock = this.extractMatrixBlock(b, k, j, blockSize, blockSize);

          blocks.push({
            aBlock,
            bBlock,
            resultRow: i,
            resultCol: j,
          });
        }
      }
    }

    return blocks;
  }

  /**
   * 행렬에서 블록을 추출합니다.
   */
  private extractMatrixBlock(
    matrix: Matrix,
    startRow: number,
    startCol: number,
    blockRows: number,
    blockCols: number
  ): number[] {
    const block: number[] = [];
    const endRow = Math.min(startRow + blockRows, matrix.rows);
    const endCol = Math.min(startCol + blockCols, matrix.cols);

    for (let i = startRow; i < endRow; i++) {
      for (let j = startCol; j < endCol; j++) {
        const index = i * matrix.cols + j;
        const value = matrix.data[index];
        block.push(value !== undefined ? value : 0);
      }
    }

    return block;
  }

  /**
   * 행렬 블록 곱셈을 계산합니다.
   */
  private computeMatrixBlock(
    aBlock: number[],
    bBlock: number[],
    resultRow: number,
    resultCol: number
  ): {
    data: number[];
    row: number;
    col: number;
    blockSize: number;
  } {
    // 간단한 블록 곱셈 구현
    const blockSize = Math.sqrt(aBlock.length);
    const result: number[] = new Array(aBlock.length).fill(0);

    for (let i = 0; i < blockSize; i++) {
      for (let j = 0; j < blockSize; j++) {
        for (let k = 0; k < blockSize; k++) {
          const aIndex = i * blockSize + k;
          const bIndex = k * blockSize + j;
          const resultIndex = i * blockSize + j;

          const aValue = aBlock[aIndex];
          const bValue = bBlock[bIndex];
          if (aValue !== undefined && bValue !== undefined) {
            const currentResult = result[resultIndex];
            if (currentResult !== undefined) {
              result[resultIndex] = currentResult + aValue * bValue;
            }
          }
        }
      }
    }

    return {
      data: result,
      row: resultRow,
      col: resultCol,
      blockSize: Math.floor(blockSize),
    };
  }

  /**
   * 블록 결과를 최종 행렬에 병합합니다.
   */
  private mergeBlockResult(
    targetMatrix: Matrix,
    blockResult: {
      data: number[];
      row: number;
      col: number;
      blockSize: number;
    }
  ): void {
    const { data, row, col, blockSize } = blockResult;

    for (let i = 0; i < blockSize; i++) {
      for (let j = 0; j < blockSize; j++) {
        const blockIndex = i * blockSize + j;
        const matrixRow = row + i;
        const matrixCol = col + j;

        if (matrixRow < targetMatrix.rows && matrixCol < targetMatrix.cols) {
          const matrixIndex = matrixRow * targetMatrix.cols + matrixCol;
          const value = data[blockIndex];
          if (value !== undefined) {
            targetMatrix.data[matrixIndex] = value;
          }
        }
      }
    }
  }
}
