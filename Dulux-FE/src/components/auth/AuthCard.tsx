import type { JSX, ReactNode } from 'react';

import duluxLogo from '#/assets/images/dulux-logo.png';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export const AuthCard = ({ title, subtitle, children }: AuthCardProps): JSX.Element => (
  <section className='relative w-full max-w-md overflow-hidden rounded-3xl border border-blue-200/80 bg-white/86 p-7 shadow-[0_28px_65px_rgba(15,76,159,0.24)] backdrop-blur-xl md:p-8'>
    <div
      aria-hidden='true'
      className='pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_50%_0%,rgba(44,132,240,0.18),transparent_70%)]'
    />

    <header className='relative mb-6 space-y-3 text-center'>
      <span className='mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-200/80 bg-white shadow-sm'>
        <img src={duluxLogo} alt='Dulux logo' className='h-10 w-10 object-contain' />
      </span>
      <div className='space-y-2'>
        <p className='text-[11px] font-bold uppercase tracking-[2px] text-blue-700'>Secure Access</p>
        <h1 className='text-2xl font-extrabold tracking-tight text-[#163b68]'>{title}</h1>
        <p className='text-sm leading-relaxed text-slate-600'>{subtitle}</p>
      </div>
    </header>

    <div className='relative'>{children}</div>
  </section>
);
