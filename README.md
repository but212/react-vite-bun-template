# 리액트 Vite Bun 템플릿

Vite, TypeScript, Bun 런타임으로 구축된 최신, 프로덕션 준비 완료 리액트 템플릿입니다. 포괄적인 테스트, CI/CD, 배포 구성을 제공합니다.

## 빠른 시작

```bash
# 새 프로젝트 생성
bun create but212/react-vite-bun-template my-project

# 의존성 설치
bun install

# 개발 서버 시작 (HTTPS 지원)
bun run dev
```

## 문서

이 프로젝트에 대한 더 자세한 정보는 `docs` 디렉터리에서 확인할 수 있습니다.

- **[구조(Architecture)](./docs/architecture.md)**: 프로젝트의 전체적인 구조와 설계 원칙을 설명합니다.
- **[개발 가이드](./docs/guides/)**: 컴포넌트, 상태 관리, 스타일링, 테스트 등 개발에 필요한 가이드를 제공합니다.
- **[API 레퍼런스](./docs/api-reference/)**: 모든 유틸리티 함수에 대한 상세한 API 문서를 포함합니다.

## 사용 가능한 스크립트

| 스크립트 | 설명 |
|--------|-------------|
| `dev` | HTTPS 개발 서버 실행 |
| `build` | 타입체킹 포함 프로덕션 빌드 |
| `preview` | 프로덕션 빌드 미리보기 |
| `typecheck` | 타입스크립트 타입 검사 |
| `test` | 단위 테스트 실행 |
| `test:watch` | 워치 모드 테스트 |
| `test:ui` | 브라우저 UI 테스트 |
| `test:coverage` | 커버리지 리포트 생성 |
| `lint` | ESLint 실행 |
| `lint:fix` | ESLint 오류 자동 수정 |
| `format` | Prettier로 코드 포맷팅 |
| `clean` | 빌드 산출물 제거 |

## 기여 방법

1. 저장소 포크
2. 기능 브랜치 생성: `git checkout -b feature/amazing-feature`
3. 변경 사항 커밋: `git commit -m 'Add amazing feature'`
4. 브랜치 푸시: `git push origin feature/amazing-feature`
5. Pull Request 생성

## 라이선스

이 프로젝트는 MIT 라이선스입니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

### 써드파티 라이선스

- `src/lib/utils/cn.ts`: MIT License
- 전체 목록은 [licenses/THIRD_PARTY_NOTICES.md](licenses/THIRD_PARTY_NOTICES.md) 참고
