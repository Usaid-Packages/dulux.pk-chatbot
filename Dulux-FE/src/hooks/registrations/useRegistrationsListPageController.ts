import { useEffect, useState } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ROUTES } from '#/constants';
import { useEditRegistrationMutation, useGetRegistrationByIdQuery } from '#/data-layer/registrations';
import { registrationEditSchema, type RegistrationEditFormValues } from '#/schemas/registrations';
import type {
  RegistrationDetail,
  RegistrationEditPayload,
  RegistrationFilterTab,
  RegistrationResubmitUpdatePaintPair,
} from '#/types/registrations';
import { getApiErrorMessage } from '#/utils';
import { useRegistrations } from './useRegistrations';

interface UseRegistrationsListPageControllerResult {
  activeTab: RegistrationFilterTab;
  searchValue: string;
  currentPage: number;
  totalPages: number;
  registrations: ReturnType<typeof useRegistrations>['registrations'];
  stats: ReturnType<typeof useRegistrations>['stats'];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setSearchValue: (value: string) => void;
  setActiveTab: (tab: RegistrationFilterTab) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  isEditModalOpen: boolean;
  editRegistrationIsLoading: boolean;
  editRegistrationIsSubmitting: boolean;
  editRegistrationData: RegistrationDetail | null;
  handleOpenDetail: (id: string) => void;
  openEditModal: (id: string) => void;
  closeEditModal: () => void;
  handleEditSubmit: (values: RegistrationEditFormValues) => void;
}

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
 * Owns registrations-list route orchestration (navigation, edit modal lifecycle, and edit-submit shaping).
 *
 * @returns Registrations list view model and handlers for page composition.
 */
export const useRegistrationsListPageController = (): UseRegistrationsListPageControllerResult => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isEditModalRequested, setIsEditModalRequested] = useState<boolean>(false);
  const [editingRegistrationId, setEditingRegistrationId] = useState<string>('');

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

  useEffect(() => {
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

  return {
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
    isEditModalOpen,
    editRegistrationIsLoading: editRegistrationQuery.isLoading,
    editRegistrationIsSubmitting: editRegistrationMutation.isPending,
    editRegistrationData: editRegistrationQuery.data ?? null,
    handleOpenDetail,
    openEditModal,
    closeEditModal,
    handleEditSubmit,
  };
};
