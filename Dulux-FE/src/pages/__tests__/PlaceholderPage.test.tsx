import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlaceholderPage } from '../PlaceholderPage';

describe('PlaceholderPage', () => {
  it('renders title and placeholder message', () => {
    render(<PlaceholderPage title='Coming Soon' />);

    expect(screen.getByRole('heading', { name: 'Coming Soon' })).toBeInTheDocument();
    expect(screen.getByText('Placeholder — implementation pending.')).toBeInTheDocument();
  });
});
