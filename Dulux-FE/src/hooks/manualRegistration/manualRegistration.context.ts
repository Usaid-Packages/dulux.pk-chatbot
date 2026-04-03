import { createContext, useContext } from 'react';

import type { UseFormReturn } from 'react-hook-form';

import {
  type ManualRegistrationFormValues,
  type ManualRegistrationSubmissionResult,
  type ManualRegistrationSubmissionState,
} from '#/types/manualRegistration';

export interface ManualRegistrationContextValue {
  form: UseFormReturn<ManualRegistrationFormValues>;
  completedSteps: number[];
  setCompletedSteps: (steps: number[]) => void;
  submissionResult: ManualRegistrationSubmissionResult | null;
  setSubmissionResult: (result: ManualRegistrationSubmissionResult | null) => void;
  submissionState: ManualRegistrationSubmissionState;
  setSubmissionState: (state: ManualRegistrationSubmissionState) => void;
}

export const ManualRegistrationContext = createContext<ManualRegistrationContextValue | null>(null);

/**
 * Returns manual-registration shared wizard context.
 *
 * @returns Manual registration context value.
 */
export const useManualRegistrationContext = (): ManualRegistrationContextValue => {
  const context = useContext(ManualRegistrationContext);

  if (!context) {
    throw new Error('useManualRegistrationContext must be used within ManualRegistrationLayout.');
  }

  return context;
};
