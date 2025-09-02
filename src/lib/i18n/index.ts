/**
 * 국제화(i18n) 시스템
 * 에러 메시지와 사용자 인터페이스 텍스트의 다국어 지원을 제공합니다.
 */

export type Locale = 'ko' | 'en';

export interface I18nMessages {
  errors: {
    env: {
      invalidKeyType: string;
      invalidKeyPattern: string;
    };
    bitUtils: {
      invalidInput: string;
      notInteger: string;
      outOfRange: string;
      invalidBitLength: string;
      invalidPosition: string;
      extractBitsRange: string;
      insertBitsRange: string;
    };
    dataStream: {
      invalidChunkSize: string;
      notArray: string;
      operationAborted: string;
    };
    cache: {
      invalidSize: string;
    };
  };
  validation: {
    required: string;
    mustBeNumber: string;
    mustBePositive: string;
    mustBeInteger: string;
  };
}

const messages: Record<Locale, I18nMessages> = {
  ko: {
    errors: {
      env: {
        invalidKeyType: '환경 변수 키는 문자열이어야 합니다. (got: {type})',
        invalidKeyPattern: '허용되지 않는 환경 변수 키입니다: {key}',
      },
      bitUtils: {
        invalidInput: '{method}: 입력값은 유한한 숫자여야 합니다. (got: {value})',
        notInteger: '{method}: 입력값은 정수여야 합니다. (got: {type})',
        outOfRange: '{method}: 값 {value}는 32비트 정수 범위를 벗어났습니다',
        invalidBitLength:
          '{method}: 유효하지 않은 길이 {length}입니다. createBitLength()를 사용하여 타입 안전한 값을 생성하세요.',
        invalidPosition: '{method}: 위치는 음수가 될 수 없습니다',
        extractBitsRange: '{method}: start + length는 32를 초과할 수 없습니다',
        insertBitsRange: '{method}: start + length는 32를 초과할 수 없습니다',
      },
      dataStream: {
        invalidChunkSize: 'chunkSize는 0보다 커야 합니다',
        notArray: '데이터는 배열이어야 합니다',
        operationAborted: '이 작업이 중단되었습니다',
      },
      cache: {
        invalidSize: '캐시 크기는 양수여야 합니다',
      },
    },
    validation: {
      required: '필수 값입니다',
      mustBeNumber: '숫자여야 합니다',
      mustBePositive: '양수여야 합니다',
      mustBeInteger: '정수여야 합니다',
    },
  },
  en: {
    errors: {
      env: {
        invalidKeyType: 'Environment variable key must be a string. (got: {type})',
        invalidKeyPattern: 'Invalid environment variable key: {key}',
      },
      bitUtils: {
        invalidInput: '{method}: Input must be a finite number. (got: {value})',
        notInteger: '{method}: Input must be an integer. (got: {type})',
        outOfRange: '{method}: Value {value} is outside 32-bit integer range',
        invalidBitLength: '{method}: Invalid length {length}. Use createBitLength() for type-safe values.',
        invalidPosition: '{method}: Position must be non-negative',
        extractBitsRange: '{method}: start + length must not exceed 32',
        insertBitsRange: '{method}: start + length must not exceed 32',
      },
      dataStream: {
        invalidChunkSize: 'chunkSize must be greater than 0',
        notArray: 'Data must be an array',
        operationAborted: 'This operation was aborted',
      },
      cache: {
        invalidSize: 'Cache size must be positive',
      },
    },
    validation: {
      required: 'Required field',
      mustBeNumber: 'Must be a number',
      mustBePositive: 'Must be positive',
      mustBeInteger: 'Must be an integer',
    },
  },
};

class I18n {
  private currentLocale: Locale = 'ko';

  /**
   * 현재 로케일을 설정합니다.
   */
  setLocale(locale: Locale): void {
    this.currentLocale = locale;
  }

  /**
   * 현재 로케일을 반환합니다.
   */
  getLocale(): Locale {
    return this.currentLocale;
  }

  /**
   * 키에 해당하는 번역된 메시지를 반환합니다.
   * 플레이스홀더 {key}를 params 객체의 값으로 치환합니다.
   */
  t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let message: any = messages[this.currentLocale];

    for (const k of keys) {
      message = message?.[k];
      if (message === undefined) {
        console.warn(`Missing translation for key: ${key} (locale: ${this.currentLocale})`);
        return key; // 번역이 없으면 키를 그대로 반환
      }
    }

    if (typeof message !== 'string') {
      console.warn(`Translation for key ${key} is not a string`);
      return key;
    }

    // 플레이스홀더 치환
    if (params) {
      return Object.entries(params).reduce(
        (text, [paramKey, value]) => text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value)),
        message
      );
    }

    return message;
  }

  /**
   * 타입 안전한 에러 메시지 생성 헬퍼
   */
  error(category: keyof I18nMessages['errors'], key: string, params?: Record<string, string | number>): string {
    return this.t(`errors.${category}.${key}`, params);
  }
}

// 싱글톤 인스턴스
export const i18n = new I18n();

// 편의 함수들
export const t = (key: string, params?: Record<string, string | number>) => i18n.t(key, params);
export const setLocale = (locale: Locale) => i18n.setLocale(locale);
export const getLocale = () => i18n.getLocale();

// 에러 메시지 생성 헬퍼
export const createErrorMessage = (
  category: keyof I18nMessages['errors'],
  key: string,
  params?: Record<string, string | number>
) => i18n.error(category, key, params);
