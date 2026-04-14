import type { JSX } from 'react';

import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '#/components/ui';
import { HEADER_TITLE_MAP, ROUTES } from '#/constants';

const getHeaderTitle = (pathName: string): string => {
  const matchedHeader = HEADER_TITLE_MAP.find(item => pathName.startsWith(item.pathPrefix));
  return matchedHeader?.title ?? 'Dulux Assurance';
};

const getBreadcrumb = (pathName: string): string | null => {
  void pathName;
  return null;
};

const getStateBackRoute = (state: unknown): string | null => {
  if (!state || typeof state !== 'object') {
    return null;
  }

  const backTo = (state as { backTo?: unknown }).backTo;

  if (typeof backTo !== 'string' || backTo.trim().length === 0 || !backTo.startsWith('/')) {
    return null;
  }

  return backTo;
};

const withSearch = (path: string, search: string): string => {
  if (!search) {
    return path;
  }

  return `${path}${search}`;
};

const getBackRoute = (pathName: string, search: string, state: unknown): string | null => {
  const stateBackRoute = getStateBackRoute(state);

  if (pathName.startsWith(ROUTES.MANUAL_REGISTRATION_ROOT)) {
    return withSearch(ROUTES.REGISTRATIONS, search);
  }

  if (pathName.startsWith(`${ROUTES.REGISTRATIONS}/`)) {
    return stateBackRoute ?? withSearch(ROUTES.REGISTRATIONS, search);
  }

  if (pathName.startsWith(`${ROUTES.CLAIMS}/`)) {
    return withSearch(ROUTES.CLAIMS, search);
  }

  if (pathName.startsWith(`${ROUTES.QUALITY}/`)) {
    return withSearch(ROUTES.QUALITY, search);
  }

  if (pathName === ROUTES.PRODUCT_NEW || pathName.startsWith(`${ROUTES.PRODUCTS}/`)) {
    return withSearch(ROUTES.PRODUCTS, search);
  }

  return null;
};

/**
 * Header renders top bar content for the app shell.
 *
 * @returns Header component.
 */
export const Header = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const title = getHeaderTitle(location.pathname);
  const breadcrumb = getBreadcrumb(location.pathname);
  const backRoute = getBackRoute(location.pathname, location.search, location.state);
  const isRegistrationsRoute = location.pathname === ROUTES.REGISTRATIONS;
  const isClaimsRoute = location.pathname === ROUTES.CLAIMS;
  const isProductsRoute = location.pathname === ROUTES.PRODUCTS;
  const actionButtonLabel = isRegistrationsRoute
    ? 'Add Manual Registration'
    : isClaimsRoute
      ? 'Add Claim'
      : isProductsRoute
        ? 'Add Product'
        : null;

  const handleBack = (): void => {
    if (backRoute) {
      navigate(backRoute);
    }
  };

  const handleAction = (): void => {
    if (isRegistrationsRoute) {
      navigate(ROUTES.MANUAL_REGISTRATION_STEP_1);
      return;
    }

    if (isClaimsRoute) {
      const nextParams = new URLSearchParams(location.search);
      nextParams.set('createClaim', '1');
      navigate(`${ROUTES.CLAIMS}?${nextParams.toString()}`);
      return;
    }

    if (isProductsRoute) {
      navigate(ROUTES.PRODUCT_NEW);
    }
  };

  return (
    <header className='relative shrink-0 border-b border-border/60 bg-white/75 px-4 backdrop-blur-xl md:h-[74px] md:px-6'>
      <div className='mx-auto flex h-full w-full max-w-[1360px] min-[1440px]:max-w-[1240px] items-center justify-between gap-4 py-3 md:py-0'>
        <div className='flex min-w-0 items-start gap-3'>
          {backRoute ? (
            <Button
              type='button'
              variant='outline'
              className='h-9 w-9 rounded-xl border-primary/25 bg-white p-0 text-primary hover:bg-primary/10'
              onClick={handleBack}
              aria-label='Go back'
            >
              <ArrowLeft className='h-4 w-4' />
            </Button>
          ) : null}
          <div className='flex min-w-0 flex-col'>
            <div className='flex min-w-0 items-center gap-2'>
              {breadcrumb ? <p className='truncate text-xs font-semibold text-text-muted'>{breadcrumb}</p> : null}
            </div>
            <h2 className='truncate text-lg font-extrabold tracking-tight text-text-primary'>{title}</h2>
            <p className='text-xs text-text-muted md:text-sm'>
              Modern operations cockpit for registration and claims workflows.
            </p>
          </div>
        </div>
        {actionButtonLabel ? <Button onClick={handleAction}>{actionButtonLabel}</Button> : null}
      </div>
    </header>
  );
};
