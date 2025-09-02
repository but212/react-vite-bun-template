# 캐시 전략 유틸리티

**경로**: `src/lib/utils/cache-strategy.ts`

이 파일은 다양한 요구사항에 맞는 캐시 전략을 구현한 클래스들을 제공합니다. `AdaptiveLRUCache`와 `WeakMapCache` 두 가지 주요 구현체가 포함되어 있습니다.

---

## 인터페이스

### `CacheStrategy<K, V>`

모든 캐시 구현체가 따라야 하는 공통 인터페이스입니다.

```typescript
export interface CacheStrategy<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  clear(): void;
  size(): number;
  getStats(): CacheStats;
}
```

### `CacheStats`

캐시의 성능을 추적하기 위한 통계 정보를 정의합니다.

```typescript
export interface CacheStats {
  hits: number;        // 캐시 히트 횟수
  misses: number;      // 캐시 미스 횟수
  hitRate: number;     // 히트율 (0-1)
  evictions: number;   // 제거된 항목 수
  lastCleanup: number; // 마지막 정리 시각 (타임스탬프)
  cacheSize: number;   // 현재 캐시 크기
}
```

---

## `AdaptiveLRUCache<K, V>`

워크로드에 따라 제거 정책을 동적으로 조절하는 **적응형 LRU(Least Recently Used) 캐시**입니다. 일반적인 캐싱 요구사항에 적합합니다.

### 주요 특징 - AdaptiveLRUCache

- **LRU 정책**: 가장 오랫동안 사용되지 않은 항목을 우선적으로 제거합니다.
- **적응형 제거**: 캐시 히트율에 따라 제거할 항목의 비율을 동적으로 조절합니다. (히트율이 높으면 적게, 낮으면 많이 제거)
- **크기 제한**: 생성 시 지정된 `maxSize`를 초과하지 않도록 크기를 관리합니다.
- **통계 제공**: 상세한 성능 통계를 `getStats()`를 통해 제공합니다.

### 함수 시그니처 - AdaptiveLRUCache

```typescript
export class AdaptiveLRUCache<K, V> implements CacheStrategy<K, V> {
  constructor(maxSize?: number);
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  clear(): void;
  size(): number;
  getStats(): CacheStats;
}
```

### 사용 예시 - AdaptiveLRUCache

```typescript
// 최대 100개의 항목을 저장하는 캐시 생성
const lruCache = new AdaptiveLRUCache<string, number>(100);

lruCache.set('user:1', 12345);
lruCache.set('product:5', 67890);

const userId = lruCache.get('user:1'); // 12345 (히트)
const nonExistent = lruCache.get('user:2'); // undefined (미스)

console.log(lruCache.size()); // 2
console.log(lruCache.getStats()); // { hits: 1, misses: 1, ... }
```

---

## `WeakMapCache<V>`

`WeakMap`을 기반으로 하여 메모리 효율성을 극대화한 캐시입니다. 키(key)가 반드시 **객체**여야 하며, 해당 객체에 대한 다른 참조가 사라지면 가비지 컬렉터(GC)가 캐시 항목을 자동으로 제거합니다.

### 주요 특징 - WeakMapCache

- **메모리 효율성**: 키 객체가 GC의 대상이 되면 캐시에서도 자동으로 제거되어 메모리 누수를 방지합니다.
- **객체 키 전용**: 키는 반드시 객체여야 합니다. (e.g., `string`, `number` 사용 불가)
- **제한된 기능**: `WeakMap`의 특성상 전체 캐시를 순회하거나 크기를 확인하는 것이 불가능합니다.
  - `size()`는 항상 `-1`을 반환합니다.
  - `clear()`는 통계 정보만 초기화하며, 실제 데이터는 GC에 의해 관리됩니다.

### 함수 시그니처 - WeakMapCache

```typescript
export class WeakMapCache<V> implements CacheStrategy<object, V> {
  constructor();
  get(key: object): V | undefined;
  set(key: object, value: V): void;
  clear(): void;
  size(): number;
  getStats(): CacheStats;
}
```

### 사용 예시 - WeakMapCache

```typescript
const weakCache = new WeakMapCache<string>();

let userNode = { id: 1 };
weakCache.set(userNode, 'User Data');

console.log(weakCache.get(userNode)); // 'User Data'

// userNode에 대한 모든 참조를 제거
userNode = null;

// 잠시 후, GC가 동작하면 weakCache에서 해당 항목이 자동으로 제거됩니다.
// (정확한 시점은 보장되지 않음)
```
