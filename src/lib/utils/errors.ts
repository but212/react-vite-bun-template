/**
 * Utils 라이브러리 전용 에러 클래스들
 * 일관된 에러 처리와 디버깅을 위한 표준화된 에러 타입을 제공합니다.
 */

/**
 * Utils 라이브러리의 기본 에러 클래스
 */
export abstract class UtilsError extends Error {
  public readonly code: string;
  public readonly module: string;
  public readonly timestamp: number;

  constructor(message: string, code: string, module: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.module = module;
    this.timestamp = Date.now();

    if (cause) {
      this.cause = cause;
    }

    // Error 클래스의 스택 트레이스 설정
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 에러 정보를 JSON 형태로 직렬화
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      module: this.module,
      timestamp: this.timestamp,
      stack: this.stack,
      cause:
        this.cause instanceof Error
          ? {
              name: this.cause.name,
              message: this.cause.message,
              stack: this.cause.stack,
            }
          : this.cause,
    };
  }
}

/**
 * 비트 연산 관련 에러
 */
export class BitUtilsError extends UtilsError {
  constructor(message: string, code: string, cause?: Error) {
    super(message, code, 'bit-utils', cause);
  }

  static invalidPosition(position: number): BitUtilsError {
    return new BitUtilsError(
      `비트 위치가 유효하지 않습니다: ${position}. 0-31 범위여야 합니다.`,
      'INVALID_BIT_POSITION'
    );
  }

  static invalidLength(length: number): BitUtilsError {
    return new BitUtilsError(`비트 길이가 유효하지 않습니다: ${length}. 1-32 범위여야 합니다.`, 'INVALID_BIT_LENGTH');
  }

  static invalidValue(value: unknown): BitUtilsError {
    return new BitUtilsError(
      `비트 연산에 유효하지 않은 값입니다: ${typeof value}. 숫자여야 합니다.`,
      'INVALID_BIT_VALUE'
    );
  }
}

/**
 * 캐시 관련 에러
 */
export class CacheError extends UtilsError {
  constructor(message: string, code: string, cause?: Error) {
    super(message, code, 'cache-strategy', cause);
  }

  static invalidSize(size: number): CacheError {
    return new CacheError(`캐시 크기가 유효하지 않습니다: ${size}. 양수여야 합니다.`, 'INVALID_CACHE_SIZE');
  }

  static operationFailed(operation: string, cause?: Error): CacheError {
    return new CacheError(`캐시 ${operation} 작업이 실패했습니다.`, 'CACHE_OPERATION_FAILED', cause);
  }
}

/**
 * 환경 변수 관련 에러
 */
export class EnvError extends UtilsError {
  constructor(message: string, code: string, cause?: Error) {
    super(message, code, 'env', cause);
  }

  static invalidKeyType(type: string): EnvError {
    return new EnvError(`환경 변수 키 타입이 유효하지 않습니다: ${type}. 문자열이어야 합니다.`, 'INVALID_KEY_TYPE');
  }

  static invalidKeyPattern(key: string): EnvError {
    return new EnvError(
      `환경 변수 키 패턴이 유효하지 않습니다: ${key}. VITE_ 접두사가 필요합니다.`,
      'INVALID_KEY_PATTERN'
    );
  }
}

/**
 * 비동기 처리 관련 에러
 */
export class AsyncError extends UtilsError {
  constructor(message: string, code: string, cause?: Error) {
    super(message, code, 'async', cause);
  }

  static retryExhausted(attempts: number, cause?: Error): AsyncError {
    return new AsyncError(`재시도 횟수를 초과했습니다: ${attempts}회 시도 후 실패`, 'RETRY_EXHAUSTED', cause);
  }

  static invalidTimeout(timeout: number): AsyncError {
    return new AsyncError(`타임아웃 값이 유효하지 않습니다: ${timeout}. 양수여야 합니다.`, 'INVALID_TIMEOUT');
  }
}

/**
 * 파이프라인 관련 에러
 */
export class PipeError extends UtilsError {
  constructor(message: string, code: string, cause?: Error) {
    super(message, code, 'pipe', cause);
  }

  static invalidFunction(index: number): PipeError {
    return new PipeError(`파이프라인의 ${index}번째 함수가 유효하지 않습니다.`, 'INVALID_PIPE_FUNCTION');
  }

  static executionFailed(index: number, cause?: Error): PipeError {
    return new PipeError(`파이프라인의 ${index}번째 함수 실행이 실패했습니다.`, 'PIPE_EXECUTION_FAILED', cause);
  }
}

/**
 * 객체 조작 관련 에러
 */
export class ObjectError extends UtilsError {
  constructor(message: string, code: string, cause?: Error) {
    super(message, code, 'object', cause);
  }

  static invalidObject(value: unknown): ObjectError {
    return new ObjectError(`유효하지 않은 객체입니다: ${typeof value}`, 'INVALID_OBJECT');
  }

  static invalidKey(key: unknown): ObjectError {
    return new ObjectError(`유효하지 않은 키입니다: ${typeof key}`, 'INVALID_KEY');
  }
}

/**
 * 에러 생성을 위한 헬퍼 함수들
 */
export const createError = {
  bitUtils: BitUtilsError,
  cache: CacheError,
  env: EnvError,
  async: AsyncError,
  pipe: PipeError,
  object: ObjectError,
} as const;

/**
 * 에러가 Utils 라이브러리 에러인지 확인하는 타입 가드
 */
export function isUtilsError(error: unknown): error is UtilsError {
  return error instanceof UtilsError;
}

/**
 * 특정 모듈의 에러인지 확인하는 헬퍼 함수
 */
export function isModuleError(error: unknown, module: string): error is UtilsError {
  return isUtilsError(error) && error.module === module;
}

/**
 * 에러 코드로 에러를 필터링하는 헬퍼 함수
 */
export function hasErrorCode(error: unknown, code: string): error is UtilsError {
  return isUtilsError(error) && error.code === code;
}

/**
 * 에러 정보를 로깅하기 위한 헬퍼 함수
 */
export function formatError(error: unknown): string {
  if (isUtilsError(error)) {
    return `[${error.module}:${error.code}] ${error.message}`;
  }

  if (error instanceof Error) {
    return `[${error.name}] ${error.message}`;
  }

  return `[Unknown] ${String(error)}`;
}
