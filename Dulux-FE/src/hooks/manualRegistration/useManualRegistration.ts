import { useEffect } from 'react';

import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { MANUAL_REGISTRATION_STEP_FIELDS, MANUAL_REGISTRATION_STEPS, ROUTES } from '#/constants';
import { useCreateManualRegistrationMutation } from '#/data-layer/registrations';
import type { ManualRegistrationFormValues, ManualRegistrationStepId } from '#/types/manualRegistration';
import { getApiErrorMessage } from '#/utils';
import { useManualRegistrationContext } from './manualRegistration.context';

interface UseManualRegistrationResult {
  currentStep: ManualRegistrationStepId;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  steps: typeof MANUAL_REGISTRATION_STEPS;
  goToPreviousStep: () => void;
  goToNextStep: () => Promise<void>;
  submitRegistration: (values: ManualRegistrationFormValues) => void;
}

const FALLBACK_STEP: ManualRegistrationStepId = 1;

const parseManualStep = (value: string | undefined): ManualRegistrationStepId => {
  const parsed = Number.parseInt(value ?? '', 10);

  if (parsed >= 1 && parsed <= MANUAL_REGISTRATION_STEPS.length) {
    return parsed as ManualRegistrationStepId;
  }

  return FALLBACK_STEP;
};

const getMissingStepBefore = (currentStep: ManualRegistrationStepId, completedSteps: number[]): number | null => {
  for (let stepId = 1; stepId < currentStep; stepId += 1) {
    if (!completedSteps.includes(stepId)) {
      return stepId;
    }
  }

  return null;
};

/**
 * Provides manual-registration wizard controls and submission flow.
 *
 * @returns Wizard state and actions for step pages.
 */
export const useManualRegistration = (): UseManualRegistrationResult => {
  const navigate = useNavigate();
  const { stepId } = useParams();
  const { form, completedSteps, setCompletedSteps, setSubmissionResult, setSubmissionState } =
    useManualRegistrationContext();

  const createMutation = useCreateManualRegistrationMutation();

  const currentStep = parseManualStep(stepId);
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === MANUAL_REGISTRATION_STEPS.length;

  useEffect(() => {
    const parsed = Number.parseInt(stepId ?? '', 10);

    if (!Number.isFinite(parsed) || parsed < 1 || parsed > MANUAL_REGISTRATION_STEPS.length) {
      navigate(ROUTES.MANUAL_REGISTRATION_STEP(FALLBACK_STEP), { replace: true });
    }
  }, [navigate, stepId]);

  useEffect(() => {
    const missingStep = getMissingStepBefore(currentStep, completedSteps);

    if (missingStep) {
      navigate(ROUTES.MANUAL_REGISTRATION_STEP(missingStep), { replace: true });
    }
  }, [completedSteps, currentStep, navigate]);

  const goToPreviousStep = (): void => {
    if (isFirstStep) {
      return;
    }

    const previousStep = currentStep - 1;
    navigate(ROUTES.MANUAL_REGISTRATION_STEP(previousStep));
  };

  const goToNextStep = async (): Promise<void> => {
    const fields = [...MANUAL_REGISTRATION_STEP_FIELDS[currentStep]];
    const additionalPairs = form.getValues('additionalPaintPairs');

    if (currentStep === 3 && additionalPairs.length > 0) {
      additionalPairs.forEach((_, index) => {
        fields.push(`additionalPaintPairs.${index}.topcoatProductId` as keyof ManualRegistrationFormValues);
        fields.push(`additionalPaintPairs.${index}.topcoatQuantity` as keyof ManualRegistrationFormValues);
        fields.push(`additionalPaintPairs.${index}.basecoatProductId` as keyof ManualRegistrationFormValues);
        fields.push(`additionalPaintPairs.${index}.basecoatQuantity` as keyof ManualRegistrationFormValues);
      });
    }

    const isStepValid = await form.trigger([...fields], { shouldFocus: true });
    if (!isStepValid) {
      return;
    }

    form.clearErrors(fields);

    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }

    const nextStep = (currentStep + 1) as ManualRegistrationStepId;
    navigate(ROUTES.MANUAL_REGISTRATION_STEP(nextStep));
  };

  const submitRegistration = (values: ManualRegistrationFormValues): void => {
    createMutation.mutate(values, {
      onSuccess: () => {
        toast.success('Manual registration submitted successfully.');
        navigate(ROUTES.REGISTRATIONS, { replace: true });
      },
      onError: error => {
        const errorMessage = getApiErrorMessage(error);
        setSubmissionResult(null);
        setSubmissionState({ status: 'error', errorMessage });
        toast.error(errorMessage);
        navigate(ROUTES.MANUAL_REGISTRATION_SUCCESS, {
          state: {
            submissionStatus: 'error',
            submissionResult: null,
            submissionErrorMessage: errorMessage,
          },
        });
      },
    });
  };

  return {
    currentStep,
    isFirstStep,
    isLastStep,
    isSubmitting: createMutation.isPending,
    steps: MANUAL_REGISTRATION_STEPS,
    goToPreviousStep,
    goToNextStep,
    submitRegistration,
  };
};
