import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MANUAL_REGISTRATION_STEP_FIELDS, ROUTES } from '#/constants';
import { useManualRegistration, useManualRegistrationContext } from '#/hooks/manualRegistration';
import type { ManualRegistrationFormValues } from '#/types/manualRegistration';
import { ManualStepPage } from '../ManualStepPage';

const mockNavigate = vi.fn();
const mockGoToPreviousStep = vi.fn();
const mockGoToNextStep = vi.fn();
const mockSubmitRegistration = vi.fn();

let currentErrors: Record<string, unknown> = {};
let shouldUseInvalidSubmit = false;

const FORM_VALUES = { additionalPaintPairs: [] } as unknown as ManualRegistrationFormValues;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('#/components/manualRegistration', () => ({
  Stepper: () => <div>Mock Stepper</div>,
  PersonalInfoStep: () => <div>Personal Step</div>,
  PurchaseDealerStep: () => <div>Purchase Dealer Step</div>,
  ProductsStep: () => <div>Products Step</div>,
  InvoicesStep: () => <div>Invoices Step</div>,
  ReviewStep: () => <div>Review Step</div>,
}));

vi.mock('react-hook-form', () => ({
  useFormContext: () => ({
    handleSubmit: (onValid: (values: ManualRegistrationFormValues) => void, onInvalid: () => void) => {
      return (event?: { preventDefault?: () => void }): void => {
        event?.preventDefault?.();

        if (shouldUseInvalidSubmit) {
          onInvalid();
          return;
        }

        onValid(FORM_VALUES);
      };
    },
    formState: {
      errors: currentErrors,
    },
  }),
}));

vi.mock('#/hooks/manualRegistration', () => ({
  useManualRegistration: vi.fn(),
  useManualRegistrationContext: vi.fn(),
}));

const mockedUseManualRegistration = vi.mocked(useManualRegistration);
const mockedUseManualRegistrationContext = vi.mocked(useManualRegistrationContext);

describe('ManualStepPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGoToPreviousStep.mockReset();
    mockGoToNextStep.mockReset();
    mockSubmitRegistration.mockReset();

    shouldUseInvalidSubmit = false;
    currentErrors = {};

    mockedUseManualRegistration.mockReturnValue({
      currentStep: 3,
      isFirstStep: false,
      isLastStep: false,
      isSubmitting: false,
      steps: [
        { id: 1, label: 'Personal' },
        { id: 2, label: 'Purchase' },
        { id: 3, label: 'Products' },
        { id: 4, label: 'Invoices' },
        { id: 5, label: 'Review' },
      ] as unknown as ReturnType<typeof useManualRegistration>['steps'],
      goToPreviousStep: mockGoToPreviousStep,
      goToNextStep: mockGoToNextStep,
      submitRegistration: mockSubmitRegistration,
    });

    mockedUseManualRegistrationContext.mockReturnValue({
      completedSteps: [1, 2],
    } as unknown as ReturnType<typeof useManualRegistrationContext>);
  });

  it('renders current step and triggers next-step navigation callback', () => {
    render(<ManualStepPage />);

    expect(screen.getByText('Products Step')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(mockGoToNextStep).toHaveBeenCalledTimes(1);
  });

  it('submits final step values when submit button is clicked', () => {
    mockedUseManualRegistration.mockReturnValue({
      currentStep: 5,
      isFirstStep: false,
      isLastStep: true,
      isSubmitting: false,
      steps: [] as unknown as ReturnType<typeof useManualRegistration>['steps'],
      goToPreviousStep: mockGoToPreviousStep,
      goToNextStep: mockGoToNextStep,
      submitRegistration: mockSubmitRegistration,
    });

    render(<ManualStepPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Registration' }));

    expect(mockSubmitRegistration).toHaveBeenCalledWith(FORM_VALUES);
  });

  it('redirects to first invalid step when form submit is invalid', () => {
    const stepTwoField = MANUAL_REGISTRATION_STEP_FIELDS[2][0];
    shouldUseInvalidSubmit = true;
    currentErrors = {
      [stepTwoField]: {
        type: 'required',
      },
    };

    mockedUseManualRegistration.mockReturnValue({
      currentStep: 5,
      isFirstStep: false,
      isLastStep: true,
      isSubmitting: false,
      steps: [] as unknown as ReturnType<typeof useManualRegistration>['steps'],
      goToPreviousStep: mockGoToPreviousStep,
      goToNextStep: mockGoToNextStep,
      submitRegistration: mockSubmitRegistration,
    });

    render(<ManualStepPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Registration' }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.MANUAL_REGISTRATION_STEP(2));
    expect(mockSubmitRegistration).not.toHaveBeenCalled();
  });
});
