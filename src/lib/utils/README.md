# Utils Library

고성능 TypeScript 유틸리티 라이브러리로, 실무에서 자주 사용되는 다양한 기능들을 제공합니다.

## 📦 모듈 구성

### 🔧 Core Utilities

- [`bit-utils`](#bit-utils) - 고성능 비트 연산 유틸리티
- [`cache-strategy`](#cache-strategy) - LRU 캐시 시스템
- [`async`](#async) - 비동기 처리 유틸리티
- [`object`](#object) - 객체 조작 유틸리티

### 🎨 UI/UX Utilities

- [`cn`](#cn) - Tailwind CSS 클래스 병합

### 🔄 Functional Programming

- [`pipe`](#pipe) - 함수 파이프라인 유틸리티

### ⚙️ Configuration

- [`env`](#env) - Vite 환경 변수 처리
- [`retry-strategy`](#retry-strategy) - 재시도 전략

## 🚀 빠른 시작

```typescript
import { 
  cn, 
  sleep, 
  debounce, 
  pipe, 
  pick, 
  omit, 
  BitUtils,
  AdaptiveLRUCache 
} from '@/lib/utils';

// CSS 클래스 병합
const className = cn('px-4 py-2', { 'bg-blue-500': isActive });

// 비동기 처리
await sleep(1000);
const debouncedFn = debounce(() => console.log('Hello'), 300);

// 함수형 프로그래밍
const transform = pipe(
  (x: number) => x * 2,
  (x: number) => x + 1,
  (x: number) => x.toString()
);
console.log(transform(5)); // "11"

// 객체 조작
const user = { id: 1, name: 'John', email: 'john@example.com', password: '***' };
const publicUser = omit(user, ['password']);
const basicInfo = pick(user, ['id', 'name']);
```

## 📚 상세 API 문서

### bit-utils

고성능 비트 연산을 위한 유틸리티 클래스입니다.

```typescript
import { BitUtils } from '@/lib/utils';

const bitUtils = new BitUtils();

// 비트 설정/해제
bitUtils.setBit(0b1010, 1);     // 0b1110
bitUtils.clearBit(0b1110, 1);   // 0b1100
bitUtils.toggleBit(0b1010, 0);  // 0b1011

// 비트 검사
bitUtils.hasBit(0b1010, 1);     // true
bitUtils.hasBit(0b1010, 0);     // false

// 비트 카운팅
bitUtils.popcount(0b1010);      // 2 (설정된 비트 개수)
bitUtils.clz(0b1010);          // 28 (선행 0의 개수)

// 비트 패턴 검색
bitUtils.findFirstSet(0b1010);  // 1 (첫 번째 설정된 비트 위치)
bitUtils.findLastSet(0b1010);   // 3 (마지막 설정된 비트 위치)
```

**성능 특징:**

- LRU 캐시를 통한 연산 결과 캐싱
- 브라우저별 최적화된 알고리즘 사용
- 대용량 데이터 처리를 위한 청크 기반 처리

### cache-strategy

다양한 캐싱 전략을 제공하는 시스템입니다.

```typescript
import { AdaptiveLRUCache, TTLCache } from '@/lib/utils';

// LRU 캐시
const lruCache = new AdaptiveLRUCache<string, number>({ maxSize: 100 });
lruCache.set('key1', 42);
const value = lruCache.get('key1'); // 42

// TTL 캐시 (시간 기반 만료)
const ttlCache = new TTLCache<string, string>({ 
  maxSize: 50, 
  ttl: 5000 // 5초 후 만료
});

// 캐시 통계 확인
const stats = lruCache.getStats();
console.log(`Hit Rate: ${stats.hitRate * 100}%`);
```

### async

비동기 처리를 위한 유틸리티 함수들입니다.

```typescript
import { sleep, debounce, throttle, retry } from '@/lib/utils';

// 지연 실행
await sleep(1000); // 1초 대기

// 디바운스 (연속 호출 방지)
const debouncedSearch = debounce((query: string) => {
  console.log('Searching:', query);
}, 300);

debouncedSearch('a');
debouncedSearch('ab');
debouncedSearch('abc'); // 300ms 후에만 실행됨

// 스로틀 (호출 빈도 제한)
const throttledScroll = throttle(() => {
  console.log('Scroll event');
}, 100);

// 재시도 로직
const result = await retry(
  async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Failed');
    return response.json();
  },
  3, // 3회 재시도
  1000 // 1초 간격
);
```

### pipe

함수형 프로그래밍을 위한 파이프라인 유틸리티입니다.

```typescript
import { pipe, pipeAsync } from '@/lib/utils';

// 동기 파이프라인
const processNumber = pipe(
  (x: number) => x * 2,
  (x: number) => x + 10,
  (x: number) => Math.sqrt(x),
  (x: number) => Math.round(x)
);

console.log(processNumber(5)); // Math.round(Math.sqrt((5 * 2) + 10)) = 4

// 비동기 파이프라인
const processAsync = pipeAsync(
  async (url: string) => fetch(url),
  async (response: Response) => response.json(),
  async (data: any) => data.results,
  async (results: any[]) => results.map(item => item.name)
);

const names = await processAsync('/api/users');
```

### cn

Tailwind CSS 클래스를 지능적으로 병합하는 유틸리티입니다.

```typescript
import { cn } from '@/lib/utils';

// 기본 사용법
cn('px-2 py-1', 'text-red-500'); // "px-2 py-1 text-red-500"

// 조건부 클래스
cn('base-class', {
  'active-class': isActive,
  'disabled-class': isDisabled
});

// 중복 제거 (Tailwind 특화)
cn('px-2 py-1', 'px-4'); // "py-1 px-4" (px-2가 px-4로 대체됨)

// 배열 지원
cn(['class1', 'class2'], 'class3');

// 실제 컴포넌트 예시
function Button({ className, variant = 'default', ...props }) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded font-medium transition-colors',
        {
          'bg-blue-500 text-white hover:bg-blue-600': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'default',
          'bg-red-500 text-white hover:bg-red-600': variant === 'danger',
        },
        className
      )}
      {...props}
    />
  );
}
```

### object

객체 조작을 위한 유틸리티 함수들입니다.

```typescript
import { pick, omit, clamp } from '@/lib/utils';

const user = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secret123',
  role: 'admin',
  createdAt: new Date()
};

// 특정 속성만 선택
const publicProfile = pick(user, ['id', 'name', 'email']);
// { id: 1, name: 'John Doe', email: 'john@example.com' }

// 특정 속성 제외
const safeUser = omit(user, ['password']);
// password를 제외한 모든 속성

// 값 범위 제한
const progress = clamp(150, 0, 100); // 100 (0-100 사이로 제한)
const temperature = clamp(-10, -5, 35); // -5 (최솟값으로 제한)
```

### env

Vite 환경 변수를 안전하게 처리하는 유틸리티입니다.

```typescript
import { getEnv } from '@/lib/utils';

// 환경 변수 가져오기
const apiUrl = getEnv('VITE_API_URL', 'http://localhost:3000');
const isDev = getEnv('VITE_NODE_ENV') === 'development';

// 타입 안전성 보장
try {
  const config = getEnv('VITE_APP_CONFIG');
} catch (error) {
  // 잘못된 키 형식이나 존재하지 않는 환경 변수 처리
  console.error('Environment variable error:', error.message);
}
```

## 🧪 테스트

```bash
# 전체 테스트 실행
npm test

# 특정 모듈 테스트
npm test bit-utils
npm test pipe
npm test utils

# 테스트 커버리지 확인
npm run test:coverage

# 테스트 UI 모드
npm run test:ui
```

## 📊 성능 특징

### 메모리 효율성

- **LRU 캐시**: 메모리 사용량 자동 관리
- **WeakMap 활용**: 가비지 컬렉션 친화적 캐싱
- **청크 기반 처리**: 대용량 데이터 처리 최적화

### 실행 성능

- **비트 연산 최적화**: 브라우저별 최적 알고리즘 선택
- **함수 메모이제이션**: 반복 계산 결과 캐싱
- **지연 평가**: 필요한 시점에만 연산 수행

### 번들 크기

- **트리 셰이킹 지원**: 사용하지 않는 코드 자동 제거
- **모듈별 임포트**: 필요한 기능만 선택적 로드
- **외부 의존성 최소화**: 핵심 기능은 자체 구현

## 🔧 고급 사용법

### 커스텀 캐시 전략

```typescript
import { CacheStrategy, CacheStats } from '@/lib/utils';

class CustomCache<K, V> implements CacheStrategy<K, V> {
  private cache = new Map<K, V>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    evictions: 0,
    lastCleanup: Date.now(),
    cacheSize: 0
  };

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    this.updateHitRate();
    return value;
  }

  set(key: K, value: V): void {
    this.cache.set(key, value);
    this.stats.cacheSize = this.cache.size;
  }

  clear(): void {
    this.cache.clear();
    this.stats.cacheSize = 0;
    this.stats.lastCleanup = Date.now();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}
```

### 복합 파이프라인

```typescript
import { pipe, pipeAsync } from '@/lib/utils';

// 데이터 변환 파이프라인
const processUserData = pipe(
  (rawData: string) => JSON.parse(rawData),
  (data: any) => ({
    id: data.user_id,
    name: data.full_name,
    email: data.email_address
  }),
  (user: any) => ({
    ...user,
    displayName: `${user.name} <${user.email}>`
  })
);

// API 호출 파이프라인
const fetchAndProcessUsers = pipeAsync(
  async (endpoint: string) => fetch(endpoint),
  async (response: Response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  async (data: any) => data.users || [],
  async (users: any[]) => users.map(processUserData)
);
```

## 🚨 주의사항

### 타입 안전성

- 모든 함수는 TypeScript로 작성되어 컴파일 타임 타입 검사를 제공합니다
- 런타임 검증도 포함되어 있어 예상치 못한 입력에 대해 적절한 에러를 발생시킵니다

### 성능 고려사항

- 대용량 데이터 처리 시 청크 크기를 적절히 조정하세요
- 캐시 크기는 메모리 사용량과 성능의 균형을 고려하여 설정하세요
- 비동기 파이프라인에서는 에러 전파를 위해 적절한 에러 핸들링을 구현하세요

### 브라우저 호환성

- 모던 브라우저 환경을 대상으로 합니다 (ES2020+)
- 필요시 폴리필을 추가하여 구형 브라우저 지원 가능

## 📄 라이센스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 🤝 기여하기

1. 이슈 리포트: 버그나 개선사항을 GitHub Issues에 등록
2. 풀 리퀘스트: 새로운 기능이나 버그 수정을 위한 PR 환영
3. 테스트: 새로운 기능 추가 시 적절한 테스트 케이스 포함 필수

---

> 💡 **팁**: 이 라이브러리는 실무 경험을 바탕으로 자주 사용되는 패턴들을 추상화한 것입니다. 프로젝트의 특성에 맞게 필요한 부분만 선택적으로 사용하세요.
