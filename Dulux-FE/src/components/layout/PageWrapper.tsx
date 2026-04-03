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
  return <main className='flex-1 overflow-y-auto bg-page-body p-6'>{children}</main>;
};
