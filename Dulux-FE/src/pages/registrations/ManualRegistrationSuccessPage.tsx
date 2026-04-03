import type { JSX } from 'react';

import { useNavigate } from 'react-router-dom';

import { SuccessScreen } from '#/components/manualRegistration';
import { Button } from '#/components/ui';
import { MANUAL_REGISTRATION_DEFAULT_VALUES, ROUTES } from '#/constants';
import { useManualRegistrationContext } from '#/hooks/manualRegistration';

/**
 * ManualRegistrationSuccessPage renders post-submit success content.
 *
 * @returns Manual registration success route page.
 */
export const ManualRegistrationSuccessPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { submissionResult, setSubmissionResult, setCompletedSteps, submissionState, setSubmissionState, form } =
    useManualRegistrationContext();

  const handleViewRegistration = (): void => {
    if (!submissionResult) {
      return;
    }

    navigate(ROUTES.REGISTRATION_DETAIL(String(submissionResult.id)));
  };

  const handleCreateAnother = (): void => {
    setSubmissionResult(null);
    setCompletedSteps([]);
    setSubmissionState({ status: 'idle', errorMessage: null });
    form.reset(MANUAL_REGISTRATION_DEFAULT_VALUES);
    navigate(ROUTES.MANUAL_REGISTRATION_STEP_1);
  };

  const handleBackToList = (): void => {
    setSubmissionResult(null);
    setCompletedSteps([]);
    setSubmissionState({ status: 'idle', errorMessage: null });
    form.reset(MANUAL_REGISTRATION_DEFAULT_VALUES);
    navigate(ROUTES.REGISTRATIONS);
  };

  if (submissionState.status === 'error') {
    return (
      <section className='mx-auto max-w-3xl space-y-5 rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center'>
        <div className='space-y-2'>
          <h3 className='text-2xl font-semibold text-destructive'>Registration Submission Failed</h3>
          <p className='text-sm text-destructive/90'>
            {submissionState.errorMessage ?? 'Unable to submit this registration. Please review and try again.'}
          </p>
        </div>
        <div className='flex flex-wrap justify-center gap-3'>
          <Button type='button' onClick={handleCreateAnother}>
            Retry Registration
          </Button>
          <Button type='button' variant='outline' onClick={handleBackToList}>
            Back to Registrations
          </Button>
        </div>
      </section>
    );
  }

  if (!submissionResult) {
    return (
      <section className='mx-auto max-w-3xl space-y-4 rounded-xl border border-border bg-surface p-8 text-center'>
        <h3 className='text-xl font-semibold text-text-primary'>No Recent Submission Found</h3>
        <p className='text-sm text-text-muted'>Start a new manual registration or return to the registrations list.</p>
        <div className='flex flex-wrap justify-center gap-3'>
          <Button type='button' onClick={handleCreateAnother}>
            Create Another
          </Button>
          <Button type='button' variant='outline' onClick={handleBackToList}>
            Back to Registrations
          </Button>
        </div>
      </section>
    );
  }

  return (
    <SuccessScreen
      registrationCode={submissionResult.registrationCode}
      onViewRegistration={handleViewRegistration}
      onCreateAnother={handleCreateAnother}
      onBackToList={handleBackToList}
    />
  );
};
