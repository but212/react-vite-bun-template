/**
 * 함수 파이프라인 유틸리티
 * 여러 함수를 순차적으로 합성하여 데이터를 변환하는 기능을 제공합니다.
 */

// 타입 헬퍼: 파이프라인에서 각 함수의 타입을 추론
type _Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;
type _Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R] ? R : [];

type PipeFn<T, U> = (value: T) => U;
type AsyncPipeFn<T, U> = (value: T) => U | Promise<U>;

// 파이프 오버로드 정의
interface Pipe {
  <T>(): (value: T) => T;
  <T, U>(fn1: PipeFn<T, U>): (value: T) => U;
  <T, U, V>(fn1: PipeFn<T, U>, fn2: PipeFn<U, V>): (value: T) => V;
  <T, U, V, W>(fn1: PipeFn<T, U>, fn2: PipeFn<U, V>, fn3: PipeFn<V, W>): (value: T) => W;
  <T, U, V, W, X>(fn1: PipeFn<T, U>, fn2: PipeFn<U, V>, fn3: PipeFn<V, W>, fn4: PipeFn<W, X>): (value: T) => X;
  <T, U, V, W, X, Y>(
    fn1: PipeFn<T, U>,
    fn2: PipeFn<U, V>,
    fn3: PipeFn<V, W>,
    fn4: PipeFn<W, X>,
    fn5: PipeFn<X, Y>
  ): (value: T) => Y;
  <T, U, V, W, X, Y, Z>(
    fn1: PipeFn<T, U>,
    fn2: PipeFn<U, V>,
    fn3: PipeFn<V, W>,
    fn4: PipeFn<W, X>,
    fn5: PipeFn<X, Y>,
    fn6: PipeFn<Y, Z>
  ): (value: T) => Z;
  // 더 많은 함수를 위한 일반적인 케이스
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...fns: PipeFn<any, any>[]): (value: any) => any;
}

// 비동기 파이프 오버로드 정의
interface PipeAsync {
  <T>(): (value: T) => Promise<T>;
  <T, U>(fn1: AsyncPipeFn<T, U>): (value: T) => Promise<U>;
  <T, U, V>(fn1: AsyncPipeFn<T, U>, fn2: AsyncPipeFn<U, V>): (value: T) => Promise<V>;
  <T, U, V, W>(fn1: AsyncPipeFn<T, U>, fn2: AsyncPipeFn<U, V>, fn3: AsyncPipeFn<V, W>): (value: T) => Promise<W>;
  <T, U, V, W, X>(
    fn1: AsyncPipeFn<T, U>,
    fn2: AsyncPipeFn<U, V>,
    fn3: AsyncPipeFn<V, W>,
    fn4: AsyncPipeFn<W, X>
  ): (value: T) => Promise<X>;
  <T, U, V, W, X, Y>(
    fn1: AsyncPipeFn<T, U>,
    fn2: AsyncPipeFn<U, V>,
    fn3: AsyncPipeFn<V, W>,
    fn4: AsyncPipeFn<W, X>,
    fn5: AsyncPipeFn<X, Y>
  ): (value: T) => Promise<Y>;
  <T, U, V, W, X, Y, Z>(
    fn1: AsyncPipeFn<T, U>,
    fn2: AsyncPipeFn<U, V>,
    fn3: AsyncPipeFn<V, W>,
    fn4: AsyncPipeFn<W, X>,
    fn5: AsyncPipeFn<X, Y>,
    fn6: AsyncPipeFn<Y, Z>
  ): (value: T) => Promise<Z>;
  // 더 많은 함수를 위한 일반적인 케이스
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...fns: AsyncPipeFn<any, any>[]): (value: any) => Promise<any>;
}

/**
 * 여러 함수를 좌측에서 우측으로 순차적으로 적용하는 파이프 유틸리티입니다.
 * 각 함수의 출력이 다음 함수의 입력으로 전달되며, 타입이 안전하게 추론됩니다.
 *
 * @param fns 적용할 함수들의 목록
 * @returns 입력값을 받아 모든 함수를 순차적으로 적용한 결과를 반환하는 함수
 *
 * @example
 * ```typescript
 * // 같은 타입으로 변환
 * const add = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const pipeline1 = pipe(add, double);
 * console.log(pipeline1(3)); // 8
 *
 * // 다른 타입으로 변환
 * const toString = (x: number) => x.toString();
 * const addExclamation = (s: string) => s + '!';
 * const pipeline2 = pipe(add, toString, addExclamation);
 * console.log(pipeline2(3)); // "4!"
 *
 * // 빈 파이프 (항등 함수)
 * const identity = pipe();
 * console.log(identity(42)); // 42
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pipe: Pipe = (...fns: PipeFn<any, any>[]) => {
  // Validate all arguments are functions upfront
  for (const fn of fns) {
    if (typeof fn !== 'function') {
      throw new Error('All arguments must be functions');
    }
  }

  if (fns.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (value: any) => value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (value: any) => {
    try {
      return fns.reduce((acc, fn) => fn(acc), value);
    } catch (error) {
      throw new Error(`Pipe execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
};

/**
 * 비동기/동기 함수를 좌측에서 우측으로 순차적으로 적용하는 파이프 유틸리티입니다.
 * 각 함수는 Promise를 반환할 수 있으며, 모든 함수가 순차적으로 await 처리됩니다.
 * 동기 함수의 경우 불필요한 Promise 래핑을 최소화합니다.
 *
 * @param fns 적용할 함수들의 목록
 * @returns 입력값을 받아 모든 함수를 순차적으로 적용한 결과 Promise를 반환하는 함수
 *
 * @example
 * ```typescript
 * // 비동기 함수 조합
 * const fetchUser = async (id: number) => ({ id, name: `User ${id}` });
 * const formatUser = (user: { id: number, name: string }) => `ID: ${user.id}, Name: ${user.name}`;
 * const pipeline1 = pipeAsync(fetchUser, formatUser);
 * console.log(await pipeline1(1)); // "ID: 1, Name: User 1"
 *
 * // 동기/비동기 함수 혼합
 * const add = (x: number) => x + 1;
 * const multiplyAsync = async (x: number) => x * 2;
 * const toString = (x: number) => x.toString();
 * const pipeline2 = pipeAsync(add, multiplyAsync, toString);
 * console.log(await pipeline2(3)); // "8"
 *
 * // 빈 파이프 (Promise로 래핑된 항등 함수)
 * const identityAsync = pipeAsync();
 * console.log(await identityAsync(42)); // 42
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pipeAsync: PipeAsync = (...fns: AsyncPipeFn<any, any>[]) => {
  // Validate all arguments are functions upfront
  for (const fn of fns) {
    if (typeof fn !== 'function') {
      throw new Error('All arguments must be functions');
    }
  }

  if (fns.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (value: any) => value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (value: any) => {
    try {
      let result = value;

      for (const fn of fns) {
        const fnResult = fn(result);
        // Promise인 경우에만 await 처리
        result = fnResult instanceof Promise ? await fnResult : fnResult;
      }

      return result;
    } catch (error) {
      throw new Error(`Async pipe execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
};

/**
 * 함수를 우측에서 좌측으로 순차적으로 적용하는 컴포즈 유틸리티입니다.
 * pipe의 반대 방향으로 함수를 합성합니다.
 *
 * @param fns 적용할 함수들의 목록 (우측부터 실행)
 * @returns 입력값을 받아 모든 함수를 역순으로 적용한 결과를 반환하는 함수
 *
 * @example
 * ```typescript
 * const add = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 *
 * // pipe(add, double)와 동일한 결과
 * const composed = compose(double, add);
 * console.log(composed(3)); // 8
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function compose<T>(...fns: PipeFn<any, any>[]): (value: T) => any {
  return pipe(...fns.reverse());
}

/**
 * 비동기 컴포즈 유틸리티입니다.
 * pipeAsync의 반대 방향으로 함수를 합성합니다.
 *
 * @param fns 적용할 함수들의 목록 (우측부터 실행)
 * @returns 입력값을 받아 모든 함수를 역순으로 적용한 결과 Promise를 반환하는 함수
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function composeAsync<T>(...fns: AsyncPipeFn<any, any>[]): (value: T) => Promise<any> {
  return pipeAsync(...fns.reverse());
}

/**
 * 조건부 파이프 유틸리티입니다.
 * 조건에 따라 다른 함수를 적용할 수 있습니다.
 *
 * @param condition 조건을 판단하는 함수 또는 boolean 값
 * @param trueFn 조건이 참일 때 적용할 함수
 * @param falseFn 조건이 거짓일 때 적용할 함수 (기본값: 항등 함수)
 * @returns 조건부로 함수를 적용하는 함수
 *
 * @example
 * ```typescript
 * const isPositive = (x: number) => x > 0;
 * const double = (x: number) => x * 2;
 * const negate = (x: number) => -x;
 *
 * const conditionalPipe = pipeIf(isPositive, double, negate);
 * console.log(conditionalPipe(5));  // 10
 * console.log(conditionalPipe(-3)); // 3
 * ```
 */
export function pipeIf<T, U>(
  condition: ((value: T) => boolean) | boolean,
  trueFn: (value: T) => U,
  falseFn: (value: T) => U = (value: T) => value as unknown as U
): (value: T) => U {
  return (value: T) => {
    const shouldApplyTrue = typeof condition === 'function' ? condition(value) : condition;
    return shouldApplyTrue ? trueFn(value) : falseFn(value);
  };
}

/**
 * 병렬 파이프 유틸리티입니다.
 * 입력값에 여러 함수를 병렬로 적용하고 결과를 배열로 반환합니다.
 *
 * @param fns 병렬로 적용할 함수들의 목록
 * @returns 입력값을 받아 모든 함수를 병렬로 적용한 결과 배열을 반환하는 함수
 *
 * @example
 * ```typescript
 * const add1 = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const square = (x: number) => x * x;
 *
 * const parallel = pipeParallel(add1, double, square);
 * console.log(parallel(3)); // [4, 6, 9]
 * ```
 */
export function pipeParallel<T, U extends readonly unknown[]>(
  ...fns: { [K in keyof U]: (value: T) => U[K] }
): (value: T) => U {
  return (value: T) => {
    return fns.map(fn => fn(value)) as unknown as U;
  };
}

/**
 * 비동기 병렬 파이프 유틸리티입니다.
 * 입력값에 여러 함수를 병렬로 적용하고 모든 Promise가 완료되면 결과 배열을 반환합니다.
 *
 * @param fns 병렬로 적용할 함수들의 목록
 * @returns 입력값을 받아 모든 함수를 병렬로 적용한 결과 배열 Promise를 반환하는 함수
 *
 * @example
 * ```typescript
 * const fetchUser = async (id: number) => `User ${id}`;
 * const fetchPosts = async (id: number) => [`Post 1 by ${id}`, `Post 2 by ${id}`];
 * const fetchStats = async (id: number) => ({ followers: id * 10, following: id * 5 });
 *
 * const parallelFetch = pipeParallelAsync(fetchUser, fetchPosts, fetchStats);
 * const [user, posts, stats] = await parallelFetch(1);
 * console.log({ user, posts, stats });
 * ```
 */
export function pipeParallelAsync<T, U extends readonly unknown[]>(
  ...fns: { [K in keyof U]: (value: T) => U[K] | Promise<U[K]> }
): (value: T) => Promise<U> {
  return async (value: T) => {
    const promises = fns.map(fn => Promise.resolve(fn(value)));
    return Promise.all(promises) as unknown as Promise<U>;
  };
}

/**
 * 에러 처리가 포함된 파이프 유틸리티입니다.
 * 함수 실행 중 에러가 발생하면 기본값을 반환하거나 에러 핸들러를 실행합니다.
 *
 * @param defaultValue 에러 발생 시 반환할 기본값
 * @param onError 에러 발생 시 실행할 핸들러 (선택사항)
 * @returns 에러 처리가 포함된 파이프 함수를 반환하는 함수
 *
 * @example
 * ```typescript
 * const divide = (x: number) => (y: number) => x / y;
 * const safeDivision = pipeSafe(0, (error, value) => {
 *   console.error(`Division failed for ${value}:`, error.message);
 * });
 *
 * const pipeline = safeDivision(divide(10), (x: number) => Math.round(x));
 * console.log(pipeline(2)); // 5
 * console.log(pipeline(0)); // 0 (기본값)
 * ```
 */
export function pipeSafe<T, R>(
  defaultValue: R,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorHandler?: (error: Error, input: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (...fns: PipeFn<any, any>[]) => (value: T) => R {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (...fns: PipeFn<any, any>[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (value: any): R => {
      try {
        return pipe(...fns)(value);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errorHandler?.(err, value);
        return defaultValue;
      }
    };
  };
}

// 추가적인 헬퍼 함수들
/**
 * 값을 그대로 반환하는 항등 함수입니다.
 */
export const identity = <T>(value: T): T => value;

/**
 * 상수 함수를 생성합니다.
 * 어떤 입력이든 항상 같은 값을 반환합니다.
 */
export const constant =
  <T>(value: T) =>
  (): T =>
    value;

/**
 * 함수를 여러 번 적용합니다.
 */
export function repeat<T>(fn: (value: T) => T, times: number): (value: T) => T {
  if (times <= 0) return identity;
  return pipe(...Array(times).fill(fn));
}
