import { AdaptiveLRUCache, type CacheStats } from './cache-strategy';

/**
 * 0~31까지의 비트 위치를 나타내는 타입입니다.
 * @remarks
 * 비트 연산에서 사용되는 합법적인 비트 인덱스를 엄격하게 제한합니다.
 * 예시: 0(최하위 비트) ~ 31(최상위 비트)
 */
export type BitPosition =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31;

/**
 * 1~32까지의 비트 길이를 나타내는 타입입니다.
 * @remarks
 * 비트 연산에서 사용되는 유효한 길이 값을 엄격하게 제한합니다.
 */
export type BitLength =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32;

/**
 * 0~32까지의 비트 길이를 나타내는 브랜드 타입입니다.
 * @remarks
 * 브랜드 타입을 사용하여 컴파일 타임에 더 강력한 타입 검증을 제공합니다.
 * 런타임 에러 대신 TypeScript 컴파일 에러로 잘못된 값을 사전에 차단합니다.
 */
export type BitLengthWithZero = 0 | BitLength;

/**
 * 비트 길이 값이 유효한지 컴파일 타임에 검증하는 타입 가드입니다.
 * @param length 검증할 길이 값
 * @returns 유효한 BitLengthWithZero인지 여부
 */
export function isValidBitLength(length: number): length is BitLengthWithZero {
  return Number.isInteger(length) && length >= 0 && length <= 32;
}

/**
 * 안전한 비트 길이 생성 함수입니다.
 * @param length 길이 값
 * @returns 검증된 BitLengthWithZero 또는 에러
 * @throws {RangeError} 유효하지 않은 길이인 경우
 */
export function createBitLength(length: number): BitLengthWithZero {
  if (!isValidBitLength(length)) {
    throw new RangeError(`Invalid bit length: ${length}. Must be 0-32.`);
  }
  return length;
}

/**
 * 1~31까지의 회전 위치를 나타내는 타입입니다.
 * @remarks
 * 회전 연산에서 0은 의미가 없으므로 제외하고, 1~31만 허용합니다.
 * 0으로 회전하는 것은 원본과 동일한 결과를 반환하므로 불필요합니다.
 */
export type RotationPosition = Exclude<BitPosition, 0>;

/**
 * @class BitUtils
 * @description 32비트 정수 전용 비트 연산 유틸리티 클래스
 * @remarks
 * 이 클래스는 JavaScript의 32비트 정수 범위(-2^31 ~ 2^31-1)에서 안전하게 동작하는
 * 비트 연산 메서드들을 제공합니다. 모든 메서드는 정적 메서드로 구현되어 있으며,
 * 입력값에 대한 엄격한 검증을 수행합니다.
 *
 * @example
 * ```typescript
 * // 비트 설정 및 테스트
 * const value = BitUtils.setBit(0, 3); // 8 (1000₂)
 * const isSet = BitUtils.testBit(value, 3); // true
 *
 * // 비트 카운팅
 * const count = BitUtils.popCount(15); // 4 (1111₂의 설정된 비트 수)
 *
 * // 회전 연산
 * const rotated = BitUtils.rotateLeft(1, 2); // 4 (00...001 → 00...100)
 *
 * // 비트 추출 및 삽입
 * const extracted = BitUtils.extractBits(0b11110000, 4, 4); // 15 (1111₂)
 * const inserted = BitUtils.insertBits(0, 0b1111, 4); // 240 (11110000₂)
 * ```
 */
class BitUtils {
  private static readonly MAX_32BIT = 0x7fffffff;
  private static readonly MIN_32BIT = -0x80000000;

  // AdaptiveLRUCache를 활용한 성능 최적화 캐시
  private static readonly powerOfTwoCache = new AdaptiveLRUCache<number, boolean>(1000);
  private static readonly popCountCache = new AdaptiveLRUCache<number, number>(1000);

  /**
   * 현재 환경에서 입력값 검증을 수행해야 하는지 판단합니다.
   *
   * @returns 프로덕션 모드가 아닌 경우 true, 프로덕션 모드인 경우 false
   */
  private static shouldValidate(): boolean {
    return import.meta.env.MODE !== 'production';
  }

  /**
   * 주어진 값이 32비트 정수 범위에 속하는지 검증하고, 안전하게 32비트 정수로 변환합니다.
   *
   * @param x 검사 및 변환할 값
   * @param methodName (선택) 오류 메시지에 사용할 메서드 이름
   * @returns 변환된 32비트 정수 값
   * @throws {TypeError} x가 정수가 아닐 경우
   * @throws {RangeError} x가 32비트 정수 범위를 벗어난 경우
   *
   * @example
   * ```typescript
   * BitUtils['validate32Bit'](123); // 123
   * BitUtils['validate32Bit'](3.14); // TypeError 발생
   * BitUtils['validate32Bit'](2 ** 40); // RangeError 발생
   * ```
   */
  private static validate32Bit(x: number, methodName: string = 'BitUtils'): number {
    // 프로덕션에서도 NaN/Infinity 체크 (최소한의 안전성)
    if (!Number.isFinite(x)) {
      throw new TypeError(`${methodName}: Input must be a finite number, got ${x}`);
    }

    if (this.shouldValidate()) {
      if (!Number.isInteger(x)) {
        throw new TypeError(`${methodName}: Input must be an integer, got ${typeof x}`);
      }
      // 32비트 부호 없는 정수 범위도 허용 (0 ~ 2^32-1)
      if (x < this.MIN_32BIT || x > 0xffffffff) {
        throw new RangeError(`${methodName}: Value ${x} is outside 32-bit integer range`);
      }
    }
    return x >>> 0; // 항상 부호 없는 32비트로 변환
  }

  // ===== 기본 비트 조작 =====

  /**
   * 주어진 정수가 2의 거듭제곱인지 판별합니다.
   *
   * @param n 검사할 정수
   * @returns n이 2의 거듭제곱이면 `true`, 아니면 `false`
   *
   * @remarks
   * - 0 또는 음수는 항상 `false`를 반환합니다.
   * - 2의 거듭제곱이란, 정확히 하나의 비트만 1로 설정된 양의 정수를 의미합니다.
   * - AdaptiveLRUCache를 활용한 지능형 캐싱으로 성능을 최적화합니다.
   *
   * @example
   * ```typescript
   * BitUtils.isPowerOfTwo(1);   // true (2^0)
   * BitUtils.isPowerOfTwo(2);   // true (2^1)
   * BitUtils.isPowerOfTwo(8);   // true (2^3)
   * BitUtils.isPowerOfTwo(10);  // false
   * BitUtils.isPowerOfTwo(0);   // false
   * BitUtils.isPowerOfTwo(-4);  // false
   * ```
   */
  static isPowerOfTwo(n: number): boolean {
    if (this.shouldValidate()) {
      n = this.validate32Bit(n, 'isPowerOfTwo');
    }

    // 캐시 확인
    const cachedValue = this.powerOfTwoCache.get(n);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const result = n > 0 && (n & (n - 1)) === 0;

    // 캐시에 저장
    this.powerOfTwoCache.set(n, result);

    return result;
  }

  /**
   * 주어진 32비트 정수 `x`에서 지정한 비트 위치 `position`의 비트를 1로 설정합니다.
   *
   * @param x 비트를 설정할 32비트 정수 값
   * @param position 1로 설정할 비트의 위치 (0=최하위 비트, 31=최상위 비트)
   * @returns 지정 위치의 비트가 1로 설정된 새로운 32비트 정수 값
   *
   * @throws {TypeError} x가 정수가 아니거나 32비트 범위를 벗어난 경우
   *
   * @example
   * ```typescript
   * BitUtils.setBit(0, 2);      // 결과: 4 (이진수: 0b100)
   * BitUtils.setBit(5, 0);      // 결과: 5 (이진수: 0b101, 이미 설정됨)
   * BitUtils.setBit(8, 3);      // 결과: 8 (이진수: 0b1000, 이미 설정됨)
   * BitUtils.setBit(8, 0);      // 결과: 9 (이진수: 0b1001)
   * ```
   */
  static setBit(x: number, position: BitPosition): number {
    x = this.validate32Bit(x, 'setBit');
    return (x | (1 << position)) >>> 0;
  }

  /**
   * 주어진 32비트 정수 `x`에서 지정한 비트 위치 `position`의 비트를 0으로 클리어합니다.
   *
   * @param x 비트를 클리어할 32비트 정수 값
   * @param position 0으로 만들 비트의 위치 (0=최하위 비트, 31=최상위 비트)
   * @returns 지정 위치의 비트가 0으로 클리어된 새로운 32비트 정수 값
   *
   * @throws {TypeError} x가 정수가 아니거나 32비트 범위를 벗어난 경우
   *
   * @example
   * ```typescript
   * BitUtils.clearBit(7, 1);    // 결과: 5 (이진수: 0b111 → 0b101)
   * BitUtils.clearBit(15, 3);   // 결과: 7 (이진수: 0b1111 → 0b0111)
   * BitUtils.clearBit(8, 3);    // 결과: 0 (이진수: 0b1000 → 0b0000)
   * ```
   */
  static clearBit(x: number, position: BitPosition): number {
    x = this.validate32Bit(x, 'clearBit');
    return (x & ~(1 << position)) >>> 0;
  }

  /**
   * 주어진 32비트 정수 `x`에서 지정한 비트 위치 `position`의 비트를 반전(토글)시킵니다.
   *
   * @param x 비트를 토글할 32비트 정수 값
   * @param position 반전할 비트의 위치 (0=최하위 비트, 31=최상위 비트)
   * @returns 지정 위치의 비트가 반전된 새로운 32비트 정수 값
   *
   * @throws {TypeError} x가 정수가 아니거나 32비트 범위를 벗어난 경우
   *
   * @example
   * ```typescript
   * BitUtils.toggleBit(0b1010, 1); // 결과: 8 (이진수: 0b1010 → 0b1000)
   * BitUtils.toggleBit(0b1000, 3); // 결과: 0 (이진수: 0b1000 → 0b0000)
   * BitUtils.toggleBit(0b0000, 0); // 결과: 1 (이진수: 0b0000 → 0b0001)
   * ```
   */
  static toggleBit(x: number, position: BitPosition): number {
    x = this.validate32Bit(x, 'toggleBit');
    return (x ^ (1 << position)) >>> 0;
  }

  /**
   * 주어진 32비트 정수 `x`에서 지정한 비트 위치 `position`의 비트가 1인지 확인합니다.
   *
   * @param x 검사할 32비트 정수 값
   * @param position 검사할 비트의 위치 (0=최하위 비트, 31=최상위 비트)
   * @returns 지정 위치의 비트가 1이면 `true`, 아니면 `false`
   *
   * @throws {TypeError} x가 정수가 아니거나 32비트 범위를 벗어난 경우
   *
   * @example
   * ```typescript
   * BitUtils.testBit(5, 0);    // 결과: true (이진수: 0b101, 0번째 비트: 1)
   * BitUtils.testBit(5, 1);    // 결과: false (이진수: 0b101, 1번째 비트: 0)
   * BitUtils.testBit(8, 3);    // 결과: true (이진수: 0b1000, 3번째 비트: 1)
   * BitUtils.testBit(8, 0);    // 결과: false (이진수: 0b1000, 0번째 비트: 0)
   * ```
   */
  static testBit(x: number, position: BitPosition): boolean {
    x = this.validate32Bit(x, 'testBit');
    return (x & (1 << position)) !== 0;
  }

  // ===== 비트 시프트 및 회전 =====

  /**
   * 주어진 32비트 정수 `x`를 왼쪽으로 `positions`만큼 순환 시프트(rotate, 롤)합니다.
   *
   * @param x      왼쪽 회전할 32비트 정수 값
   * @param positions 왼쪽으로 회전할 비트 수 (1~31)
   * @returns      왼쪽으로 회전된 32비트 부호 없는 정수 값
   *
   * @throws {TypeError} x가 정수가 아니거나 32비트 범위를 벗어난 경우
   * @throws {RangeError} positions가 1~31 범위를 벗어난 경우
   *
   * @remarks
   * - 0으로 회전하는 것은 의미가 없으므로 1~31만 허용합니다.
   * - JavaScript의 비트 연산 특성을 이용하여 부호 없는 32비트 정수로 결과가 반환됩니다.
   *
   * @example
   * ```typescript
   * BitUtils.rotateLeft(0b0001, 2);         // 0b0100, 결과: 4
   * BitUtils.rotateLeft(0x80000000, 1);     // 0x00000001, 최상위 비트가 순환
   * BitUtils.rotateLeft(0b10100000, 3);     // 0b00000101_000
   * BitUtils.rotateLeft(0xffffffff, 16);    // 0xffffffff, 모든 비트가 1
   * ```
   */
  static rotateLeft(x: number, positions: RotationPosition): number {
    x = this.validate32Bit(x, 'rotateLeft');
    return ((x << positions) | (x >>> (32 - positions))) >>> 0;
  }

  /**
   * 주어진 32비트 정수 `x`를 오른쪽으로 `positions`만큼 순환 시프트(rotate, 롤)합니다.
   *
   * @param x 오른쪽 회전할 32비트 정수 값
   * @param positions 오른쪽으로 회전할 비트 수 (1~31)
   * @returns 오른쪽으로 회전된 32비트 부호 없는 정수 값
   *
   * @throws {TypeError} x가 정수가 아니거나 32비트 범위를 벗어난 경우
   * @throws {RangeError} positions가 1~31 범위를 벗어난 경우
   *
   * @remarks
   * - 0으로 회전하는 것은 의미가 없으므로 1~31만 허용합니다.
   * - JavaScript의 비트 연산 특성을 이용하여 부호 없는 32비트 정수로 결과가 반환됩니다.
   *
   * @example
   * ```typescript
   * BitUtils.rotateRight(0b0100, 2);        // 0b0001_0000_0000_0000_0000_0000_0000_0001, 결과: 1
   * BitUtils.rotateRight(0x80000000, 1);    // 0x40000000, 최상위 비트가 오른쪽으로 이동
   * BitUtils.rotateRight(0b10100000, 3);    // 0b00010100_000
   * BitUtils.rotateRight(0xffffffff, 16);   // 0xffffffff, 모든 비트가 1
   * ```
   */
  static rotateRight(x: number, positions: RotationPosition): number {
    x = this.validate32Bit(x, 'rotateRight');
    return ((x >>> positions) | (x << (32 - positions))) >>> 0;
  }

  // ===== 팝카운트 및 분석 =====

  /**
   * 주어진 32비트 정수 `x`에서 1로 설정된 비트(설정 비트, set bit)의 개수를 반환합니다.
   *
   * @param x 팝카운트를 계산할 32비트 정수 값
   * @returns `x`의 2진수 표현에서 1로 설정된 비트(설정 비트)의 개수
   *
   * @throws {TypeError} x가 정수가 아니거나 32비트 범위를 벗어난 경우
   *
   * @remarks
   * - 팝카운트(popcount)는 2진수에서 1의 개수를 의미합니다.
   * - Brian Kernighan 알고리즘을 사용하여 효율적으로 계산합니다.
   * - 입력값이 0이면 0을 반환합니다.
   * - 입력값이 음수일 경우 32비트 2의 보수 표현 기준으로 팝카운트를 계산합니다.
   * - AdaptiveLRUCache를 활용한 지능형 캐싱으로 성능을 최적화합니다.
   *
   * @example
   * ```typescript
   * BitUtils.popCount(0);        // 0
   * BitUtils.popCount(15);       // 4 (0000...1111)
   * BitUtils.popCount(0b1011);   // 3
   * BitUtils.popCount(-1);       // 32 (0xffffffff)
   * BitUtils.popCount(0x80000000); // 1 (최상위 비트만 1)
   * ```
   */
  static popCount(x: number): number {
    x = this.validate32Bit(x, 'popCount');

    const unsignedX = x >>> 0;

    // 캐시 확인
    const cachedValue = this.popCountCache.get(unsignedX);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    let count = 0;
    let temp = unsignedX;
    while (temp) {
      count++;
      temp &= temp - 1;
    }

    // 캐시에 저장
    this.popCountCache.set(unsignedX, count);

    return count;
  }

  /**
   * 주어진 32비트 정수의 비트 순서를 뒤집습니다.
   *
   * @param x 비트 순서를 뒤집을 32비트 정수 값
   * @returns 비트 순서가 뒤집힌 32비트 정수 값
   *
   * @throws {TypeError} x가 정수가 아니거나 32비트 범위를 벗어난 경우
   *
   * @remarks
   * - 최하위 비트가 최상위 비트가 되고, 최상위 비트가 최하위 비트가 됩니다.
   * - 8비트 lookup table을 사용하여 성능을 최적화합니다.
   * - 예: 0b00000001 → 0b10000000_00000000_00000000_00000000
   *
   * @example
   * ```typescript
   * BitUtils.reverseBits(0b00000001); // 0x80000000
   * BitUtils.reverseBits(0b11110000); // 0x0f000000
   * BitUtils.reverseBits(0x12345678); // 0x1e6a2c48
   * ```
   */
  static reverseBits(x: number): number {
    x = this.validate32Bit(x, 'reverseBits');

    // reverseBits 최적화를 위한 8비트 lookup table
    this.initializeReverseLookup();

    const unsignedX = x >>> 0;

    // 8비트씩 나누어 lookup table로 처리 (타입 안전성 보장)
    const byte0 = this.REVERSE_LOOKUP[unsignedX & 0xff] ?? 0;
    const byte1 = this.REVERSE_LOOKUP[(unsignedX >>> 8) & 0xff] ?? 0;
    const byte2 = this.REVERSE_LOOKUP[(unsignedX >>> 16) & 0xff] ?? 0;
    const byte3 = this.REVERSE_LOOKUP[(unsignedX >>> 24) & 0xff] ?? 0;

    // 바이트 순서를 뒤집어서 조합
    return ((byte0 << 24) | (byte1 << 16) | (byte2 << 8) | byte3) >>> 0;
  }

  // reverseBits 최적화를 위한 8비트 lookup table
  private static readonly REVERSE_LOOKUP = new Uint8Array(256);
  private static isLookupInitialized = false;

  /**
   * 8비트 역순 lookup table을 초기화합니다.
   * @private
   */
  private static initializeReverseLookup(): void {
    if (this.isLookupInitialized) return;

    for (let i = 0; i < 256; i++) {
      let reversed = 0;
      let value = i;
      for (let bit = 0; bit < 8; bit++) {
        reversed = (reversed << 1) | (value & 1);
        value >>>= 1;
      }
      this.REVERSE_LOOKUP[i] = reversed;
    }
    this.isLookupInitialized = true;
  }

  // ===== 새로운 비트 조작 메서드 =====

  /**
   * 주어진 비트 값의 유효 비트 길이를 계산합니다.
   * @private
   * @param bits 길이를 계산할 비트 값
   * @returns 유효 비트 길이 (0~32)
   * @remarks
   * - bits가 0이면 0을 반환 (아무것도 삽입하지 않음)
   * - 그 외의 경우 Math.clz32를 사용하여 효율적으로 계산
   */
  private static calcBitLength(bits: number): BitLengthWithZero {
    if (bits === 0) {
      return 0;
    }
    return (32 - Math.clz32(bits)) as BitLengthWithZero;
  }

  /**
   * 주어진 32비트 정수에서 지정된 위치와 길이의 비트들을 추출합니다.
   *
   * @param x 비트를 추출할 32비트 정수 값
   * @param start 추출을 시작할 비트 위치 (0=최하위 비트)
   * @param length 추출할 비트의 개수 (1~32)
   * @returns 추출된 비트들로 구성된 정수 값
   *
   * @throws {TypeError} x가 정수가 아니거나 32비트 범위를 벗어난 경우
   * @throws {RangeError} start나 length가 유효하지 않은 경우
   *
   * @remarks
   * - start + length는 32를 초과할 수 없습니다.
   * - 추출된 비트들은 최하위 비트부터 배치됩니다.
   *
   * @example
   * ```typescript
   * BitUtils.extractBits(0b11110000, 4, 4); // 15 (0b1111)
   * BitUtils.extractBits(0b10101010, 1, 3); // 5 (0b101)
   * BitUtils.extractBits(0xff00ff00, 8, 8); // 255 (0b11111111)
   * ```
   */
  static extractBits(x: number, start: BitPosition, length: BitLengthWithZero): number {
    x = this.validate32Bit(x, 'extractBits');

    // 음수 검증
    if (start < 0) {
      throw new RangeError('extractBits: start must be non-negative');
    }
    if (length < 0) {
      throw new RangeError('extractBits: length must be non-negative');
    }

    // 0 길이인 경우 0 반환
    if (length === 0) {
      return 0;
    }

    if (start + length > 32) {
      throw new RangeError('extractBits: start + length must not exceed 32');
    }

    // 32비트 전체를 추출하는 경우 특별 처리
    if (length === 32) {
      return (x >>> start) >>> 0;
    }

    const maskedBits = (x >>> start) & ((1 << length) - 1);
    return maskedBits >>> 0;
  }

  /**
   * 주어진 32비트 정수의 지정된 위치에 비트들을 삽입합니다.
   *
   * @param x 비트를 삽입할 대상 32비트 정수 값
   * @param bits 삽입할 비트 값
   * @param start 삽입을 시작할 비트 위치 (0=최하위 비트)
   * @param length 삽입할 비트의 개수 (기본값: bits의 유효 비트 수)
   * @returns 비트가 삽입된 새로운 32비트 정수 값
   *
   * @throws {TypeError} x나 bits가 정수가 아니거나 32비트 범위를 벗어난 경우
   * @throws {RangeError} start나 length가 유효하지 않은 경우
   *
   * @remarks
   * - 기존 위치의 비트들은 삽입되는 비트들로 덮어씌워집니다.
   * - length를 지정하지 않으면 bits의 유효 비트 수를 자동 계산합니다.
   * - 타입 안전성을 위해 length는 컴파일 타임에 검증됩니다.
   *
   * @example
   * ```typescript
   * BitUtils.insertBits(0, 0b1111, 4, 4);     // 240 (0b11110000)
   * BitUtils.insertBits(0b11110000, 0b101, 1, 3); // 234 (0b11101010)
   * BitUtils.insertBits(0xff00ff00, 0b1010, 4, 4); // 0xff00ffa0
   *
   * // 타입 안전한 길이 사용
   * const safeLength = createBitLength(4);
   * BitUtils.insertBits(0, 0b1111, 4, safeLength); // 컴파일 타임 안전
   * ```
   */
  static insertBits(x: number, bits: number, start: BitPosition, length?: BitLengthWithZero): number {
    x = this.validate32Bit(x, 'insertBits');
    bits = this.validate32Bit(bits, 'insertBits');

    // length가 지정되지 않으면 bits의 유효 비트 수 계산
    if (length === undefined) {
      length = this.calcBitLength(bits);
    }

    // 런타임에서도 타입 안전성 보장
    if (!isValidBitLength(length)) {
      throw new RangeError(`insertBits: Invalid length ${length}. Use createBitLength() for type-safe values.`);
    }

    if (start + length > 32) {
      throw new RangeError('insertBits: start + length must not exceed 32');
    }

    // length가 0이면 아무것도 삽입하지 않음
    if (length === 0) {
      return x >>> 0;
    }

    const mask = ((1 << length) - 1) << start;
    const maskedBits = (bits & ((1 << length) - 1)) << start;
    return ((x & ~mask) | maskedBits) >>> 0;
  }

  // ===== 마스크 상수 =====

  /**
   * 32비트 마스크 상수 집합
   *
   * - 각 비트 및 바이트 단위로 사용할 수 있는 마스크 상수를 제공합니다.
   * - FLAG, 비트 연산, 마스킹 등 다양한 비트 조작 연산에 활용할 수 있습니다.
   *
   * @property BIT_0  최하위 비트(0번 비트)만 1인 마스크 (0x00000001)
   * @property BIT_1  1번 비트만 1인 마스크 (0x00000002)
   * @property BIT_2  2번 비트만 1인 마스크 (0x00000004)
   * @property BIT_3  3번 비트만 1인 마스크 (0x00000008)
   * @property BYTE_0 하위 8비트(0~7)만 1인 마스크 (0x000000ff)
   * @property BYTE_1 8~15비트만 1인 마스크 (0x0000ff00)
   * @property BYTE_2 16~23비트만 1인 마스크 (0x00ff0000)
   * @property BYTE_3 최상위 8비트(24~31)만 1인 마스크 (0xff000000)
   * @property ALL_BITS 모든 비트가 1인 마스크 (0xffffffff)
   * @property SIGN_BIT 부호 비트(31번 비트)만 1인 마스크 (0x80000000)
   *
   * @example
   * ```typescript
   * BitUtils.MASKS.BIT_0;      // 0x00000001
   * BitUtils.MASKS.BYTE_3;     // 0xff000000
   * BitUtils.MASKS.ALL_BITS;   // 0xffffffff
   * BitUtils.MASKS.SIGN_BIT;   // 0x80000000
   * ```
   */
  static readonly MASKS = Object.freeze({
    /** 최하위 비트(0번 비트)만 1인 마스크 (0x00000001) */
    BIT_0: 0x00000001,
    /** 1번 비트만 1인 마스크 (0x00000002) */
    BIT_1: 0x00000002,
    /** 2번 비트만 1인 마스크 (0x00000004) */
    BIT_2: 0x00000004,
    /** 3번 비트만 1인 마스크 (0x00000008) */
    BIT_3: 0x00000008,
    /** 하위 8비트(0~7)만 1인 마스크 (0x000000ff) */
    BYTE_0: 0x000000ff,
    /** 8~15비트만 1인 마스크 (0x0000ff00) */
    BYTE_1: 0x0000ff00,
    /** 16~23비트만 1인 마스크 (0x00ff0000) */
    BYTE_2: 0x00ff0000,
    /** 최상위 8비트(24~31)만 1인 마스크 (0xff000000) */
    BYTE_3: 0xff000000,
    /** 모든 비트가 1인 마스크 (0xffffffff) */
    ALL_BITS: 0xffffffff,
    /** 부호 비트(31번 비트)만 1인 마스크 (0x80000000) */
    SIGN_BIT: 0x80000000,
  } as const);

  // ===== 플래그 연산 =====

  /**
   * 주어진 32비트 정수 `mask`에서 `flags`로 지정한 모든 플래그(비트)가 설정되어 있는지 확인합니다.
   *
   * @param mask 검사할 32비트 정수 값(비트 집합)
   * @param flags 확인할 플래그 비트 집합(1로 설정된 비트가 모두 mask에 존재해야 true)
   * @returns `mask`에 `flags`의 모든 비트가 1로 설정되어 있으면 `true`, 아니면 `false`
   *
   * @throws {TypeError} mask 또는 flags가 정수가 아니거나 32비트 범위를 벗어난 경우
   *
   * @remarks
   * - 이 함수는 AND 연산 결과가 flags와 동일한지를 비교하여 모든 비트가 설정되었는지 확인합니다.
   * - flags가 0이면 항상 true를 반환합니다(0은 아무 비트도 요구하지 않으므로).
   *
   * @example
   * ```typescript
   * BitUtils.hasAllFlags(0b1101, 0b1001); // true (mask: 1101, flags: 1001)
   * BitUtils.hasAllFlags(0b1101, 0b1111); // false (mask: 1101, flags: 1111)
   * BitUtils.hasAllFlags(0b1010, 0b0010); // true (mask: 1010, flags: 0010)
   * BitUtils.hasAllFlags(0b1010, 0b0101); // false (mask: 1010, flags: 0101)
   * BitUtils.hasAllFlags(0b1111, 0);      // true (flags가 0이면 항상 true)
   * ```
   */
  static hasAllFlags(mask: number, flags: number): boolean {
    mask = this.validate32Bit(mask, 'hasAllFlags');
    flags = this.validate32Bit(flags, 'hasAllFlags');
    return (mask & flags) === flags;
  }

  /**
   * 주어진 32비트 정수 `mask`에서 `flags`로 지정한 플래그(비트) 중 하나 이상이 설정되어 있는지 확인합니다.
   *
   * @param mask 검사할 32비트 정수 값(비트 집합)
   * @param flags 확인할 플래그 비트 집합(비트들 중 하나라도 mask에 존재하면 true)
   * @returns `mask`에 `flags`의 비트 중 하나라도 1로 설정되어 있으면 `true`, 아니면 `false`
   *
   * @throws {TypeError} mask 또는 flags가 정수가 아니거나 32비트 범위를 벗어난 경우
   *
   * @remarks
   * - 이 함수는 AND 연산 결과가 0이 아닌지를 확인하여, 지정된 플래그 중 하나 이상이 설정되었는지 판별합니다.
   * - flags가 0이면 항상 false를 반환합니다(확인할 비트가 없으므로).
   *
   * @example
   * ```typescript
   * BitUtils.hasAnyFlag(0b1101, 0b1001); // true (mask: 1101, flags: 1001, 1번/3번 플래그 중 하나라도 있음)
   * BitUtils.hasAnyFlag(0b1101, 0b0100); // true (mask: 1101, flags: 0100, 2번 플래그 있음)
   * BitUtils.hasAnyFlag(0b1010, 0b0101); // true (mask: 1010, flags: 0101, 1번 플래그 있음)
   * BitUtils.hasAnyFlag(0b1000, 0b0111); // false (mask: 1000, flags: 0111, 일치하는 플래그 없음)
   * BitUtils.hasAnyFlag(0b1111, 0);      // false (flags가 0이면 항상 false)
   * ```
   */
  static hasAnyFlag(mask: number, flags: number): boolean {
    mask = this.validate32Bit(mask, 'hasAnyFlag');
    flags = this.validate32Bit(flags, 'hasAnyFlag');
    return (mask & flags) !== 0;
  }

  /**
   * 캐시 통계를 반환합니다.
   * @returns 캐시 히트율, 미스 수, 히트 수, 제거 수 등의 통계
   */
  static getCacheStats(): {
    powerOfTwoCache: CacheStats;
    popCountCache: CacheStats;
    combinedHitRate: number;
  } {
    const powerStats = this.powerOfTwoCache.getStats();
    const popStats = this.popCountCache.getStats();

    const totalHits = powerStats.hits + popStats.hits;
    const totalMisses = powerStats.misses + popStats.misses;
    const combinedHitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

    return {
      powerOfTwoCache: powerStats,
      popCountCache: popStats,
      combinedHitRate,
    };
  }

  /**
   * 주어진 32비트 정수 `x`의 이진수 표현에서 선행 0(leading zero)의 개수를 반환합니다.
   *
   * @param x 선행 0의 개수를 계산할 32비트 정수 값
   * @returns `x`의 2진수 표현에서 앞부분에 연속으로 나타나는 0의 개수 (0~32)
   *
   * @throws {TypeError} x가 정수가 아니거나 32비트 범위를 벗어난 경우
   *
   * @remarks
   * - `x`가 0이면 32를 반환합니다.
   * - JavaScript의 `Math.clz32`를 사용하여 부호 없는 32비트 정수로 처리합니다.
   * - 예를 들어, 8(`0b00000000_00000000_00000000_00001000`)의 선행 0 개수는 28입니다.
   *
   * @example
   * ```typescript
   * BitUtils.countLeadingZeros(0);      // 32
   * BitUtils.countLeadingZeros(1);      // 31
   * BitUtils.countLeadingZeros(8);      // 28
   * BitUtils.countLeadingZeros(0x80000000); // 0
   * ```
   */
  static countLeadingZeros(x: number): number {
    x = this.validate32Bit(x, 'countLeadingZeros');
    return Math.clz32(x);
  }

  /**
   * 주어진 32비트 정수 `x`의 이진수 표현에서 후행 0(trailing zero)의 개수를 반환합니다.
   *
   * @param x 후행 0의 개수를 계산할 32비트 정수 값
   * @returns `x`의 2진수 표현에서 끝부분(최하위 비트)부터 연속으로 나타나는 0의 개수 (0~32)
   *
   * @throws {TypeError} x가 정수가 아니거나 32비트 범위를 벗어난 경우
   *
   * @remarks
   * - `x`가 0이면 32를 반환합니다.
   * - Brian Kernighan 알고리즘과 `Math.clz32`를 활용해 효율적으로 계산합니다.
   * - 예를 들어, 8(`0b00000000_00000000_00000000_00001000`)의 후행 0 개수는 3입니다.
   *
   * @example
   * ```typescript
   * BitUtils.countTrailingZeros(0);      // 32
   * BitUtils.countTrailingZeros(1);      // 0
   * BitUtils.countTrailingZeros(8);      // 3
   * BitUtils.countTrailingZeros(0x80000000); // 31
   * ```
   */
  static countTrailingZeros(x: number): number {
    x = this.validate32Bit(x, 'countTrailingZeros');
    if (x === 0) return 32;
    return 31 - Math.clz32(x & -x);
  }

  /**
   * 모든 캐시를 초기화합니다.
   * @remarks
   * 테스트나 메모리 정리 목적으로 사용됩니다.
   */
  static clearAllCaches(): void {
    this.powerOfTwoCache.clear();
    this.popCountCache.clear();
  }
}

export default BitUtils;
