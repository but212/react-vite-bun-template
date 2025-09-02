import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

const httpLink = new HttpLink({
  uri: 'https://spacex.land/graphql/',
});

/**
 * Apollo Client 인스턴스
 * @description GraphQL 서버와 통신하기 위한 클라이언트입니다.
 * @see https://www.apollographql.com/docs/react/
 */
export const client = new ApolloClient({
  // GraphQL 서버와 통신하기 위한 링크를 설정합니다.
  link: httpLink,
  // 쿼리 결과를 캐시하기 위한 인스턴스를 생성합니다.
  cache: new InMemoryCache(),
});
