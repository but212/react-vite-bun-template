# GraphQL 사용 가이드

이 프로젝트는 `Apollo Client`를 사용하여 GraphQL API와 통신합니다.

## 설정

Apollo Client 설정은 `src/lib/apollo.ts` 파일에 정의되어 있습니다. 현재는 SpaceX GraphQL API를 예시로 사용하고 있습니다.

```typescript
// src/lib/apollo.ts
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const httpLink = new HttpLink({
  uri: 'https://spacex.land/graphql/', // GraphQL 엔드포인트
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
```

애플리케이션의 진입점인 `src/main.tsx`에서 `ApolloProvider`를 통해 클라이언트를 앱 전체에 주입합니다.

## 사용법

컴포넌트 내에서 `useQuery`, `useMutation`, `useSubscription` 등의 훅을 사용하여 GraphQL API와 상호작용할 수 있습니다.

### 데이터 조회 (useQuery)

`useQuery` 훅을 사용하여 데이터를 가져오는 예시입니다.

```tsx
// src/components/Launches.tsx
import { gql, useQuery } from '@apollo/client';

// GraphQL 쿼리 정의
const GET_LAUNCHES = gql`
  query GetLaunches {
    launches(limit: 5) {
      mission_name
    }
  }
`;

const Launches = () => {
  // 쿼리 실행
  const { loading, error, data } = useQuery(GET_LAUNCHES);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  // 데이터 렌더링
  return (
    <ul>
      {data.launches.map((launch: any) => (
        <li key={launch.mission_name}>{launch.mission_name}</li>
      ))}
    </ul>
  );
};
```

자세한 내용은 [Apollo Client 공식 문서](https://www.apollographql.com/docs/react/)를 참고하세요.
