# 상수 (Constants)

이 디렉터리는 애플리케이션 전역에서 사용하는 상수 값을 포함하고 있습니다.

## 사용 가능한 상수

**경로**: `src/constants/index.ts`

### `TIME`

시간 관련 상수를 밀리초(ms) 단위로 제공합니다.

- `SECOND`: 1000
- `MINUTE`: 60000
- `HOUR`: 3600000
- `DAY`: 86400000

**사용 예시**

```typescript
import { TIME } from '@/constants';

setTimeout(doSomething, TIME.SECOND * 5); // 5초 후 실행
```

### `HTTP_STATUS`

자주 사용되는 HTTP 상태 코드를 제공합니다.

- `OK`: 200
- `CREATED`: 201
- `BAD_REQUEST`: 400
- `UNAUTHORIZED`: 401
- `NOT_FOUND`: 404
- `INTERNAL_SERVER_ERROR`: 500
- ... 등

**사용 예시**

```typescript
import { HTTP_STATUS } from '@/constants';

if (response.status === HTTP_STATUS.OK) {
  console.log('Success!');
}
```

### `REGEX`

자주 사용되는 정규식 패턴을 제공합니다.

- `EMAIL`: 이메일 형식 검증
- `URL`: URL 형식 검증

**사용 예시**

```typescript
import { REGEX } from '@/constants';

const isValidEmail = REGEX.EMAIL.test(email);
