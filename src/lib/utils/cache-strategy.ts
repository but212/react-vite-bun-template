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
 * 캐시 통계 정보를 나타내는 인터페이스입니다.
 *
 * @property hits        캐시 히트(성공적 조회) 횟수
 * @property misses      캐시 미스(조회 실패) 횟수
 * @property hitRate     전체 요청 대비 히트 비율 (0~1, hits/(hits+misses))
 * @property evictions   캐시 용량 초과 등으로 인한 항목 제거(퇴출) 횟수
 * @property lastCleanup 마지막 캐시 정리(청소) 시각 (ms 단위 타임스탬프, Date.now() 기준)
 * @property cacheSize   현재 캐시 내 저장된 항목 수 (-1은 크기 측정 불가 의미)
 */
export interface CacheStats {
  /** 캐시 히트(성공적 조회) 횟수 */
  hits: number;
  /** 캐시 미스(조회 실패) 횟수 */
  misses: number;
  /** 전체 요청 대비 히트 비율 (0~1) */
  hitRate: number;
  /** 캐시 용량 초과 등으로 인한 항목 제거(퇴출) 횟수 */
  evictions: number;
  /** 마지막 캐시 정리(청소) 시각 (ms 단위 타임스탬프) */
  lastCleanup: number;
  /** 현재 캐시 내 저장된 항목 수 (-1: 크기 측정 불가) */
  cacheSize: number;
}

/**
 * 적응형 LRU(Least Recently Used) 캐시 구현체입니다.
 *
 * @template K 캐시 키 타입
 * @template V 캐시 값 타입
 *
 * @remarks
 * - 기본적으로 LRU 정책(가장 오래 사용되지 않은 항목 제거)을 따르며,
 *   실제 워크로드의 히트율에 따라 동적으로 캐시 정리 비율이 조절됩니다.
 * - 캐시 크기 초과, 낮은/높은 히트율, 연속 접근 등 다양한 상황에서
 *   효율적으로 메모리와 성능을 균형 있게 관리할 수 있습니다.
 * - 통계 정보(히트, 미스, 퇴출, 히트율 등)와 캐시 크기 측정 및 초기화 기능을 제공합니다.
 *
 * @example
 * ```typescript
 * const cache = new AdaptiveLRUCache<string, number>(100);
 * cache.set('a', 1);
 * cache.set('b', 2);
 * cache.get('a'); // 1 (히트)
 * cache.get('c'); // undefined (미스)
 * cache.size();   // 현재 캐시 항목 수 반환
 * cache.clear();  // 캐시 초기화
 * ```
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

  /**
   * AdaptiveLRUCache 인스턴스를 생성합니다.
   * @param maxSize 캐시에 허용할 최대 항목 수 (기본값: 1000)
   */
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * 캐시에서 값을 가져옵니다.
   *
   * @param key 캐시 키
   * @returns 캐시된 값 또는 undefined
   *
   * @remarks
   * - LRU 정책을 위해 값 조회 시 해당 항목을 맨 뒤로 이동합니다.
   * - 캐시 히트/미스 통계를 갱신합니다.
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // LRU: 접근 시 항목을 가장 최근으로 이동
      this.cache.delete(key);
      this.cache.set(key, value);
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    return value;
  }

  /**
   * 캐시에 값을 저장합니다.
   *
   * @param key 캐시 키
   * @param value 저장할 값
   *
   * @remarks
   * - 이미 존재하는 키라면 LRU 순서를 위해 먼저 제거 후 다시 추가합니다.
   * - set 후 캐시 크기를 유지 관리합니다.
   */
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, value);
    this.maintainCacheSize();
  }

  /**
   * 캐시를 초기화합니다.
   *
   * @remarks
   * - 모든 캐시 데이터를 제거하고 통계 정보를 리셋합니다.
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      lastCleanup: Date.now(),
    };
  }

  /**
   * 현재 캐시에 저장된 항목 수를 반환합니다.
   * @returns 캐시 내 저장된 항목 수
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 캐시 통계 정보를 반환합니다.
   * @returns CacheStats 객체 (히트, 미스, 히트율, 제거 수, 마지막 정리 시각, 캐시 크기 포함)
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      cacheSize: this.cache.size,
    };
  }

  /**
   * 워크로드 패턴 및 히트율에 따라 캐시 크기를 적응적으로 관리합니다.
   *
   * @private
   * @remarks
   * - 캐시가 {@link AdaptiveLRUCache.maxSize}를 초과하면 LRU 정책에 따라 일부 항목을 제거합니다.
   * - 최근 접근 패턴(히트율)에 따라 제거 비율이 동적으로 조정됩니다.
   *   - 히트율이 높으면 적게, 낮으면 많이 제거하여 워크로드에 효율적으로 대응합니다.
   * - 캐시 정리(청소)가 1초 이내에 반복될 경우, 불필요한 빈번한 제거를 막기 위해
   *   제거 비율을 최대 10%로 제한합니다.
   *
   * @example
   * ```typescript
   * // 내부적으로 set() 호출 시 자동 실행됨
   * cache.set('foo', 1); // 캐시 초과 시 일부 항목 자동 제거
   * ```
   */
  private maintainCacheSize(): void {
    if (this.cache.size <= this.maxSize) return;

    const now = Date.now();
    const timeSinceLastCleanup = now - this.stats.lastCleanup;
    const hitRate =
      this.stats.hits + this.stats.misses > 0 ? this.stats.hits / (this.stats.hits + this.stats.misses) : 0;

    // 적응형 제거 비율: 히트율에 따라 조정
    let removalRatio = 0.3; // 기본 30%
    if (hitRate > 0.8) {
      removalRatio = 0.2; // 히트율 높음: 20%만 제거
    } else if (hitRate < 0.5) {
      removalRatio = 0.4; // 히트율 낮음: 40% 제거
    }

    // 과도한 빈번한 정리 방지: 최소 간격 내에는 최대 10%만 제거
    if (timeSinceLastCleanup < 1000) {
      removalRatio = Math.min(removalRatio, 0.1);
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
 * {@link CacheStrategy}를 구현한 WeakMap 기반 메모리 효율 캐시입니다.
 *
 * @template V 캐시 값 타입
 * @implements {CacheStrategy<object, V>}
 *
 * @remarks
 * - 객체만 키로 사용할 수 있습니다(문자열/숫자 불가).
 * - 키가 더 이상 참조되지 않으면 자동으로 GC에 의해 캐시 항목도 삭제됩니다.
 * - WeakMap 특성상 크기 측정, 전체 삭제, 순회가 불가합니다.
 * - {@link clear}는 실제 캐시 내용이 아닌 통계 정보만 초기화합니다.
 * - {@link size}는 항상 -1을 반환하며, {@link getStats}의 cacheSize도 -1입니다.
 *
 * @example
 * ```typescript
 * const cache = new WeakMapCache<number>();
 * const key = {};
 * cache.set(key, 123);
 * cache.get(key); // 123 (히트)
 * cache.get({}); // undefined (미스)
 * cache.clear(); // 통계만 초기화, 데이터는 남아 있음
 * ```
 */
export class WeakMapCache<V> implements CacheStrategy<object, V> {
  private readonly cache = new WeakMap<object, V>();
  private stats: Omit<CacheStats, 'hitRate' | 'cacheSize'> = {
    hits: 0,
    misses: 0,
    evictions: 0,
    lastCleanup: Date.now(),
  };

  /**
   * 캐시에서 값을 조회합니다.
   * @param key 객체 타입의 캐시 키
   * @returns 캐시된 값 또는 undefined
   * @remarks
   * - 캐시 히트/미스 통계를 갱신합니다.
   * - WeakMap 특성상 키가 없으면 undefined 반환
   */
  get(key: object): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    return value;
  }

  /**
   * 캐시에 값을 저장합니다.
   * @param key 객체 타입의 캐시 키
   * @param value 저장할 값
   * @remarks
   * - WeakMap에 값 저장 (동일 키면 덮어씀)
   */
  set(key: object, value: V): void {
    this.cache.set(key, value);
  }

  /**
   * 캐시 통계 정보를 초기화합니다.
   * @remarks
   * - WeakMap은 clear가 없으므로 통계만 리셋합니다.
   * - 기존 캐시 데이터는 남아 있습니다.
   */
  clear(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      lastCleanup: Date.now(),
    };
  }

  /**
   * 캐시 크기를 반환합니다.
   * @returns 항상 -1 (WeakMap 특성상 크기를 알 수 없음)
   */
  size(): number {
    return -1;
  }

  /**
   * 캐시 통계 정보를 반환합니다.
   * @returns CacheStats 객체 (히트, 미스, 히트율, 제거 수, 마지막 정리 시각, cacheSize=-1)
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      cacheSize: -1,
    };
  }
}
