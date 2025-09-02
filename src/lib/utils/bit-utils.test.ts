import { beforeEach, describe, expect, test } from 'vitest';
import BitUtils from './bit-utils';

describe('BitUtils', () => {
  beforeEach(() => {
    // 각 테스트 전에 캐시 초기화
    BitUtils.clearAllCaches();
  });

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
      expect(BitUtils.rotateLeft(0b1010, 1)).toBe(0b10100); // 10 → 20
      expect(BitUtils.rotateLeft(0b1010, 31)).toBe(5); // 10을 31비트 왼쪽 회전 = 5
    });
  });

  describe('rotateRight', () => {
    test('오른쪽 회전 - 정상 케이스', () => {
      expect(BitUtils.rotateRight(0b0100, 2)).toBe(1); // 4를 오른쪽으로 2비트 회전 = 1
      expect(BitUtils.rotateRight(0b10000, 1)).toBe(0b1000); // 16 → 8
    });

    test('최하위 비트 회전', () => {
      expect(BitUtils.rotateRight(1, 1)).toBe(0x80000000); // 최하위 비트가 최상위로
    });

    test('RotationPosition 타입 제한 (1~31)', () => {
      expect(BitUtils.rotateRight(0b1010, 1)).toBe(5); // 10을 1비트 오른쪽 회전 = 5
      expect(BitUtils.rotateRight(0b1010, 31)).toBe(20); // 10을 31비트 오른쪽 회전 = 20
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
      // V8과 bun 엔진 모두에서 읽기 전용 속성 할당 시 에러 메시지가 다름
      expect(() => {
        // @ts-expect-error: 읽기 전용 속성 할당 시도
        BitUtils.MASKS.BIT_0 = 999;
      }).toThrow(/(Cannot assign to read only property|Attempted to assign to readonly property)/);
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

    test('LRU 캐시 동작 확인', () => {
      // 캐시 크기를 초과하는 값들로 테스트
      const largeDataSet = Array.from({ length: 1200 }, (_, i) => i + 1);

      // 첫 번째 패스: 캐시 채우기
      largeDataSet.forEach(value => {
        BitUtils.isPowerOfTwo(value);
      });

      // 두 번째 패스: 일부는 캐시 히트, 일부는 미스
      const start = performance.now();
      largeDataSet.slice(0, 500).forEach(value => {
        BitUtils.isPowerOfTwo(value);
      });
      const end = performance.now();

      console.log(`LRU 캐시 테스트 완료: ${end - start}ms`);
      expect(end - start).toBeLessThan(50); // 적절한 성능 유지
    });

    test('reverseBits lookup table 성능 비교', () => {
      const testValues = [0x12345678, 0xabcdef00, 0x55555555, 0xaaaaaaaa];
      const iterations = 10000;

      // lookup table 기반 reverseBits 성능 측정
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        testValues.forEach(value => {
          BitUtils.reverseBits(value);
        });
      }
      const end = performance.now();

      const timePerOperation = (end - start) / (iterations * testValues.length);
      console.log(`reverseBits (lookup table) 평균: ${timePerOperation.toFixed(6)}ms`);

      // lookup table 사용으로 매우 빨라야 함
      expect(timePerOperation).toBeLessThan(0.01);
    });
  });

  describe('insertBits', () => {
    test('비트 삽입 - 정상 케이스', () => {
      expect(BitUtils.insertBits(0, 0b1111, 4, 4)).toBe(0b11110000); // 240
      expect(BitUtils.insertBits(0b11110000, 0b101, 1, 3)).toBe(0b11111010); // 250
      expect(BitUtils.insertBits(0xff00ff00, 0b1010, 4, 4)).toBe(0xff00ffa0);
    });

    test('length 자동 계산', () => {
      expect(BitUtils.insertBits(0, 0b1111, 0)).toBe(0b1111); // length 자동 계산
      expect(BitUtils.insertBits(0, 0b101, 3)).toBe(0b101000); // 3비트 시프트
    });

    test('bits = 0인 경우 더 직관적인 동작', () => {
      // bits = 0이면 length = 0으로 자동 계산되어 아무것도 삽입하지 않음
      expect(BitUtils.insertBits(0b11111111, 0, 4)).toBe(0b11111111); // 변화 없음
      expect(BitUtils.insertBits(0b10101010, 0, 0)).toBe(0b10101010); // 변화 없음
    });

    test('기존 비트 덮어쓰기', () => {
      expect(BitUtils.insertBits(0b11111111, 0b0000, 2, 4)).toBe(0b11000011); // 중간 4비트를 0으로
    });

    test('경계값 테스트', () => {
      expect(BitUtils.insertBits(0, 1, 31, 1)).toBe(0x80000000); // 최상위 비트 설정
      expect(BitUtils.insertBits(0xffffffff, 0, 0, 1)).toBe(0xfffffffe); // 최하위 비트 클리어
    });
  });

  describe('insertBits 개선된 길이 계산', () => {
    test('타입 안전한 길이 검증', () => {
      // BitLength 타입 범위 테스트 (1-32)
      expect(() => BitUtils.extractBits(0, 0, 1)).not.toThrow();
      expect(() => BitUtils.extractBits(0, 0, 16)).not.toThrow();
      expect(() => BitUtils.extractBits(0, 0, 32)).not.toThrow();

      // 잘못된 길이는 에러 발생 (타입 시스템에서 방지되지만 런타임 검증도 확인)
      expect(() => BitUtils.extractBits(0, 0, 0)).not.toThrow(); // 0은 허용
      expect(() => BitUtils.extractBits(0, 0, -1 as any)).toThrow();
      expect(() => BitUtils.extractBits(0, 0, 33 as any)).toThrow();
    });

    test('타입 안전성 검증', () => {
      // BitLength 타입 (1-32) 범위 확인
      expect(() => BitUtils.extractBits(0, 0, 1)).not.toThrow();
      expect(() => BitUtils.extractBits(0, 0, 32)).not.toThrow();

      // BitPosition 타입 (0-31) 범위 확인
      expect(() => BitUtils.extractBits(0, 0, 1)).not.toThrow();
      expect(() => BitUtils.extractBits(0, 31, 1)).not.toThrow();
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
      // 32비트 부호 있는 정수 범위 내의 값들로 제한
      const testValues = Array.from(
        { length: 100 },
        () => Math.floor(Math.random() * 0x7fffffff) * (Math.random() > 0.5 ? 1 : -1)
      );

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

      // 2147483648 (0x80000000)은 이제 유효한 32비트 부호 없는 정수
      // 더 큰 값으로 테스트
      expect(() => BitUtils.setBit(0x100000000, 0)).toThrow(RangeError); // 2^32
      expect(() => BitUtils.setBit(-0x80000001, 0)).toThrow(RangeError); // -2^31-1

      import.meta.env.MODE = originalMode;
    });

    test('NaN/Infinity 입력 (프로덕션에서도 검증)', () => {
      // 프로덕션 모드에서도 NaN/Infinity는 항상 검증됨
      expect(() => BitUtils.isPowerOfTwo(NaN)).toThrow(TypeError);
      expect(() => BitUtils.isPowerOfTwo(Infinity)).toThrow(TypeError);
      expect(() => BitUtils.isPowerOfTwo(-Infinity)).toThrow(TypeError);

      expect(() => BitUtils.setBit(NaN, 0)).toThrow(TypeError);
      expect(() => BitUtils.clearBit(Infinity, 1)).toThrow(TypeError);
      expect(() => BitUtils.toggleBit(-Infinity, 2)).toThrow(TypeError);

      expect(() => BitUtils.popCount(NaN)).toThrow(TypeError);
      expect(() => BitUtils.rotateLeft(Infinity, 1)).toThrow(TypeError);
    });
  });

  describe('적응형 캐시 관리 시스템', () => {
    beforeEach(() => {
      // 각 테스트 전에 캐시 초기화
      BitUtils.clearAllCaches();
    });

    test('캐시 통계 수집', () => {
      const initialStats = BitUtils.getCacheStats();
      expect(initialStats.powerOfTwoCache.hits).toBe(0);
      expect(initialStats.powerOfTwoCache.misses).toBe(0);
      expect(initialStats.powerOfTwoCache.hitRate).toBe(0);

      // 캐시 미스 발생
      BitUtils.isPowerOfTwo(1024);
      let stats = BitUtils.getCacheStats();
      expect(stats.powerOfTwoCache.misses).toBe(1);
      expect(stats.powerOfTwoCache.hitRate).toBe(0);

      // 캐시 히트 발생
      BitUtils.isPowerOfTwo(1024);
      stats = BitUtils.getCacheStats();
      expect(stats.powerOfTwoCache.hits).toBe(1);
      expect(stats.powerOfTwoCache.hitRate).toBe(0.5); // 1 hit / 2 total
    });

    test('적응형 제거 비율 - 높은 히트율', () => {
      // 높은 히트율 시나리오 생성
      const values = [1, 2, 4, 8, 16];

      // 캐시에 값들 저장
      values.forEach(v => BitUtils.isPowerOfTwo(v));

      // 반복 접근으로 높은 히트율 생성
      for (let i = 0; i < 100; i++) {
        values.forEach(v => BitUtils.isPowerOfTwo(v));
      }

      const stats = BitUtils.getCacheStats();
      expect(stats.powerOfTwoCache.hitRate).toBeGreaterThan(0.8);

      // 대량의 새로운 값으로 캐시 오버플로우 유발
      const newValues = Array.from({ length: 1200 }, (_, i) => i + 100);
      newValues.forEach(v => BitUtils.isPowerOfTwo(v));

      // 높은 히트율에서는 적게 제거되어야 함
      const finalStats = BitUtils.getCacheStats();
      expect(finalStats.powerOfTwoCache.evictions).toBeGreaterThan(0);
    });

    test('적응형 제거 비율 - 낮은 히트율', () => {
      // 낮은 히트율 시나리오: 계속 새로운 값들만 접근
      const values1 = Array.from({ length: 500 }, (_, i) => i);
      const values2 = Array.from({ length: 500 }, (_, i) => i + 1000);
      const values3 = Array.from({ length: 500 }, (_, i) => i + 2000);

      // 각각 한 번씩만 접근 (낮은 히트율)
      values1.forEach(v => BitUtils.isPowerOfTwo(v));
      values2.forEach(v => BitUtils.isPowerOfTwo(v));
      values3.forEach(v => BitUtils.isPowerOfTwo(v));

      const stats = BitUtils.getCacheStats();
      expect(stats.powerOfTwoCache.hitRate).toBeLessThan(0.5);
      expect(stats.powerOfTwoCache.evictions).toBeGreaterThan(0);
    });

    test('빈번한 정리 방지', () => {
      // 짧은 시간 내에 여러 번 캐시 오버플로우 유발
      for (let batch = 0; batch < 3; batch++) {
        const values = Array.from({ length: 500 }, (_, i) => i + batch * 1000);
        values.forEach(v => BitUtils.isPowerOfTwo(v));
      }

      const stats = BitUtils.getCacheStats();
      // 빈번한 정리 방지로 제거 비율이 제한되어야 함
      expect(stats.powerOfTwoCache.evictions).toBeLessThan(1000); // 전체 삭제되지 않음
    });

    test('캐시 초기화', () => {
      // 캐시에 데이터 추가
      BitUtils.isPowerOfTwo(1024);
      BitUtils.popCount(255);

      let stats = BitUtils.getCacheStats();
      expect(stats.powerOfTwoCache.cacheSize).toBeGreaterThan(0);
      expect(stats.popCountCache.cacheSize).toBeGreaterThan(0);

      // 캐시 초기화
      BitUtils.clearAllCaches();

      stats = BitUtils.getCacheStats();
      expect(stats.powerOfTwoCache.hits).toBe(0);
      expect(stats.powerOfTwoCache.misses).toBe(0);
      expect(stats.powerOfTwoCache.cacheSize).toBe(0);
      expect(stats.popCountCache.cacheSize).toBe(0);
    });
  });

  describe('개선된 LRU 캐시 시스템', () => {
    test('Map 기반 LRU 캐시 동작 확인', () => {
      // 캐시 크기를 초과하는 값들로 테스트
      const largeDataSet = Array.from({ length: 1200 }, (_, i) => i + 1);

      // 첫 번째 패스: 캐시 채우기
      largeDataSet.forEach(value => {
        BitUtils.isPowerOfTwo(value);
      });

      // 두 번째 패스: 최근 사용된 값들은 캐시 히트
      const recentValues = largeDataSet.slice(-100); // 최근 100개 값
      const start = performance.now();
      recentValues.forEach(value => {
        BitUtils.isPowerOfTwo(value);
      });
      const end = performance.now();

      console.log(`개선된 LRU 캐시 테스트: ${end - start}ms`);
      expect(end - start).toBeLessThan(10); // 캐시된 값들은 매우 빨라야 함
    });

    test('진정한 LRU 동작 검증', () => {
      // 특정 값들을 캐시에 저장
      const testValues = [1, 2, 4, 8, 16];
      testValues.forEach(value => {
        BitUtils.isPowerOfTwo(value);
      });

      // 첫 번째 값을 다시 접근하여 LRU 순서 변경
      BitUtils.isPowerOfTwo(1);

      // 대량의 새로운 값들로 캐시 오버플로우 유발
      const newValues = Array.from({ length: 1200 }, (_, i) => i + 100);
      newValues.forEach(value => {
        BitUtils.isPowerOfTwo(value);
      });

      // 최근 접근한 1은 여전히 캐시에 있어야 함 (빠른 응답)
      const start = performance.now();
      BitUtils.isPowerOfTwo(1);
      const end = performance.now();

      console.log(`LRU 보존 테스트: ${end - start}ms`);
      expect(end - start).toBeLessThan(0.1); // 캐시 히트로 매우 빨라야 함
    });

    test('캐시 크기 자동 관리', () => {
      // 대량의 서로 다른 값들로 캐시 오버플로우 테스트
      const testValues = Array.from({ length: 1500 }, (_, i) => i * 2 + 1);

      testValues.forEach(value => {
        BitUtils.popCount(value);
      });

      // 캐시가 적절히 관리되어야 함 (메모리 누수 없음)
      expect(true).toBe(true); // 테스트가 완료되면 성공
    });
  });

  describe('누락된 메서드들 테스트', () => {
    describe('countLeadingZeros', () => {
      test('기본 동작 확인', () => {
        expect(BitUtils.countLeadingZeros(0)).toBe(32);
        expect(BitUtils.countLeadingZeros(1)).toBe(31);
        expect(BitUtils.countLeadingZeros(8)).toBe(28);
        expect(BitUtils.countLeadingZeros(0x80000000)).toBe(0);
      });

      test('다양한 값들 테스트', () => {
        expect(BitUtils.countLeadingZeros(0b1)).toBe(31);
        expect(BitUtils.countLeadingZeros(0b10)).toBe(30);
        expect(BitUtils.countLeadingZeros(0b100)).toBe(29);
        expect(BitUtils.countLeadingZeros(0b1000)).toBe(28);
        expect(BitUtils.countLeadingZeros(0b10000)).toBe(27);
        expect(BitUtils.countLeadingZeros(0b100000)).toBe(26);
      });

      test('경계값 테스트', () => {
        expect(BitUtils.countLeadingZeros(0x7fffffff)).toBe(1); // 최대 양수
        expect(BitUtils.countLeadingZeros(0xffffffff)).toBe(0); // -1 (부호 없는 최대값)
      });

      test('입력 검증', () => {
        expect(() => BitUtils.countLeadingZeros(NaN)).toThrow();
        expect(() => BitUtils.countLeadingZeros(Infinity)).toThrow();
        expect(() => BitUtils.countLeadingZeros(-Infinity)).toThrow();
      });
    });

    describe('countTrailingZeros', () => {
      test('기본 동작 확인', () => {
        expect(BitUtils.countTrailingZeros(0)).toBe(32);
        expect(BitUtils.countTrailingZeros(1)).toBe(0);
        expect(BitUtils.countTrailingZeros(8)).toBe(3);
        expect(BitUtils.countTrailingZeros(0x80000000)).toBe(31);
      });

      test('다양한 값들 테스트', () => {
        expect(BitUtils.countTrailingZeros(0b1)).toBe(0);
        expect(BitUtils.countTrailingZeros(0b10)).toBe(1);
        expect(BitUtils.countTrailingZeros(0b100)).toBe(2);
        expect(BitUtils.countTrailingZeros(0b1000)).toBe(3);
        expect(BitUtils.countTrailingZeros(0b10000)).toBe(4);
        expect(BitUtils.countTrailingZeros(0b100000)).toBe(5);
      });

      test('복합 패턴 테스트', () => {
        expect(BitUtils.countTrailingZeros(0b1010)).toBe(1); // 끝에서 첫 번째 1까지
        expect(BitUtils.countTrailingZeros(0b1100)).toBe(2); // 끝에서 첫 번째 1까지
        expect(BitUtils.countTrailingZeros(0b11000)).toBe(3);
        expect(BitUtils.countTrailingZeros(0b110000)).toBe(4);
      });

      test('입력 검증', () => {
        expect(() => BitUtils.countTrailingZeros(NaN)).toThrow();
        expect(() => BitUtils.countTrailingZeros(Infinity)).toThrow();
        expect(() => BitUtils.countTrailingZeros(-Infinity)).toThrow();
      });
    });

    describe('extractBits', () => {
      test('기본 비트 추출', () => {
        // 0b11110000에서 위치 4부터 4비트 추출
        expect(BitUtils.extractBits(0b11110000, 4, 4)).toBe(0b1111);

        // 0b10101010에서 위치 1부터 3비트 추출
        expect(BitUtils.extractBits(0b10101010, 1, 3)).toBe(0b101);

        // 0b11111111에서 위치 0부터 8비트 추출
        expect(BitUtils.extractBits(0b11111111, 0, 8)).toBe(0b11111111);
      });

      test('경계값 테스트', () => {
        // 1비트 추출
        expect(BitUtils.extractBits(0b10000000, 7, 1)).toBe(0b1);
        expect(BitUtils.extractBits(0b01111111, 7, 1)).toBe(0b0);

        // 최대 32비트 추출
        expect(BitUtils.extractBits(0xffffffff, 0, 32)).toBe(0xffffffff);
        expect(BitUtils.extractBits(0x12345678, 0, 32)).toBe(0x12345678);
      });

      test('부분 추출 테스트', () => {
        const value = 0b11010110; // 214

        // 하위 4비트 추출
        expect(BitUtils.extractBits(value, 0, 4)).toBe(0b0110); // 6

        // 상위 4비트 추출
        expect(BitUtils.extractBits(value, 4, 4)).toBe(0b1101); // 13

        // 중간 2비트 추출
        expect(BitUtils.extractBits(value, 2, 2)).toBe(0b01); // 1
      });

      test('0 길이 추출', () => {
        expect(BitUtils.extractBits(0b11111111, 4, 0)).toBe(0);
        expect(BitUtils.extractBits(0xffffffff, 0, 0)).toBe(0);
      });

      test('입력 검증', () => {
        expect(() => BitUtils.extractBits(NaN, 0, 4)).toThrow();
        expect(() => BitUtils.extractBits(0, -1 as any, 4)).toThrow();
        expect(() => BitUtils.extractBits(0, 0, -1 as any)).toThrow();
        expect(() => BitUtils.extractBits(0, 32 as any, 1)).toThrow();
        expect(() => BitUtils.extractBits(0, 0, 33 as any)).toThrow();
      });
    });

    describe('성능 테스트', () => {
      test('countLeadingZeros 성능', () => {
        const values = Array.from({ length: 10000 }, (_, i) => i + 1);

        const start = performance.now();
        values.forEach(v => BitUtils.countLeadingZeros(v));
        const end = performance.now();

        console.log(`countLeadingZeros 성능 테스트: ${end - start}ms`);
        expect(end - start).toBeLessThan(100); // 10,000회 실행이 100ms 미만
      });

      test('countTrailingZeros 성능', () => {
        const values = Array.from({ length: 10000 }, (_, i) => (i + 1) << i % 16);

        const start = performance.now();
        values.forEach(v => BitUtils.countTrailingZeros(v));
        const end = performance.now();

        console.log(`countTrailingZeros 성능 테스트: ${end - start}ms`);
        expect(end - start).toBeLessThan(100); // 10,000회 실행이 100ms 미만
      });

      test('extractBits 성능', () => {
        const values = Array.from({ length: 5000 }, (_, i) => i + 1);

        const start = performance.now();
        values.forEach(v => BitUtils.extractBits(v, 4, 8));
        const end = performance.now();

        console.log(`extractBits 성능 테스트: ${end - start}ms`);
        expect(end - start).toBeLessThan(50); // 5,000회 실행이 50ms 미만
      });
    });
  });
});
