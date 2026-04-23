import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthContext } from '#/context';
import { useLogout } from '#/hooks';
import { HomePage } from '../HomePage';

const mockHandleLogout = vi.fn();

vi.mock('#/context', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('#/hooks', () => ({
  useLogout: vi.fn(),
}));

const mockedUseAuthContext = vi.mocked(useAuthContext);
const mockedUseLogout = vi.mocked(useLogout);

describe('HomePage', () => {
  beforeEach(() => {
    mockHandleLogout.mockReset();

    mockedUseAuthContext.mockReturnValue({
      user: {
        email: 'agent@dulux.com',
      },
    } as unknown as ReturnType<typeof useAuthContext>);

    mockedUseLogout.mockReturnValue({
      handleLogout: mockHandleLogout,
      isLogoutPending: false,
    } as unknown as ReturnType<typeof useLogout>);
  });

  it('renders signed-in user and triggers logout', () => {
    render(<HomePage />);

    expect(screen.getByText('Signed in as')).toBeInTheDocument();
    expect(screen.getByText('agent@dulux.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(mockHandleLogout).toHaveBeenCalledTimes(1);
  });
});
