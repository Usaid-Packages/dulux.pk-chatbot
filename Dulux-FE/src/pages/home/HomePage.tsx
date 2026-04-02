import type { JSX } from 'react';

import { Button } from '#/components/ui/Button';
import { useAuth } from '#/context';
import { useLogoutAction } from '#/hooks';

/**
 * HomePage renders the authenticated landing experience.
 *
 * @returns Dashboard home page.
 */
export const HomePage = (): JSX.Element => {
  const { user } = useAuth();
  const { handleLogout, isLogoutPending } = useLogoutAction();

  const handleLogoutClick = (): void => {
    void handleLogout();
  };

  return (
    <main className='min-h-screen bg-background px-4 py-10'>
      <div className='mx-auto flex w-full max-w-5xl items-center justify-between rounded-2xl border bg-card p-6 shadow-sm'>
        <div>
          <p className='text-xs uppercase tracking-wide text-muted-foreground'>Dulux Assurance</p>
          <h1 className='mt-1 text-2xl font-semibold text-foreground'>Dashboard</h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            Signed in as <span className='font-medium text-foreground'>{user?.email ?? 'authenticated user'}</span>
          </p>
        </div>
        <Button variant='outline' onClick={handleLogoutClick} disabled={isLogoutPending}>
          {isLogoutPending ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
    </main>
  );
};
