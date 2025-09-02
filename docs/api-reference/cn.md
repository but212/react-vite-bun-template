# `cn` 유틸리티

**경로**: `src/lib/utils/cn.ts`

`cn` 함수는 [clsx](https://github.com/lukeed/clsx)와 [tailwind-merge](https://github.com/dcastil/tailwind-merge)를 결합하여, 조건부 클래스를 쉽게 적용하고 충돌하는 Tailwind CSS 클래스를 지능적으로 병합하는 역할을 합니다.

## 함수 시그니처

```typescript
import { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string;
```

## 주요 기능

- **조건부 클래스**: `clsx`의 기능을 사용하여 객체나 배열 형태로 조건부 클래스를 손쉽게 추가할 수 있습니다.
- **클래스 병합**: `tailwind-merge`가 Tailwind 유틸리티 클래스의 충돌을 해결합니다. 예를 들어, `px-2`와 `px-4`가 함께 주어지면, 나중에 온 `px-4`만 남깁니다.

## 파라미터

- `...inputs` (`ClassValue[]`)
  - 병합할 클래스 값들의 배열입니다. `ClassValue`는 문자열, 숫자, 객체, 배열 등 다양한 형태를 가질 수 있습니다.

## 반환값

- `string`
  - 최종적으로 병합되고 중복이 제거된 단일 클래스 문자열을 반환합니다.

## 사용 예시

### 기본 사용법

```tsx
import { cn } from '@/lib/utils/cn';

<div className={cn('font-bold', 'text-lg', 'mt-4')} />
// 결과: "font-bold text-lg mt-4"
```

### 조건부 클래스 적용

```tsx
const isActive = true;
const hasError = false;

<div
  className={cn('base-class', {
    'active-class': isActive,
    'error-class': hasError,
  })}
/>
// 결과: "base-class active-class"
```

### Tailwind 클래스 병합

`px-2`가 `px-4`로 덮어씌워지고, `text-red-500`이 `text-blue-500`으로 덮어씌워집니다.

```tsx
<button className={cn('px-2 py-1 text-red-500', 'px-4', { 'text-blue-500': true })} />
// 결과: "py-1 px-4 text-blue-500"
```
