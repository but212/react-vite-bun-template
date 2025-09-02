import { render, screen } from '@/test/utils';
import { expect, test } from 'vitest';
import App from './App';

test('renders template page', () => {
  render(<App />);
  expect(screen.getByText('템플릿 페이지')).toBeInTheDocument();
});
