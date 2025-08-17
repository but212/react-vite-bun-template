/**
 * 주어진 값을 최솟값과 최댓값 사이로 제한합니다.
 * @param v 제한할 값
 * @param min 최솟값
 * @param max 최댓값
 * @returns 제한된 값
 */
export const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/**
 * 객체에서 지정된 키들만 선택하여 새로운 객체를 만듭니다.
 * @param obj 원본 객체
 * @param keys 선택할 키들의 배열
 * @returns 선택된 키들만 포함하는 새로운 객체
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: ReadonlyArray<K>): Pick<T, K> {
  const out = {} as Pick<T, K>;
  keys.forEach(k => {
    if (k in obj) out[k] = obj[k];
  });
  return out;
}

/**
 * 객체에서 지정된 키들을 제외한 새로운 객체를 만듭니다.
 * @param obj 원본 객체
 * @param keys 제외할 키들의 배열
 * @returns 지정된 키들이 제외된 새로운 객체
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: ReadonlyArray<K>): Omit<T, K> {
  const set = new Set<keyof T>(keys as ReadonlyArray<keyof T>);
  const out = {} as Omit<T, K>;
  (Object.keys(obj) as Array<keyof T>).forEach(k => {
    if (!set.has(k)) (out as any)[k] = (obj as any)[k];
  });
  return out;
}
