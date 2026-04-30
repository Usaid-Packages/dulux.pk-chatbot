import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProductFormImageSection } from '#/components/products/productFormSections/ProductFormImageSection';

describe('ProductFormImageSection', () => {
  it('renders required product image label with asterisk', () => {
    render(
      <ProductFormImageSection
        initialImages={[]}
        isImageActionPending={false}
        selectedImageFile={null}
        imageValidationError={null}
        onImageFilesChange={() => undefined}
      />
    );

    expect(screen.getByText('Product Image')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
