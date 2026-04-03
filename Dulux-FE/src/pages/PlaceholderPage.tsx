import type { JSX } from 'react';

/**
 * Thin placeholder for routes not yet implemented.
 *
 * @param props.title - Screen title shown in the shell.
 */
interface PlaceholderPageProps {
  title: string;
}

export const PlaceholderPage = ({ title }: PlaceholderPageProps): JSX.Element => {
  return (
    <section className='rounded-lg border border-border bg-surface p-6'>
      <h1 className='text-lg font-bold text-text-primary'>{title}</h1>
      <p className='mt-2 text-sm text-text-muted'>Placeholder — implementation pending.</p>
    </section>
  );
};
