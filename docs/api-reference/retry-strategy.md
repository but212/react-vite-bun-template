# Retry Strategy API Reference

실패한 작업에 대한 지능적인 재시도 전략을 제공하는 유틸리티입니다.

## 개요

Retry Strategy는 네트워크 요청, 데이터베이스 연결, 파일 I/O 등에서 발생할 수 있는 일시적인 실패에 대해 자동으로 재시도하는 메커니즘을 제공합니다. 다양한 재시도 전략을 통해 시스템의 안정성과 복원력을 향상시킵니다.

## 주요 기능

- **지수 백오프**: 재시도 간격을 지수적으로 증가시켜 시스템 부하 감소
- **지터(Jitter)**: 재시도 시점을 무작위화하여 동시 재시도 방지
- **최대 재시도 횟수**: 무한 재시도 방지를 위한 제한
- **조건부 재시도**: 특정 에러 타입에 대해서만 재시도
- **커스텀 전략**: 사용자 정의 재시도 로직 구현 가능

## 기본 사용법

```typescript
import { ExponentialBackoffRetryStrategy } from '@/lib/utils/retry-strategy';

// 기본 지수 백오프 전략
const retryStrategy = new ExponentialBackoffRetryStrategy(
  3,     // 최대 재시도 횟수
  1000,  // 초기 지연 시간 (ms)
  2      // 백오프 배수
);

// 재시도가 필요한 작업 실행
async function unreliableOperation() {
  const response = await fetch('/api/data');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

const result = await retryStrategy.execute(unreliableOperation);
```

## API 참조

### RetryStrategy 인터페이스

모든 재시도 전략이 구현해야 하는 기본 인터페이스입니다.

```typescript
interface RetryStrategy {
  execute<T>(operation: () => Promise<T>): Promise<T>;
  shouldRetry(error: Error, attemptNumber: number): boolean;
  getDelay(attemptNumber: number): number;
}
```

### ExponentialBackoffRetryStrategy

지수 백오프 알고리즘을 사용하는 재시도 전략입니다.

#### 생성자

```typescript
constructor(
  maxRetries: number = 3,
  initialDelay: number = 1000,
  backoffMultiplier: number = 2,
  maxDelay: number = 30000,
  jitter: boolean = true
)
```

**매개변수:**

- `maxRetries`: 최대 재시도 횟수 (기본값: 3)
- `initialDelay`: 초기 지연 시간 (ms, 기본값: 1000)
- `backoffMultiplier`: 백오프 배수 (기본값: 2)
- `maxDelay`: 최대 지연 시간 (ms, 기본값: 30000)
- `jitter`: 지터 활성화 여부 (기본값: true)

#### 주요 메서드

##### `execute<T>(operation: () => Promise<T>): Promise<T>`

작업을 실행하고 실패 시 재시도합니다.

**예제:**

```typescript
const strategy = new ExponentialBackoffRetryStrategy(5, 500, 1.5);

const data = await strategy.execute(async () => {
  const response = await fetch('/api/users');
  if (response.status === 429) {
    throw new Error('Rate limited');
  }
  return response.json();
});
```

##### `shouldRetry(error: Error, attemptNumber: number): boolean`

에러와 시도 횟수를 기반으로 재시도 여부를 결정합니다.

##### `getDelay(attemptNumber: number): number`

시도 횟수에 따른 지연 시간을 계산합니다.

**지연 시간 계산 공식:**

```typescript
delay = initialDelay * (backoffMultiplier ^ attemptNumber)
if (jitter) delay = delay * (0.5 + Math.random() * 0.5)
delay = Math.min(delay, maxDelay)
```

## 고급 사용법

### 커스텀 재시도 조건

```typescript
class CustomRetryStrategy extends ExponentialBackoffRetryStrategy {
  shouldRetry(error: Error, attemptNumber: number): boolean {
    // 특정 에러만 재시도
    if (error.message.includes('ECONNRESET') || 
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('Rate limited')) {
      return super.shouldRetry(error, attemptNumber);
    }
    return false;
  }
}

const customStrategy = new CustomRetryStrategy(3, 1000, 2);
```

### HTTP 상태 코드 기반 재시도

```typescript
class HttpRetryStrategy extends ExponentialBackoffRetryStrategy {
  shouldRetry(error: Error, attemptNumber: number): boolean {
    // HTTP 에러 처리
    if (error.message.includes('HTTP')) {
      const statusCode = parseInt(error.message.match(/HTTP (\d+)/)?.[1] || '0');
      
      // 5xx 서버 에러와 429 Rate Limit만 재시도
      if (statusCode >= 500 || statusCode === 429) {
        return super.shouldRetry(error, attemptNumber);
      }
      return false;
    }
    
    return super.shouldRetry(error, attemptNumber);
  }
}
```

### 데이터베이스 연결 재시도

```typescript
async function connectToDatabase() {
  const retryStrategy = new ExponentialBackoffRetryStrategy(
    5,     // 최대 5회 재시도
    2000,  // 2초 초기 지연
    1.5,   // 1.5배씩 증가
    15000  // 최대 15초 지연
  );

  return await retryStrategy.execute(async () => {
    const connection = await createConnection({
      host: 'localhost',
      port: 5432,
      database: 'myapp'
    });
    
    // 연결 테스트
    await connection.query('SELECT 1');
    return connection;
  });
}
```

### 파일 업로드 재시도

```typescript
async function uploadFile(file: File) {
  const uploadStrategy = new ExponentialBackoffRetryStrategy(
    3,     // 최대 3회 재시도
    1000,  // 1초 초기 지연
    2,     // 2배씩 증가
    10000, // 최대 10초 지연
    true   // 지터 활성화
  );

  return await uploadStrategy.execute(async () => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: HTTP ${response.status}`);
    }
    
    return response.json();
  });
}
```

## 실제 사용 사례

### API 클라이언트 래퍼

```typescript
class ApiClient {
  private retryStrategy: RetryStrategy;

  constructor() {
    this.retryStrategy = new ExponentialBackoffRetryStrategy(3, 1000, 2);
  }

  async get<T>(url: string): Promise<T> {
    return this.retryStrategy.execute(async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    });
  }

  async post<T>(url: string, data: any): Promise<T> {
    return this.retryStrategy.execute(async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    });
  }
}

// 사용법
const api = new ApiClient();
const users = await api.get<User[]>('/api/users');
```

### 배치 작업 처리

```typescript
async function processBatchWithRetry<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  batchSize: number = 10
) {
  const retryStrategy = new ExponentialBackoffRetryStrategy(3, 500, 1.5);
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(item => 
        retryStrategy.execute(() => processor(item))
      )
    );
  }
}

// 사용 예제
await processBatchWithRetry(
  userIds,
  async (userId) => {
    await updateUserProfile(userId);
  },
  5
);
```

## 모니터링 및 로깅

```typescript
class LoggingRetryStrategy extends ExponentialBackoffRetryStrategy {
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt}/${this.maxRetries}`);
        }
        
        const result = await operation();
        
        if (attempt > 0) {
          console.log(`Operation succeeded after ${attempt} retries`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < this.maxRetries && this.shouldRetry(lastError, attempt)) {
          const delay = this.getDelay(attempt);
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`All ${this.maxRetries + 1} attempts failed`);
    throw lastError;
  }
}
```

## 성능 고려사항

### 지터의 중요성

```typescript
// 지터 없음 - 동시 재시도로 인한 서버 부하
const noJitterStrategy = new ExponentialBackoffRetryStrategy(3, 1000, 2, 30000, false);

// 지터 있음 - 재시도 시점 분산으로 부하 감소
const jitterStrategy = new ExponentialBackoffRetryStrategy(3, 1000, 2, 30000, true);
```

### 적절한 백오프 설정

```typescript
// 빠른 복구가 예상되는 경우
const fastRetry = new ExponentialBackoffRetryStrategy(5, 100, 1.2, 2000);

// 느린 복구가 예상되는 경우
const slowRetry = new ExponentialBackoffRetryStrategy(3, 5000, 2, 60000);

// 네트워크 요청용 균형잡힌 설정
const networkRetry = new ExponentialBackoffRetryStrategy(3, 1000, 2, 10000);
```

## 모범 사례

1. **적절한 재시도 횟수**: 너무 많으면 응답 시간 지연, 너무 적으면 복구 기회 상실
2. **지터 사용**: 동시 재시도로 인한 서버 부하 방지
3. **에러 타입 구분**: 재시도 가능한 에러와 불가능한 에러 구분
4. **모니터링**: 재시도 패턴과 성공률 추적
5. **타임아웃 설정**: 개별 시도에 대한 타임아웃 설정

## 관련 문서

- [Data Stream API](./data-stream.md)
- [Async Utilities API](./async.md)
- [Performance Benchmark API](./performance-benchmark.md)
