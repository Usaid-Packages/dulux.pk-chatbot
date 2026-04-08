import type { JSX } from 'react';

import { ArrowLeft } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import {
  InvoicesStep,
  PersonalInfoStep,
  ProductsStep,
  PurchaseDealerStep,
  ReviewStep,
  Stepper,
} from '#/components/manualRegistration';
import { Button } from '#/components/ui';
import { MANUAL_REGISTRATION_STEP_FIELDS, ROUTES } from '#/constants';
import { useManualRegistration, useManualRegistrationContext } from '#/hooks/manualRegistration';
import type { ManualRegistrationFormValues, ManualRegistrationStepId } from '#/types/manualRegistration';

const STEP_COMPONENTS: Record<ManualRegistrationStepId, () => JSX.Element> = {
  1: PersonalInfoStep,
  2: PurchaseDealerStep,
  3: ProductsStep,
  4: InvoicesStep,
  5: ReviewStep,
};

const VALIDATION_STEP_IDS: ManualRegistrationStepId[] = [1, 2, 3, 4, 5];

/**
 * ManualStepPage renders route-driven wizard steps for manual registration.
 *
 * @returns Manual registration step page.
 */
export const ManualStepPage = (): JSX.Element => {
  const navigate = useNavigate();
  const {
    currentStep,
    isFirstStep,
    isLastStep,
    isSubmitting,
    steps,
    goToPreviousStep,
    goToNextStep,
    submitRegistration,
  } = useManualRegistration();

  const { completedSteps } = useManualRegistrationContext();
  const {
    handleSubmit,
    formState: { errors },
  } = useFormContext<ManualRegistrationFormValues>();

  const CurrentStepComponent = STEP_COMPONENTS[currentStep];

  const handleFormSubmit = (values: ManualRegistrationFormValues): void => {
    submitRegistration(values);
  };

  const handleFormInvalidSubmit = (): void => {
    const errorFields = Object.keys(errors);

    for (const step of VALIDATION_STEP_IDS) {
      if (step === 5) {
        continue;
      }

      const stepFields = MANUAL_REGISTRATION_STEP_FIELDS[step];
      const hasStepError = stepFields.some(fieldName => errorFields.includes(fieldName));

      if (hasStepError) {
        navigate(ROUTES.MANUAL_REGISTRATION_STEP(step));
        return;
      }
    }
  };

  const handleNextClick = (): void => {
    void goToNextStep();
  };

  return (
    <section className='space-y-4'>
      <Button
        type='button'
        variant='outline'
        className='transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md'
        onClick={() => navigate(ROUTES.REGISTRATIONS)}
      >
        <ArrowLeft className='h-4 w-4' />
        Back
      </Button>

      <Stepper steps={steps} currentStep={currentStep} completedSteps={completedSteps} />

      <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit, handleFormInvalidSubmit)}>
        <CurrentStepComponent />

        <div className='flex flex-wrap items-center gap-2 wf-card wf-card-p4'>
          <Button type='button' variant='outline' disabled={isFirstStep || isSubmitting} onClick={goToPreviousStep}>
            Previous
          </Button>

          <div className='flex-1' />

          {isLastStep ? (
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Registration'}
            </Button>
          ) : (
            <Button type='button' disabled={isSubmitting} onClick={handleNextClick}>
              Next
            </Button>
          )}
        </div>
      </form>
    </section>
  );
};
