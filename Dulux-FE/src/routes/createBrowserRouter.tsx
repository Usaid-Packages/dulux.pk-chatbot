import type { JSX } from 'react';
import { Suspense, lazy } from 'react';

import { Navigate, Route, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';

import { AppLayout, ManualRegistrationLayout } from '#/components/layout';
import { APP_USER_ROLES, ROUTES, getHomeRouteByRole } from '#/constants';
import { useAuthContext } from '#/context';
import { PrivateRoute } from '#/routes/PrivateRoute';
import { RoleRoute } from '#/routes/RoleRoute';

const LoginPage = lazy(async () => ({ default: (await import('#/pages/auth/LoginPage')).LoginPage }));
const ForgotPasswordPage = lazy(async () => ({
  default: (await import('#/pages/auth/ForgotPasswordPage')).ForgotPasswordPage,
}));
const ResetPasswordPage = lazy(async () => ({
  default: (await import('#/pages/auth/ResetPasswordPage')).ResetPasswordPage,
}));
const DashboardPage = lazy(async () => ({ default: (await import('#/pages/DashboardPage')).DashboardPage }));
const ClaimsListPage = lazy(async () => ({ default: (await import('#/pages/claims/ClaimsListPage')).ClaimsListPage }));
const ClaimDetailPage = lazy(async () => ({
  default: (await import('#/pages/claims/ClaimDetailPage')).ClaimDetailPage,
}));
const RegistrationsListPage = lazy(async () => ({
  default: (await import('#/pages/registrations/RegistrationsListPage')).RegistrationsListPage,
}));
const RegistrationDetailPage = lazy(async () => ({
  default: (await import('#/pages/registrations/RegistrationDetailPage')).RegistrationDetailPage,
}));
const QualityListPage = lazy(async () => ({
  default: (await import('#/pages/quality/QualityListPage')).QualityListPage,
}));
const QualityDetailPage = lazy(async () => ({
  default: (await import('#/pages/quality/QualityDetailPage')).QualityDetailPage,
}));
const LiveChatPage = lazy(async () => ({ default: (await import('#/pages/complaints/LiveChatPage')).LiveChatPage }));
const ManualStepPage = lazy(async () => ({
  default: (await import('#/pages/registrations/ManualStepPage')).ManualStepPage,
}));
const ManualRegistrationSuccessPage = lazy(async () => ({
  default: (await import('#/pages/registrations/ManualRegistrationSuccessPage')).ManualRegistrationSuccessPage,
}));
const ProductsListPage = lazy(async () => ({
  default: (await import('#/pages/products/ProductsListPage')).ProductsListPage,
}));
const ProductCreatePage = lazy(async () => ({
  default: (await import('#/pages/products/ProductCreatePage')).ProductCreatePage,
}));
const ProductEditPage = lazy(async () => ({
  default: (await import('#/pages/products/ProductEditPage')).ProductEditPage,
}));

const LoadingFallback = (): JSX.Element => (
  <div className='flex h-screen items-center justify-center'>
    <div className='h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary' />
  </div>
);

const withSuspense = (element: JSX.Element): JSX.Element => {
  return <Suspense fallback={<LoadingFallback />}>{element}</Suspense>;
};

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
      <Route path={ROUTES.LOGIN} element={withSuspense(<LoginPage />)} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={withSuspense(<ForgotPasswordPage />)} />
      <Route path={ROUTES.RESET_PASSWORD} element={withSuspense(<ResetPasswordPage />)} />
      <Route path={`${ROUTES.RESET_PASSWORD}/:uid/:token`} element={withSuspense(<ResetPasswordPage />)} />
      <Route path={ROUTES.UNAUTHORIZED} element={<Navigate to={ROUTES.LOGIN} replace />} />

      <Route element={protectedRouteGroup}>
        <Route index element={<RedirectHandler />} />
        <Route element={<RoleRoute allowedRoles={[APP_USER_ROLES.ADMIN, APP_USER_ROLES.CS]} />}>
          <Route path={ROUTES.DASHBOARD} element={withSuspense(<DashboardPage />)} />
        </Route>
        <Route path={ROUTES.CLAIMS}>
          <Route index element={withSuspense(<ClaimsListPage />)} />
          <Route path=':id' element={withSuspense(<ClaimDetailPage />)} />
        </Route>
        <Route path={ROUTES.REGISTRATIONS}>
          <Route element={<RoleRoute allowedRoles={[APP_USER_ROLES.ADMIN, APP_USER_ROLES.CS]} />}>
            <Route index element={withSuspense(<RegistrationsListPage />)} />
          </Route>
          <Route
            element={<RoleRoute allowedRoles={[APP_USER_ROLES.ADMIN, APP_USER_ROLES.CS, APP_USER_ROLES.QUALITY]} />}
          >
            <Route path=':id' element={withSuspense(<RegistrationDetailPage />)} />
          </Route>
        </Route>
        <Route element={<RoleRoute allowedRoles={[APP_USER_ROLES.ADMIN, APP_USER_ROLES.QUALITY]} />}>
          <Route path={ROUTES.QUALITY}>
            <Route index element={withSuspense(<QualityListPage />)} />
            <Route path=':id' element={withSuspense(<QualityDetailPage />)} />
          </Route>
        </Route>
        <Route path={ROUTES.COMPLAINTS}>
          <Route index element={withSuspense(<LiveChatPage />)} />
          <Route path=':id' element={withSuspense(<LiveChatPage />)} />
        </Route>
        <Route element={<RoleRoute allowedRoles={[APP_USER_ROLES.ADMIN, APP_USER_ROLES.CS]} />}>
          <Route path={ROUTES.MANUAL_REGISTRATION_ROOT} element={<ManualRegistrationLayout />}>
            <Route index element={<Navigate to='step/1' replace />} />
            <Route path='step/:stepId' element={withSuspense(<ManualStepPage />)} />
            <Route path='success' element={withSuspense(<ManualRegistrationSuccessPage />)} />
          </Route>
        </Route>
        <Route path={ROUTES.PRODUCTS}>
          <Route element={<RoleRoute allowedRoles={[APP_USER_ROLES.ADMIN, APP_USER_ROLES.CS]} />}>
            <Route index element={withSuspense(<ProductsListPage />)} />
          </Route>
          <Route element={<RoleRoute allowedRoles={[APP_USER_ROLES.ADMIN, APP_USER_ROLES.CS]} />}>
            <Route path='new' element={withSuspense(<ProductCreatePage />)} />
            <Route path=':id/edit' element={withSuspense(<ProductEditPage />)} />
          </Route>
        </Route>
      </Route>

      <Route path='*' element={<RedirectHandler />} />
    </>
  ),
  { basename: '/app' }
);
