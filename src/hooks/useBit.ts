import { useCallback, useMemo } from 'react';
import BitUtils, {
  type BitLengthWithZero,
  type BitPosition,
  type RotationPosition,
  createBitLength,
  isValidBitLength,
} from '../lib/utils/bit-utils';
import type { CacheStats } from '../lib/utils/cache-strategy';

export interface UseBitOptions {
  /**
   * 개발 모드에서 입력값 검증을 활성화할지 여부
   * @default true
   */
  enableValidation?: boolean;
}

export interface UseBitReturn {
  // 기본 비트 조작
  isPowerOfTwo: (n: number) => boolean;
  setBit: (x: number, position: BitPosition) => number;
  clearBit: (x: number, position: BitPosition) => number;
  toggleBit: (x: number, position: BitPosition) => number;
  testBit: (x: number, position: BitPosition) => boolean;

  // 비트 시프트 및 회전
  rotateLeft: (x: number, positions: RotationPosition) => number;
  rotateRight: (x: number, positions: RotationPosition) => number;
  leftShift: (x: number, positions: number) => number;
  rightShift: (x: number, positions: number) => number;

  // 팝카운트 및 분석
  popCount: (x: number) => number;
  reverseBits: (x: number) => number;
  countLeadingZeros: (x: number) => number;
  countTrailingZeros: (x: number) => number;

  // 비트 추출 및 삽입
  extractBits: (x: number, start: BitPosition, length: BitLengthWithZero) => number;
  insertBits: (x: number, bits: number, start: BitPosition, length?: BitLengthWithZero) => number;

  // 플래그 연산
  hasAllFlags: (mask: number, flags: number) => boolean;
  hasAnyFlag: (mask: number, flags: number) => boolean;

  // 유틸리티 함수
  isValidBitLength: (length: number) => length is BitLengthWithZero;
  createBitLength: (length: number) => BitLengthWithZero;
  getCacheStats: () => {
    powerOfTwoCache: CacheStats;
    popCountCache: CacheStats;
    combinedHitRate: number;
  };
  clearAllCaches: () => void;

  // 마스크 상수
  MASKS: typeof BitUtils.MASKS;
}

/**
 * BitUtils를 React 컴포넌트에서 사용하기 위한 훅
 *
 * @example
 * ```tsx
 * function BitManipulator() {
 *   const bit = useBit();
 *
 *   const handleBitOperation = useCallback(() => {
 *     const value = 0b1010;
 *     const setBitResult = bit.setBit(value, 2); // 0b1110
 *     const popCount = bit.popCount(setBitResult); // 3
 *     const rotated = bit.rotateLeft(setBitResult, 1); // 0b11100
 *
 *     console.log('Original:', value.toString(2));
 *     console.log('Set bit 2:', setBitResult.toString(2));
 *     console.log('Pop count:', popCount);
 *     console.log('Rotated left:', rotated.toString(2));
 *   }, [bit]);
 *
 *   return (
 *     <div>
 *       <button onClick={handleBitOperation}>
 *         Perform Bit Operations
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function FlagManager() {
 *   const bit = useBit();
 *   const [flags, setFlags] = useState(0);
 *
 *   const toggleFlag = useCallback((position: BitPosition) => {
 *     setFlags(prev => bit.toggleBit(prev, position));
 *   }, [bit]);
 *
 *   const hasPermission = useCallback((permission: number) => {
 *     return bit.hasAllFlags(flags, permission);
 *   }, [bit, flags]);
 *
 *   return (
 *     <div>
 *       <p>Current flags: {flags.toString(2).padStart(8, '0')}</p>
 *       <button onClick={() => toggleFlag(0)}>Toggle Read</button>
 *       <button onClick={() => toggleFlag(1)}>Toggle Write</button>
 *       <button onClick={() => toggleFlag(2)}>Toggle Execute</button>
 *       <p>Has read permission: {hasPermission(bit.MASKS.BIT_0) ? 'Yes' : 'No'}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBit(options: UseBitOptions = {}): UseBitReturn {
  const { enableValidation: _enableValidation = true } = options;

  // 기본 비트 조작 메서드들을 useCallback으로 최적화
  const isPowerOfTwo = useCallback((n: number) => BitUtils.isPowerOfTwo(n), []);
  const setBit = useCallback((x: number, position: BitPosition) => BitUtils.setBit(x, position), []);
  const clearBit = useCallback((x: number, position: BitPosition) => BitUtils.clearBit(x, position), []);
  const toggleBit = useCallback((x: number, position: BitPosition) => BitUtils.toggleBit(x, position), []);
  const testBit = useCallback((x: number, position: BitPosition) => BitUtils.testBit(x, position), []);

  // 비트 시프트 및 회전 메서드들
  const rotateLeft = useCallback((x: number, positions: RotationPosition) => BitUtils.rotateLeft(x, positions), []);
  const rotateRight = useCallback((x: number, positions: RotationPosition) => BitUtils.rotateRight(x, positions), []);
  const leftShift = useCallback((x: number, positions: number) => BitUtils.leftShift(x, positions), []);
  const rightShift = useCallback((x: number, positions: number) => BitUtils.rightShift(x, positions), []);

  // 팝카운트 및 분석 메서드들
  const popCount = useCallback((x: number) => BitUtils.popCount(x), []);
  const reverseBits = useCallback((x: number) => BitUtils.reverseBits(x), []);
  const countLeadingZeros = useCallback((x: number) => BitUtils.countLeadingZeros(x), []);
  const countTrailingZeros = useCallback((x: number) => BitUtils.countTrailingZeros(x), []);

  // 비트 추출 및 삽입 메서드들
  const extractBits = useCallback(
    (x: number, start: BitPosition, length: BitLengthWithZero) => BitUtils.extractBits(x, start, length),
    []
  );
  const insertBits = useCallback(
    (x: number, bits: number, start: BitPosition, length?: BitLengthWithZero) =>
      BitUtils.insertBits(x, bits, start, length),
    []
  );

  // 플래그 연산 메서드들
  const hasAllFlags = useCallback((mask: number, flags: number) => BitUtils.hasAllFlags(mask, flags), []);
  const hasAnyFlag = useCallback((mask: number, flags: number) => BitUtils.hasAnyFlag(mask, flags), []);

  // 유틸리티 함수들
  const getCacheStats = useCallback(() => BitUtils.getCacheStats(), []);
  const clearAllCaches = useCallback(() => BitUtils.clearAllCaches(), []);

  // 마스크 상수를 메모이제이션
  const MASKS = useMemo(() => BitUtils.MASKS, []);

  return {
    // 기본 비트 조작
    isPowerOfTwo,
    setBit,
    clearBit,
    toggleBit,
    testBit,

    // 비트 시프트 및 회전
    rotateLeft,
    rotateRight,
    leftShift,
    rightShift,

    // 팝카운트 및 분석
    popCount,
    reverseBits,
    countLeadingZeros,
    countTrailingZeros,

    // 비트 추출 및 삽입
    extractBits,
    insertBits,

    // 플래그 연산
    hasAllFlags,
    hasAnyFlag,

    // 유틸리티 함수
    isValidBitLength,
    createBitLength,
    getCacheStats,
    clearAllCaches,

    // 마스크 상수
    MASKS,
  };
}

export default useBit;
