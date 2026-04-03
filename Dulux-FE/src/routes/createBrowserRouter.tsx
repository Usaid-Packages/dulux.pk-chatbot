import type { JSX } from 'react';
import { Suspense } from 'react';

import { Navigate, Route, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';

import { AppLayout, ManualRegistrationLayout } from '#/components/layout';
import { DETAIL_ROUTE_CONFIGS, ROUTES } from '#/constants';
import { useAuthContext } from '#/context';
import { ForgotPasswordPage, LoginPage, ResetPasswordPage } from '#/pages/auth';
import { ClaimDetailPage, ClaimsListPage } from '#/pages/claims';
import { DashboardPage } from '#/pages/DashboardPage';
import { PlaceholderPage } from '#/pages/PlaceholderPage';
import {
  ManualRegistrationSuccessPage,
  ManualStepPage,
  RegistrationDetailPage,
  RegistrationsListPage,
} from '#/pages/registrations';
import { ProductCreatePage, ProductEditPage, ProductsListPage } from '#/pages/products';
import { QualityDetailPage, QualityListPage } from '#/pages/quality';
import { RegistrationDetailPage, RegistrationsListPage } from '#/pages/registrations';
import { PrivateRoute } from '#/routes/PrivateRoute';

const LoadingFallback = (): JSX.Element => (
  <div className='flex h-screen items-center justify-center'>
    <div className='h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary' />
  </div>
);

const RedirectHandler = (): JSX.Element => {
  const { token } = useAuthContext();
  return token ? <Navigate to={ROUTES.DASHBOARD} replace /> : <Navigate to={ROUTES.LOGIN} replace />;
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
        <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.CLAIMS}>
          <Route index element={<ClaimsListPage />} />
          <Route path=':id' element={<ClaimDetailPage />} />
        </Route>
        <Route path={ROUTES.REGISTRATIONS}>
          <Route index element={<RegistrationsListPage />} />
          <Route path=':id' element={<RegistrationDetailPage />} />
        </Route>
        <Route path={ROUTES.QUALITY}>
          <Route index element={<QualityListPage />} />
          <Route path=':id' element={<QualityDetailPage />} />
        </Route>
        {DETAIL_ROUTE_CONFIGS.map(routeConfig => (
          <Route key={routeConfig.path} path={routeConfig.path}>
            <Route index element={<PlaceholderPage title={routeConfig.indexTitle} />} />
            <Route path=':id' element={<PlaceholderPage title={routeConfig.detailTitle} />} />
          </Route>
        ))}
        <Route path={ROUTES.MANUAL_REGISTRATION_ROOT} element={<ManualRegistrationLayout />}>
          <Route index element={<Navigate to='step/1' replace />} />
          <Route path='step/:stepId' element={<ManualStepPage />} />
          <Route path='success' element={<ManualRegistrationSuccessPage />} />
        </Route>
        <Route path={ROUTES.PRODUCTS}>
          <Route index element={<ProductsListPage />} />
          <Route path='new' element={<ProductCreatePage />} />
          <Route path=':id/edit' element={<ProductEditPage />} />
        </Route>
      </Route>

      <Route path='*' element={<RedirectHandler />} />
    </>
  ),
  { basename: '/app' }
);
