import { useEffect, useRef } from 'react';

interface PageWrapperProps {
  children: React.ReactNode;
  pathname: string;
}

/**
 * PageWrapper applies the shared content-area spacing/background.
 *
 * @param props - Wrapper props.
 * @param props.children - Nested route content.
 * @returns Wrapped page content.
 */
export const PageWrapper = ({ children, pathname }: PageWrapperProps): React.JSX.Element => {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <main ref={containerRef} className='relative flex-1 overflow-y-auto px-4 pb-6 pt-5 md:px-6 md:pb-8 md:pt-6'>
      <div className='relative mx-auto flex h-full min-h-full w-full max-w-[1360px] flex-col min-[1440px]:max-w-[1240px]'>
        {children}
      </div>
    </main>
  );
};
