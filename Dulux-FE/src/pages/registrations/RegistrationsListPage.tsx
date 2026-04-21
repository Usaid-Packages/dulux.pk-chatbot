import React from 'react';

import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { RegistrationEditModal, RegistrationTable } from '#/components/registrations';
import { Button, Input } from '#/components/ui';
import { REGISTRATION_FILTER_TAB_LABELS, ROUTES } from '#/constants';
import { useEditRegistrationMutation, useGetRegistrationByIdQuery } from '#/data-layer/registrations';
import { useRegistrations } from '#/hooks/registrations';
import { registrationEditSchema, type RegistrationEditFormValues } from '#/schemas/registrations';
import { registrationFilterTabs } from '#/types/registrations';
import type {
  RegistrationDetail,
  RegistrationEditPayload,
  RegistrationResubmitUpdatePaintPair,
} from '#/types/registrations';
import { cn, getApiErrorMessage } from '#/utils';

const normalizeText = (value: string | null | undefined): string => {
  return value?.trim() ?? '';
};

const toNormalizedPaintPairs = (
  paintPairs: RegistrationEditFormValues['paintPairs']
): RegistrationResubmitUpdatePaintPair[] => {
  return paintPairs.map(paintPair => ({
    topcoat: Number.parseInt(paintPair.topcoatId, 10),
    topcoatQuantity: paintPair.topcoatQuantity.trim(),
    ...(paintPair.basecoatId.trim()
      ? {
          basecoat: Number.parseInt(paintPair.basecoatId, 10),
        }
      : {}),
    ...(paintPair.basecoatQuantity.trim()
      ? {
          basecoatQuantity: paintPair.basecoatQuantity.trim(),
        }
      : {}),
  }));
};

const toExistingNormalizedPaintPairs = (registration: RegistrationDetail): RegistrationResubmitUpdatePaintPair[] => {
  return registration.paintPairs.map(paintPair => ({
    topcoat: paintPair.topcoat.id,
    topcoatQuantity: paintPair.topcoatQuantity.trim(),
    ...(paintPair.basecoat?.id
      ? {
          basecoat: paintPair.basecoat.id,
        }
      : {}),
    ...(paintPair.basecoatQuantity?.trim()
      ? {
          basecoatQuantity: paintPair.basecoatQuantity.trim(),
        }
      : {}),
  }));
};

const hasPaintPairChanges = (
  previousPaintPairs: RegistrationResubmitUpdatePaintPair[],
  nextPaintPairs: RegistrationResubmitUpdatePaintPair[]
): boolean => {
  if (previousPaintPairs.length !== nextPaintPairs.length) {
    return true;
  }

  return previousPaintPairs.some((previousPair, index) => {
    const nextPair = nextPaintPairs[index];
    return (
      previousPair.topcoat !== nextPair.topcoat ||
      normalizeText(previousPair.topcoatQuantity) !== normalizeText(nextPair.topcoatQuantity) ||
      (previousPair.basecoat ?? null) !== (nextPair.basecoat ?? null) ||
      normalizeText(previousPair.basecoatQuantity) !== normalizeText(nextPair.basecoatQuantity)
    );
  });
};

const hasInvoiceSelectionChanges = (previousImageIds: number[], nextImageIds: number[]): boolean => {
  if (previousImageIds.length !== nextImageIds.length) {
    return true;
  }

  const sortedPrevious = [...previousImageIds].sort((first, second) => first - second);
  const sortedNext = [...nextImageIds].sort((first, second) => first - second);

  return sortedPrevious.some((previousId, index) => previousId !== sortedNext[index]);
};

/**
 * RegistrationsListPage renders listing, filters, tabs, and pagination.
 *
 * @returns Registrations list route content.
 */
export const RegistrationsListPage = (): React.JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditModalOpen, setIsEditModalOpen] = React.useState<boolean>(false);
  const [isEditModalRequested, setIsEditModalRequested] = React.useState<boolean>(false);
  const [editingRegistrationId, setEditingRegistrationId] = React.useState<string>('');

  const {
    activeTab,
    searchValue,
    currentPage,
    totalPages,
    registrations,
    stats,
    isLoading,
    isError,
    errorMessage,
    hasNextPage,
    hasPreviousPage,
    setSearchValue,
    setActiveTab,
    goToNextPage,
    goToPreviousPage,
  } = useRegistrations();
  const editRegistrationQuery = useGetRegistrationByIdQuery(editingRegistrationId);
  const editRegistrationMutation = useEditRegistrationMutation();

  const handleOpenDetail = (id: string): void => {
    navigate(`${ROUTES.REGISTRATION_DETAIL(id)}${location.search}`);
  };

  const openEditModal = (id: string): void => {
    setIsEditModalRequested(true);
    setIsEditModalOpen(false);
    setEditingRegistrationId(id);
  };

  const closeEditModal = (): void => {
    if (editRegistrationMutation.isPending) {
      return;
    }

    setIsEditModalRequested(false);
    setIsEditModalOpen(false);
  };

  React.useEffect(() => {
    if (!isEditModalRequested || !editingRegistrationId) {
      return;
    }

    if (editRegistrationQuery.isError) {
      toast.error(getApiErrorMessage(editRegistrationQuery.error));
      setIsEditModalRequested(false);
      return;
    }

    if (editRegistrationQuery.isLoading || editRegistrationQuery.isFetching) {
      return;
    }

    if (editRegistrationQuery.data) {
      setIsEditModalOpen(true);
    }
  }, [
    editRegistrationQuery.data,
    editRegistrationQuery.error,
    editRegistrationQuery.isError,
    editRegistrationQuery.isFetching,
    editRegistrationQuery.isLoading,
    editingRegistrationId,
    isEditModalRequested,
  ]);

  const handleEditSubmit = (values: RegistrationEditFormValues): void => {
    if (!editingRegistrationId) {
      toast.error('Registration id is missing.');
      return;
    }

    const registration = editRegistrationQuery.data;
    if (!registration) {
      toast.error('Registration details are still loading. Please try again.');
      return;
    }

    const parsedValues = registrationEditSchema.safeParse(values);
    if (!parsedValues.success) {
      toast.error('Please correct highlighted fields before saving.');
      return;
    }

    const normalizedNextPaintPairs = toNormalizedPaintPairs(parsedValues.data.paintPairs);
    const normalizedPreviousPaintPairs = toExistingNormalizedPaintPairs(registration);
    const hasPaintPairsUpdate = hasPaintPairChanges(normalizedPreviousPaintPairs, normalizedNextPaintPairs);

    const selectedExistingImageIds = parsedValues.data.existingInvoiceImageIds;
    const existingImageIds = registration.paintPairInvoices.map(invoice => invoice.image.id);
    const hasInvoiceSelectionUpdate = hasInvoiceSelectionChanges(existingImageIds, selectedExistingImageIds);
    const hasNewInvoiceUploads = parsedValues.data.invoiceFiles.length > 0;

    const payload: RegistrationEditPayload = {};

    const scalarFieldUpdates: Array<{
      key: keyof RegistrationEditPayload;
      previousValue: string;
      nextValue: string;
    }> = [
      {
        key: 'customerName',
        previousValue: registration.customerName,
        nextValue: parsedValues.data.customerName,
      },
      {
        key: 'phoneNumber',
        previousValue: registration.phoneNumber,
        nextValue: parsedValues.data.phoneNumber,
      },
      {
        key: 'email',
        previousValue: registration.email,
        nextValue: parsedValues.data.email,
      },
      {
        key: 'city',
        previousValue: registration.city,
        nextValue: parsedValues.data.city,
      },
      {
        key: 'siteAddress',
        previousValue: registration.siteAddress,
        nextValue: parsedValues.data.siteAddress,
      },
      {
        key: 'purchaseDate',
        previousValue: registration.purchaseDate,
        nextValue: parsedValues.data.purchaseDate,
      },
      {
        key: 'purchaseDealer',
        previousValue: registration.purchaseDealer,
        nextValue: parsedValues.data.purchaseDealer,
      },
      {
        key: 'purchaseDealerCity',
        previousValue: registration.purchaseDealerCity,
        nextValue: parsedValues.data.purchaseDealerCity,
      },
      {
        key: 'purchaseDealerAddress',
        previousValue: registration.purchaseDealerAddress,
        nextValue: parsedValues.data.purchaseDealerAddress,
      },
    ];

    scalarFieldUpdates.forEach(fieldUpdate => {
      const normalizedPreviousValue = normalizeText(fieldUpdate.previousValue);
      const normalizedNextValue = normalizeText(fieldUpdate.nextValue);
      if (normalizedPreviousValue !== normalizedNextValue) {
        payload[fieldUpdate.key] = normalizedNextValue;
      }
    });

    if (hasPaintPairsUpdate) {
      payload.paintPairs = normalizedNextPaintPairs;
    }

    if (hasInvoiceSelectionUpdate || hasNewInvoiceUploads) {
      payload.paintPairInvoices = selectedExistingImageIds.flatMap(existingImageId => {
        const matchedInvoice = registration.paintPairInvoices.find(invoice => invoice.image.id === existingImageId);
        if (!matchedInvoice) {
          return [];
        }

        return [
          {
            imageId: matchedInvoice.image.id,
            invoiceType: matchedInvoice.invoiceType,
          },
        ];
      });
    }

    if (Object.keys(payload).length === 0 && !hasNewInvoiceUploads) {
      toast.info('No changes detected.');
      return;
    }

    editRegistrationMutation.mutate(
      {
        id: editingRegistrationId,
        payload,
        invoiceFiles: parsedValues.data.invoiceFiles,
      },
      {
        onSuccess: () => {
          toast.success('Registration updated successfully.');
          closeEditModal();
        },
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      }
    );
  };

  const handleTabClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    const tabValue = event.currentTarget.dataset.tab;

    if (!tabValue) {
      return;
    }

    if (registrationFilterTabs.includes(tabValue as (typeof registrationFilterTabs)[number])) {
      setActiveTab(tabValue as (typeof registrationFilterTabs)[number]);
    }
  };

  return (
    <section className='wf-list-shell'>
      <div className='wf-stat-grid-3'>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Total Registrations</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{stats.total}</p>
        </article>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Pending Review</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{stats.pending}</p>
        </article>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Approved</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{stats.approved}</p>
        </article>
      </div>

      <section className='wf-tabs-panel border-primary/15 bg-white shadow-[0_10px_24px_rgba(19,87,167,0.08)]'>
        <div className='flex items-center gap-3 overflow-x-auto'>
          <div className='flex min-w-0 flex-1 items-center gap-2 overflow-x-auto'>
            {registrationFilterTabs.map(tab => (
              <button
                key={tab}
                type='button'
                data-tab={tab}
                onClick={handleTabClick}
                className={cn('wf-filter-tab shrink-0', tab === activeTab ? 'wf-filter-tab-active' : '')}
              >
                {REGISTRATION_FILTER_TAB_LABELS[tab]}
              </button>
            ))}
          </div>
          <Input
            type='search'
            value={searchValue}
            onChange={event => setSearchValue(event.target.value)}
            placeholder='Search by registration code, customer, or phone'
            className='h-10 w-[240px] min-w-[240px] rounded-xl border-primary/25 bg-white'
            aria-label='Search registrations'
          />
        </div>
      </section>

      {isError ? (
        <section className='rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'>
          {errorMessage}
        </section>
      ) : (
        <RegistrationTable
          registrations={registrations}
          isLoading={isLoading}
          onOpenDetail={handleOpenDetail}
          onOpenEdit={openEditModal}
        />
      )}

      <section className='wf-pagination-panel'>
        <p className='text-sm text-text-muted'>
          Page {currentPage} of {totalPages}
        </p>
        <div className='flex w-full gap-2 sm:w-auto'>
          <Button type='button' variant='outline' disabled={!hasPreviousPage || isLoading} onClick={goToPreviousPage}>
            Previous
          </Button>
          <Button type='button' variant='outline' disabled={!hasNextPage || isLoading} onClick={goToNextPage}>
            Next
          </Button>
        </div>
      </section>

      <RegistrationEditModal
        isOpen={isEditModalOpen}
        isLoading={editRegistrationQuery.isLoading}
        isSubmitting={editRegistrationMutation.isPending}
        registration={editRegistrationQuery.data ?? null}
        onClose={closeEditModal}
        onSubmit={handleEditSubmit}
      />
    </section>
  );
};
