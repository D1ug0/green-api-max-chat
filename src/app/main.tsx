import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { setupConversationPersistence } from './providers/conversation-persistence';
import { ErrorBoundary } from './providers/error-boundary';
import './styles/global.css';

setupConversationPersistence();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
