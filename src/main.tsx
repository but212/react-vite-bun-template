import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { StrictMode } from 'react';
import './styles/main.css';
import { BrowserRouter } from 'react-router-dom';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root container #root not found');
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
