import type { JSX } from 'react';
import React, { lazy, Suspense } from 'react';

import { Route, createBrowserRouter, createRoutesFromElements, Navigate } from 'react-router-dom';

import { ROUTES } from '#/constants';
import { useAuth } from '#/context';
import { PrivateRoute } from '#/routes/PrivateRoute';

const Home = lazy(() => import('#/pages/Home'));
const Unauthorized = lazy(() => import('#/pages/Unauthorized'));

// replace this with your own loading component
const LoadingFallback = (): JSX.Element => (
  <div className='flex items-center justify-center h-screen'>
    <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary' />
  </div>
);
const RedirectHandler = () => {
  const { token } = useAuth();
  return token ? <Navigate to={ROUTES.HOME} replace /> : <Navigate to={ROUTES.AUTH} replace />;
};

export const createPrivateRoute = (Component: React.ComponentType): JSX.Element => {
  return (
    <PrivateRoute>
      <Suspense fallback={<LoadingFallback />}>
        <Component />
      </Suspense>
    </PrivateRoute>
  );
};

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path={ROUTES.HOME} element={createPrivateRoute(Home)} />
      <Route
        path={ROUTES.UN_AUTHORIZED}
        element={
          <Suspense fallback={<LoadingFallback />}>
            <Unauthorized />
          </Suspense>
        }
      />
      <Route path='*' element={<RedirectHandler />} />
    </>
  ),
  { basename: '/app' }
);
