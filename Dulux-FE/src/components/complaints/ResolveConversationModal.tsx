import { useMemo, useState } from 'react';
import type { JSX } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '#/components/ui';
import { NOTES_MAX_LENGTH, NOTES_MAX_LENGTH_HELPER_TEXT } from '#/constants';

interface ResolveConversationModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (closureNote: string) => void;
}

/**
 * ResolveConversationModal confirms marking a complaint as resolved.
 *
 * @param props - Modal visibility and action handlers.
 * @returns Resolve confirmation dialog.
 */
export const ResolveConversationModal = ({
  isOpen,
  isSubmitting,
  onClose,
  onConfirm,
}: ResolveConversationModalProps): JSX.Element => {
  const [closureNote, setClosureNote] = useState('');
  const trimmedClosureNote = useMemo(() => closureNote.trim(), [closureNote]);

  const handleClose = (): void => {
    setClosureNote('');
    onClose();
  };

  const handleConfirm = (): void => {
    onConfirm(trimmedClosureNote);
    setClosureNote('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => (!open ? handleClose() : undefined)}>
      <DialogContent className='border-primary/20 bg-white'>
        <DialogHeader>
          <DialogTitle>Mark Complaint as Resolved</DialogTitle>
          <DialogDescription>
            This will resolve and close the complaint. You can add a closure note if needed.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-2'>
          <label htmlFor='closure-note' className='text-sm font-medium text-text-primary'>
            Closure Note (Optional)
          </label>
          <Textarea
            id='closure-note'
            rows={4}
            className='rounded-xl border-primary/20 bg-white'
            maxLength={NOTES_MAX_LENGTH}
            value={closureNote}
            onChange={event => setClosureNote(event.target.value)}
            placeholder='Issue resolved and confirmed by customer.'
          />
          <p className='text-xs text-text-muted'>{NOTES_MAX_LENGTH_HELPER_TEXT}</p>
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type='button'
            variant='primaryGradient'
            className='rounded-xl'
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Resolve & Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
