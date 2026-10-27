import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/geist-sans/latin-300.css';
import '@fontsource/geist-sans/latin-400.css';
import '@fontsource/geist-sans/latin-500.css';
import '@fontsource/geist-sans/latin-600.css';
import '@fontsource/geist-sans/latin-700.css';
import '@fontsource/geist-mono/latin-400.css';
import './config/env';
import './styles/tokens.css';
import './styles/global.css';
import { App } from './app/App';
import { Providers } from './app/Providers';
import { runtime } from './app/runtime';

const root = document.getElementById('root');

if (!root) {
  throw new Error('No se encontró el contenedor de la aplicación.');
}

createRoot(root).render(
  <StrictMode>
    <Providers runtime={runtime}><App /></Providers>
  </StrictMode>,
);
