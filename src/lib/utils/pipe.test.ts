import { describe, expect, test, vi } from 'vitest';
import {
  compose,
  composeAsync,
  constant,
  identity,
  pipe,
  pipeAsync,
  pipeIf,
  pipeParallel,
  pipeParallelAsync,
  pipeSafe,
  repeat,
} from './pipe';

describe('pipe utilities', () => {
  describe('pipe', () => {
    test('빈 파이프는 항등 함수 반환', () => {
      const pipeline = pipe();
      expect(pipeline(42)).toBe(42);
      expect(pipeline('hello')).toBe('hello');
      expect(pipeline(null)).toBe(null);
    });

    test('단일 함수 파이프', () => {
      const double = (x: number) => x * 2;
      const pipeline = pipe(double);

      expect(pipeline(5)).toBe(10);
      expect(pipeline(0)).toBe(0);
      expect(pipeline(-3)).toBe(-6);
    });

    test('두 함수 조합', () => {
      const add1 = (x: number) => x + 1;
      const double = (x: number) => x * 2;
      const pipeline = pipe(add1, double);

      expect(pipeline(3)).toBe(8); // (3 + 1) * 2 = 8
      expect(pipeline(0)).toBe(2); // (0 + 1) * 2 = 2
    });

    test('여러 함수 체이닝', () => {
      const add1 = (x: number) => x + 1;
      const double = (x: number) => x * 2;
      const toString = (x: number) => x.toString();
      const addExclamation = (s: string) => s + '!';

      const pipeline = pipe(add1, double, toString, addExclamation);
      expect(pipeline(3)).toBe('8!');
    });

    test('타입 변환 파이프라인', () => {
      const parseNumber = (s: string) => parseInt(s, 10);
      const isEven = (n: number) => n % 2 === 0;
      const boolToString = (b: boolean) => (b ? 'even' : 'odd');

      const pipeline = pipe(parseNumber, isEven, boolToString);
      expect(pipeline('4')).toBe('even');
      expect(pipeline('5')).toBe('odd');
    });

    test('함수가 아닌 값 전달 시 에러', () => {
      expect(() => {
        // @ts-expect-error 의도적으로 잘못된 타입 전달
        pipe(42, 'not a function');
      }).toThrow('All arguments must be functions');
    });

    test('함수 실행 중 에러 발생', () => {
      const throwError = () => {
        throw new Error('Test error');
      };
      const pipeline = pipe(throwError);

      expect(() => pipeline(1)).toThrow('Pipe execution failed: Test error');
    });

    test('복잡한 객체 변환', () => {
      interface User {
        name: string;
        age: number;
      }

      interface UserProfile {
        displayName: string;
        isAdult: boolean;
        category: string;
      }

      const extractName = (user: User) => user.name;
      const capitalize = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);
      const createProfile = (displayName: string): UserProfile => ({
        displayName,
        isAdult: true,
        category: 'user',
      });

      const pipeline = pipe(extractName, capitalize, createProfile);
      const user = { name: 'john', age: 25 };
      const result = pipeline(user);

      expect(result).toEqual({
        displayName: 'John',
        isAdult: true,
        category: 'user',
      });
    });
  });

  describe('pipeAsync', () => {
    test('빈 비동기 파이프는 Promise로 래핑된 항등 함수', async () => {
      const pipeline = pipeAsync();

      expect(await pipeline(42)).toBe(42);
      expect(await pipeline('hello')).toBe('hello');
    });

    test('단일 비동기 함수', async () => {
      const asyncDouble = async (x: number) => x * 2;
      const pipeline = pipeAsync(asyncDouble);

      expect(await pipeline(5)).toBe(10);
    });

    test('동기/비동기 함수 혼합', async () => {
      const add1 = (x: number) => x + 1;
      const asyncDouble = async (x: number) => x * 2;
      const toString = (x: number) => x.toString();

      const pipeline = pipeAsync(add1, asyncDouble, toString);
      expect(await pipeline(3)).toBe('8');
    });

    test('모든 함수가 비동기인 경우', async () => {
      const asyncAdd1 = async (x: number) => x + 1;
      const asyncDouble = async (x: number) => x * 2;
      const asyncToString = async (x: number) => x.toString();

      const pipeline = pipeAsync(asyncAdd1, asyncDouble, asyncToString);
      expect(await pipeline(3)).toBe('8');
    });

    test('비동기 함수에서 에러 발생', async () => {
      const asyncThrowError = async () => {
        throw new Error('Async test error');
      };
      const pipeline = pipeAsync(asyncThrowError);

      await expect(pipeline(1)).rejects.toThrow('Async pipe execution failed: Async test error');
    });

    test('Promise 체인에서 중간 에러 처리', async () => {
      const asyncAdd1 = async (x: number) => x + 1;
      const asyncThrowError = async () => {
        throw new Error('Middle error');
      };
      const asyncDouble = async (x: number) => x * 2;

      const pipeline = pipeAsync(asyncAdd1, asyncThrowError, asyncDouble);
      await expect(pipeline(3)).rejects.toThrow('Async pipe execution failed: Middle error');
    });

    test('지연된 비동기 작업', async () => {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      const asyncDelayedDouble = async (x: number) => {
        await delay(10);
        return x * 2;
      };

      const start = Date.now();
      const pipeline = pipeAsync(asyncDelayedDouble);
      const result = await pipeline(5);
      const elapsed = Date.now() - start;

      expect(result).toBe(10);
      expect(elapsed).toBeGreaterThanOrEqual(8); // 약간의 오차 허용
    });

    test('함수가 아닌 값 전달 시 에러', async () => {
      expect(() => {
        // @ts-expect-error 의도적으로 잘못된 타입 전달
        pipeAsync(42, 'not a function');
      }).toThrow('All arguments must be functions');
    });
  });

  describe('compose', () => {
    test('빈 컴포즈는 항등 함수', () => {
      const pipeline = compose();
      expect(pipeline(42)).toBe(42);
    });

    test('단일 함수 컴포즈', () => {
      const double = (x: number) => x * 2;
      const pipeline = compose(double);

      expect(pipeline(5)).toBe(10);
    });

    test('두 함수 컴포즈 (우측에서 좌측으로)', () => {
      const add1 = (x: number) => x + 1;
      const double = (x: number) => x * 2;
      const pipeline = compose(double, add1); // double(add1(x))

      expect(pipeline(3)).toBe(8); // double(add1(3)) = double(4) = 8
    });

    test('pipe와 compose 비교', () => {
      const add1 = (x: number) => x + 1;
      const double = (x: number) => x * 2;

      const pipeResult = pipe(add1, double)(3); // (3 + 1) * 2 = 8
      const composeResult = compose(double, add1)(3); // double(add1(3)) = 8

      expect(pipeResult).toBe(composeResult);
    });

    test('여러 함수 컴포즈', () => {
      const add1 = (x: number) => x + 1;
      const double = (x: number) => x * 2;
      const square = (x: number) => x * x;

      // square(double(add1(x)))
      const pipeline = compose(square, double, add1);
      expect(pipeline(3)).toBe(64); // square(double(add1(3))) = square(8) = 64
    });
  });

  describe('composeAsync', () => {
    test('빈 비동기 컴포즈', async () => {
      const pipeline = composeAsync();
      expect(await pipeline(42)).toBe(42);
    });

    test('비동기 함수들의 컴포즈', async () => {
      const asyncAdd1 = async (x: number) => x + 1;
      const asyncDouble = async (x: number) => x * 2;

      const pipeline = composeAsync(asyncDouble, asyncAdd1);
      expect(await pipeline(3)).toBe(8);
    });

    test('pipeAsync와 composeAsync 비교', async () => {
      const asyncAdd1 = async (x: number) => x + 1;
      const asyncDouble = async (x: number) => x * 2;

      const pipeResult = await pipeAsync(asyncAdd1, asyncDouble)(3);
      const composeResult = await composeAsync(asyncDouble, asyncAdd1)(3);

      expect(pipeResult).toBe(composeResult);
    });
  });

  describe('pipeIf', () => {
    test('조건이 참일 때 trueFn 실행', () => {
      const isPositive = (x: number) => x > 0;
      const double = (x: number) => x * 2;
      const negate = (x: number) => -x;

      const conditionalPipe = pipeIf(isPositive, double, negate);

      expect(conditionalPipe(5)).toBe(10); // 양수이므로 double 실행
      expect(conditionalPipe(-3)).toBe(3); // 음수이므로 negate 실행
    });

    test('조건이 boolean 값인 경우', () => {
      const double = (x: number) => x * 2;
      const negate = (x: number) => -x;

      const alwaysDouble = pipeIf(true, double, negate);
      const alwaysNegate = pipeIf(false, double, negate);

      expect(alwaysDouble(5)).toBe(10);
      expect(alwaysNegate(5)).toBe(-5);
    });

    test('falseFn이 없으면 항등 함수 사용', () => {
      const isEven = (x: number) => x % 2 === 0;
      const double = (x: number) => x * 2;

      const conditionalPipe = pipeIf(isEven, double);

      expect(conditionalPipe(4)).toBe(8); // 짝수이므로 double 실행
      expect(conditionalPipe(5)).toBe(5); // 홀수이므로 원래 값 반환
    });

    test('복잡한 조건 함수', () => {
      interface User {
        age: number;
        isActive: boolean;
      }

      const isAdultAndActive = (user: User) => user.age >= 18 && user.isActive;
      const grantAccess = (user: User) => ({ ...user, hasAccess: true });
      const denyAccess = (user: User) => ({ ...user, hasAccess: false });

      const accessControl = pipeIf(isAdultAndActive, grantAccess, denyAccess);

      const adultActiveUser = { age: 25, isActive: true };
      const minorUser = { age: 16, isActive: true };
      const inactiveUser = { age: 25, isActive: false };

      expect(accessControl(adultActiveUser)).toEqual({ age: 25, isActive: true, hasAccess: true });
      expect(accessControl(minorUser)).toEqual({ age: 16, isActive: true, hasAccess: false });
      expect(accessControl(inactiveUser)).toEqual({ age: 25, isActive: false, hasAccess: false });
    });
  });

  describe('pipeParallel', () => {
    test('여러 함수를 병렬로 실행하여 결과 배열 반환', () => {
      const add1 = (x: number) => x + 1;
      const double = (x: number) => x * 2;
      const square = (x: number) => x * x;

      const parallel = pipeParallel<number, [number, number, number]>(add1, double, square);
      const result = parallel(3);

      expect(result).toEqual([4, 6, 9]); // [3+1, 3*2, 3*3]
    });

    test('다양한 타입 반환하는 함수들', () => {
      const toString = (x: number) => x.toString();
      const isEven = (x: number) => x % 2 === 0;
      const double = (x: number) => x * 2;

      const parallel = pipeParallel<number, [string, boolean, number]>(toString, isEven, double);
      const result = parallel(4);

      expect(result).toEqual(['4', true, 8]);
    });

    test('단일 함수 병렬 실행', () => {
      const double = (x: number) => x * 2;
      const parallel = pipeParallel<number, [number]>(double);

      expect(parallel(5)).toEqual([10]);
    });

    test('빈 함수 배열', () => {
      const parallel = pipeParallel();
      expect(parallel(42)).toEqual([]);
    });

    test('함수 실행 중 에러 발생', () => {
      const normal = (x: number) => x * 2;
      const throwError = () => {
        throw new Error('Parallel error');
      };

      const parallel = pipeParallel<number, [number, never]>(normal, throwError);
      expect(() => parallel(5)).toThrow('Parallel error');
    });
  });

  describe('pipeParallelAsync', () => {
    test('비동기 함수들을 병렬로 실행', async () => {
      const asyncAdd1 = async (x: number) => x + 1;
      const asyncDouble = async (x: number) => x * 2;
      const asyncSquare = async (x: number) => x * x;

      const parallel = pipeParallelAsync<number, [number, number, number]>(asyncAdd1, asyncDouble, asyncSquare);
      const result = await parallel(3);

      expect(result).toEqual([4, 6, 9]);
    });

    test('동기/비동기 함수 혼합 병렬 실행', async () => {
      const syncAdd1 = (x: number) => x + 1;
      const asyncDouble = async (x: number) => x * 2;
      const syncSquare = (x: number) => x * x;

      const parallel = pipeParallelAsync<number, [number, number, number]>(syncAdd1, asyncDouble, syncSquare);
      const result = await parallel(3);

      expect(result).toEqual([4, 6, 9]);
    });

    test('병렬 실행 성능 확인', async () => {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const slowFunc1 = async (x: number) => {
        await delay(50);
        return x + 1;
      };
      const slowFunc2 = async (x: number) => {
        await delay(50);
        return x * 2;
      };

      const start = Date.now();
      const parallel = pipeParallelAsync<number, [number, number]>(slowFunc1, slowFunc2);
      const result = await parallel(3);
      const elapsed = Date.now() - start;

      expect(result).toEqual([4, 6]);
      // 병렬 실행이므로 100ms보다 훨씬 적게 걸려야 함 (약 50ms + 오버헤드)
      expect(elapsed).toBeLessThan(80);
    });

    test('비동기 함수에서 에러 발생', async () => {
      const asyncNormal = async (x: number) => x * 2;
      const asyncThrowError = async () => {
        throw new Error('Async parallel error');
      };

      const parallel = pipeParallelAsync<number, [number, never]>(asyncNormal, asyncThrowError);
      await expect(parallel(5)).rejects.toThrow('Async parallel error');
    });

    test('빈 함수 배열', async () => {
      const parallel = pipeParallelAsync();
      expect(await parallel(42)).toEqual([]);
    });
  });

  describe('pipeSafe', () => {
    test('정상 실행 시 결과 반환', () => {
      const add1 = (x: number) => x + 1;
      const double = (x: number) => x * 2;

      const safePipe = pipeSafe(0);
      const pipeline = safePipe(add1, double);

      expect(pipeline(3)).toBe(8);
    });

    test('에러 발생 시 기본값 반환', () => {
      const throwError = () => {
        throw new Error('Safe pipe error');
      };

      const safePipe = pipeSafe(-1);
      const pipeline = safePipe(throwError);

      expect(pipeline(5)).toBe(-1);
    });

    test('에러 핸들러 호출', () => {
      const errorHandler = vi.fn();
      const throwError = (x: number) => {
        throw new Error(`Error with ${x}`);
      };

      const safePipe = pipeSafe(0, errorHandler);
      const pipeline = safePipe(throwError);

      const result = pipeline(5);

      expect(result).toBe(0);
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Pipe execution failed: Error with 5' }),
        5
      );
    });

    test('복잡한 파이프라인에서 중간 에러', () => {
      const add1 = (x: number) => x + 1;
      const throwError = () => {
        throw new Error('Middle error');
      };
      const double = (x: number) => x * 2;

      const safePipe = pipeSafe('error');
      const pipeline = safePipe(add1, throwError, double);

      expect(pipeline(3)).toBe('error');
    });

    test('다양한 기본값 타입', () => {
      const throwError = () => {
        throw new Error('Test');
      };

      // 숫자 기본값
      const numericSafe = pipeSafe(42)(throwError);
      expect(numericSafe(1)).toBe(42);

      // 문자열 기본값
      const stringSafe = pipeSafe('fallback')(throwError);
      expect(stringSafe(1)).toBe('fallback');

      // 객체 기본값
      const objectSafe = pipeSafe({ error: true })(throwError);
      expect(objectSafe(1)).toEqual({ error: true });

      // null 기본값
      const nullSafe = pipeSafe(null)(throwError);
      expect(nullSafe(1)).toBe(null);
    });
  });

  describe('helper functions', () => {
    describe('identity', () => {
      test('입력값을 그대로 반환', () => {
        expect(identity(42)).toBe(42);
        expect(identity('hello')).toBe('hello');
        expect(identity(null)).toBe(null);
        expect(identity(undefined)).toBe(undefined);

        const obj = { a: 1 };
        expect(identity(obj)).toBe(obj);
      });

      test('파이프라인에서 사용', () => {
        const double = (x: number) => x * 2;
        const pipeline = pipe(double, identity);

        expect(pipeline(5)).toBe(10);
      });
    });

    describe('constant', () => {
      test('항상 같은 값 반환', () => {
        const always42 = constant(42);
        const alwaysHello = constant('hello');

        expect(always42()).toBe(42);
        expect(alwaysHello()).toBe('hello');
      });

      test('다양한 타입의 상수', () => {
        const obj = { a: 1, b: 2 };
        const alwaysObj = constant(obj);

        expect(alwaysObj()).toBe(obj);
        expect(alwaysObj()).toEqual({ a: 1, b: 2 });
      });

      test('파이프라인에서 사용', () => {
        const getValue = () => 10;
        const alwaysZero = constant(0);

        // getValue 결과를 무시하고 항상 0 반환
        const pipeline = pipe(getValue, alwaysZero);
        expect(pipeline(undefined)).toBe(0);
      });
    });

    describe('repeat', () => {
      test('함수를 지정된 횟수만큼 반복 적용', () => {
        const add1 = (x: number) => x + 1;

        const add3 = repeat(add1, 3);
        expect(add3(5)).toBe(8); // 5 + 1 + 1 + 1 = 8

        const add10 = repeat(add1, 10);
        expect(add10(0)).toBe(10);
      });

      test('0회 반복은 항등 함수', () => {
        const double = (x: number) => x * 2;
        const noRepeat = repeat(double, 0);

        expect(noRepeat(5)).toBe(5);
      });

      test('음수 횟수는 항등 함수', () => {
        const double = (x: number) => x * 2;
        const negativeRepeat = repeat(double, -5);

        expect(negativeRepeat(5)).toBe(5);
      });

      test('복잡한 함수 반복', () => {
        const multiplyBy2AndAdd1 = (x: number) => x * 2 + 1;

        const repeated = repeat(multiplyBy2AndAdd1, 3);
        // f(x) = 2x + 1
        // f(f(f(2))) = f(f(5)) = f(11) = 23
        expect(repeated(2)).toBe(23);
      });

      test('문자열 변환 함수 반복', () => {
        const addExclamation = (s: string) => s + '!';

        const addThreeExclamations = repeat(addExclamation, 3);
        expect(addThreeExclamations('hello')).toBe('hello!!!');
      });

      test('파이프라인과 조합', () => {
        const double = (x: number) => x * 2;
        const add1 = (x: number) => x + 1;

        const pipeline = pipe(
          repeat(double, 2), // x * 4
          repeat(add1, 3) // + 3
        );

        expect(pipeline(2)).toBe(11); // (2 * 4) + 3 = 11
      });
    });
  });

  describe('edge cases and error handling', () => {
    test('null과 undefined 처리', () => {
      const handleNull = (x: any) => x ?? 'default';
      const pipeline = pipe(handleNull);

      expect(pipeline(null)).toBe('default');
      expect(pipeline(undefined)).toBe('default');
      expect(pipeline(0)).toBe(0);
      expect(pipeline('')).toBe('');
    });

    test('큰 파이프라인 처리', () => {
      const add1 = (x: number) => x + 1;
      const functions = Array(100).fill(add1);

      const largePipeline = pipe(...functions);
      expect(largePipeline(0)).toBe(100);
    });

    test('타입 안전성 확인', () => {
      // 컴파일 타임에 타입 체크가 되어야 함
      const numToStr = (x: number) => x.toString();
      const strToUpper = (s: string) => s.toUpperCase();
      const strToNum = (s: string) => s.length;

      const pipeline = pipe(numToStr, strToUpper, strToNum);
      expect(pipeline(123)).toBe(3); // "123" -> "123" -> 3
    });

    test('비동기 에러 전파', async () => {
      const asyncSuccess = async (x: number) => x + 1;
      const asyncError = async () => {
        throw new Error('Async error');
      };
      const asyncAfterError = async (x: number) => x * 2;

      const pipeline = pipeAsync(asyncSuccess, asyncError, asyncAfterError);

      await expect(pipeline(5)).rejects.toThrow('Async pipe execution failed: Async error');
    });

    test('메모리 효율성 - 대용량 데이터', () => {
      const largeArray = Array(10000)
        .fill(0)
        .map((_, i) => i);

      const processArray = (arr: number[]) => arr.map(x => x + 1);
      const filterEven = (arr: number[]) => arr.filter(x => x % 2 === 0);
      const sumArray = (arr: number[]) => arr.reduce((sum, x) => sum + x, 0);

      const pipeline = pipe(processArray, filterEven, sumArray);
      const result = pipeline(largeArray);

      // 1부터 10000까지 짝수의 합: (2 + 4 + ... + 10000)
      const expected = Array(5000)
        .fill(0)
        .map((_, i) => (i + 1) * 2)
        .reduce((sum, x) => sum + x, 0);
      expect(result).toBe(expected);
    });

    test('재귀적 함수 처리', () => {
      const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
      const pipeline = pipe(factorial);

      expect(pipeline(5)).toBe(120);
      expect(pipeline(0)).toBe(1);
    });

    test('부분 적용과 커링', () => {
      const add = (a: number) => (b: number) => a + b;
      const multiply = (a: number) => (b: number) => a * b;

      const add5 = add(5);
      const multiply3 = multiply(3);

      const pipeline = pipe(add5, multiply3);
      expect(pipeline(2)).toBe(21); // (2 + 5) * 3 = 21
    });
  });
});
