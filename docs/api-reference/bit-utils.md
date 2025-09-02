# BitUtils API Reference

`BitUtils`는 32비트 정수 전용 비트 연산 유틸리티 클래스입니다. JavaScript의 32비트 정수 범위에서 안전하게 동작하는 다양한 정적 메서드를 제공하며, 입력값에 대한 엄격한 검증과 성능 최적화를 위한 캐싱 기능을 포함합니다.

**경로**: `src/lib/utils/bit-utils.ts`

---

## 주요 기능

- **기본 비트 조작**: 비트 설정, 클리어, 토글, 테스트
- **시프트 및 회전**: 안전한 순환 시프트(rotate)
- **분석**: 팝카운트(설정된 비트 수), 비트 순서 뒤집기, 선행/후행 0 개수 계산
- **추출 및 삽입**: 특정 위치의 비트 그룹 추출 및 삽입
- **플래그 연산**: 여러 플래그 동시 검사
- **타입 안전성**: `BitPosition`, `BitLength` 등 엄격한 타입 정의
- **성능**: `AdaptiveLRUCache`를 이용한 지능형 캐싱

---

## 타입 정의 (Type Definitions)

### `BitPosition`

0부터 31까지의 비트 위치를 나타내는 타입입니다. 유효한 비트 인덱스 범위를 강제합니다.

```typescript
export type BitPosition = 0 | 1 | ... | 31;
```

### `BitLength`

1부터 32까지의 비트 길이를 나타내는 타입입니다.

```typescript
export type BitLength = 1 | 2 | ... | 32;
```

### `BitLengthWithZero`

0을 포함하는 0부터 32까지의 비트 길이를 나타냅니다.

```typescript
export type BitLengthWithZero = 0 | BitLength;
```

### `RotationPosition`

1부터 31까지의 회전 위치를 나타냅니다. 0은 회전 연산에서 의미가 없으므로 제외됩니다.

```typescript
export type RotationPosition = Exclude<BitPosition, 0>;
```

---

## 헬퍼 함수 (Helper Functions)

### `isValidBitLength(length)`

숫자가 유효한 `BitLengthWithZero` 범위(0-32)에 속하는지 검사하는 타입 가드입니다.

- **@param** `length` - 검증할 길이 값
- **@returns** `boolean` - 유효한 경우 `true`

### `createBitLength(length)`

안전한 `BitLengthWithZero` 값을 생성합니다. 유효하지 않은 값이 주어지면 `RangeError`를 발생시킵니다.

- **@param** `length` - 생성할 길이 값
- **@returns** `BitLengthWithZero` - 검증된 길이 값

---

## `BitUtils` 클래스 메서드

### 기본 비트 조작

- `isPowerOfTwo(n)`: 정수가 2의 거듭제곱인지 판별합니다. (0, 음수는 `false`)
- `setBit(x, position)`: 지정된 위치의 비트를 1로 설정합니다.
- `clearBit(x, position)`: 지정된 위치의 비트를 0으로 클리어합니다.
- `toggleBit(x, position)`: 지정된 위치의 비트를 반전(토글)합니다.
- `testBit(x, position)`: 지정된 위치의 비트가 1인지 확인합니다.

```typescript
// 사용 예시
const value = BitUtils.setBit(0, 3); // 8 (0b1000)
const isSet = BitUtils.testBit(value, 3); // true
const cleared = BitUtils.clearBit(value, 3); // 0
```

### 비트 시프트 및 회전

- `rotateLeft(x, positions)`: 정수를 왼쪽으로 순환 시프트합니다.
- `rotateRight(x, positions)`: 정수를 오른쪽으로 순환 시프트합니다.

```typescript
// 사용 예시
const rotated = BitUtils.rotateLeft(0x80000000, 1); // 1
```

### 팝카운트 및 분석

- `popCount(x)`: 설정된 비트(1)의 개수를 반환합니다. (Brian Kernighan 알고리즘 사용)
- `reverseBits(x)`: 32비트 정수의 비트 순서를 뒤집습니다.
- `countLeadingZeros(x)`: 선행 0의 개수를 반환합니다. (`Math.clz32` 사용)
- `countTrailingZeros(x)`: 후행 0의 개수를 반환합니다.

```typescript
// 사용 예시
const count = BitUtils.popCount(15); // 4 (0b1111)
const reversed = BitUtils.reverseBits(1); // 0x80000000
```

### 비트 추출 및 삽입

- `extractBits(x, start, length)`: 지정된 위치와 길이의 비트를 추출합니다.
- `insertBits(x, bits, start, length?)`: 지정된 위치에 비트를 삽입합니다. `length`를 생략하면 `bits`의 유효 비트 수로 자동 계산됩니다.

```typescript
// 사용 예시
const extracted = BitUtils.extractBits(0b11110000, 4, 4); // 15 (0b1111)
const inserted = BitUtils.insertBits(0, 0b101, 1, 3); // 10 (0b1010)
```

### 플래그 연산

- `hasAllFlags(mask, flags)`: `mask`에 `flags`의 모든 비트가 설정되어 있는지 확인합니다.
- `hasAnyFlag(mask, flags)`: `mask`에 `flags`의 비트 중 하나라도 설정되어 있는지 확인합니다.

```typescript
// 사용 예시
const READ = 1; // 0b001
const WRITE = 2; // 0b010
const EXEC = 4; // 0b100

const permissions = READ | WRITE; // 3 (0b011)

BitUtils.hasAllFlags(permissions, READ | WRITE); // true
BitUtils.hasAnyFlag(permissions, EXEC); // false
```

### 마스크 상수

`BitUtils.MASKS` 객체를 통해 사전 정의된 마스크 상수를 사용할 수 있습니다.

- `BIT_0`, `BIT_1`, ...
- `BYTE_0`, `BYTE_1`, ...
- `ALL_BITS` (0xffffffff)
- `SIGN_BIT` (0x80000000)

```typescript
// 사용 예시
const value = 5;
if ((value & BitUtils.MASKS.BIT_0) !== 0) {
  console.log('최하위 비트가 설정됨');
}
```

### 캐시 관리

- `getCacheStats()`: `powerOfTwoCache`와 `popCountCache`의 통계(히트, 미스, 제거 수 등)를 반환합니다.
- `clearAllCaches()`: 모든 캐시를 초기화합니다.

```typescript
// 사용 예시
const stats = BitUtils.getCacheStats();
console.log(`통합 캐시 히트율: ${stats.combinedHitRate.toFixed(2)}`);

BitUtils.clearAllCaches();
```
