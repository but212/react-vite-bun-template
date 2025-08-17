import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/main.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root container #root not found');
}

createRoot(root).render(<App />);
