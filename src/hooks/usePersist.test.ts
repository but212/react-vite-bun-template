import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import usePersist from './usePersist';

// localStorage mock
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// storage event mock
const mockStorageEvent = (key: string, newValue: string | null, oldValue?: string | null) => {
  const event = new StorageEvent('storage', {
    key,
    newValue,
    oldValue,
    storageArea: localStorage,
  });
  window.dispatchEvent(event);
};

describe('usePersist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('기본 기능', () => {
    it('초기값을 올바르게 설정해야 한다', () => {
      const { result } = renderHook(() => usePersist('test-key', 'initial'));

      expect(result.current[0]).toBe('initial');
    });

    it('localStorage에서 값을 읽어와야 한다', () => {
      localStorageMock.getItem.mockReturnValue('"saved-value"');

      const { result } = renderHook(() => usePersist('test-key', 'initial'));

      expect(result.current[0]).toBe('saved-value');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key');
    });

    it('값을 변경하면 localStorage에 저장해야 한다', async () => {
      const { result } = renderHook(() => usePersist('test-key', 'initial'));

      act(() => {
        result.current[1]('new-value');
      });

      // 디바운스 때문에 약간의 대기 필요
      await waitFor(
        () => {
          expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', '"new-value"');
        },
        { timeout: 500 }
      );
    });

    it('removeValue 함수가 올바르게 동작해야 한다', () => {
      const { result } = renderHook(() => usePersist('test-key', 'initial'));

      act(() => {
        result.current[2](); // removeValue 호출
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key');
      expect(result.current[0]).toBe('initial');
    });
  });

  describe('커스텀 Serializer', () => {
    const customSerializer = {
      parse: vi.fn((value: string) => `parsed-${value}`),
      stringify: vi.fn((value: string) => `stringified-${value}`),
    };

    it('커스텀 parse 함수를 사용해야 한다', () => {
      localStorageMock.getItem.mockReturnValue('test-value');

      const { result } = renderHook(() => usePersist('test-key', 'initial', { serializer: customSerializer }));

      expect(customSerializer.parse).toHaveBeenCalledWith('test-value');
      expect(result.current[0]).toBe('parsed-test-value');
    });

    it('커스텀 stringify 함수를 사용해야 한다', async () => {
      const { result } = renderHook(() => usePersist('test-key', 'initial', { serializer: customSerializer }));

      act(() => {
        result.current[1]('new-value');
      });

      await waitFor(
        () => {
          expect(customSerializer.stringify).toHaveBeenCalledWith('new-value');
          expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', 'stringified-new-value');
        },
        { timeout: 500 }
      );
    });
  });

  describe('디바운싱', () => {
    it('빠른 연속 업데이트 시 마지막 값만 저장해야 한다', async () => {
      const { result } = renderHook(() => usePersist('test-key', 'initial', { debounceMs: 100 }));

      act(() => {
        result.current[1]('value1');
        result.current[1]('value2');
        result.current[1]('value3');
      });

      // 디바운스 시간보다 짧게 대기
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      // 디바운스 시간 후 대기
      await waitFor(
        () => {
          expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
          expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', '"value3"');
        },
        { timeout: 200 }
      );
    });

    it('setValueImmediate는 디바운스를 우회해야 한다', () => {
      const { result } = renderHook(() => usePersist('test-key', 'initial', { debounceMs: 1000 }));

      act(() => {
        result.current[3]('immediate-value'); // setValueImmediate 호출
      });

      // 즉시 저장되어야 함
      expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', '"immediate-value"');
    });
  });

  describe('스토리지 이벤트 동기화', () => {
    it('다른 탭에서의 변경사항을 감지해야 한다', () => {
      const { result } = renderHook(() => usePersist('test-key', 'initial', { syncAcrossTabs: true }));

      act(() => {
        mockStorageEvent('test-key', '"external-value"');
      });

      expect(result.current[0]).toBe('external-value');
    });

    it('다른 키의 변경사항은 무시해야 한다', () => {
      const { result } = renderHook(() => usePersist('test-key', 'initial', { syncAcrossTabs: true }));

      const initialValue = result.current[0];

      act(() => {
        mockStorageEvent('other-key', '"external-value"');
      });

      expect(result.current[0]).toBe(initialValue);
    });

    it('값이 삭제된 경우 초기값으로 복원해야 한다', () => {
      const { result } = renderHook(() => usePersist('test-key', 'initial', { syncAcrossTabs: true }));

      act(() => {
        mockStorageEvent('test-key', null);
      });

      expect(result.current[0]).toBe('initial');
    });

    it('syncAcrossTabs가 false면 이벤트를 무시해야 한다', () => {
      const { result } = renderHook(() => usePersist('test-key', 'initial', { syncAcrossTabs: false }));

      const initialValue = result.current[0];

      act(() => {
        mockStorageEvent('test-key', '"external-value"');
      });

      expect(result.current[0]).toBe(initialValue);
    });
  });

  describe('에러 처리', () => {
    it('localStorage 읽기 실패 시 초기값을 사용해야 한다', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => usePersist('test-key', 'initial'));

      expect(result.current[0]).toBe('initial');
      expect(consoleSpy).toHaveBeenCalledWith('Error reading localStorage key "test-key":', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('localStorage 쓰기 실패 시 경고를 출력해야 한다', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => usePersist('test-key', 'initial'));

      act(() => {
        result.current[1]('new-value');
      });

      await waitFor(
        () => {
          expect(consoleSpy).toHaveBeenCalledWith('Error setting localStorage key "test-key":', expect.any(Error));
        },
        { timeout: 500 }
      );

      consoleSpy.mockRestore();
    });

    it('잘못된 JSON 파싱 시 초기값을 사용해야 한다', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => usePersist('test-key', 'initial'));

      expect(result.current[0]).toBe('initial');
      expect(consoleSpy).toHaveBeenCalledWith('Error reading localStorage key "test-key":', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('복합 타입 지원', () => {
    it('객체 타입을 올바르게 처리해야 한다', async () => {
      interface TestObject {
        name: string;
        count: number;
      }

      const initialValue: TestObject = { name: 'test', count: 0 };
      const newValue: TestObject = { name: 'updated', count: 5 };

      const { result } = renderHook(() => usePersist('test-key', initialValue));

      act(() => {
        result.current[1](newValue);
      });

      await waitFor(
        () => {
          expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(newValue));
        },
        { timeout: 500 }
      );
    });

    it('배열 타입을 올바르게 처리해야 한다', async () => {
      const initialValue: string[] = [];
      const newValue: string[] = ['item1', 'item2'];

      const { result } = renderHook(() => usePersist('test-key', initialValue));

      act(() => {
        result.current[1](newValue);
      });

      await waitFor(
        () => {
          expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(newValue));
        },
        { timeout: 500 }
      );
    });
  });
});
