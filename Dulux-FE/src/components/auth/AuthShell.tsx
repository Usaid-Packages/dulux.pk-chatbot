import type { JSX, ReactNode } from 'react';

import duluxLogo from '#/assets/images/dulux-logo.png';

interface AuthShellProps {
  children: ReactNode;
}

/**
 * AuthShell renders a branded full-screen backdrop for all auth pages.
 *
 * @param props - Wrapper props.
 * @param props.children - Auth card content.
 * @returns Auth shell layout.
 */
export const AuthShell = ({ children }: AuthShellProps): JSX.Element => {
  return (
    <main className='relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 md:px-8'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(31,111,210,0.26),transparent_38%),radial-gradient(circle_at_90%_18%,rgba(56,189,248,0.24),transparent_38%),linear-gradient(150deg,#f4f9ff_0%,#ecf4ff_48%,#f8fbff_100%)]' />
      <div className='pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-blue-300/35 blur-3xl' />
      <div className='pointer-events-none absolute -right-16 top-20 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl' />

      <section className='relative grid w-full max-w-[1120px] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]'>
        <div className='hidden rounded-3xl border border-blue-200/80 bg-white/65 p-8 text-slate-800 shadow-[0_24px_60px_rgba(18,78,163,0.2)] backdrop-blur lg:block'>
          <img
            src={duluxLogo}
            alt='Dulux logo'
            className='h-14 w-14 rounded-2xl border border-blue-200/70 bg-white p-2'
          />
          <p className='mt-6 text-xs font-semibold uppercase tracking-[2.2px] text-blue-700'>Dulux Pakistan</p>
          <h2 className='mt-2 text-4xl font-extrabold leading-tight tracking-tight text-[#123768]'>
            Customer Service
            <br />
            Experience Hub
          </h2>
          <p className='mt-4 max-w-[42ch] text-sm leading-relaxed text-slate-600'>
            Securely manage claims, registrations, and quality actions from one polished command workspace.
          </p>
        </div>

        <div>{children}</div>
      </section>
    </main>
  );
};
