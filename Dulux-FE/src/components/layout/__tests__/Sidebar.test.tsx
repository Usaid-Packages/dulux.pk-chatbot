import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Sidebar } from '#/components/layout/Sidebar';
import { useAuthContext } from '#/context';
import { useLogout } from '#/hooks';

vi.mock('#/context', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('#/hooks', () => ({
  useLogout: vi.fn(),
}));

const mockedUseAuthContext = vi.mocked(useAuthContext);
const mockedUseLogout = vi.mocked(useLogout);

describe('Sidebar', () => {
  beforeEach(() => {
    mockedUseLogout.mockReturnValue({
      handleLogout: vi.fn(),
      isLogoutPending: false,
    });
  });

  it('hides the Quality Review nav item for admin users', () => {
    mockedUseAuthContext.mockReturnValue({
      user: { email: 'admin@dulux.pk', role: 'admin' },
    } as unknown as ReturnType<typeof useAuthContext>);

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: 'Quality Review' })).not.toBeInTheDocument();
  });

  it('shows the Quality Review nav item for quality users', () => {
    mockedUseAuthContext.mockReturnValue({
      user: { email: 'quality@dulux.pk', role: 'quality' },
    } as unknown as ReturnType<typeof useAuthContext>);

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Quality Review' })).toBeInTheDocument();
  });
});
