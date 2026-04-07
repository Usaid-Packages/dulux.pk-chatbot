import type { JSX, ReactNode } from 'react';

interface PageWrapperProps {
  children: ReactNode;
}

/**
 * PageWrapper applies the shared content-area spacing/background.
 *
 * @param props - Wrapper props.
 * @param props.children - Nested route content.
 * @returns Wrapped page content.
 */
export const PageWrapper = ({ children }: PageWrapperProps): JSX.Element => {
  return (
    <main className='relative flex-1 overflow-y-auto px-4 pb-6 pt-5 md:px-6 md:pb-8 md:pt-6'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(59,130,246,0.15),transparent_42%),radial-gradient(circle_at_88%_20%,rgba(14,165,233,0.16),transparent_36%),linear-gradient(160deg,#f6fbff_0%,#eef5ff_46%,#f8fbff_100%)]' />
      <div className='relative mx-auto w-full max-w-[1440px]'>{children}</div>
    </main>
  );
};
