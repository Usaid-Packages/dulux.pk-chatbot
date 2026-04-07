import type { JSX } from 'react';

import { REGISTRATION_CHANNEL_LABELS } from '#/constants';
import type { RegistrationChannel } from '#/types/registrations';
import { cn } from '#/utils';

interface SourceTagProps {
  source: RegistrationChannel;
}

/**
 * SourceTag renders source badges for registrations.
 *
 * @param props - Source tag props.
 * @returns Source badge element.
 */
export const SourceTag = ({ source }: SourceTagProps): JSX.Element => {
  const isWhatsApp = source === 'WHATSAPP';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        isWhatsApp
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-primary/25 bg-primary/10 text-primary'
      )}
    >
      {REGISTRATION_CHANNEL_LABELS[source] ?? source}
    </span>
  );
};
