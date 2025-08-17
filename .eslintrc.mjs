import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] }, // 빌드 폴더 제외
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended], // JS와 TS 권장 규칙 적용
    files: ['**/*.{ts,tsx}'], // TypeScript 파일에만 적용
    languageOptions: {
      ecmaVersion: 2020, // ES2020 문법 지원
      globals: globals.browser, // 브라우저 전역 변수 허용
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // JSX 문법 지원
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks, // React Hooks 규칙
      'react-refresh': reactRefresh, // React Fast Refresh 지원
      react: react, // React 관련 규칙
      import: importPlugin, // import 구문 규칙
    },
    rules: {
      ...reactHooks.configs.recommended.rules, // React Hooks 권장 규칙
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }], // Fast Refresh를 위한 컴포넌트 export 규칙
      'react/react-in-jsx-scope': 'off', // React 17+ 자동 JSX 런타임으로 불필요
      'react/jsx-uses-react': 'off', // React 17+ 자동 JSX 런타임으로 불필요
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'], // import 순서 정의
          'newlines-between': 'always', // import 그룹 사이에 빈 줄 강제
        },
      ],
    },
    settings: {
      react: {
        version: 'detect', // React 버전 자동 감지
      },
    },
  },
  prettier // Prettier와 충돌하는 규칙 비활성화
);
