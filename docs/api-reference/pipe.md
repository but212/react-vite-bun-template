# Pipe API Reference

함수형 프로그래밍을 위한 파이프라인 유틸리티 모음입니다. 여러 함수를 순차적으로 합성하여 데이터를 변환하는 기능을 제공합니다.

## 개요

Pipe 유틸리티는 함수형 프로그래밍의 핵심 개념인 함수 합성을 쉽고 타입 안전하게 구현할 수 있도록 도와줍니다. 좌측에서 우측으로 데이터가 흐르는 파이프라인을 구성하여 복잡한 데이터 변환 로직을 간결하고 읽기 쉽게 작성할 수 있습니다.

## 주요 기능

- **타입 안전한 함수 합성**: TypeScript의 타입 추론을 활용한 안전한 파이프라인
- **동기/비동기 지원**: 일반 함수와 Promise 반환 함수 모두 지원
- **에러 처리**: 안전한 파이프라인과 에러 복구 메커니즘
- **조건부 실행**: 조건에 따른 선택적 함수 적용
- **병렬 처리**: 여러 함수를 동시에 실행하는 병렬 파이프라인

## 기본 사용법

### pipe - 기본 파이프라인

```typescript
import { pipe } from '@/lib/utils/pipe';

// 숫자 변환 파이프라인
const add = (x: number) => x + 1;
const double = (x: number) => x * 2;
const toString = (x: number) => x.toString();

const pipeline = pipe(add, double, toString);
console.log(pipeline(3)); // "8"

// 타입이 자동으로 추론됩니다: (x: number) => string
```

### pipeAsync - 비동기 파이프라인

```typescript
import { pipeAsync } from '@/lib/utils/pipe';

const fetchUser = async (id: number) => ({ id, name: `User ${id}` });
const formatUser = (user: { id: number; name: string }) => `ID: ${user.id}, Name: ${user.name}`;
const logResult = async (message: string) => {
  console.log(message);
  return message;
};

const asyncPipeline = pipeAsync(fetchUser, formatUser, logResult);
const result = await asyncPipeline(1); // "ID: 1, Name: User 1"
```

## API 참조

### 핵심 함수들

#### `pipe(...fns): (value) => result`

여러 함수를 좌측에서 우측으로 순차적으로 적용합니다.

**매개변수:**

- `...fns`: 적용할 함수들의 목록

**반환값:**

- 입력값을 받아 모든 함수를 순차적으로 적용한 결과를 반환하는 함수

**예제:**

```typescript
// 데이터 변환 파이프라인
const processData = pipe(
  (data: string) => data.trim(),
  (data: string) => data.toLowerCase(),
  (data: string) => data.split(' '),
  (words: string[]) => words.filter(word => word.length > 2),
  (words: string[]) => words.join('-')
);

console.log(processData('  Hello World  ')); // "hello-world"
```

#### `pipeAsync(...fns): (value) => Promise<result>`

비동기/동기 함수를 좌측에서 우측으로 순차적으로 적용합니다.

**예제:**

```typescript
const processUserData = pipeAsync(
  async (userId: number) => await fetchUser(userId),
  user => ({ ...user, processed: true }),
  async user => await saveUser(user),
  savedUser => `User ${savedUser.id} processed successfully`
);

const result = await processUserData(123);
```

### 안전한 파이프라인

#### `pipeSafe(defaultValue, errorHandler?): (...fns) => (value) => result`

에러가 발생해도 기본값을 반환하는 안전한 파이프라인을 생성합니다.

**매개변수:**

- `defaultValue`: 에러 발생 시 반환할 기본값
- `errorHandler?`: 에러 발생 시 실행할 핸들러 (선택사항)

**예제:**

```typescript
import { pipeSafe } from '@/lib/utils/pipe';

const safeDivision = pipeSafe(0, (error, value) => {
  console.error(`Division failed for ${value}:`, error.message);
});

const divide = (x: number) => (y: number) => {
  if (y === 0) throw new Error('Division by zero');
  return x / y;
};

const pipeline = safeDivision(divide(10), Math.round);
console.log(pipeline(2)); // 5
console.log(pipeline(0)); // 0 (기본값)
```

#### `pipeAsyncSafe(defaultValue, errorHandler?): (...fns) => (value) => Promise<result>`

비동기 함수를 위한 안전한 파이프라인입니다.

### 함수 합성

#### `compose(...fns): (value) => result`

함수를 우측에서 좌측으로 합성합니다 (pipe의 반대 방향).

**예제:**

```typescript
import { compose } from '@/lib/utils/pipe';

const add = (x: number) => x + 1;
const double = (x: number) => x * 2;

// compose(double, add)는 pipe(add, double)와 동일
const composed = compose(double, add);
console.log(composed(3)); // 8
```

#### `composeAsync(...fns): (value) => Promise<result>`

비동기 함수를 위한 compose입니다.

### 조건부 파이프라인

#### `pipeIf(condition, trueFn, falseFn?): (value) => result`

조건에 따라 다른 함수를 적용합니다.

**매개변수:**

- `condition`: 조건 함수 또는 boolean 값
- `trueFn`: 조건이 참일 때 적용할 함수
- `falseFn?`: 조건이 거짓일 때 적용할 함수 (기본값: 항등 함수)

**예제:**

```typescript
import { pipeIf } from '@/lib/utils/pipe';

const isPositive = (x: number) => x > 0;
const double = (x: number) => x * 2;
const negate = (x: number) => -x;

const conditionalPipe = pipeIf(isPositive, double, negate);
console.log(conditionalPipe(5)); // 10
console.log(conditionalPipe(-3)); // 3
```

### 병렬 파이프라인

#### `pipeParallel(...fns): (value) => results[]`

입력값에 여러 함수를 병렬로 적용하고 결과를 배열로 반환합니다.

**예제:**

```typescript
import { pipeParallel } from '@/lib/utils/pipe';

const add1 = (x: number) => x + 1;
const double = (x: number) => x * 2;
const square = (x: number) => x * x;

const parallel = pipeParallel(add1, double, square);
console.log(parallel(3)); // [4, 6, 9]
```

#### `pipeParallelAsync(...fns): (value) => Promise<results[]>`

비동기 함수를 병렬로 실행합니다.

**예제:**

```typescript
import { pipeParallelAsync } from '@/lib/utils/pipe';

const fetchUser = async (id: number) => `User ${id}`;
const fetchPosts = async (id: number) => [`Post 1 by ${id}`, `Post 2 by ${id}`];
const fetchStats = async (id: number) => ({ followers: id * 10, following: id * 5 });

const parallelFetch = pipeParallelAsync(fetchUser, fetchPosts, fetchStats);
const [user, posts, stats] = await parallelFetch(1);
```

## 고급 사용법

### 복잡한 데이터 변환

```typescript
// 사용자 데이터 처리 파이프라인
const processUserProfile = pipe(
  // 1. 입력 검증
  (rawData: any) => {
    if (!rawData.email) throw new Error('Email is required');
    return rawData;
  },
  // 2. 데이터 정규화
  data => ({
    email: data.email.toLowerCase().trim(),
    name: data.name?.trim() || '',
    age: parseInt(data.age) || 0,
  }),
  // 3. 유효성 검사
  user => {
    if (user.age < 0 || user.age > 150) {
      throw new Error('Invalid age');
    }
    return user;
  },
  // 4. 최종 변환
  user => ({
    ...user,
    id: generateId(),
    createdAt: new Date().toISOString(),
  })
);
```

### 에러 처리 전략

```typescript
// 단계별 에러 처리
const robustPipeline = pipeSafe({ error: 'Processing failed', data: null }, (error, input) => {
  console.error('Pipeline error:', error.message);
  console.error('Input was:', input);
});

const processWithFallback = robustPipeline(
  (data: string) => JSON.parse(data),
  obj => obj.value,
  value => value * 2
);

// 안전한 실행
const result1 = processWithFallback('{"value": 5}'); // 10
const result2 = processWithFallback('invalid json'); // { error: 'Processing failed', data: null }
```

### 조건부 변환 체인

```typescript
const processNumber = pipe(
  (x: number) => x,
  pipeIf(
    (x: number) => x < 0,
    Math.abs,
    (x: number) => x
  ),
  pipeIf(
    (x: number) => x > 100,
    (x: number) => 100,
    (x: number) => x
  ),
  (x: number) => Math.round(x)
);

console.log(processNumber(-50)); // 50
console.log(processNumber(150)); // 100
console.log(processNumber(42.7)); // 43
```

## 유틸리티 함수

### `identity<T>(value: T): T`

값을 그대로 반환하는 항등 함수입니다.

### `constant<T>(value: T): () => T`

항상 같은 값을 반환하는 상수 함수를 생성합니다.

### `repeat<T>(fn: (value: T) => T, times: number): (value: T) => T`

함수를 지정된 횟수만큼 반복 적용합니다.

**예제:**

```typescript
import { repeat, identity, constant } from '@/lib/utils/pipe';

// 함수 반복
const increment = (x: number) => x + 1;
const add5 = repeat(increment, 5);
console.log(add5(10)); // 15

// 항등 함수
console.log(identity(42)); // 42

// 상수 함수
const getZero = constant(0);
console.log(getZero()); // 0
```

## 타입 정의

### 기본 타입

```typescript
type PipeFn<T, U> = (value: T) => U;
type AsyncPipeFn<T, U> = (value: T) => U | Promise<U>;
```

### 인터페이스

```typescript
interface Pipe {
  <T>(): (value: T) => T;
  <T, U>(fn1: PipeFn<T, U>): (value: T) => U;
  <T, U, V>(fn1: PipeFn<T, U>, fn2: PipeFn<U, V>): (value: T) => V;
  // ... 더 많은 오버로드
  (...fns: PipeFn<any, any>[]): (value: any) => any;
}
```

## 모범 사례

### 1. 작은 함수로 분해

```typescript
// 좋은 예: 작은, 재사용 가능한 함수들
const trim = (str: string) => str.trim();
const toLowerCase = (str: string) => str.toLowerCase();
const removeSpaces = (str: string) => str.replace(/\s+/g, '');

const normalizeString = pipe(trim, toLowerCase, removeSpaces);
```

### 2. 타입 안전성 활용

```typescript
// TypeScript의 타입 추론을 활용
const pipeline = pipe(
  (x: number) => x.toString(), // number -> string
  (s: string) => s.length, // string -> number
  (n: number) => n > 5 // number -> boolean
);
// 타입: (x: number) => boolean
```

### 3. 에러 경계 설정

```typescript
// 중요한 파이프라인에는 에러 처리 추가
const criticalPipeline = pipeSafe(defaultValue, (error, input) => logError(error, input));
```

### 4. 성능 고려사항

```typescript
// 비용이 큰 연산은 병렬로 처리
const expensiveOperations = pipeParallelAsync(heavyComputation1, heavyComputation2, heavyComputation3);
```

## 관련 문서

- [Async Utilities API](./async.md)
- [Object Utilities API](./object.md)
- [Data Stream API](./data-stream.md)
