import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MANUAL_REGISTRATION_DEFAULT_VALUES, ROUTES } from '#/constants';
import { useManualRegistrationContext } from '#/hooks/manualRegistration';
import { ManualRegistrationSuccessPage } from '../ManualRegistrationSuccessPage';

const mockNavigate = vi.fn();
const mockSetSubmissionResult = vi.fn();
const mockSetCompletedSteps = vi.fn();
const mockSetSubmissionState = vi.fn();
const mockReset = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('#/components/manualRegistration', () => ({
  SuccessScreen: ({
    registrationCode,
    onViewRegistration,
    onCreateAnother,
    onBackToList,
  }: {
    registrationCode: string;
    onViewRegistration: () => void;
    onCreateAnother: () => void;
    onBackToList: () => void;
  }) => (
    <div>
      <p>Success Screen {registrationCode}</p>
      <button type='button' onClick={onViewRegistration}>
        View Registration
      </button>
      <button type='button' onClick={onCreateAnother}>
        Create Another
      </button>
      <button type='button' onClick={onBackToList}>
        Back to List
      </button>
    </div>
  ),
}));

vi.mock('#/hooks/manualRegistration', () => ({
  useManualRegistrationContext: vi.fn(),
}));

const mockedUseManualRegistrationContext = vi.mocked(useManualRegistrationContext);

describe('ManualRegistrationSuccessPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSetSubmissionResult.mockReset();
    mockSetCompletedSteps.mockReset();
    mockSetSubmissionState.mockReset();
    mockReset.mockReset();

    mockedUseManualRegistrationContext.mockReturnValue({
      submissionResult: {
        id: 77,
        registrationCode: 'REG-77',
      },
      setSubmissionResult: mockSetSubmissionResult,
      setCompletedSteps: mockSetCompletedSteps,
      submissionState: {
        status: 'success',
        errorMessage: null,
      },
      setSubmissionState: mockSetSubmissionState,
      form: {
        reset: mockReset,
      },
    } as unknown as ReturnType<typeof useManualRegistrationContext>);
  });

  it('renders success screen and navigates to registration detail', () => {
    render(<ManualRegistrationSuccessPage />);

    expect(screen.getByText('Success Screen REG-77')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View Registration' }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.REGISTRATION_DETAIL('77'));
  });

  it('renders error state and supports retry flow', () => {
    mockedUseManualRegistrationContext.mockReturnValue({
      submissionResult: null,
      setSubmissionResult: mockSetSubmissionResult,
      setCompletedSteps: mockSetCompletedSteps,
      submissionState: {
        status: 'error',
        errorMessage: 'Validation failed',
      },
      setSubmissionState: mockSetSubmissionState,
      form: {
        reset: mockReset,
      },
    } as unknown as ReturnType<typeof useManualRegistrationContext>);

    render(<ManualRegistrationSuccessPage />);

    expect(screen.getByText('Registration Submission Failed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry Registration' }));

    expect(mockSetSubmissionResult).toHaveBeenCalledWith(null);
    expect(mockSetCompletedSteps).toHaveBeenCalledWith([]);
    expect(mockSetSubmissionState).toHaveBeenCalledWith({ status: 'idle', errorMessage: null });
    expect(mockReset).toHaveBeenCalledWith(MANUAL_REGISTRATION_DEFAULT_VALUES);
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.MANUAL_REGISTRATION_STEP_1);
  });

  it('renders fallback state when there is no recent submission', () => {
    mockedUseManualRegistrationContext.mockReturnValue({
      submissionResult: null,
      setSubmissionResult: mockSetSubmissionResult,
      setCompletedSteps: mockSetCompletedSteps,
      submissionState: {
        status: 'idle',
        errorMessage: null,
      },
      setSubmissionState: mockSetSubmissionState,
      form: {
        reset: mockReset,
      },
    } as unknown as ReturnType<typeof useManualRegistrationContext>);

    render(<ManualRegistrationSuccessPage />);

    expect(screen.getByText('No Recent Submission Found')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Registrations' }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.REGISTRATIONS);
  });
});
