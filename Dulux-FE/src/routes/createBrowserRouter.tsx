import type { JSX } from 'react';
import { Suspense } from 'react';

import { Navigate, Route, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';

import { AppLayout, ManualRegistrationLayout } from '#/components/layout';
import { APP_USER_ROLES, ROUTES, getHomeRouteByRole } from '#/constants';
import { useAuthContext } from '#/context';
import { ForgotPasswordPage, LoginPage, ResetPasswordPage } from '#/pages/auth';
import { ClaimDetailPage, ClaimsListPage } from '#/pages/claims';
import { LiveChatPage } from '#/pages/complaints';
import { DashboardPage } from '#/pages/DashboardPage';
import { ProductCreatePage, ProductEditPage, ProductsListPage } from '#/pages/products';
import { QualityDetailPage, QualityListPage } from '#/pages/quality';
import {
  ManualRegistrationSuccessPage,
  ManualStepPage,
  RegistrationDetailPage,
  RegistrationsListPage,
} from '#/pages/registrations';
import { PrivateRoute } from '#/routes/PrivateRoute';
import { RoleRoute } from '#/routes/RoleRoute';

const LoadingFallback = (): JSX.Element => (
  <div className='flex h-screen items-center justify-center'>
    <div className='h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary' />
  </div>
);

const RedirectHandler = (): JSX.Element => {
  const { token, user } = useAuthContext();
  return token ? <Navigate to={getHomeRouteByRole(user?.role)} replace /> : <Navigate to={ROUTES.LOGIN} replace />;
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
      <Route path={`${ROUTES.RESET_PASSWORD}/:uid/:token`} element={<ResetPasswordPage />} />
      <Route path={ROUTES.UNAUTHORIZED} element={<Navigate to={ROUTES.LOGIN} replace />} />

      <Route element={protectedRouteGroup}>
        <Route index element={<RedirectHandler />} />
        <Route element={<RoleRoute allowedRoles={[APP_USER_ROLES.ADMIN, APP_USER_ROLES.CS]} />}>
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        </Route>
        <Route path={ROUTES.CLAIMS}>
          <Route index element={<ClaimsListPage />} />
          <Route path=':id' element={<ClaimDetailPage />} />
        </Route>
        <Route path={ROUTES.REGISTRATIONS}>
          <Route element={<RoleRoute allowedRoles={[APP_USER_ROLES.ADMIN, APP_USER_ROLES.CS]} />}>
            <Route index element={<RegistrationsListPage />} />
          </Route>
          <Route
            element={<RoleRoute allowedRoles={[APP_USER_ROLES.ADMIN, APP_USER_ROLES.CS, APP_USER_ROLES.QUALITY]} />}
          >
            <Route path=':id' element={<RegistrationDetailPage />} />
          </Route>
        </Route>
        <Route element={<RoleRoute allowedRoles={[APP_USER_ROLES.QUALITY]} />}>
          <Route path={ROUTES.QUALITY}>
            <Route index element={<QualityListPage />} />
            <Route path=':id' element={<QualityDetailPage />} />
          </Route>
        </Route>
        <Route path={ROUTES.COMPLAINTS}>
          <Route index element={<LiveChatPage />} />
          <Route path=':id' element={<LiveChatPage />} />
        </Route>
        <Route element={<RoleRoute allowedRoles={[APP_USER_ROLES.ADMIN, APP_USER_ROLES.CS]} />}>
          <Route path={ROUTES.MANUAL_REGISTRATION_ROOT} element={<ManualRegistrationLayout />}>
            <Route index element={<Navigate to='step/1' replace />} />
            <Route path='step/:stepId' element={<ManualStepPage />} />
            <Route path='success' element={<ManualRegistrationSuccessPage />} />
          </Route>
        </Route>
        <Route element={<RoleRoute allowedRoles={[APP_USER_ROLES.ADMIN]} />}>
          <Route path={ROUTES.PRODUCTS}>
            <Route index element={<ProductsListPage />} />
            <Route path='new' element={<ProductCreatePage />} />
            <Route path=':id/edit' element={<ProductEditPage />} />
          </Route>
        </Route>
      </Route>

      <Route path='*' element={<RedirectHandler />} />
    </>
  ),
  { basename: '/app' }
);
