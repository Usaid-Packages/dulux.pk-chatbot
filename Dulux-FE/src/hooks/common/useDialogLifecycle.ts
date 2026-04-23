import { useCallback } from 'react';

interface UseDialogLifecycleParams {
  onClose: () => void;
  onReset?: () => void;
}

interface UseDialogLifecycleResult {
  handleDialogClose: () => void;
  handleDialogOpenChange: (open: boolean) => void;
}

/**
 * useDialogLifecycle centralizes repeated dialog close semantics (optional reset + close callback).
 *
 * @param params - Close callback and optional reset behavior.
 * @returns Stable handlers for close actions and Dialog `onOpenChange`.
 */
export const useDialogLifecycle = ({ onClose, onReset }: UseDialogLifecycleParams): UseDialogLifecycleResult => {
  const handleDialogClose = useCallback((): void => {
    onReset?.();
    onClose();
  }, [onClose, onReset]);

  const handleDialogOpenChange = useCallback(
    (open: boolean): void => {
      if (!open) {
        handleDialogClose();
      }
    },
    [handleDialogClose]
  );

  return {
    handleDialogClose,
    handleDialogOpenChange,
  };
};
