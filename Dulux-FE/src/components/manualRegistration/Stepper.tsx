import type { JSX } from 'react';

import { cn } from '#/utils';

interface StepperStep {
  id: number;
  label: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  completedSteps: number[];
}

/**
 * Stepper renders manual-registration progress across all wizard steps.
 *
 * @param props - Stepper render state.
 * @returns Manual registration stepper component.
 */
export const Stepper = ({ steps, currentStep, completedSteps }: StepperProps): JSX.Element => {
  const isDoneStep = (stepId: number): boolean => completedSteps.includes(stepId) || stepId < currentStep;

  return (
    <div className='overflow-x-auto rounded-lg border border-border bg-surface px-4 py-3'>
      <ol className='flex min-w-max items-center'>
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isDone = isDoneStep(step.id);
          const isLastItem = index === steps.length - 1;

          return (
            <li key={step.id} className='flex items-center'>
              <div className='flex items-center gap-2'>
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold',
                    isActive && 'border-stepper-activeBorder bg-stepper-activeBg text-stepper-activeText',
                    isDone && !isActive && 'border-stepper-doneBorder bg-stepper-doneBg text-stepper-doneText',
                    !isDone && !isActive && 'border-border bg-surface text-text-muted'
                  )}
                >
                  {isDone ? '✓' : step.id}
                </span>
                <span className={cn('text-sm', isDone ? 'text-stepper-doneLabel' : 'text-text-muted')}>
                  {step.label}
                </span>
              </div>
              {!isLastItem ? (
                <span
                  className={cn(
                    'mx-3 h-0.5 w-10 rounded bg-stepper-inactiveLine',
                    isDone ? 'bg-stepper-doneLine' : undefined
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
