import type { JSX, MouseEvent } from 'react';
import { useState } from 'react';

import { CONVERSATION_STATUS_LABELS } from '#/components/complaints/constants';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui';
import type { ConversationThread } from '#/types/complaints';
import { formatPkDateTimeOptional } from '#/utils';

interface ConversationInfoPanelProps {
  thread?: ConversationThread;
  onResolve: () => void;
}

const SUBJECT_PREVIEW_LENGTH = 120;
const DESCRIPTION_PREVIEW_LENGTH = 220;

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const ExpandableFieldValue = ({ value, previewLength }: { value: string; previewLength: number }): JSX.Element => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const normalizedValue = value.trim().length > 0 ? value : '--';

  if (normalizedValue.length <= previewLength) {
    return (
      <span className='min-w-0 break-words font-medium leading-5 text-text-primary [overflow-wrap:anywhere]'>
        {normalizedValue}
      </span>
    );
  }

  const previewValue = `${normalizedValue.slice(0, previewLength)}...`;
  const displayedValue = isExpanded ? normalizedValue : previewValue;
  const toggleLabel = isExpanded ? 'Show less' : 'Show more';

  const handleToggle = (): void => {
    setIsExpanded(previous => !previous);
  };

  return (
    <span className='min-w-0 break-words font-medium leading-5 text-text-primary [overflow-wrap:anywhere]'>
      {displayedValue}{' '}
      <button type='button' className='text-xs font-semibold text-primary' onClick={handleToggle}>
        {toggleLabel}
      </button>
    </span>
  );
};

/**
 * ConversationInfoPanel renders scoped customer and complaint summary with supported actions only.
 *
 * @param props - Thread data and resolve action handler.
 * @returns Right-side info panel.
 */
export const ConversationInfoPanel = ({ thread, onResolve }: ConversationInfoPanelProps): JSX.Element => {
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  const activeImage = thread?.complaintImages.find(image => image.id === activeImageId) ?? null;
  const isImageDialogOpen = Boolean(activeImageId) && Boolean(activeImage);

  const handleImagePreviewClick = (event: MouseEvent<HTMLButtonElement>): void => {
    const imageId = event.currentTarget.dataset.imageId;

    if (imageId) {
      setActiveImageId(imageId);
    }
  };

  const handleImageDialogOpenChange = (open: boolean): void => {
    if (!open) {
      setActiveImageId(null);
    }
  };

  if (!thread) {
    return (
      <aside className='flex min-h-40 flex-col rounded-2xl border border-primary/15 bg-white/95 p-4 text-sm text-text-muted shadow-[0_12px_28px_rgba(19,87,167,0.08)]'>
        Customer details appear here after selecting a conversation.
      </aside>
    );
  }

  return (
    <>
      <aside className='flex min-h-0 min-w-0 max-h-[calc(100vh-16rem)] flex-col gap-4 overflow-hidden rounded-2xl border border-primary/15 bg-white/95 p-4 shadow-[0_12px_28px_rgba(19,87,167,0.08)] sm:min-h-[26rem]'>
        <section className='text-center'>
          <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white'>
            {getInitials(thread.customerName)}
          </div>
          <h3 className='mt-2 text-base font-semibold text-text-primary'>{thread.customerName}</h3>
        </section>

        <section className='min-h-0 min-w-0 space-y-2 overflow-hidden rounded-xl border border-primary/15 bg-primary/5 p-3'>
          <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>Complaint Details</p>
          <div className='grid min-h-0 max-h-[clamp(12rem,40vh,12rem)] grid-cols-[5.5rem_minmax(0,1fr)] gap-2 overflow-y-auto overscroll-y-contain pb-2 pr-1 text-xs touch-pan-y'>
            <span className='text-text-muted'>Ticket</span>
            <span className='min-w-0 break-words font-medium text-text-primary [overflow-wrap:anywhere]'>
              {thread.ticketId}
            </span>
            <span className='text-text-muted'>Submitted</span>
            <span className='min-w-0 break-words font-medium text-text-primary [overflow-wrap:anywhere]'>
              {formatPkDateTimeOptional(thread.submittedAt)}
            </span>
            <span className='text-text-muted'>Subject</span>
            <ExpandableFieldValue value={thread.issueType} previewLength={SUBJECT_PREVIEW_LENGTH} />
            <span className='text-text-muted'>Description</span>
            <ExpandableFieldValue value={thread.description || '--'} previewLength={DESCRIPTION_PREVIEW_LENGTH} />
            <span className='text-text-muted'>Registration</span>
            <span className='min-w-0 break-words font-medium text-text-primary [overflow-wrap:anywhere]'>
              {thread.registrationId || '--'}
            </span>
            <span className='text-text-muted'>Status</span>
            <span className='min-w-0 break-words font-medium text-text-primary [overflow-wrap:anywhere]'>
              {CONVERSATION_STATUS_LABELS[thread.apiStatus]}
            </span>
            <span className='text-text-muted'>Closure Note</span>
            <ExpandableFieldValue value={thread.closureNote || '--'} previewLength={DESCRIPTION_PREVIEW_LENGTH} />
            <span className='text-text-muted'>Closed At</span>
            <span className='min-w-0 break-words font-medium text-text-primary [overflow-wrap:anywhere]'>
              {formatPkDateTimeOptional(thread.closedAt ?? undefined)}
            </span>
          </div>
        </section>

        <section className='min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-primary/15 bg-white/85 p-3'>
          <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>Complaint Images</p>
          {thread.complaintImages.length === 0 ? (
            <p className='text-xs text-text-muted'>No images</p>
          ) : (
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3'>
              {thread.complaintImages.map(image => (
                <button
                  key={image.id}
                  type='button'
                  className='group relative w-full overflow-hidden rounded-xl border border-primary/20 bg-surface-muted p-1 shadow-[0_4px_14px_rgba(19,87,167,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(19,87,167,0.14)] hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  data-image-id={image.id}
                  onClick={handleImagePreviewClick}
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className='h-28 w-full rounded-lg bg-white object-contain p-1 transition duration-200 group-hover:scale-[1.02] sm:h-32'
                    loading='lazy'
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className='space-y-2'>
          <Button
            type='button'
            className='h-10 w-full rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white shadow-[0_12px_24px_rgba(24,102,198,0.25)] hover:brightness-105'
            onClick={onResolve}
            disabled={thread.apiStatus === 'RESOLVED' || thread.apiStatus === 'CLOSED'}
          >
            Mark as Resolved
          </Button>
        </section>
      </aside>

      <Dialog open={isImageDialogOpen} onOpenChange={handleImageDialogOpenChange}>
        <DialogContent className='max-w-4xl'>
          <DialogHeader>
            <DialogTitle>{activeImage?.name ?? 'Complaint Image'}</DialogTitle>
            <DialogDescription>Click outside or press escape to close full-size image preview.</DialogDescription>
          </DialogHeader>
          {activeImage ? (
            <div className='h-[72vh] w-full rounded-md bg-surface-muted p-2'>
              <img src={activeImage.url} alt={activeImage.name} className='h-full w-full rounded-md object-contain' />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
