# 비동기 유틸리티

**경로**: `src/lib/utils/async.ts`

이 파일은 비동기 작업을 제어하고 관리하기 위한 유틸리티 함수들을 제공합니다.

---

## `sleep`

지정된 시간(밀리초) 동안 코드 실행을 중지합니다.

### 함수 시그니처 - sleep

```typescript
export const sleep = (ms: number): Promise<void>;
```

### 파라미터 - sleep

- `ms` (`number`): 대기할 시간(밀리초).

### 반환값 - sleep

- `Promise<void>`: 지정된 시간이 지나면 resolve되는 프로미스.

### 사용 예시 - sleep

```typescript
async function delayedLog() {
  console.log('Hello');
  await sleep(1000); // 1초 대기
  console.log('World');
}
```

---

## `debounce`

연속적인 함수 호출을 그룹화하여, 마지막 호출 이후 일정 시간이 지났을 때 한 번만 함수를 실행시키는 디바운스 함수를 생성합니다.

### 함수 시그니처 - debounce

```typescript
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T, 
  wait = 300
): (...args: Parameters<T>) => void;
```

### 파라미터 - debounce

- `fn` (`T`): 디바운싱할 함수.
- `wait` (`number`, 선택적, 기본값: `300`): 디바운싱 대기 시간(밀리초).

### 반환값 - debounce

- 디바운싱이 적용된 새로운 함수.

### 사용 예시 - debounce

```typescript
// 사용자가 입력을 멈춘 후 500ms가 지나면 API 호출
const handleSearch = debounce((query) => {
  fetch(`/api/search?q=${query}`);
}, 500);

<input onChange={(e) => handleSearch(e.target.value)} />
```

---

## `throttle`

지정된 시간 간격 동안 함수가 최대 한 번만 호출되도록 제한하는 스로틀 함수를 생성합니다.

### 함수 시그니처 - throttle

```typescript
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T, 
  wait = 300
): (...args: Parameters<T>) => void;
```

### 파라미터 - throttle

- `fn` (`T`): 스로틀링할 함수.
- `wait` (`number`, 선택적, 기본값: `300`): 스로틀링 간격(밀리초).

### 반환값 - throttle

- 스로틀링이 적용된 새로운 함수.

### 사용 예시 - throttle

```typescript
// 스크롤 이벤트가 200ms 간격으로 최대 한 번만 처리됨
const handleScroll = throttle(() => {
  console.log('Scrolled!');
}, 200);

window.addEventListener('scroll', handleScroll);
```

---

## `retry`

비동기 함수가 실패할 경우, 지정된 횟수만큼 재시도합니다.

### 함수 시그니처 - retry

```typescript
export async function retry<T>(
  fn: () => Promise<T>, 
  times = 3, 
  delay = 300
): Promise<T>;
```

### 파라미터 - retry

- `fn` (`() => Promise<T>`): 재시도할 비동기 함수.
- `times` (`number`, 선택적, 기본값: `3`): 총 시도 횟수.
- `delay` (`number`, 선택적, 기본값: `300`): 재시도 사이의 대기 시간(밀리초).

### 반환값 - retry

- `Promise<T>`: 함수가 성공하면 결과값을 resolve하는 프로미스.

### 예외 - retry

- 모든 재시도가 실패하면 마지막으로 발생한 에러를 throw합니다.

### 사용 예시 - retry

```typescript
async function fetchWithRetry() {
  try {
    const data = await retry(fetchData, 5, 1000); // 1초 간격으로 최대 5번 시도
    console.log('Data fetched:', data);
  } catch (error) {
    console.error('Failed to fetch data after multiple retries:', error);
  }
}
```
