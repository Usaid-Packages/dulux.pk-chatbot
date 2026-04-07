import type { JSX, ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export const AuthCard = ({ title, subtitle, children }: AuthCardProps): JSX.Element => (
  <section className='w-full max-w-md rounded-2xl border border-border/70 bg-card/90 p-8 shadow-xl backdrop-blur'>
    <header className='mb-6 space-y-2 text-center'>
      <h1 className='text-2xl font-semibold text-foreground'>{title}</h1>
      <p className='text-sm text-muted-foreground'>{subtitle}</p>
    </header>
    {children}
  </section>
);
