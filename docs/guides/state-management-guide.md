# 상태 관리 가이드 (Zustand)

이 문서는 Zustand를 사용한 전역 상태 관리 전략을 설명합니다.

## 기본 원칙

- **최소한의 전역 상태**: 전역 상태는 여러 컴포넌트에서 공유되거나, 앱의 생명주기 동안 유지되어야 하는 상태에만 사용합니다. (예: 사용자 인증 정보, 테마 설정)
- **서버 상태 분리**: API로부터 가져오는 데이터는 `React Query`나 `SWR` 같은 서버 상태 관리 라이브러리로 관리하는 것을 권장합니다. 전역 스토어는 클라이언트 상태에 집중합니다.
- **원자적 스토어 (Atomic Stores)**: 관련된 상태와 액션을 하나의 스토어에 묶어 관리합니다. 거대한 단일 스토어 대신, 도메인별로 여러 개의 작은 스토어를 만듭니다.

## 스토어 구조

모든 Zustand 스토어는 `src/stores` 디렉터리에 위치합니다.

```typescript
// src/stores/useAuthStore.ts

import { create } from 'zustand';

interface User {
  id: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  isAuthenticated: false,
  login: user => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
```

### 타입 정의

- 스토어의 상태(state)와 액션(action)을 포함하는 `interface`를 정의합니다. (`AuthState`)
- 액션은 상태를 변경하는 함수이며, `set` 함수를 호출하여 상태를 업데이트합니다.

## 스토어 사용법

컴포넌트에서 훅처럼 호출하여 스토어의 상태와 액션을 사용할 수 있습니다.

```tsx
import { useAuthStore } from '@/stores/useAuthStore';

function UserProfile() {
  const { user, logout } = useAuthStore();

  if (!user) return null;

  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 성능 최적화

Zustand는 상태의 일부만 선택(select)하여 해당 상태가 변경될 때만 리렌더링을 트리거할 수 있습니다.

```tsx
// user 객체가 변경될 때만 리렌더링됩니다.
const user = useAuthStore(state => state.user);

// isAuthenticated가 변경될 때만 리렌더링됩니다.
const isAuthenticated = useAuthStore(state => state.isAuthenticated);
```

전체 스토어를 구독하면 스토어의 어떤 상태가 변경되어도 리렌더링이 발생하므로, 필요한 상태만 선택하여 사용하는 것이 성능에 유리합니다.
