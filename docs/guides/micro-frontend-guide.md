# 마이크로 프론트엔드 (Module Federation) 가이드

이 템플릿은 Vite와 Module Federation(`@originjs/vite-plugin-federation`)을 사용하여 **호스트** 애플리케이션으로 구성되어 있습니다. 이를 통해 독립적으로 배포된 다른 애플리케이션(리모트)의 컴포넌트를 동적으로 로드하고 렌더링할 수 있습니다.

## 1. 호스트 애플리케이션 설정

설정 파일은 `vite.config.ts`에 있습니다.

```typescript
// vite.config.ts
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    // ... 다른 플러그인
    federation({
      name: 'host-app', // 호스트 앱의 고유 이름
      remotes: {
        // 'remote_app': 'http://localhost:5001/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom'], // 리모트와 공유할 의존성
    }),
  ],
});
```

- **`name`**: 호스트 애플리케이션의 고유 식별자입니다.
- **`remotes`**: 리모트 애플리케이션의 이름과 `remoteEntry.js` 파일 URL을 매핑하는 객체입니다.
- **`shared`**: 호스트와 리모트 간에 공유할 의존성 배열입니다. (예: `react` 중복 로딩 방지)

## 2. 리모트 컴포넌트 로드하기

`React.lazy`와 `Suspense`를 사용하여 리모트 애플리케이션의 컴포넌트를 동적으로 로드합니다.

`src/components/RemoteButton.tsx` 예시:

```tsx
import React, { Suspense } from 'react';

// import 경로는 '{remoteName}/{exposedComponent}' 형식입니다.
// @ts-expect-error - 가상 모듈이므로 타입 에러 무시
const RemoteButton = React.lazy(() => import('remote_app/Button'));

const RemoteComponentLoader = () => {
  return (
    <div>
      <Suspense fallback={<div>로딩 중...</div>}>
        <RemoteButton />
      </Suspense>
    </div>
  );
};

export default RemoteComponentLoader;
```

## 3. 리모트 애플리케이션 추가 방법

1. **리모트 애플리케이션 생성**: 별도의 Vite 애플리케이션을 만들고 `@originjs/vite-plugin-federation`을 이용해 리모트로 설정합니다.

    ```typescript
    // 리모트 앱 vite.config.ts
    federation({
      name: 'remote_app',
      filename: 'remoteEntry.js',
      exposes: {
        './Button': './src/components/Button.tsx',
      },
      shared: ['react', 'react-dom'],
    })
    ```

2. **리모트 앱 실행**: 리모트 애플리케이션을 실행합니다. (예: `http://localhost:5001`)

3. **호스트 설정 업데이트**: 호스트의 `vite.config.ts`에서 `remotes` 객체를 수정합니다.

    ```typescript
    // host-app/vite.config.ts
    remotes: {
      'remote_app': 'http://localhost:5001/assets/remoteEntry.js',
    },
    ```

4. **호스트 재시작**: 변경사항을 반영하려면 호스트 개발 서버를 재시작하세요. 이제 리모트 컴포넌트가 정상적으로 로드됩니다.
