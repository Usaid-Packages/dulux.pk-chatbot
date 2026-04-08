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
    <main className='relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef4ff] px-4 py-10 md:px-8'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(31,111,210,0.3),transparent_38%),radial-gradient(circle_at_85%_18%,rgba(17,82,175,0.24),transparent_42%),linear-gradient(165deg,#f6fbff_0%,#e6f2ff_52%,#f2f8ff_100%)]' />
      <div className='pointer-events-none absolute -left-24 top-10 h-96 w-96 rounded-full bg-[#4fa2ff]/30 blur-3xl' />
      <div className='pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#79b9ff]/30 blur-3xl' />
      <div className='pointer-events-none absolute left-[18%] top-[-3rem] h-64 w-64 rotate-12 rounded-[40px] border border-white/55 bg-white/30 backdrop-blur-xl' />

      <section className='relative grid w-full max-w-[1200px] items-center gap-7 lg:grid-cols-[1.15fr_0.85fr]'>
        <div className='relative hidden overflow-hidden rounded-[2rem] border border-blue-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.95)_0%,rgba(230,242,255,0.94)_48%,rgba(213,233,255,0.95)_100%)] p-9 text-slate-800 shadow-[0_28px_72px_rgba(18,78,163,0.22)] backdrop-blur xl:block'>
          <div className='pointer-events-none absolute -left-10 top-14 h-20 w-56 -rotate-12 rounded-full bg-[#0d57b8]/15 blur-lg' />
          <div className='pointer-events-none absolute right-8 top-3 h-24 w-64 rotate-12 rounded-full bg-[#2f8deb]/20 blur-lg' />
          <div className='pointer-events-none absolute -bottom-8 right-14 h-24 w-56 -rotate-12 rounded-full bg-[#0e4fa8]/15 blur-lg' />

          <div className='relative inline-flex rounded-[2.2rem] border border-blue-200/75 bg-white/90 p-6 shadow-[0_20px_55px_rgba(13,77,167,0.2)]'>
            <img src={duluxLogo} alt='Dulux logo' className='h-40 w-40 object-contain' />
          </div>

          <p className='mt-6 text-xs font-extrabold uppercase tracking-[2.4px] text-[#1f5ea7]'>Dulux Pakistan</p>
          <h2 className='mt-2 text-5xl font-extrabold leading-[1.02] tracking-tight text-[#10386d]'>
            Bold Service.
            <br />
            Brilliant Finish.
          </h2>
          <p className='mt-5 max-w-[46ch] text-base leading-relaxed text-slate-600'>
            A premium service console for registrations, claims, and quality reviews with secure access for every role.
          </p>

          <div className='mt-8 grid gap-3 text-sm font-semibold text-[#174b89] sm:grid-cols-2'>
            <div className='rounded-2xl border border-blue-200/80 bg-white/70 px-4 py-3'>
              Claims and Quality in one flow
            </div>
            <div className='rounded-2xl border border-blue-200/80 bg-white/70 px-4 py-3'>
              Role-based protected access
            </div>
          </div>
        </div>

        <div className='mx-auto w-full max-w-md'>
          <div className='mb-5 flex items-center justify-center xl:hidden'>
            <div className='rounded-[1.7rem] border border-blue-200/80 bg-white/85 p-5 shadow-[0_18px_45px_rgba(19,79,164,0.2)] backdrop-blur'>
              <img src={duluxLogo} alt='Dulux logo' className='h-24 w-24 object-contain sm:h-28 sm:w-28' />
            </div>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
};
