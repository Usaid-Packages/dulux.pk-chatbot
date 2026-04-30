import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SurfaceTypeModal } from '#/components/products/SurfaceTypeModal';

describe('SurfaceTypeModal', () => {
  it('hides description and status fields in add mode', () => {
    render(
      <SurfaceTypeModal
        isOpen
        isSubmitting={false}
        title='Add Surface Type'
        description='Provide a name and category for this surface type.'
        submitLabel='Add Surface Type'
        onClose={() => undefined}
        onSubmit={() => undefined}
      />
    );

    expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
  });

  it('hides description and status fields in edit mode', () => {
    render(
      <SurfaceTypeModal
        isOpen
        isSubmitting={false}
        title='Edit Surface Type'
        description='Provide a name and category for this surface type.'
        submitLabel='Save Changes'
        initialValues={{
          name: 'Wood',
          environment: 'INTERIOR',
          description: '',
          status: 'ACTIVE',
        }}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />
    );

    expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
  });
});
