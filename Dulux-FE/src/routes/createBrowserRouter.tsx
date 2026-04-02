import type { JSX } from 'react';
import { Suspense } from 'react';

import { Navigate, Route, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';

import { AppLayout, ManualRegistrationLayout } from '#/components/layout';
import { ROUTES } from '#/constants';
import { useAuthContext } from '#/context';
import { ForgotPasswordPage, LoginPage, ResetPasswordPage } from '#/pages/auth';
import { PlaceholderPage } from '#/pages/PlaceholderPage';
import { PrivateRoute } from '#/routes/PrivateRoute';

const LoadingFallback = (): JSX.Element => (
  <div className='flex h-screen items-center justify-center'>
    <div className='h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary' />
  </div>
);

const RedirectHandler = (): JSX.Element => {
  const { token } = useAuthContext();
  return token ? <Navigate to={ROUTES.APP.DASHBOARD} replace /> : <Navigate to={ROUTES.LOGIN} replace />;
};

const protectedRouteGroup = (
  <PrivateRoute>
    <Suspense fallback={<LoadingFallback />}>
      <AppLayout />
    </Suspense>
  </PrivateRoute>
);

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path={ROUTES.ROOT} element={<RedirectHandler />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
      <Route path={ROUTES.UNAUTHORIZED} element={<Navigate to={ROUTES.LOGIN} replace />} />

      <Route element={protectedRouteGroup}>
        <Route index element={<Navigate to={ROUTES.APP.DASHBOARD} replace />} />
        <Route path={ROUTES.APP.DASHBOARD} element={<PlaceholderPage title='Dashboard' />} />
        <Route path={ROUTES.APP.REGISTRATIONS}>
          <Route index element={<PlaceholderPage title='Registrations' />} />
          <Route path=':id' element={<PlaceholderPage title='Registration detail' />} />
        </Route>
        <Route path={ROUTES.APP.CLAIMS}>
          <Route index element={<PlaceholderPage title='Claims' />} />
          <Route path=':id' element={<PlaceholderPage title='Claim detail' />} />
        </Route>
        <Route path={ROUTES.APP.COMPLAINTS}>
          <Route index element={<PlaceholderPage title='Live Chat' />} />
          <Route path=':id' element={<PlaceholderPage title='Chat thread' />} />
        </Route>
        <Route path={ROUTES.APP.MANUAL_REGISTRATION.ROOT} element={<ManualRegistrationLayout />}>
          <Route index element={<Navigate to='step/1' replace />} />
          <Route path='step/:stepId' element={<PlaceholderPage title='Manual registration' />} />
          <Route path='success' element={<PlaceholderPage title='Manual registration — Success' />} />
        </Route>
        <Route path={ROUTES.APP.QUALITY}>
          <Route index element={<PlaceholderPage title='Quality review' />} />
          <Route path=':id' element={<PlaceholderPage title='Quality detail' />} />
        </Route>
        <Route path={ROUTES.APP.PRODUCTS}>
          <Route index element={<PlaceholderPage title='Product catalog' />} />
          <Route path='new' element={<PlaceholderPage title='New product' />} />
          <Route path=':id/edit' element={<PlaceholderPage title='Edit product' />} />
        </Route>
        <Route path={ROUTES.APP.IMPORT} element={<PlaceholderPage title='Data import' />} />
        <Route path={ROUTES.APP.SETTINGS} element={<PlaceholderPage title='Settings' />} />
      </Route>

      <Route path='*' element={<RedirectHandler />} />
    </>
  ),
  { basename: '/app' }
);
