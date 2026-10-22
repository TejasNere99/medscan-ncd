import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Activity, ArrowLeft } from 'lucide-react';

export const AuthLayout = () => <main className="min-h-screen bg-[#fafaf9] p-4 sm:p-6">
  <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:min-h-[calc(100vh-3rem)] md:grid-cols-[.9fr_1.1fr]">
    <section className="relative hidden flex-col justify-between overflow-hidden bg-[#f2eee7] p-10 md:flex lg:p-14">
      <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full border border-stone-300/70" /><div className="absolute -right-12 top-[30%] h-56 w-56 rounded-full border border-stone-300/70" />
      <Link to="/" className="relative z-10 inline-flex w-fit items-center gap-2.5 text-sm font-semibold text-stone-900"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-violet-700"><Activity size={18}/></span>MedScan</Link>
      <div className="relative z-10 max-w-sm pb-7"><p className="mb-4 text-[11px] font-semibold uppercase tracking-[.18em] text-violet-800">A clearer view of your health</p><h1 className="editorial-heading text-4xl leading-[1.12] text-stone-900 lg:text-[46px]">Your health information, made easier to understand.</h1><p className="mt-5 max-w-xs text-sm leading-6 text-stone-600">Keep your reports and health information together in one thoughtful space.</p></div>
      <p className="relative z-10 text-xs text-stone-500">Private by design. Built around your care.</p>
    </section>
    <section className="flex min-h-[calc(100vh-2rem)] flex-col justify-center px-4 py-8 sm:px-10 md:min-h-0 md:px-12 lg:px-20">
      <div className="mx-auto w-full max-w-[420px]">
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 md:hidden"><ArrowLeft size={14}/> MedScan home</Link>
        <div className="mb-8 md:hidden"><p className="text-sm font-semibold text-stone-900">MedScan</p></div>
        <Outlet />
        <p className="mt-10 text-center text-[11px] text-stone-400">Your information is handled with care.</p>
      </div>
    </section>
  </div>
</main>;
