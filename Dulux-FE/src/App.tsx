import type { JSX } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from 'react-error-boundary';
import { RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import { AuthProvider } from '#/context';
import { router } from '#/routes';
import ErrorFallback from './components/errorFallback/ErrorFallback';

function AppContent(): JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ToastContainer />
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

function App(): JSX.Element {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
