import { describe, expect, test } from 'vitest';
import BitUtils from './bit-utils';

describe('BitUtils', () => {
  describe('isPowerOfTwo', () => {
    test('2의 거듭제곱 판별 - 정상 케이스', () => {
      expect(BitUtils.isPowerOfTwo(1)).toBe(true); // 2^0
      expect(BitUtils.isPowerOfTwo(2)).toBe(true); // 2^1
      expect(BitUtils.isPowerOfTwo(4)).toBe(true); // 2^2
      expect(BitUtils.isPowerOfTwo(8)).toBe(true); // 2^3
      expect(BitUtils.isPowerOfTwo(1024)).toBe(true); // 2^10
    });

    test('2의 거듭제곱이 아닌 경우', () => {
      expect(BitUtils.isPowerOfTwo(0)).toBe(false);
      expect(BitUtils.isPowerOfTwo(3)).toBe(false);
      expect(BitUtils.isPowerOfTwo(10)).toBe(false);
      expect(BitUtils.isPowerOfTwo(-4)).toBe(false);
    });
  });

  describe('setBit', () => {
    test('비트 설정 - 정상 케이스', () => {
      expect(BitUtils.setBit(0, 2)).toBe(4); // 0b000 → 0b100
      expect(BitUtils.setBit(5, 0)).toBe(5); // 0b101 → 0b101 (이미 설정됨)
      expect(BitUtils.setBit(8, 0)).toBe(9); // 0b1000 → 0b1001
    });

    test('경계값 테스트', () => {
      expect(BitUtils.setBit(0, 0)).toBe(1); // 최하위 비트
      expect(BitUtils.setBit(0, 31)).toBe(2147483648); // 최상위 비트 (부호 없는 정수)
    });

    test('음수 입력 테스트', () => {
      expect(BitUtils.setBit(-1, 0)).toBe(4294967295); // 모든 비트가 1인 상태에서 0번 비트 설정
      expect(BitUtils.setBit(-2, 0)).toBe(4294967295); // -2 (0xFFFFFFFE) → 0xFFFFFFFF
    });
  });

  describe('clearBit', () => {
    test('비트 클리어 - 정상 케이스', () => {
      expect(BitUtils.clearBit(7, 1)).toBe(5); // 0b111 → 0b101
      expect(BitUtils.clearBit(15, 3)).toBe(7); // 0b1111 → 0b0111
      expect(BitUtils.clearBit(8, 3)).toBe(0); // 0b1000 → 0b0000
    });

    test('이미 클리어된 비트', () => {
      expect(BitUtils.clearBit(5, 1)).toBe(5); // 0b101 → 0b101 (이미 0)
    });

    test('음수 입력 테스트', () => {
      expect(BitUtils.clearBit(-1, 0)).toBe(4294967294); // 0xFFFFFFFF → 0xFFFFFFFE
      expect(BitUtils.clearBit(-2, 1)).toBe(4294967292); // 0xFFFFFFFE → 0xFFFFFFFC
    });
  });

  describe('toggleBit', () => {
    test('비트 토글 - 정상 케이스', () => {
      expect(BitUtils.toggleBit(0b1010, 1)).toBe(8); // 0b1010 → 0b1000
      expect(BitUtils.toggleBit(0b1000, 3)).toBe(0); // 0b1000 → 0b0000
      expect(BitUtils.toggleBit(0b0000, 0)).toBe(1); // 0b0000 → 0b0001
    });

    test('음수 입력 테스트', () => {
      expect(BitUtils.toggleBit(-1, 0)).toBe(4294967294); // 0xFFFFFFFF → 0xFFFFFFFE
      expect(BitUtils.toggleBit(-2, 0)).toBe(4294967295); // 0xFFFFFFFE → 0xFFFFFFFF
    });
  });

  describe('testBit', () => {
    test('비트 테스트 - 정상 케이스', () => {
      expect(BitUtils.testBit(5, 0)).toBe(true); // 0b101, 0번째 비트: 1
      expect(BitUtils.testBit(5, 1)).toBe(false); // 0b101, 1번째 비트: 0
      expect(BitUtils.testBit(8, 3)).toBe(true); // 0b1000, 3번째 비트: 1
      expect(BitUtils.testBit(8, 0)).toBe(false); // 0b1000, 0번째 비트: 0
    });
  });

  describe('rotateLeft', () => {
    test('왼쪽 회전 - 정상 케이스', () => {
      expect(BitUtils.rotateLeft(0b0001, 2)).toBe(0b0100); // 1 → 4
      expect(BitUtils.rotateLeft(0b1000, 1)).toBe(0b10000); // 8 → 16
    });

    test('최상위 비트 회전', () => {
      expect(BitUtils.rotateLeft(0x80000000, 1)).toBe(1); // 최상위 비트가 최하위로
    });

    test('RotationPosition 타입 제한 (1~31)', () => {
      // 컴파일 타임에 0은 허용되지 않음
      expect(BitUtils.rotateLeft(0b1010, 1)).toBe(0b10100);
      expect(BitUtils.rotateLeft(0b1010, 31)).toBe(0x80000005);
    });
  });

  describe('rotateRight', () => {
    test('오른쪽 회전 - 정상 케이스', () => {
      expect(BitUtils.rotateRight(0b0100, 2)).toBe(0x40000001); // 4를 오른쪽으로 2비트 회전
      expect(BitUtils.rotateRight(0b10000, 1)).toBe(0b1000); // 16 → 8
    });

    test('최하위 비트 회전', () => {
      expect(BitUtils.rotateRight(1, 1)).toBe(0x80000000); // 최하위 비트가 최상위로
    });

    test('RotationPosition 타입 제한 (1~31)', () => {
      expect(BitUtils.rotateRight(0b1010, 1)).toBe(0x80000005);
      expect(BitUtils.rotateRight(0b1010, 31)).toBe(0b10100);
    });
  });

  describe('popCount', () => {
    test('설정된 비트 개수 계산', () => {
      expect(BitUtils.popCount(0)).toBe(0);
      expect(BitUtils.popCount(15)).toBe(4); // 0b1111
      expect(BitUtils.popCount(0b1011)).toBe(3);
      expect(BitUtils.popCount(-1)).toBe(32); // 모든 비트가 1
    });

    test('경계값', () => {
      expect(BitUtils.popCount(-2147483648)).toBe(1); // 최상위 비트만
      expect(BitUtils.popCount(0x7fffffff)).toBe(31); // 최상위 비트 제외 모든 비트
    });
  });

  describe('countLeadingZeros', () => {
    test('선행 0 개수 계산', () => {
      expect(BitUtils.countLeadingZeros(0)).toBe(32);
      expect(BitUtils.countLeadingZeros(1)).toBe(31);
      expect(BitUtils.countLeadingZeros(8)).toBe(28);
      expect(BitUtils.countLeadingZeros(-2147483648)).toBe(0);
    });
  });

  describe('countTrailingZeros', () => {
    test('후행 0 개수 계산', () => {
      expect(BitUtils.countTrailingZeros(0)).toBe(32);
      expect(BitUtils.countTrailingZeros(1)).toBe(0);
      expect(BitUtils.countTrailingZeros(8)).toBe(3); // 0b1000
      expect(BitUtils.countTrailingZeros(-2147483648)).toBe(31);
    });
  });

  describe('MASKS', () => {
    test('마스크 상수 검증', () => {
      expect(BitUtils.MASKS.BIT_0).toBe(0x00000001);
      expect(BitUtils.MASKS.BIT_1).toBe(0x00000002);
      expect(BitUtils.MASKS.BYTE_0).toBe(0x000000ff);
      expect(BitUtils.MASKS.ALL_BITS).toBe(0xffffffff);
      expect(BitUtils.MASKS.SIGN_BIT).toBe(0x80000000);
    });

    test('마스크 불변성', () => {
      expect(() => {
        // @ts-expect-error: 읽기 전용 속성 할당 시도
        BitUtils.MASKS.BIT_0 = 999;
      }).toThrow('Attempted to assign to readonly property');
    });
  });

  describe('hasAllFlags', () => {
    test('모든 플래그 확인', () => {
      expect(BitUtils.hasAllFlags(0b1101, 0b1001)).toBe(true);
      expect(BitUtils.hasAllFlags(0b1101, 0b1111)).toBe(false);
      expect(BitUtils.hasAllFlags(0b1010, 0b0010)).toBe(true);
      expect(BitUtils.hasAllFlags(0b1111, 0)).toBe(true); // flags가 0이면 항상 true
    });
  });

  describe('hasAnyFlag', () => {
    test('임의 플래그 확인', () => {
      expect(BitUtils.hasAnyFlag(0b1101, 0b1001)).toBe(true);
      expect(BitUtils.hasAnyFlag(0b1101, 0b0100)).toBe(true);
      expect(BitUtils.hasAnyFlag(0b1000, 0b0111)).toBe(false);
      expect(BitUtils.hasAnyFlag(0b1111, 0)).toBe(false); // flags가 0이면 항상 false
    });
  });

  describe('캐싱 성능 테스트', () => {
    test('isPowerOfTwo 캐싱 동작 확인', () => {
      const testValue = 1024;

      // 첫 번째 호출 (캐시 미스)
      const start1 = performance.now();
      const result1 = BitUtils.isPowerOfTwo(testValue);
      const end1 = performance.now();

      // 두 번째 호출 (캐시 히트)
      const start2 = performance.now();
      const result2 = BitUtils.isPowerOfTwo(testValue);
      const end2 = performance.now();

      expect(result1).toBe(result2);
      expect(result1).toBe(true);

      // 캐시된 호출이 더 빨라야 함 (일반적으로)
      const time1 = end1 - start1;
      const time2 = end2 - start2;
      console.log(`First call: ${time1}ms, Cached call: ${time2}ms`);
    });

    test('popCount 캐싱 동작 확인', () => {
      const testValue = 0b11111111;

      // 첫 번째 호출 (캐시 미스)
      const result1 = BitUtils.popCount(testValue);

      // 두 번째 호출 (캐시 히트)
      const result2 = BitUtils.popCount(testValue);

      expect(result1).toBe(result2);
      expect(result1).toBe(8);
    });
  });

  describe('extractBits', () => {
    test('비트 추출 - 정상 케이스', () => {
      expect(BitUtils.extractBits(0b11110000, 4, 4)).toBe(0b1111); // 15
      expect(BitUtils.extractBits(0b10101010, 1, 3)).toBe(0b101); // 5
      expect(BitUtils.extractBits(0xff00ff00, 8, 8)).toBe(0b11111111); // 255
    });

    test('경계값 테스트', () => {
      expect(BitUtils.extractBits(0xffffffff, 0, 1)).toBe(1); // 최하위 비트만
      expect(BitUtils.extractBits(0xffffffff, 31, 1)).toBe(1); // 최상위 비트만
      expect(BitUtils.extractBits(0xffffffff, 0, 32)).toBe(0xffffffff); // 전체 비트
    });

    test('0에서 비트 추출', () => {
      expect(BitUtils.extractBits(0, 0, 8)).toBe(0);
      expect(BitUtils.extractBits(0, 16, 16)).toBe(0);
    });
  });

  describe('insertBits', () => {
    test('비트 삽입 - 정상 케이스', () => {
      expect(BitUtils.insertBits(0, 0b1111, 4, 4)).toBe(0b11110000); // 240
      expect(BitUtils.insertBits(0b11110000, 0b101, 1, 3)).toBe(0b11101010); // 234
      expect(BitUtils.insertBits(0xff00ff00, 0b1010, 4, 4)).toBe(0xff00ffa0);
    });

    test('length 자동 계산', () => {
      expect(BitUtils.insertBits(0, 0b1111, 0)).toBe(0b1111); // length 자동 계산
      expect(BitUtils.insertBits(0, 0b101, 3)).toBe(0b101000); // 3비트 시프트
    });

    test('기존 비트 덮어쓰기', () => {
      expect(BitUtils.insertBits(0b11111111, 0b0000, 2, 4)).toBe(0b11000011); // 중간 4비트를 0으로
    });

    test('경계값 테스트', () => {
      expect(BitUtils.insertBits(0, 1, 31, 1)).toBe(0x80000000); // 최상위 비트 설정
      expect(BitUtils.insertBits(0xffffffff, 0, 0, 1)).toBe(0xfffffffe); // 최하위 비트 클리어
    });
  });

  describe('reverseBits', () => {
    test('비트 순서 뒤집기 - 정상 케이스', () => {
      expect(BitUtils.reverseBits(0b00000001)).toBe(0x80000000); // 1 → 최상위 비트
      expect(BitUtils.reverseBits(0b11110000)).toBe(0x0f000000); // 하위 4비트 → 상위 4비트
    });

    test('대칭적인 패턴', () => {
      expect(BitUtils.reverseBits(0)).toBe(0); // 0은 뒤집어도 0
      expect(BitUtils.reverseBits(0xffffffff)).toBe(0xffffffff); // 모든 비트가 1
    });

    test('복잡한 패턴', () => {
      const original = 0x12345678;
      const reversed = BitUtils.reverseBits(original);
      const doubleReversed = BitUtils.reverseBits(reversed);
      expect(doubleReversed).toBe(original); // 두 번 뒤집으면 원래대로
    });

    test('알려진 값 테스트', () => {
      // 0x12345678의 비트 순서를 뒤집은 결과는 미리 계산된 값
      expect(BitUtils.reverseBits(0x12345678)).toBe(0x1e6a2c48);
    });
  });

  describe('성능 벤치마킹', () => {
    test('popCount 성능 테스트', () => {
      const iterations = 10000;
      const testValues = Array.from({ length: 100 }, () => Math.floor(Math.random() * 0xffffffff));

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        for (const value of testValues) {
          BitUtils.popCount(value);
        }
      }
      const end = performance.now();

      const timePerOperation = (end - start) / (iterations * testValues.length);
      console.log(`popCount 평균 실행 시간: ${timePerOperation.toFixed(6)}ms`);

      // 성능 기준: 1ms 이하여야 함
      expect(timePerOperation).toBeLessThan(1);
    });

    test('새로운 메서드들 성능 테스트', () => {
      const iterations = 1000;
      const testValue = 0x12345678;

      // extractBits 성능
      const extractStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        BitUtils.extractBits(testValue, 8, 8);
      }
      const extractEnd = performance.now();

      // insertBits 성능
      const insertStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        BitUtils.insertBits(testValue, 0xff, 8, 8);
      }
      const insertEnd = performance.now();

      // reverseBits 성능
      const reverseStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        BitUtils.reverseBits(testValue);
      }
      const reverseEnd = performance.now();

      const extractTime = (extractEnd - extractStart) / iterations;
      const insertTime = (insertEnd - insertStart) / iterations;
      const reverseTime = (reverseEnd - reverseStart) / iterations;

      console.log(`extractBits 평균: ${extractTime.toFixed(6)}ms`);
      console.log(`insertBits 평균: ${insertTime.toFixed(6)}ms`);
      console.log(`reverseBits 평균: ${reverseTime.toFixed(6)}ms`);

      // 모든 연산이 적절한 성능을 보여야 함
      expect(extractTime).toBeLessThan(0.1);
      expect(insertTime).toBeLessThan(0.1);
      expect(reverseTime).toBeLessThan(0.1);
    });

    test('캐시 효과 측정', () => {
      const testValues = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
      const iterations = 1000;

      // 캐시 워밍업
      testValues.forEach(value => {
        BitUtils.isPowerOfTwo(value);
        BitUtils.popCount(value);
      });

      // 캐시된 값들로 성능 테스트
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        testValues.forEach(value => {
          BitUtils.isPowerOfTwo(value);
          BitUtils.popCount(value);
        });
      }
      const end = performance.now();

      const timePerOperation = (end - start) / (iterations * testValues.length * 2);
      console.log(`캐시된 연산 평균 시간: ${timePerOperation.toFixed(6)}ms`);

      // 캐시된 연산은 매우 빨라야 함
      expect(timePerOperation).toBeLessThan(0.01);
    });
  });

  describe('에러 처리 (개발 모드)', () => {
    test('정수가 아닌 입력', () => {
      const originalMode = import.meta.env.MODE;
      import.meta.env.MODE = 'development';

      expect(() => BitUtils.isPowerOfTwo(3.14)).toThrow(TypeError);

      import.meta.env.MODE = originalMode;
    });

    test('32비트 범위 초과', () => {
      const originalMode = import.meta.env.MODE;
      import.meta.env.MODE = 'development';

      expect(() => BitUtils.setBit(2147483648, 0)).toThrow(RangeError);
      expect(() => BitUtils.clearBit(-2147483649, 0)).toThrow(RangeError);

      import.meta.env.MODE = originalMode;
    });
  });
});
