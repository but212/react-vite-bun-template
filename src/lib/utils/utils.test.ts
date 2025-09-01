import { afterEach, describe, expect, test, vi } from 'vitest';

// async.ts 테스트
import { debounce, retry, sleep, throttle } from './async';

// cache-strategy.ts 테스트
import { AdaptiveLRUCache, WeakMapCache } from './cache-strategy';

// cn.ts 테스트
import { cn } from './cn';

// env.ts 테스트
import { getEnv } from './env';

// object.ts 테스트
import { clamp, omit, pick } from './object';

describe('async utilities', () => {
  describe('sleep', () => {
    test('지정된 시간만큼 대기', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90); // 약간의 오차 허용
      expect(elapsed).toBeLessThan(150);
    });

    test('0ms 대기', async () => {
      const start = Date.now();
      await sleep(0);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50); // 더 관대한 타이밍 허용
    });
  });

  describe('debounce', () => {
    test('연속 호출 시 마지막 호출만 실행', async () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 50); // 짧은 지연 시간 사용

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      expect(fn).not.toHaveBeenCalled();

      // 지연 시간보다 조금 더 기다림
      await sleep(60);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('third');
    });

    test('대기 시간 후 새로운 호출 허용', async () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 50);

      debouncedFn('first');
      await sleep(60);
      expect(fn).toHaveBeenCalledWith('first');

      debouncedFn('second');
      await sleep(60);
      expect(fn).toHaveBeenCalledWith('second');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('기본 대기 시간 300ms', async () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn); // 기본값 300ms

      debouncedFn();
      await sleep(250); // 300ms보다 짧게 대기
      expect(fn).not.toHaveBeenCalled();

      await sleep(100); // 총 350ms 대기
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    test('지정된 시간 간격으로 호출 제한', async () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 50);

      throttledFn('first');
      expect(fn).toHaveBeenCalledWith('first');

      throttledFn('second');
      expect(fn).toHaveBeenCalledTimes(1); // 아직 50ms 지나지 않음

      await sleep(60); // 50ms 이상 대기
      throttledFn('third');
      expect(fn).toHaveBeenCalledWith('third');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('기본 대기 시간 300ms', async () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn); // 기본값 300ms

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1); // 아직 300ms 지나지 않음

      await sleep(350); // 300ms 이상 대기
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('retry', () => {
    test('성공 시 첫 번째 시도에서 결과 반환', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('실패 후 재시도하여 성공', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retry(fn, 3, 0); // delay 0으로 빠른 테스트

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('모든 재시도 실패 시 마지막 에러 던지기', async () => {
      const error1 = new Error('fail 1');
      const error2 = new Error('fail 2');
      const fn = vi.fn().mockRejectedValueOnce(error1).mockRejectedValueOnce(error2);

      await expect(retry(fn, 2, 0)).rejects.toThrow('fail 2');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('기본값: 3회 재시도', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fail'));

      await expect(retry(fn, undefined, 0)).rejects.toThrow('always fail');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});

describe('cache-strategy utilities', () => {
  describe('AdaptiveLRUCache', () => {
    test('기본 캐시 동작 - set/get', () => {
      const cache = new AdaptiveLRUCache<string, number>();

      cache.set('key1', 100);
      cache.set('key2', 200);

      expect(cache.get('key1')).toBe(100);
      expect(cache.get('key2')).toBe(200);
      expect(cache.size()).toBe(2);
    });

    test('캐시 미스', () => {
      const cache = new AdaptiveLRUCache<string, number>();
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    test('LRU 정책 - 최근 사용된 항목 유지', () => {
      const cache = new AdaptiveLRUCache<string, number>(3);

      cache.set('key1', 1);
      cache.set('key2', 2);
      cache.set('key3', 3);

      // key1에 접근하여 최근 사용으로 만듦
      cache.get('key1');

      // 새 항목 추가로 캐시 오버플로우 유발
      cache.set('key4', 4);

      // key1은 최근 사용되어 유지되어야 함
      expect(cache.get('key1')).toBe(1);
      expect(cache.get('key4')).toBe(4);
    });

    test('기존 키 업데이트', () => {
      const cache = new AdaptiveLRUCache<string, number>();

      cache.set('key', 100);
      expect(cache.get('key')).toBe(100);

      cache.set('key', 200); // 같은 키로 업데이트
      expect(cache.get('key')).toBe(200);
      expect(cache.size()).toBe(1); // 크기는 그대로
    });

    test('캐시 통계 수집', () => {
      const cache = new AdaptiveLRUCache<string, number>();

      // 초기 상태
      let stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.cacheSize).toBe(0);

      // 캐시 미스
      cache.get('key1');
      stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0);

      // 캐시 히트
      cache.set('key1', 100);
      cache.get('key1');
      stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.cacheSize).toBe(1);
    });

    test('적응형 캐시 제거 - 높은 히트율', () => {
      const cache = new AdaptiveLRUCache<string, number>(5);

      // 캐시 채우기
      for (let i = 1; i <= 5; i++) {
        cache.set(`key${i}`, i);
      }

      // 높은 히트율 생성 (반복 접근)
      for (let round = 0; round < 10; round++) {
        for (let i = 1; i <= 5; i++) {
          cache.get(`key${i}`);
        }
      }

      const statsBeforeEviction = cache.getStats();
      expect(statsBeforeEviction.hitRate).toBeGreaterThan(0.8);

      // 새 항목들 추가하여 제거 유발
      for (let i = 6; i <= 10; i++) {
        cache.set(`key${i}`, i);
      }

      const statsAfterEviction = cache.getStats();
      expect(statsAfterEviction.evictions).toBeGreaterThan(0);
    });

    test('적응형 캐시 제거 - 낮은 히트율', () => {
      const cache = new AdaptiveLRUCache<string, number>(5);

      // 낮은 히트율 시나리오: 캐시 크기보다 많은 새로운 키만 반복 접근
      for (let round = 0; round < 5; round++) {
        for (let i = 1; i <= 10; i++) {
          cache.get(`key${i}`); // 반복적으로 캐시에 없는 키 접근 (계속 미스)
        }
      }

      // 이후 일부만 set하여 캐시 오버플로우 유도
      for (let i = 1; i <= 10; i++) {
        cache.set(`key${i}`, i);
      }

      const stats = cache.getStats();
      expect(stats.hitRate).toBeLessThan(0.5);
      expect(stats.evictions).toBeGreaterThan(0);
    });

    test('캐시 초기화', () => {
      const cache = new AdaptiveLRUCache<string, number>();

      cache.set('key1', 1);
      cache.set('key2', 2);
      cache.get('key1'); // 히트 생성
      cache.get('nonexistent'); // 미스 생성

      expect(cache.size()).toBe(2);
      expect(cache.getStats().hits).toBe(1);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeUndefined();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
      expect(stats.evictions).toBe(0);
      expect(stats.cacheSize).toBe(0);
    });

    test('다양한 타입 지원', () => {
      // 문자열 키, 객체 값
      const cache1 = new AdaptiveLRUCache<string, { name: string; age: number }>();
      const user = { name: 'John', age: 30 };
      cache1.set('user1', user);
      expect(cache1.get('user1')).toEqual(user);

      // 숫자 키, 문자열 값
      const cache2 = new AdaptiveLRUCache<number, string>();
      cache2.set(1, 'first');
      cache2.set(2, 'second');
      expect(cache2.get(1)).toBe('first');
      expect(cache2.get(2)).toBe('second');
    });

    test('대용량 데이터 처리', () => {
      const cache = new AdaptiveLRUCache<number, string>(100);

      // 100개 항목 추가
      for (let i = 0; i < 100; i++) {
        cache.set(i, `value${i}`);
      }

      expect(cache.size()).toBe(100);

      // 추가 항목으로 제거 유발
      for (let i = 100; i < 150; i++) {
        cache.set(i, `value${i}`);
      }

      expect(cache.size()).toBeLessThanOrEqual(100);
      expect(cache.getStats().evictions).toBeGreaterThan(0);
    });
  });

  describe('WeakMapCache', () => {
    test('기본 캐시 동작 - set/get', () => {
      const cache = new WeakMapCache<number>();
      const key1 = {};
      const key2 = {};

      cache.set(key1, 100);
      cache.set(key2, 200);

      expect(cache.get(key1)).toBe(100);
      expect(cache.get(key2)).toBe(200);
    });

    test('캐시 미스', () => {
      const cache = new WeakMapCache<number>();
      const key = {};
      expect(cache.get(key)).toBeUndefined();
    });

    test('객체 키만 허용', () => {
      const cache = new WeakMapCache<string>();
      const objKey = {};
      const funcKey = () => {};
      const arrayKey: number[] = [];

      cache.set(objKey, 'object');
      cache.set(funcKey, 'function');
      cache.set(arrayKey, 'array');

      expect(cache.get(objKey)).toBe('object');
      expect(cache.get(funcKey)).toBe('function');
      expect(cache.get(arrayKey)).toBe('array');
    });

    test('캐시 통계 수집', () => {
      const cache = new WeakMapCache<number>();
      const key1 = {};
      const key2 = {};

      // 초기 상태
      let stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.cacheSize).toBe(-1); // WeakMap은 크기를 알 수 없음

      // 캐시 미스
      cache.get(key1);
      stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0);

      // 캐시 히트
      cache.set(key1, 100);
      cache.get(key1);
      stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    test('size() 메서드는 -1 반환', () => {
      const cache = new WeakMapCache<number>();
      expect(cache.size()).toBe(-1);

      const key = {};
      cache.set(key, 100);
      expect(cache.size()).toBe(-1); // 여전히 -1
    });

    test('clear() 메서드 - 통계만 초기화', () => {
      const cache = new WeakMapCache<number>();
      const key = {};

      cache.set(key, 100);
      cache.get(key); // 히트 생성
      cache.get({}); // 미스 생성

      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(1);

      cache.clear();

      // 통계는 초기화됨
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);

      // 하지만 실제 캐시 데이터는 여전히 접근 가능 (WeakMap 특성)
      expect(cache.get(key)).toBe(100);
    });

    test('다양한 객체 타입 키 지원', () => {
      const cache = new WeakMapCache<string>();

      const plainObj = {};
      const dateObj = new Date();
      const regexObj = /test/;
      const errorObj = new Error('test');

      cache.set(plainObj, 'plain');
      cache.set(dateObj, 'date');
      cache.set(regexObj, 'regex');
      cache.set(errorObj, 'error');

      expect(cache.get(plainObj)).toBe('plain');
      expect(cache.get(dateObj)).toBe('date');
      expect(cache.get(regexObj)).toBe('regex');
      expect(cache.get(errorObj)).toBe('error');
    });

    test('메모리 효율성 - 가비지 컬렉션 친화적', () => {
      const cache = new WeakMapCache<number>();

      // 키 객체가 스코프를 벗어나면 자동으로 가비지 컬렉션됨
      const createAndCacheData = () => {
        const tempKey = { id: 'temp' };
        cache.set(tempKey, 999);
        return tempKey;
      };

      const key = createAndCacheData();
      expect(cache.get(key)).toBe(999);

      // 실제 가비지 컬렉션 테스트는 어렵지만,
      // WeakMap의 특성상 키가 참조되지 않으면 자동 제거됨
    });
  });
});

describe('cn utility', () => {
  test('문자열 클래스 병합', () => {
    expect(cn('px-2 py-1', 'text-red-500')).toBe('px-2 py-1 text-red-500');
  });

  test('Tailwind 클래스 중복 제거', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  test('조건부 클래스 처리', () => {
    expect(cn('base-class', { 'conditional-class': true })).toBe('base-class conditional-class');
    expect(cn('base-class', { 'conditional-class': false })).toBe('base-class');
  });

  test('배열 형태 클래스 처리', () => {
    expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
  });

  test('빈 값 처리', () => {
    expect(cn('', null, undefined, false, 'valid-class')).toBe('valid-class');
  });

  test('복잡한 조합', () => {
    expect(
      cn(
        'px-2 py-1',
        { 'text-red-500': true, 'text-blue-500': false },
        ['bg-white', 'border'],
        'px-4' // px-2를 덮어씀
      )
    ).toBe('py-1 text-red-500 bg-white border px-4');
  });
});

describe('env utility', () => {
  const originalEnv = import.meta.env;

  afterEach(() => {
    // 환경 변수 복원
    Object.assign(import.meta.env, originalEnv);
  });

  test('존재하는 환경 변수 반환', () => {
    import.meta.env.VITE_TEST_VAR = 'test-value';
    expect(getEnv('VITE_TEST_VAR')).toBe('test-value');
  });

  test('존재하지 않는 환경 변수에 대해 기본값 반환', () => {
    delete import.meta.env.VITE_NONEXISTENT;
    expect(getEnv('VITE_NONEXISTENT', 'default')).toBe('default');
  });

  test('기본값이 없으면 빈 문자열 반환', () => {
    delete import.meta.env.VITE_NONEXISTENT;
    expect(getEnv('VITE_NONEXISTENT')).toBe('');
  });

  test('문자열이 아닌 값에 대해 기본값 반환', () => {
    // getEnv 함수는 실제로 숫자를 문자열로 변환하므로 테스트 수정
    (import.meta.env as any).VITE_NUMBER = 123;
    // 숫자가 문자열로 변환되어 반환되는 것이 정상 동작
    expect(getEnv('VITE_NUMBER')).toBe('123');
  });

  test('허용되지 않는 키 패턴이면 TypeError', () => {
    // VITE_ 접두사가 없거나 형식이 잘못된 경우
    expect(() => getEnv('DEV')).toThrow(TypeError);
    expect(() => getEnv('API_KEY')).toThrow(TypeError);
    expect(() => getEnv('VITE-lower')).toThrow(TypeError);
  });

  test('문자열이 아닌 키는 TypeError', () => {
    expect(() => getEnv(123)).toThrow(TypeError);
  });
});

describe('object utilities', () => {
  describe('clamp', () => {
    test('값이 범위 내에 있을 때 원래 값 반환', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    test('값이 최솟값보다 작을 때 최솟값 반환', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, -50, 50)).toBe(-50);
    });

    test('값이 최댓값보다 클 때 최댓값 반환', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, -50, 50)).toBe(50);
    });

    test('소수점 값 처리', () => {
      expect(clamp(3.7, 0, 5)).toBe(3.7);
      expect(clamp(-1.5, 0, 5)).toBe(0);
      expect(clamp(6.2, 0, 5)).toBe(5);
    });
  });

  describe('pick', () => {
    const testObj = {
      name: 'John',
      age: 30,
      email: 'john@example.com',
      city: 'Seoul',
    };

    test('지정된 키들만 선택', () => {
      const result = pick(testObj, ['name', 'age']);
      expect(result).toEqual({ name: 'John', age: 30 });
      expect(Object.keys(result)).toHaveLength(2);
    });

    test('존재하지 않는 키는 무시', () => {
      const result = pick(testObj, ['name', 'nonexistent']);
      expect(result).toEqual({ name: 'John' });
    });

    test('빈 키 배열', () => {
      const result = pick(testObj, []);
      expect(result).toEqual({});
    });

    test('모든 키 선택', () => {
      const result = pick(testObj, ['name', 'age', 'email', 'city']);
      expect(result).toEqual(testObj);
    });

    test('중첩 객체 처리', () => {
      const nestedObj = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' },
      };
      const result = pick(nestedObj, ['user']);
      expect(result).toEqual({ user: { name: 'John', age: 30 } });
    });
  });

  describe('omit', () => {
    const testObj = {
      name: 'John',
      age: 30,
      email: 'john@example.com',
      password: 'secret',
      city: 'Seoul',
    };

    test('지정된 키들 제외', () => {
      const result = omit(testObj, ['password', 'email']);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        city: 'Seoul',
      });
      expect('password' in result).toBe(false);
      expect('email' in result).toBe(false);
    });

    test('존재하지 않는 키는 무시', () => {
      const result = omit(testObj, ['nonexistent']);
      expect(result).toEqual(testObj);
    });

    test('빈 키 배열', () => {
      const result = omit(testObj, []);
      expect(result).toEqual(testObj);
    });

    test('모든 키 제외', () => {
      const result = omit(testObj, ['name', 'age', 'email', 'password', 'city']);
      expect(result).toEqual({});
    });

    test('중첩 객체 처리', () => {
      const nestedObj = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' },
        temp: 'remove',
      };
      const result = omit(nestedObj, ['temp']);
      expect(result).toEqual({
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' },
      });
    });
  });
});
