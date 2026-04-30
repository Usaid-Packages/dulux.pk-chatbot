import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RegistrationEditModal } from '#/components/registrations/RegistrationEditModal';
import type { RegistrationDetail } from '#/types/registrations';

vi.mock('#/data-layer/registrations', () => ({
  useGetManualRegistrationProductsQuery: () => ({
    data: {
      topcoatProducts: [],
      basecoatProductsByTopcoatId: {},
    },
  }),
  useGetManualRegistrationProductOptionsInfiniteQuery: (productType: string) => {
    if (productType === 'SPECIALIST') {
      return {
        options: [{ id: '90', label: 'Special LIME TWIST paint', productType: 'SPECIALIST' }],
        hasNextPage: false,
        isLoading: false,
        isError: false,
        isFetchingNextPage: false,
        error: null,
        fetchNextPage: vi.fn(),
      };
    }

    return {
      options: [{ id: '24', label: 'Aquashield Waterproof Roofcoat', productType: 'TOPCOAT' }],
      hasNextPage: false,
      isLoading: false,
      isError: false,
      isFetchingNextPage: false,
      error: null,
      fetchNextPage: vi.fn(),
    };
  },
}));

const buildRegistration = (): RegistrationDetail =>
  ({
    id: 656,
    registrationCode: '6012752240',
    channel: 'WEBFORM',
    state: 'RESUBMIT',
    customerName: 'Valentine Woodward',
    phoneNumber: '923171598884',
    email: 'funowiror@mailinator.com',
    city: 'Karachi',
    province: '',
    siteAddress: 'Site Address',
    purchaseDate: '2026-04-03',
    purchaseDealer: 'Dealer',
    purchaseDealerCity: 'Lahore',
    purchaseDealerAddress: 'Dealer Address',
    postalCode: '',
    notes: '',
    approvedBy: null,
    approvedByEmail: null,
    approvedAt: null,
    warrantyCertificate: null,
    rejectionFields: [],
    paintPairs: [
      {
        id: 1457,
        topcoat: { id: 90, name: 'Special LIME TWIST paint', productType: 'SPECIALIST' },
        topcoatQuantity: '7.00',
        basecoat: null,
        basecoatQuantity: null,
        created: '2026-04-29T10:54:57.030881Z',
      },
    ],
    paintPairInvoices: [
      {
        id: 1,
        invoiceType: 'TOPCOAT',
        image: { id: 1, image: 'https://example.com/invoice.jpg', created: '2026-04-29T10:54:56.592197Z' },
        created: '2026-04-29T10:54:57.035043Z',
      },
    ],
    created: '2026-04-29T10:54:57.028381Z',
    modified: '2026-04-29T10:55:08.676432Z',
  }) as RegistrationDetail;

describe('RegistrationEditModal', () => {
  it('shows existing pairs in read-only table but keeps update inputs unselected and empty', () => {
    render(
      <RegistrationEditModal
        isOpen
        isLoading={false}
        isSubmitting={false}
        registration={buildRegistration()}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />
    );

    expect(screen.getByText('Specialized Paint')).toBeInTheDocument();
    expect(screen.getByText('Special LIME TWIST paint')).toBeInTheDocument();
    expect(screen.getByText('Choose Paint Type')).toBeInTheDocument();
    expect(screen.queryByText('Specialist Product')).not.toBeInTheDocument();
    expect(screen.queryByText('Topcoat Quantity (liters)')).not.toBeInTheDocument();
  });

  it('keeps basecoat disabled until topcoat is selected in edit add-pair section', async () => {
    const user = userEvent.setup();

    render(
      <RegistrationEditModal
        isOpen
        isLoading={false}
        isSubmitting={false}
        registration={buildRegistration()}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Topcoat + Basecoat' }));
    expect(screen.getByLabelText('Select basecoat product')).toBeDisabled();
  });

  it('submits successfully when only non paint-pair fields are edited', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <RegistrationEditModal
        isOpen
        isLoading={false}
        isSubmitting={false}
        registration={buildRegistration()}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />
    );

    const customerNameInput = screen.getByLabelText(/Customer Name/i);
    await user.clear(customerNameInput);
    await user.type(customerNameInput, 'Valentine Updated');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Select paint type first.')).not.toBeInTheDocument();
  });

  it('allows deselecting paint type to save other fields without paint-pair validation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <RegistrationEditModal
        isOpen
        isLoading={false}
        isSubmitting={false}
        registration={buildRegistration()}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Specialized Coat' }));
    expect(screen.getByText('Specialist Product')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Specialized Coat' }));
    expect(screen.queryByText('Specialist Product')).not.toBeInTheDocument();

    const customerNameInput = screen.getByLabelText(/Customer Name/i);
    await user.clear(customerNameInput);
    await user.type(customerNameInput, 'Valentine Final');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows paint-pair validation when paint type is selected but product details are missing', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <RegistrationEditModal
        isOpen
        isLoading={false}
        isSubmitting={false}
        registration={buildRegistration()}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Specialized Coat' }));
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Specialist product is required.')).toBeInTheDocument();
    expect(screen.getByText('Specialist quantity is required.')).toBeInTheDocument();
  });

  it('shows update warning and add-pair action together in the edit section', () => {
    render(
      <RegistrationEditModal
        isOpen
        isLoading={false}
        isSubmitting={false}
        registration={buildRegistration()}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />
    );

    expect(screen.getByText('Update Paint Pairs')).toBeInTheDocument();
    expect(screen.getByText('Saving this will overwrite the existing product card.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Pair' })).toBeInTheDocument();
  });
});
