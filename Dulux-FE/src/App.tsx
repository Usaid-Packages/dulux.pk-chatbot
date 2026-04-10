import type { JSX } from 'react';
import { useEffect } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from 'react-error-boundary';
import { RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import duluxLogo from '#/assets/images/dulux-logo.png';
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
  const handleReset = (): void => window.location.reload();

  useEffect(() => {
    const head = document.head;
    const existingIcon = head.querySelector<HTMLLinkElement>("link[rel='icon']");
    const iconElement = existingIcon ?? document.createElement('link');
    iconElement.rel = 'icon';
    iconElement.type = 'image/png';
    iconElement.href = duluxLogo;

    if (!existingIcon) {
      head.appendChild(iconElement);
    }
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={handleReset}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
