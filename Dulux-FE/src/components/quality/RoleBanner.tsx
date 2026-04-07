import type { JSX } from 'react';

/**
 * RoleBanner renders a quality-team contextual banner above detail content.
 *
 * @returns Role banner component.
 */
export const RoleBanner = (): JSX.Element => {
  return (
    <div className='sticky top-0 z-10 rounded-md border-b-2 border-quality-roleBannerBorder bg-quality-roleBannerBg px-4 py-2 text-sm font-semibold text-quality-roleBannerText'>
      <span aria-hidden='true' className='mr-2 inline-block h-2 w-2 rounded-full bg-quality-roleBannerDot' />
      Quality Team View
    </div>
  );
};
