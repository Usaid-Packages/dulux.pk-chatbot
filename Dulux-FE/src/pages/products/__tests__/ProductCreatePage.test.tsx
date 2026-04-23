import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProductCreatePageController } from '#/hooks/products';
import { ProductCreatePage } from '../ProductCreatePage';

const mockHandleCancel = vi.fn();
const mockHandleSubmit = vi.fn();

vi.mock('#/hooks/products', () => ({
  useProductCreatePageController: vi.fn(),
}));

vi.mock('#/components/products', () => ({
  ProductForm: ({
    onCancel,
    onSubmit,
  }: {
    basecoatOptions: unknown[];
    defaultBasecoatWarrantyYears: number;
    description: string;
    isSubmitting: boolean;
    onCancel: () => void;
    onSubmit: (values: unknown) => void;
    submitLabel: string;
    surfaceTypes: unknown[];
    title: string;
    useSplitLongFieldLayout: boolean;
  }) => (
    <div>
      <button type='button' onClick={onCancel}>
        Cancel Product Create
      </button>
      <button
        type='button'
        onClick={() =>
          onSubmit({
            imageFile: null,
            values: { name: 'Dulux Shield', productType: 'TOPCOAT' },
          })
        }
      >
        Submit Product Create
      </button>
    </div>
  ),
}));

const mockedUseProductCreatePageController = vi.mocked(useProductCreatePageController);

const buildControllerState = (
  overrides: Partial<ReturnType<typeof useProductCreatePageController>> = {}
): ReturnType<typeof useProductCreatePageController> => {
  return {
    isLoading: false,
    isError: false,
    errorMessage: '',
    isSubmitting: false,
    surfaceTypes: [{ id: 1, name: 'Wood', environment: 'INTERIOR' }],
    basecoatOptions: [{ id: 10, name: 'Basecoat X' }],
    handleCancel: mockHandleCancel,
    handleSubmit: mockHandleSubmit,
    ...overrides,
  } as ReturnType<typeof useProductCreatePageController>;
};

describe('ProductCreatePage', () => {
  beforeEach(() => {
    mockHandleCancel.mockReset();
    mockHandleSubmit.mockReset();
    mockedUseProductCreatePageController.mockReturnValue(buildControllerState());
  });

  it('renders dependency error state when dependencies fail', () => {
    mockedUseProductCreatePageController.mockReturnValue(
      buildControllerState({
        isError: true,
        errorMessage: 'Surface types failed',
      })
    );

    render(<ProductCreatePage />);

    expect(screen.getByText('Unable to load product dependencies')).toBeInTheDocument();
    expect(screen.getByText('Surface types failed')).toBeInTheDocument();
  });

  it('calls cancel handler', () => {
    render(<ProductCreatePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Product Create' }));

    expect(mockHandleCancel).toHaveBeenCalledTimes(1);
  });

  it('calls submit handler with form payload', () => {
    render(<ProductCreatePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Product Create' }));

    expect(mockHandleSubmit).toHaveBeenCalledWith({
      imageFile: null,
      values: { name: 'Dulux Shield', productType: 'TOPCOAT' },
    });
  });
});
