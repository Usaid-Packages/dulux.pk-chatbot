import type { JSX } from 'react';
import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { Outlet } from 'react-router-dom';

import { MANUAL_REGISTRATION_DEFAULT_VALUES } from '#/constants';
import { useAuthContext } from '#/context';
import { ManualRegistrationContext } from '#/hooks/manualRegistration';
import { manualRegistrationSchema } from '#/schemas/registrations';
import type {
  ManualRegistrationFormValues,
  ManualRegistrationSubmissionResult,
  ManualRegistrationSubmissionState,
} from '#/types/manualRegistration';

let inMemoryCompletedSteps: number[] = [];
let inMemorySubmissionResult: ManualRegistrationSubmissionResult | null = null;
let inMemorySubmissionState: ManualRegistrationSubmissionState = { status: 'idle', errorMessage: null };

/**
 * ManualRegistrationLayout provides shared wizard state and layout for manual-registration routes.
 *
 * @returns Manual registration route layout.
 */
export const ManualRegistrationLayout = (): JSX.Element => {
  const { token } = useAuthContext();
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => inMemoryCompletedSteps);
  const [submissionResult, setSubmissionResult] = useState<ManualRegistrationSubmissionResult | null>(
    () => inMemorySubmissionResult
  );
  const [submissionState, setSubmissionState] = useState<ManualRegistrationSubmissionState>(
    () => inMemorySubmissionState
  );

  const form = useForm<ManualRegistrationFormValues>({
    resolver: zodResolver(manualRegistrationSchema),
    mode: 'onTouched',
    defaultValues: MANUAL_REGISTRATION_DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!token) {
      setCompletedSteps([]);
      setSubmissionResult(null);
      setSubmissionState({ status: 'idle', errorMessage: null });
      form.reset(MANUAL_REGISTRATION_DEFAULT_VALUES);
      inMemoryCompletedSteps = [];
      inMemorySubmissionResult = null;
      inMemorySubmissionState = { status: 'idle', errorMessage: null };
    }
  }, [form, token]);

  useEffect(() => {
    inMemoryCompletedSteps = completedSteps;
  }, [completedSteps]);

  useEffect(() => {
    inMemorySubmissionResult = submissionResult;
  }, [submissionResult]);

  useEffect(() => {
    inMemorySubmissionState = submissionState;
  }, [submissionState]);

  useEffect(() => {
    return () => {
      inMemoryCompletedSteps = [];
      inMemorySubmissionResult = null;
      inMemorySubmissionState = { status: 'idle', errorMessage: null };
    };
  }, []);

  return (
    <ManualRegistrationContext.Provider
      value={{
        form,
        completedSteps,
        setCompletedSteps,
        submissionResult,
        setSubmissionResult,
        submissionState,
        setSubmissionState,
      }}
    >
      <FormProvider {...form}>
        <div className='space-y-4 p-6'>
          <Outlet />
        </div>
      </FormProvider>
    </ManualRegistrationContext.Provider>
  );
};
