# 테스팅 가이드

이 문서는 Vitest와 React Testing Library(RTL)를 사용한 테스트 전략과 모범 사례를 설명합니다.

## 테스트 철학

- **사용자 관점에서 테스트**: 우리는 컴포넌트의 내부 구현 로직이 아닌, 사용자가 경험하는 방식을 테스트합니다. "사용자가 이 버튼을 클릭하면, 이 텍스트가 나타나는가?"와 같은 시나리오에 집중합니다.
- **구현 세부사항 지양**: 컴포넌트의 내부 상태나 생명주기 메서드를 직접 테스트하는 것을 피합니다. 이는 리팩토링 시 테스트가 쉽게 깨지는 것을 방지합니다.

## 테스트 종류

- **단위 테스트 (Unit Tests)**: 개별 함수, 커스텀 훅, 작은 컴포넌트 등 가장 작은 코드 단위를 테스트합니다.
- **통합 테스트 (Integration Tests)**: 여러 컴포넌트가 함께 렌더링되고 상호작용하는 방식을 테스트합니다. 대부분의 컴포넌트 테스트는 여기에 해당합니다.

## 파일 구조

- 테스트 파일은 테스트 대상 파일과 동일한 디렉터리에 위치시키고, `.test.tsx` 접미사를 사용합니다. (예: `src/components/ui/Button.tsx`의 테스트는 `src/components/ui/Button.test.tsx`)
- 테스트 관련 설정 파일은 `vitest.config.ts`입니다.

## 테스트 작성 예시

`React Testing Library`를 사용하여 사용자의 상호작용을 시뮬레이션합니다.

```tsx
// src/components/Counter.tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

// src/components/Counter.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Counter } from './Counter';

describe('Counter', () => {
  it('should render initial count and increment on button click', () => {
    // 1. 렌더링
    render(<Counter />);

    // 2. 초기 상태 검증
    expect(screen.getByText('Count: 0')).toBeInTheDocument();

    // 3. 이벤트 시뮬레이션
    const incrementButton = screen.getByRole('button', { name: /increment/i });
    fireEvent.click(incrementButton);

    // 4. 결과 검증
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });
});
```

## 테스트 실행

`package.json`에 정의된 다음 스크립트를 사용하여 테스트를 실행할 수 있습니다.

- **`bun test`**: 모든 테스트를 실행합니다.
- **`bun run test:ui`**: Vitest UI를 통해 시각적으로 테스트를 확인하고 관리합니다.
- **`bun run test:coverage`**: 테스트 커버리지 리포트를 생성합니다.
