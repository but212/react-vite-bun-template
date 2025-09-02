# 객체 유틸리티

**경로**: `src/lib/utils/object.ts`

이 파일은 일반적인 객체 및 값 조작을 위한 유틸리티 함수들을 제공합니다.

---

## `clamp`

주어진 숫자를 지정된 최솟값과 최댓값 사이로 제한합니다.

### 함수 시그니처 - clamp

```typescript
export const clamp = (v: number, min: number, max: number): number;
```

### 파라미터 - clamp

- `v` (`number`): 제한할 값.
- `min` (`number`): 허용되는 최솟값.
- `max` (`number`): 허용되는 최댓값.

### 반환값 - clamp

- `number`: `min`과 `max` 사이로 제한된 값.

### 사용 예시 - clamp

```typescript
clamp(10, 0, 5);   // 결과: 5
clamp(-5, 0, 5);   // 결과: 0
clamp(3, 0, 5);    // 결과: 3
```

---

## `pick`

객체에서 지정된 키(key)들에 해당하는 속성만 추출하여 새로운 객체를 생성합니다.

### 함수 시그니처 - pick

```typescript
export function pick<T extends object, K extends keyof T>(
  obj: T, 
  keys: ReadonlyArray<K>
): Pick<T, K>;
```

### 파라미터 - pick

- `obj` (`T`): 원본 객체.
- `keys` (`ReadonlyArray<K>`): 선택할 키들의 배열.

### 반환값 - pick

- `Pick<T, K>`: 선택된 키와 값으로 구성된 새로운 객체.

### 사용 예시 - pick

```typescript
const user = { id: 1, name: 'John', age: 30, email: 'john@example.com' };

const userInfo = pick(user, ['id', 'name']);
// 결과: { id: 1, name: 'John' }
```

---

## `omit`

객체에서 지정된 키(key)들에 해당하는 속성을 제외하고 새로운 객체를 생성합니다.

### 함수 시그니처 - omit

```typescript
export function omit<T extends object, K extends keyof T>(
  obj: T, 
  keys: ReadonlyArray<K>
): Omit<T, K>;
```

### 파라미터 - omit

- `obj` (`T`): 원본 객체.
- `keys` (`ReadonlyArray<K>`): 제외할 키들의 배열.

### 반환값 - omit

- `Omit<T, K>`: 지정된 키들이 제외된 새로운 객체.

### 사용 예시 - omit

```typescript
const user = { id: 1, name: 'John', age: 30, password: '...' };

const publicUser = omit(user, ['password']);
// 결과: { id: 1, name: 'John', age: 30 }
```
