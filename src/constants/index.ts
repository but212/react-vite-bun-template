/**
 * @file 애플리케이션 전반에서 사용되는 범용 상수 모음
 */

/**
 * 시간 관련 상수 (밀리초 단위)
 */
export const TIME = {
  SECOND: 1000,
  MINUTE: 1000 * 60,
  HOUR: 1000 * 60 * 60,
  DAY: 1000 * 60 * 60 * 24,
} as const;

/**
 * HTTP 상태 코드
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * 자주 사용되는 정규식 패턴
 */
export const REGEX = {
  /** 이메일 형식 (간단한 버전) */
  EMAIL: /^\S+@\S+\.\S+$/,
  /** URL 형식 (http/https) */
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
} as const;
