import type { JSX } from 'react';
import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { FormProvider, useForm } from 'react-hook-form';
import { Outlet, useNavigate } from 'react-router-dom';

import { Button } from '#/components/ui';
import { MANUAL_REGISTRATION_DEFAULT_VALUES, ROUTES } from '#/constants';
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
  const navigate = useNavigate();
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

  const handleBackToRegistrations = (): void => {
    setCompletedSteps([]);
    setSubmissionResult(null);
    setSubmissionState({ status: 'idle', errorMessage: null });
    form.reset(MANUAL_REGISTRATION_DEFAULT_VALUES);
    inMemoryCompletedSteps = [];
    inMemorySubmissionResult = null;
    inMemorySubmissionState = { status: 'idle', errorMessage: null };
    navigate(ROUTES.REGISTRATIONS);
  };

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
            <div className='relative flex items-start gap-3'>
              <Button
                type='button'
                variant='outline'
                className='h-10 w-10 rounded-xl border-[#0b1f3a] bg-[#0b1f3a] p-0 text-white shadow-[0_12px_24px_rgba(8,24,46,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#08182e] hover:text-white hover:shadow-[0_16px_30px_rgba(8,24,46,0.45)]'
                onClick={handleBackToRegistrations}
                aria-label='Back to registrations'
              >
                <ArrowLeft className='h-4 w-4' />
              </Button>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[2px] text-blue-100'>Registration Operations</p>
                <h2 className='mt-1 text-2xl font-extrabold tracking-tight text-white'>Manual Registration Wizard</h2>
                <p className='text-sm text-blue-50/90'>Registrations</p>
              </div>
            </div>
          </header>
          <Outlet />
        </div>
      </FormProvider>
    </ManualRegistrationContext.Provider>
  );
};
