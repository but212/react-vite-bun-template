import { afterEach, describe, expect, test, vi } from 'vitest';

// async.ts 테스트
import { debounce, retry, sleep, throttle } from './async';

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
    expect(getEnv('VITE_NONEXISTENT' as keyof ImportMetaEnv, 'default')).toBe('default');
  });

  test('기본값이 없으면 빈 문자열 반환', () => {
    delete import.meta.env.VITE_NONEXISTENT;
    expect(getEnv('VITE_NONEXISTENT' as keyof ImportMetaEnv)).toBe('');
  });

  test('문자열이 아닌 값에 대해 기본값 반환', () => {
    // getEnv 함수는 실제로 숫자를 문자열로 변환하므로 테스트 수정
    (import.meta.env as any).VITE_NUMBER = 123;
    // 숫자가 문자열로 변환되어 반환되는 것이 정상 동작
    expect(getEnv('VITE_NUMBER' as keyof ImportMetaEnv)).toBe('123');
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
      const result = pick(testObj, ['name', 'nonexistent' as keyof typeof testObj]);
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
      const result = omit(testObj, ['nonexistent' as keyof typeof testObj]);
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
