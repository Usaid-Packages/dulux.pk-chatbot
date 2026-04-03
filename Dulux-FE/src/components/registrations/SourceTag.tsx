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
        'inline-flex items-center rounded-2xl px-2.5 py-1 text-xs font-semibold',
        isWhatsApp ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
      )}
    >
      {REGISTRATION_CHANNEL_LABELS[source] ?? source}
    </span>
  );
};
