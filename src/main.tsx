// Debe ir primero: inicializa Sentry antes del render para capturar también los
// errores de arranque (ver `instrument.ts`).
import './instrument';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { SESSION_QUERY_KEY } from './features/auth/hooks/useSession';
import type { SessionUser } from './features/auth/types/session';
import { onLegalNotAccepted } from './shared/api/apiFetch';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';

const queryClient = new QueryClient();

// El backend rechaza todo con 403 LEGAL_NOT_ACCEPTED si el usuario no aceptó los
// textos vigentes (ENG-140). Se marca la sesión cacheada para que `RequireAuth`
// muestre el pedido de aceptación en vez de errores sueltos en cada pantalla.
onLegalNotAccepted(() => {
  queryClient.setQueryData<SessionUser | null>(SESSION_QUERY_KEY, (user) =>
    user ? { ...user, legalAccepted: false } : user,
  );
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Envuelve a los providers: si falla el árbol, igual hay pantalla. */}
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
