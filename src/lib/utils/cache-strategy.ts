/**
 * 캐시 전략을 정의하는 인터페이스입니다.
 * @template K 캐시 키 타입
 * @template V 캐시 값 타입
 */
export interface CacheStrategy<K, V> {
  /**
   * 캐시에서 값을 가져옵니다.
   * @param key 캐시 키
   * @returns 캐시된 값 또는 undefined
   */
  get(key: K): V | undefined;

  /**
   * 캐시에 값을 저장합니다.
   * @param key 캐시 키
   * @param value 저장할 값
   */
  set(key: K, value: V): void;

  /**
   * 캐시를 초기화합니다.
   */
  clear(): void;

  /**
   * 캐시 크기를 반환합니다.
   */
  size(): number;

  /**
   * 캐시 통계를 반환합니다.
   */
  getStats(): CacheStats;
}

/**
 * 캐시 통계 정보입니다.
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  lastCleanup: number;
  cacheSize: number;
}

/**
 * 적응형 LRU 캐시 구현체입니다.
 * @template K 캐시 키 타입
 * @template V 캐시 값 타입
 */
export class AdaptiveLRUCache<K, V> implements CacheStrategy<K, V> {
  private readonly cache = new Map<K, V>();
  private readonly maxSize: number;
  private stats: Omit<CacheStats, 'hitRate' | 'cacheSize'> = {
    hits: 0,
    misses: 0,
    evictions: 0,
    lastCleanup: Date.now(),
  };

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 진정한 LRU: 접근 시 항목을 맨 뒤로 이동
      this.cache.delete(key);
      this.cache.set(key, value);
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    return value;
  }

  set(key: K, value: V): void {
    // 이미 존재하는 키라면 먼저 제거 (순서 업데이트)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, value);
    this.maintainCacheSize();
  }

  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      lastCleanup: Date.now(),
    };
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      cacheSize: this.cache.size,
    };
  }

  /**
   * 워크로드 패턴에 따른 적응형 캐시 관리
   * @private
   */
  private maintainCacheSize(): void {
    if (this.cache.size <= this.maxSize) return;

    const now = Date.now();
    const timeSinceLastCleanup = now - this.stats.lastCleanup;
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses);

    // 적응형 제거 비율: 히트율이 높으면 적게, 낮으면 많이 제거
    let removalRatio = 0.3; // 기본 30%
    if (hitRate > 0.8) {
      removalRatio = 0.2; // 히트율 높음: 20%만 제거
    } else if (hitRate < 0.5) {
      removalRatio = 0.4; // 히트율 낮음: 40% 제거
    }

    // 빈번한 정리 방지: 최소 간격 유지
    if (timeSinceLastCleanup < 1000) {
      // 1초 미만이면
      removalRatio = Math.min(removalRatio, 0.1); // 최대 10%만 제거
    }

    const entriesToRemove = Math.floor(this.cache.size * removalRatio);
    const keysToRemove = Array.from(this.cache.keys()).slice(0, entriesToRemove);

    for (const key of keysToRemove) {
      this.cache.delete(key);
    }

    this.stats.evictions += entriesToRemove;
    this.stats.lastCleanup = now;
  }
}

/**
 * WeakMap 기반 캐시 구현체 (메모리 효율적)
 * @template V 캐시 값 타입
 */
export class WeakMapCache<V> implements CacheStrategy<object, V> {
  private readonly cache = new WeakMap<object, V>();
  private stats: Omit<CacheStats, 'hitRate' | 'cacheSize'> = {
    hits: 0,
    misses: 0,
    evictions: 0,
    lastCleanup: Date.now(),
  };

  get(key: object): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    return value;
  }

  set(key: object, value: V): void {
    this.cache.set(key, value);
  }

  clear(): void {
    // WeakMap은 clear 메서드가 없으므로 새로운 인스턴스 생성
    // 하지만 인터페이스 호환성을 위해 stats만 초기화
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      lastCleanup: Date.now(),
    };
  }

  size(): number {
    // WeakMap은 size를 알 수 없으므로 -1 반환
    return -1;
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      cacheSize: -1, // WeakMap은 크기를 알 수 없음
    };
  }
}
