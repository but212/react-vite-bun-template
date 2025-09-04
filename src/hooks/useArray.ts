import { useCallback, useState } from 'react';

/**
 * 배열 상태를 관리하는 커스텀 훅입니다.
 * 배열에 대한 다양한 조작 메서드를 제공합니다.
 *
 * @template T 배열 요소의 타입
 * @param initialValue 초기 배열 값
 * @returns 배열 상태와 조작 메서드들을 포함한 객체
 *
 * @example
 * ```typescript
 * const { value, push, remove, filter } = useArray([1, 2, 3]);
 * push(4, 5); // [1, 2, 3, 4, 5]
 * remove(0); // [2, 3, 4, 5]
 * filter(x => x > 3); // [4, 5]
 * ```
 */
export default function useArray<T>(initialValue: T[]) {
  const [value, setValue] = useState(initialValue);

  /**
   * 배열 값을 직접 설정합니다.
   *
   * @param next 새 배열 값
   */
  const set = useCallback((next: T[]) => setValue(next), []);

  /**
   * 배열 끝에 항목을 추가합니다.
   * @param items 추가할 항목(들)
   */
  const push = useCallback((...items: T[]) => {
    setValue(prev => [...prev, ...items]);
  }, []);

  /**
   * 배열 앞에 항목을 추가합니다.
   * @param items 추가할 항목(들)
   */
  const unshift = useCallback((...items: T[]) => {
    setValue(prev => [...items, ...prev]);
  }, []);

  /**
   * 다른 배열을 이어붙입니다.
   * @param other 병합할 배열
   */
  const concat = useCallback((other: T[]) => {
    setValue(prev => [...prev, ...other]);
  }, []);

  /**
   * 배열을 비웁니다.
   */
  const clear = useCallback(() => setValue([]), []);

  /**
   * 지정한 인덱스의 항목을 새 항목으로 교체합니다.
   *
   * @param index 교체할 항목의 인덱스
   * @param item 새로 설정할 항목
   */
  const replace = useCallback((index: number, item: T) => {
    setValue(prev => {
      if (index < 0 || index >= prev.length) {
        if (import.meta.env.MODE === 'development') {
          console.warn(`Invalid index ${index} for array of length ${prev.length}`);
        }
        return prev;
      }
      const newValue = [...prev];
      newValue[index] = item;
      return newValue;
    });
  }, []);

  /**
   * 배열에서 조건을 만족하는 항목들을 필터링합니다.
   *
   * @param predicate 항목을 필터링할 조건 함수
   */
  const filter = useCallback((predicate: (item: T) => boolean) => {
    setValue(prev => prev.filter(predicate));
  }, []);

  /**
   * 지정한 인덱스의 항목을 제거합니다.
   *
   * @param index 제거할 항목의 인덱스
   */
  const remove = useCallback((index: number) => {
    setValue(prev => {
      if (index < 0 || index >= prev.length) {
        if (import.meta.env.MODE === 'development') {
          console.warn(`Invalid index ${index} for array of length ${prev.length}`);
        }
        return prev;
      }
      const newValue = [...prev];
      newValue.splice(index, 1);
      return newValue;
    });
  }, []);

  /**
   * 여러 개의 항목을 동시에 제거합니다.
   *
   * @param indices 제거할 항목의 인덱스 배열
   */
  const removeMultiple = useCallback((indices: number[]) => {
    setValue(prev => {
      const validIndices = indices.filter(index => index >= 0 && index < prev.length).sort((a, b) => b - a);
      if (import.meta.env.MODE === 'development') {
        const invalids = indices.filter(index => index < 0 || index >= prev.length);
        if (invalids.length > 0) {
          console.warn(`Invalid indices [${invalids.join(', ')}] for array of length ${prev.length}`);
        }
      }
      let newValue = [...prev];
      validIndices.forEach(index => {
        newValue.splice(index, 1);
      });
      return newValue;
    });
  }, []);

  /**
   * 배열을 초기값으로 재설정합니다.
   */
  const reset = useCallback(() => setValue(initialValue), [initialValue]);

  /**
   * 배열의 각 항목을 변환하여 새로운 배열을 반환합니다.
   *
   * @template U 변환된 항목의 타입
   * @param mapper 각 항목을 변환하는 함수
   * @returns 변환된 새로운 배열
   */
  const mapToNew = useCallback(
    <U>(mapper: (item: T) => U): U[] => {
      return value.map(mapper);
    },
    [value]
  );

  /**
   * 배열의 모든 항목을 새로운 함수로 변환하여 현재 배열을 업데이트합니다.
   *
   * @param mapper 각 항목을 변환하는 함수
   */
  const updateAll = useCallback((mapper: (item: T) => T) => {
    setValue(prev => prev.map(mapper));
  }, []);

  /**
   * 배열을 정렬합니다.
   *
   * @param compareFn 비교 함수 (선택사항)
   */
  const sort = useCallback((compareFn?: (a: T, b: T) => number) => {
    setValue(prev => [...prev].sort(compareFn));
  }, []);

  /**
   * 배열의 일부를 새로운 배열로 설정합니다.
   *
   * @param start 시작 인덱스
   * @param end 끝 인덱스 (선택사항)
   */
  const sliceAndSet = useCallback((start: number, end?: number) => {
    setValue(prev => {
      const length = prev.length;
      const normalizedStart = start < 0 ? Math.max(0, length + start) : Math.min(start, length);
      const normalizedEnd = end === undefined ? length : end < 0 ? Math.max(0, length + end) : Math.min(end, length);
      if (normalizedStart >= normalizedEnd) return [];
      return prev.slice(normalizedStart, normalizedEnd);
    });
  }, []);

  /**
   * 배열의 일부를 읽기 전용으로 반환합니다.
   *
   * @param start 시작 인덱스
   * @param end 끝 인덱스 (선택사항)
   * @returns 배열의 일부분
   */
  const slice = useCallback(
    (start: number, end?: number): T[] => {
      const length = value.length;
      const normalizedStart = start < 0 ? Math.max(0, length + start) : Math.min(start, length);
      const normalizedEnd = end === undefined ? length : end < 0 ? Math.max(0, length + end) : Math.min(end, length);
      if (normalizedStart >= normalizedEnd) return [];
      return value.slice(normalizedStart, normalizedEnd);
    },
    [value]
  );

  /**
   * 조건에 맞는 첫 번째 요소의 인덱스를 반환합니다.
   * @param predicate 찾을 조건 함수
   */
  const findIndex = useCallback(
    (predicate: (item: T) => boolean): number => {
      return value.findIndex(predicate);
    },
    [value]
  );

  /**
   * 배열을 뒤집습니다.
   */
  const reverse = useCallback(() => {
    setValue(prev => [...prev].reverse());
  }, []);

  /**
   * 특정 요소를 모두 제거합니다.
   * @param item 제거할 요소
   */
  const removeItem = useCallback((item: T) => {
    setValue(prev => prev.filter(x => x !== item));
  }, []);

  /**
   * 특정 위치에 요소를 삽입합니다.
   * @param index 삽입할 위치
   * @param items 삽입할 요소(들)
   */
  const insert = useCallback((index: number, ...items: T[]) => {
    setValue(prev => {
      if (index < 0 || index > prev.length) return prev;
      const newValue = [...prev];
      newValue.splice(index, 0, ...items);
      return newValue;
    });
  }, []);

  return {
    value,
    set,
    push,
    unshift,
    concat,
    clear,
    replace,
    filter,
    remove,
    removeMultiple,
    reset,
    mapToNew,
    updateAll,
    sort,
    sliceAndSet,
    slice,
    findIndex,
    reverse,
    removeItem,
    insert,
  };
}
