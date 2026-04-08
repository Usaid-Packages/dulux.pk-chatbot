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
          <header className='relative overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(120deg,#0d4ea8_0%,#2a7ddb_45%,#7fc5ff_100%)] p-5 text-white md:p-6'>
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(255,255,255,0.32),transparent_42%)]'
            />
            <div className='relative'>
              <p className='text-xs font-semibold uppercase tracking-[2px] text-blue-100'>Registration Operations</p>
              <h2 className='mt-1 text-2xl font-extrabold tracking-tight text-white'>Manual Registration Wizard</h2>
              <p className='text-sm text-blue-50/90'>Registrations / Manual Entry</p>
            </div>
          </header>
          <Outlet />
        </div>
      </FormProvider>
    </ManualRegistrationContext.Provider>
  );
};
