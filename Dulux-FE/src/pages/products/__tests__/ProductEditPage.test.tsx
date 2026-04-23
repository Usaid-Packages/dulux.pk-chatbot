import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProductEditPageController } from '#/hooks/products';
import { ProductEditPage } from '../ProductEditPage';

const mockHandleCancel = vi.fn();
const mockHandleRemoveImage = vi.fn();
const mockHandleSubmit = vi.fn();

vi.mock('#/hooks/products', () => ({
  useProductEditPageController: vi.fn(),
}));

vi.mock('#/components/products', () => ({
  ProductForm: ({
    onCancel,
    onRemoveImage,
    onSubmit,
  }: {
    basecoatOptions: unknown[];
    description: string;
    initialImages: unknown[];
    initialValues: unknown;
    isImageActionPending: boolean;
    isSubmitting: boolean;
    onCancel: () => void;
    onRemoveImage: (imageId: string) => void;
    onSubmit: (values: unknown) => void;
    submitLabel: string;
    surfaceTypes: unknown[];
    title: string;
  }) => (
    <div>
      <button type='button' onClick={onCancel}>
        Cancel Product Edit
      </button>
      <button type='button' onClick={() => onRemoveImage('img-1')}>
        Remove Product Image
      </button>
      <button
        type='button'
        onClick={() =>
          onSubmit({
            imageFile: null,
            values: { name: 'Updated Product' },
          })
        }
      >
        Submit Product Edit
      </button>
    </div>
  ),
}));

const mockedUseProductEditPageController = vi.mocked(useProductEditPageController);

const buildControllerState = (
  overrides: Partial<ReturnType<typeof useProductEditPageController>> = {}
): ReturnType<typeof useProductEditPageController> => {
  return {
    isInvalidProductId: false,
    isLoading: false,
    isProductError: false,
    productErrorMessage: '',
    isDependenciesError: false,
    dependenciesErrorMessage: '',
    isSubmitting: false,
    isImageActionPending: false,
    initialValues: { name: 'Existing Product' },
    initialImages: [{ id: 'img-1' }],
    surfaceTypes: [{ id: 1, name: 'Wood', environment: 'INTERIOR' }],
    basecoatOptions: [{ id: 2, name: 'Basecoat A' }],
    handleCancel: mockHandleCancel,
    handleSubmit: mockHandleSubmit,
    handleRemoveImage: mockHandleRemoveImage,
    ...overrides,
  } as ReturnType<typeof useProductEditPageController>;
};

describe('ProductEditPage', () => {
  beforeEach(() => {
    mockHandleCancel.mockReset();
    mockHandleRemoveImage.mockReset();
    mockHandleSubmit.mockReset();
    mockedUseProductEditPageController.mockReturnValue(buildControllerState());
  });

  it('renders invalid-id state when route param is missing', () => {
    mockedUseProductEditPageController.mockReturnValue(
      buildControllerState({
        isInvalidProductId: true,
      })
    );

    render(<ProductEditPage />);

    expect(screen.getByText('Invalid product id')).toBeInTheDocument();
  });

  it('renders product error state when detail query fails', () => {
    mockedUseProductEditPageController.mockReturnValue(
      buildControllerState({
        isProductError: true,
        productErrorMessage: 'Product detail failed',
      })
    );

    render(<ProductEditPage />);

    expect(screen.getByText('Unable to load product')).toBeInTheDocument();
    expect(screen.getByText('Product detail failed')).toBeInTheDocument();
  });

  it('calls submit and remove-image handlers', () => {
    render(<ProductEditPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Product Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Product Image' }));

    expect(mockHandleSubmit).toHaveBeenCalledWith({
      imageFile: null,
      values: { name: 'Updated Product' },
    });
    expect(mockHandleRemoveImage).toHaveBeenCalledWith('img-1');
  });

  it('calls cancel handler', () => {
    render(<ProductEditPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Product Edit' }));

    expect(mockHandleCancel).toHaveBeenCalledTimes(1);
  });
});
