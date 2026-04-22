import type { JSX } from 'react';

import { ImagePreviewGallery } from '#/components/ui';
import type { QualityLatestResubmission } from '#/types/quality.types';
import { formatDisplayDateTime } from '#/utils/date';

interface QualityResubmissionCardProps {
  latestResubmission?: QualityLatestResubmission;
}

const formatEnumLabel = (value: string): string => {
  return value
    .toLowerCase()
    .split('_')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
};

/**
 * QualityResubmissionCard renders latest customer resubmission context and uploaded evidence.
 *
 * @param props - Latest resubmission payload from quality detail.
 * @returns Resubmission gallery and metadata, or null when unavailable.
 */
export const QualityResubmissionCard = ({ latestResubmission }: QualityResubmissionCardProps): JSX.Element | null => {
  if (!latestResubmission) {
    return null;
  }

  const photos = latestResubmission.entries
    .filter(entry => Boolean(entry.imageUrl))
    .map((entry, index) => ({
      id: entry.id,
      label: `${formatEnumLabel(entry.requiredItem)} (${index + 1})`,
      url: entry.imageUrl ?? '',
    }));

  return (
    <section className='space-y-3 rounded-2xl border border-primary/15 bg-white p-4'>
      <div className='space-y-1'>
        <h2 className='text-md font-semibold text-text-primary'>Latest Resubmission</h2>
        <p className='text-xs text-text-muted'>
          Source: <span className='font-medium text-text-primary'>{latestResubmission.source}</span> • Submitted:{' '}
          <span className='font-medium text-text-primary'>{formatDisplayDateTime(latestResubmission.createdAt)}</span>
        </p>
        {latestResubmission.notes ? (
          <p className='rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-text-primary'>
            {latestResubmission.notes}
          </p>
        ) : null}
      </div>

      <ImagePreviewGallery
        title='Resubmission Photos'
        description='Photos provided in the latest customer resubmission.'
        items={photos}
        emptyMessage='No resubmission photos were uploaded.'
        fallbackModalTitle='Resubmission Photo'
      />
    </section>
  );
};
