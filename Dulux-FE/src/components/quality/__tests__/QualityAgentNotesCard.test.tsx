import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QualityAgentNotesCard } from '#/components/quality/QualityAgentNotesCard';

describe('QualityAgentNotesCard', () => {
  it('renders a scrollable notes container for long note content', () => {
    render(<QualityAgentNotesCard notes='Imported legacy note content.' />);

    const notesCard = screen.getByText('Note').parentElement;
    const notesContent = screen.getByText('Imported legacy note content.').parentElement;

    expect(notesCard).toHaveClass('max-h-[150px]', 'overflow-auto');
    expect(notesContent).toHaveClass('overflow-auto');
  });
});
