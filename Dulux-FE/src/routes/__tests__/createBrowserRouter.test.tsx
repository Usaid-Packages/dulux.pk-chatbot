import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthContext } from '#/context';

vi.mock('#/context', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('#/components/layout', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    AppLayout: () => <actual.Outlet />,
    ManualRegistrationLayout: () => <actual.Outlet />,
  };
});

vi.mock('#/pages/quality/QualityListPage', () => ({
  QualityListPage: () => <div>Quality queue page</div>,
}));

vi.mock('#/pages/quality/QualityDetailPage', () => ({
  QualityDetailPage: () => <div>Quality detail page</div>,
}));

const mockedUseAuthContext = vi.mocked(useAuthContext);

describe('router quality access', () => {
  beforeEach(() => {
    mockedUseAuthContext.mockReturnValue({
      token: 'token-123',
      user: { role: 'admin' },
    } as unknown as ReturnType<typeof useAuthContext>);
  });

  it('allows admin users to open the quality queue route', async () => {
    window.history.pushState({}, '', '/app/quality');

    const { RouterProvider } = await import('react-router-dom');
    const { router } = await import('../createBrowserRouter');

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Quality queue page')).toBeInTheDocument();
  });
});
