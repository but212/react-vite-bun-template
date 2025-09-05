import { useCallback, useMemo } from 'react';
import BitUtils, {
  type BitLengthWithZero,
  type BitPosition,
  type RotationPosition,
  createBitLength,
  isValidBitLength,
} from '../lib/utils/bit-utils';
import type { CacheStats } from '../lib/utils/cache-strategy';

/**
 * useBit 훅을 위한 옵션 객체입니다.
 *
 * @property enableValidation - 개발 모드에서 입력값 검증을 활성화할지 여부 (기본값: true)
 */
export interface UseBitOptions {
  /** 개발 모드에서 입력값 검증을 활성화할지 여부 (기본값: true) */
  enableValidation?: boolean;
}

/**
 * useBit 훅이 반환하는 비트 연산 유틸리티 객체의 타입입니다.
 *
 * @interface UseBitReturn
 *
 * @property isPowerOfTwo           - 주어진 수가 2의 거듭제곱인지 확인합니다.
 * @property setBit                 - 지정한 위치의 비트를 1로 설정합니다.
 * @property clearBit               - 지정한 위치의 비트를 0으로 클리어합니다.
 * @property toggleBit              - 지정한 위치의 비트를 반전(토글)합니다.
 * @property testBit                - 지정한 위치의 비트가 1인지 확인합니다.
 *
 * @property rotateLeft             - 비트를 왼쪽으로 순환(rotate)합니다.
 * @property rotateRight            - 비트를 오른쪽으로 순환(rotate)합니다.
 * @property leftShift              - 비트를 왼쪽으로 시프트합니다.
 * @property rightShift             - 비트를 오른쪽으로 시프트합니다.
 *
 * @property popCount               - 1로 설정된 비트의 개수를 셉니다.
 * @property reverseBits            - 비트 순서를 반전합니다.
 * @property countLeadingZeros      - 선행 0의 개수를 셉니다.
 * @property countTrailingZeros     - 후행 0의 개수를 셉니다.
 *
 * @property extractBits            - 지정 범위의 비트들을 추출합니다.
 * @property insertBits             - 지정 범위에 비트들을 삽입합니다.
 *
 * @property hasAllFlags            - 모든 플래그가 마스크에 포함되어 있는지 확인합니다.
 * @property hasAnyFlag             - 플래그 중 하나라도 마스크에 포함되어 있는지 확인합니다.
 *
 * @property isValidBitLength       - 비트 길이 값의 유효성을 검사합니다.
 * @property createBitLength        - 비트 길이 값을 생성합니다.
 * @property getCacheStats          - 내부 캐시 통계를 반환합니다.
 * @property clearAllCaches         - 내부 캐시를 모두 초기화합니다.
 *
 * @property MASKS                  - 다양한 비트 마스크 상수 모음입니다.
 */
export interface UseBitReturn {
  /** 주어진 수가 2의 거듭제곱인지 확인합니다. */
  isPowerOfTwo: (n: number) => boolean;
  /** 지정한 위치의 비트를 1로 설정합니다. */
  setBit: (x: number, position: BitPosition) => number;
  /** 지정한 위치의 비트를 0으로 클리어합니다. */
  clearBit: (x: number, position: BitPosition) => number;
  /** 지정한 위치의 비트를 반전(토글)합니다. */
  toggleBit: (x: number, position: BitPosition) => number;
  /** 지정한 위치의 비트가 1인지 확인합니다. */
  testBit: (x: number, position: BitPosition) => boolean;

  /** 비트를 왼쪽으로 순환(rotate)합니다. */
  rotateLeft: (x: number, positions: RotationPosition) => number;
  /** 비트를 오른쪽으로 순환(rotate)합니다. */
  rotateRight: (x: number, positions: RotationPosition) => number;
  /** 비트를 왼쪽으로 시프트합니다. */
  leftShift: (x: number, positions: number) => number;
  /** 비트를 오른쪽으로 시프트합니다. */
  rightShift: (x: number, positions: number) => number;

  /** 1로 설정된 비트의 개수를 셉니다. */
  popCount: (x: number) => number;
  /** 비트 순서를 반전합니다. */
  reverseBits: (x: number) => number;
  /** 선행 0의 개수를 셉니다. */
  countLeadingZeros: (x: number) => number;
  /** 후행 0의 개수를 셉니다. */
  countTrailingZeros: (x: number) => number;

  /** 지정 범위의 비트들을 추출합니다. */
  extractBits: (x: number, start: BitPosition, length: BitLengthWithZero) => number;
  /** 지정 범위에 비트들을 삽입합니다. */
  insertBits: (x: number, bits: number, start: BitPosition, length?: BitLengthWithZero) => number;

  /** 모든 플래그가 마스크에 포함되어 있는지 확인합니다. */
  hasAllFlags: (mask: number, flags: number) => boolean;
  /** 플래그 중 하나라도 마스크에 포함되어 있는지 확인합니다. */
  hasAnyFlag: (mask: number, flags: number) => boolean;

  /** 비트 길이 값의 유효성을 검사합니다. */
  isValidBitLength: (length: number) => length is BitLengthWithZero;
  /** 비트 길이 값을 생성합니다. */
  createBitLength: (length: number) => BitLengthWithZero;
  /** 내부 캐시 통계를 반환합니다. */
  getCacheStats: () => {
    powerOfTwoCache: CacheStats;
    popCountCache: CacheStats;
    combinedHitRate: number;
  };
  /** 내부 캐시를 모두 초기화합니다. */
  clearAllCaches: () => void;

  /** 다양한 비트 마스크 상수 모음입니다. */
  MASKS: typeof BitUtils.MASKS;
}

/**
 * 32비트 비트 연산 유틸리티 {@link BitUtils} 를 React 컴포넌트에서 쉽고 안전하게 사용할 수 있도록 래핑한 커스텀 훅입니다.
 *
 * @remarks
 * - 모든 비트 연산 메서드는 입력값 검증과 32비트 정수 범위 보호를 내장합니다.
 * - 플래그 조작, 비트 시프트/회전, 분석(카운트, 리딩/트레일링 0 등), 마스킹, 비트 추출/삽입 등 다양한 기능을 제공합니다.
 * - 내부적으로 useCallback, useMemo로 성능 최적화가 적용되어 있습니다.
 *
 * @returns {@link UseBitReturn} 비트 유틸리티 메서드와 상수 객체
 *
 * @example
 * ```tsx
 * // 비트 연산 사용 예시
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
 *       <button onClick={handleBitOperation}>Perform Bit Operations</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // 플래그(비트필드) 관리 예시
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
export function useBit(): UseBitReturn {
  // enableValidation 옵션은 현재 사용되지 않으므로, 혼란 방지를 위해 변수 할당을 제거합니다.

  /**
   * 주어진 수가 2의 거듭제곱인지 확인합니다.
   * @param n 검사할 값
   * @returns 2의 거듭제곱이면 true, 아니면 false
   */
  const isPowerOfTwo = useCallback((n: number) => BitUtils.isPowerOfTwo(n), []);

  /**
   * 지정한 위치의 비트를 1로 설정합니다.
   * @param x 대상 값
   * @param position 비트 위치
   * @returns 비트가 1로 설정된 결과
   */
  const setBit = useCallback((x: number, position: BitPosition) => BitUtils.setBit(x, position), []);

  /**
   * 지정한 위치의 비트를 0으로 클리어합니다.
   * @param x 대상 값
   * @param position 비트 위치
   * @returns 비트가 0으로 클리어된 결과
   */
  const clearBit = useCallback((x: number, position: BitPosition) => BitUtils.clearBit(x, position), []);

  /**
   * 지정한 위치의 비트를 반전(토글)합니다.
   * @param x 대상 값
   * @param position 비트 위치
   * @returns 비트가 반전된 결과
   */
  const toggleBit = useCallback((x: number, position: BitPosition) => BitUtils.toggleBit(x, position), []);

  /**
   * 지정한 위치의 비트가 1인지 확인합니다.
   * @param x 대상 값
   * @param position 비트 위치
   * @returns 해당 위치의 비트가 1이면 true
   */
  const testBit = useCallback((x: number, position: BitPosition) => BitUtils.testBit(x, position), []);

  /**
   * 비트를 왼쪽으로 순환(rotate)합니다.
   * @param x 대상 값
   * @param positions 회전할 비트 수
   * @returns 왼쪽으로 회전된 결과
   */
  const rotateLeft = useCallback((x: number, positions: RotationPosition) => BitUtils.rotateLeft(x, positions), []);

  /**
   * 비트를 오른쪽으로 순환(rotate)합니다.
   * @param x 대상 값
   * @param positions 회전할 비트 수
   * @returns 오른쪽으로 회전된 결과
   */
  const rotateRight = useCallback((x: number, positions: RotationPosition) => BitUtils.rotateRight(x, positions), []);

  /**
   * 비트를 왼쪽으로 시프트합니다.
   * @param x 대상 값
   * @param positions 시프트할 비트 수
   * @returns 왼쪽으로 시프트된 결과
   */
  const leftShift = useCallback((x: number, positions: number) => BitUtils.leftShift(x, positions), []);

  /**
   * 비트를 오른쪽으로 시프트합니다.
   * @param x 대상 값
   * @param positions 시프트할 비트 수
   * @returns 오른쪽으로 시프트된 결과
   */
  const rightShift = useCallback((x: number, positions: number) => BitUtils.rightShift(x, positions), []);

  /**
   * 1로 설정된 비트의 개수를 셉니다.
   * @param x 대상 값
   * @returns 1로 설정된 비트의 개수
   */
  const popCount = useCallback((x: number) => BitUtils.popCount(x), []);

  /**
   * 비트 순서를 반전합니다.
   * @param x 대상 값
   * @returns 비트가 반전된 결과
   */
  const reverseBits = useCallback((x: number) => BitUtils.reverseBits(x), []);

  /**
   * 선행 0의 개수를 셉니다.
   * @param x 대상 값
   * @returns 선행 0의 개수
   */
  const countLeadingZeros = useCallback((x: number) => BitUtils.countLeadingZeros(x), []);

  /**
   * 후행 0의 개수를 셉니다.
   * @param x 대상 값
   * @returns 후행 0의 개수
   */
  const countTrailingZeros = useCallback((x: number) => BitUtils.countTrailingZeros(x), []);

  /**
   * 지정 범위의 비트들을 추출합니다.
   * @param x 대상 값
   * @param start 시작 위치
   * @param length 추출할 비트 개수
   * @returns 추출된 비트 값
   */
  const extractBits = useCallback(
    (x: number, start: BitPosition, length: BitLengthWithZero) => BitUtils.extractBits(x, start, length),
    []
  );

  /**
   * 지정 범위에 비트들을 삽입합니다.
   * @param x 대상 값
   * @param bits 삽입할 비트 값
   * @param start 시작 위치
   * @param length 삽입할 비트 개수(생략 가능)
   * @returns 비트가 삽입된 결과
   */
  const insertBits = useCallback(
    (x: number, bits: number, start: BitPosition, length?: BitLengthWithZero) =>
      BitUtils.insertBits(x, bits, start, length),
    []
  );

  /**
   * 모든 플래그가 마스크에 포함되어 있는지 확인합니다.
   * @param mask 마스크 값
   * @param flags 확인할 플래그 값
   * @returns 모두 포함되면 true
   */
  const hasAllFlags = useCallback((mask: number, flags: number) => BitUtils.hasAllFlags(mask, flags), []);

  /**
   * 플래그 중 하나라도 마스크에 포함되어 있는지 확인합니다.
   * @param mask 마스크 값
   * @param flags 확인할 플래그 값
   * @returns 하나라도 포함되면 true
   */
  const hasAnyFlag = useCallback((mask: number, flags: number) => BitUtils.hasAnyFlag(mask, flags), []);

  /**
   * 내부 캐시 통계를 반환합니다.
   * @returns 캐시 통계 정보
   */
  const getCacheStats = useCallback(() => BitUtils.getCacheStats(), []);

  /**
   * 내부 캐시를 모두 초기화합니다.
   */
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
