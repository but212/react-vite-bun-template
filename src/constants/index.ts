/**
 * @fileoverview
 * 애플리케이션 전반에서 사용되는 범용 상수 모음 파일입니다.
 *
 * - 시간 단위 상수(TIME): 밀리초 단위로 자주 사용하는 시간값을 제공합니다.
 * - HTTP 상태 코드(HTTP_STATUS): REST API 및 네트워크 통신에서 표준적으로 사용하는 HTTP 상태 코드를 집계합니다.
 *
 * 각 상수는 타입 안정성(const assertion)과 타입 추론을 활용하여, 오타 및 잘못된 값 사용을 방지합니다.
 *
 * @module constants
 */

/**
 * @const TIME
 * @description 시간 관련 상수 모음 (밀리초 단위)
 *
 * @property SECOND - 1초(1,000ms)
 * @property MINUTE - 1분(60,000ms)
 * @property HOUR - 1시간(3,600,000ms)
 * @property DAY - 1일(86,400,000ms)
 *
 * @example
 * setTimeout(() => { ... }, TIME.SECOND);
 * setInterval(fn, TIME.MINUTE);
 */
export const TIME = {
  /** 1초 (1,000ms) */
  SECOND: 1000,
  /** 1분 (60,000ms) */
  MINUTE: 1000 * 60,
  /** 1시간 (3,600,000ms) */
  HOUR: 1000 * 60 * 60,
  /** 1일 (86,400,000ms) */
  DAY: 1000 * 60 * 60 * 24,
} as const;

/**
 * @const HTTP_STATUS
 * @description HTTP 표준 상태 코드 상수 모음
 *
 * @property OK - 요청이 성공적으로 처리됨 (200)
 * @property CREATED - 요청이 성공적으로 처리되어 새로운 리소스가 생성됨 (201)
 * @property NO_CONTENT - 요청이 성공적이지만 반환할 내용이 없음 (204)
 * @property BAD_REQUEST - 잘못된 요청 (400)
 * @property UNAUTHORIZED - 인증 필요/실패 (401)
 * @property FORBIDDEN - 권한 부족 (403)
 * @property NOT_FOUND - 요청한 리소스를 찾을 수 없음 (404)
 * @property INTERNAL_SERVER_ERROR - 서버 내부 오류 (500)
 */
export const HTTP_STATUS = {
  /**
   * 요청이 성공적으로 처리됨
   */
  OK: 200,
  /**
   * 요청이 성공적으로 처리되어 새로운 리소스가 생성됨
   */
  CREATED: 201,
  /**
   * 요청이 성공적이나 반환할 내용이 없음
   */
  NO_CONTENT: 204,
  /**
   * 잘못된 요청
   */
  BAD_REQUEST: 400,
  /**
   * 인증 필요 또는 인증 실패
   */
  UNAUTHORIZED: 401,
  /**
   * 권한 부족
   */
  FORBIDDEN: 403,
  /**
   * 요청한 리소스를 찾을 수 없음
   */
  NOT_FOUND: 404,
  /**
   * 서버 내부 오류
   */
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * @const REGEX
 * @description 애플리케이션에서 자주 사용되는 정규식(regular expression) 패턴 모음
 *
 * @property EMAIL 이메일 주소 형식 검증용 정규식
 *   - 공백 없이, @로 구분된 사용자명과 도메인, 그리고 .이 포함된 최상위 도메인 구조를 검사합니다.
 *   - 예: 'user@example.com' => 매치됨
 *   - 예: 'user@localhost' => 매치되지 않음
 *   - 패턴: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
 *
 * @property URL 웹사이트 URL 형식 검증용 정규식 (http/https, 도메인, 경로 일부 지원)
 *   - 프로토콜은 선택적이며, 도메인과 최상위 도메인, 경로 일부까지 허용합니다.
 *   - 예: 'http://example.com', 'https://domain.co.kr/path' => 매치됨
 *   - 예: 'ftp://site.com', 'example' => 매치되지 않음
 *   - 패턴: `/^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})([/\w.-]*)*\/?$/`
 */
export const REGEX = {
  /**
   * 이메일 주소 형식 검증용 정규식
   * - 공백 없이, @로 구분된 사용자명과 도메인, 그리고 .이 포함된 최상위 도메인 구조를 검사합니다.
   * - 예: 'user@example.com' => 매치됨
   * - 예: 'user@localhost' => 매치되지 않음
   */
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /**
   * 웹사이트 URL 형식 검증용 정규식 (http/https, 도메인, 경로 일부 지원)
   * - 프로토콜은 선택적이며, 도메인과 최상위 도메인, 경로 일부까지 허용합니다.
   * - 예: 'http://example.com', 'https://domain.co.kr/path' => 매치됨
   * - 예: 'ftp://site.com', 'example' => 매치되지 않음
   */
  URL: /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})([/\w.-]*)*\/?$/,
} as const;
