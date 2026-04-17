import type { JSX } from 'react';

import type { AuditTimelineChangeViewModel, TimelineImagePreviewItem } from '#/types/auditLogs';

interface AuditTimelineChangeRendererProps {
  change: AuditTimelineChangeViewModel;
}

const renderImagePreviewRow = (heading: string, previewItems: TimelineImagePreviewItem[], key: string): JSX.Element => {
  if (previewItems.length === 0) {
    return (
      <div key={key} className='space-y-1'>
        <p className='text-[11px] font-semibold text-text-muted'>{heading}</p>
        <p className='text-xs text-text-muted'>No images</p>
      </div>
    );
  }

  return (
    <div key={key} className='space-y-1'>
      <p className='text-[11px] font-semibold text-text-muted'>{heading}</p>
      <div className='flex flex-wrap gap-2'>
        {previewItems.map(item => (
          <a
            key={`${key}-${item.id}-${item.url}`}
            href={item.url}
            target='_blank'
            rel='noreferrer'
            className='inline-flex'
            title={`Image ${item.id}`}
          >
            <img
              src={item.url}
              alt={`Image ${item.id}`}
              className='h-14 w-14 rounded-lg border border-primary/15 bg-surface-subtle object-cover'
              loading='lazy'
            />
          </a>
        ))}
      </div>
    </div>
  );
};

/**
 * AuditTimelineChangeRenderer renders one precomputed field-change row inside a timeline event card.
 *
 * @param props - Precomputed change view model.
 * @returns Change row UI.
 */
export const AuditTimelineChangeRenderer = ({ change }: AuditTimelineChangeRendererProps): JSX.Element => {
  if (change.kind === 'image') {
    return (
      <div key={change.key} className='space-y-2'>
        <p className='text-xs text-text-primary'>
          <span className='font-semibold text-text-muted'>{change.fieldLabel}:</span>{' '}
          <span>{change.beforeSummary}</span>
          <span className='mx-1 text-primary'>{'\u2192'}</span>
          <span>{change.afterSummary}</span>
        </p>
        <div className='grid gap-3 sm:grid-cols-2'>
          {renderImagePreviewRow('Before', change.beforePreviewItems, `${change.key}-before`)}
          {renderImagePreviewRow('After', change.afterPreviewItems, `${change.key}-after`)}
        </div>
      </div>
    );
  }

  if (change.kind === 'rejectionFields') {
    return (
      <p key={change.key} className='text-xs text-text-primary'>
        <span className='font-semibold text-text-muted'>{change.fieldLabel}:</span>{' '}
        <span title={change.beforeSummary}>{change.compactBefore}</span>
        <span className='mx-1 text-primary'>{'\u2192'}</span>
        <span title={change.afterSummary}>{change.compactAfter}</span>
      </p>
    );
  }

  if (change.kind === 'idList') {
    return (
      <div key={change.key} className='space-y-1.5'>
        <p className='text-xs text-text-primary'>
          <span className='font-semibold text-text-muted'>{change.fieldLabel}:</span>{' '}
          <span>{change.beforeSummary}</span>
          <span className='mx-1 text-primary'>{'\u2192'}</span>
          <span>{change.afterSummary}</span>
        </p>
      </div>
    );
  }

  if (change.kind === 'resubmission') {
    return (
      <div key={change.key} className='space-y-2'>
        <p className='text-xs text-text-primary'>
          <span className='font-semibold text-text-muted'>{change.fieldLabel}:</span>{' '}
          <span className='font-medium'>
            {change.beforeSubmissionCount} submission{change.beforeSubmissionCount === 1 ? '' : 's'}
          </span>
          <span className='mx-1 text-primary'>{'\u2192'}</span>
          <span className='font-medium'>
            {change.afterSubmissionCount} submission{change.afterSubmissionCount === 1 ? '' : 's'}
          </span>
        </p>

        {change.latestAfterSummary ? (
          <div className='rounded-lg border border-primary/20 bg-primary/5 p-2 text-xs text-text-primary'>
            <p className='text-text-muted'>
              Source: {change.latestAfterSummary.source ?? 'Unknown'} | Requested items:{' '}
              {change.latestAfterSummary.totalEntries} | Answered: {change.latestAfterSummary.answeredEntries}
            </p>
            {change.latestAfterSummary.entries.length > 0 ? (
              <div className='mt-2 space-y-2'>
                {change.latestAfterSummary.entries.map(entry => (
                  <div
                    key={`${change.key}-${entry.requiredItemLabel}-${entry.hasResponseText}-${entry.hasImage}-${entry.responsePreview ?? ''}`}
                    className='rounded-md border border-primary/15 bg-white p-2'
                  >
                    <p className='text-[11px] font-semibold text-text-primary'>{entry.requiredItemLabel}</p>
                    <p className='mt-1 text-[11px] text-text-muted'>
                      Text: {entry.hasResponseText ? 'Provided' : 'Not provided'} | Image:{' '}
                      {entry.hasImage ? 'Attached' : 'Not attached'}
                    </p>
                    {entry.responsePreview ? (
                      <p className='mt-1 line-clamp-2 text-[11px] text-text-muted'>{entry.responsePreview}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {change.latestAfterSummary.note ? (
              <p className='mt-2 line-clamp-2 rounded-md border border-border/60 bg-white px-2 py-1 text-[11px] text-text-muted'>
                {change.latestAfterSummary.note}
              </p>
            ) : null}
          </div>
        ) : (
          <p className='text-xs text-text-muted'>No resubmission entries found.</p>
        )}
      </div>
    );
  }

  if (change.kind === 'complex') {
    return (
      <div key={change.key} className='space-y-1.5'>
        <p className='text-xs text-text-primary'>
          <span className='font-semibold text-text-muted'>{change.fieldLabel}:</span>{' '}
          <span className='font-medium'>{change.beforeSummary}</span>
          <span className='mx-1 text-primary'>{'\u2192'}</span>
          <span className='font-medium'>{change.afterSummary}</span>
        </p>
        <p className='text-[11px] text-text-muted'>
          <span title={change.beforeRaw}>{change.beforePreview}</span>
          <span className='mx-1 text-primary'>{'\u2192'}</span>
          <span title={change.afterRaw}>{change.afterPreview}</span>
        </p>
        <details className='rounded-lg border border-border/70 bg-white px-2 py-1.5'>
          <summary className='cursor-pointer text-[11px] font-semibold text-primary'>View full payload</summary>
          <div className='mt-2 space-y-2'>
            <pre className='max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-surface-subtle/40 p-2 text-[11px] text-text-primary'>
              {change.beforeRaw}
            </pre>
            <pre className='max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-surface-subtle/40 p-2 text-[11px] text-text-primary'>
              {change.afterRaw}
            </pre>
          </div>
        </details>
      </div>
    );
  }

  return (
    <p key={change.key} className='text-xs text-text-primary'>
      <span className='font-semibold text-text-muted'>{change.fieldLabel}:</span>{' '}
      <span title={change.fullBefore}>{change.compactBefore}</span>
      <span className='mx-1 text-primary'>{'\u2192'}</span>
      <span title={change.fullAfter}>{change.compactAfter}</span>
    </p>
  );
};
