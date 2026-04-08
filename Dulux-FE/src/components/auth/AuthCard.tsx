import type { JSX, ReactNode } from 'react';

import duluxLogo from '#/assets/images/dulux-logo.png';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export const AuthCard = ({ title, subtitle, children }: AuthCardProps): JSX.Element => (
  <section className='relative w-full max-w-md overflow-hidden rounded-[2rem] border border-blue-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(244,250,255,0.96)_100%)] p-7 shadow-[0_30px_70px_rgba(15,76,159,0.25)] backdrop-blur-xl md:p-8'>
    <div
      aria-hidden='true'
      className='pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_50%_0%,rgba(44,132,240,0.24),transparent_72%)]'
    />
    <div
      aria-hidden='true'
      className='pointer-events-none absolute -right-16 top-20 h-32 w-32 rounded-full bg-[#2f8deb]/15 blur-2xl'
    />

    <header className='relative mb-6 space-y-4 text-center'>
      <span className='mx-auto inline-flex rounded-[1.4rem] border border-blue-200/80 bg-white px-5 py-4 shadow-[0_14px_35px_rgba(18,78,163,0.16)]'>
        <img src={duluxLogo} alt='Dulux logo' className='h-16 w-16 object-contain' />
      </span>
      <div className='space-y-2'>
        <p className='text-[11px] font-extrabold uppercase tracking-[2.4px] text-blue-700'>Secure Access</p>
        <h1 className='text-[1.95rem] font-extrabold leading-[1.05] tracking-tight text-[#163b68]'>{title}</h1>
        <p className='text-sm leading-relaxed text-slate-600'>{subtitle}</p>
      </div>
    </header>

    <div className='relative rounded-2xl border border-white/80 bg-white/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] md:p-5'>
      {children}
    </div>
  </section>
);
