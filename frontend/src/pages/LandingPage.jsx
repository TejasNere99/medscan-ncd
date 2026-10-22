import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, BookOpenText, FileText, ScanLine, ShieldCheck, Stethoscope } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const PinnedHero = lazy(() => import('../components/hero/PinnedHero'));

const steps = [
  { number: '01', icon: FileText, title: 'Bring your report together', body: 'Keep your health reports in one place, ready to review when you need them.' },
  { number: '02', icon: ScanLine, title: 'Review what was extracted', body: 'Check the information read from a report and correct it before saving.' },
  { number: '03', icon: BookOpenText, title: 'See information with context', body: 'Explore health information and model-estimated risk insights in clear language.' },
];

export const LandingPage = () => {
  const { user, role } = useAuth();
  const workspace = user && role ? `/${role.toLowerCase()}/dashboard` : '/login';
  const entryPath = user ? workspace : '/register';

  return (
    <>
      <Suspense fallback={<section className="cinematic-pin-shell" style={{ height: '100svh' }} aria-label="Loading MedScan story"><div className="cinematic-stage" style={{ background: '#faf8f3 url(/assets/videos/derived/medscan-film-poster.webp) center / cover no-repeat' }} /></section>}>
        <PinnedHero />
      </Suspense>

      <main className="min-h-screen bg-[#fafaf9] text-stone-900">
        <section id="experience-title" className="scroll-mt-8 border-y border-stone-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 md:grid-cols-[.7fr_1.3fr] md:py-20">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-violet-700">The MedScan experience</p>
              <h2 className="editorial-heading mt-3 max-w-sm text-3xl leading-tight text-stone-900 sm:text-4xl">Clarity begins with taking the time to review.</h2>
            </div>
            <div className="max-w-2xl md:pt-8">
              <p className="text-sm leading-7 text-stone-600">Reports can be difficult to navigate. MedScan helps organize the information you choose to share and gives you a clear place to review it. The experience supports conversations with your care team; it does not replace them.</p>
              <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-5">
                <Link to={entryPath} className="inline-flex items-center gap-2 rounded-md bg-violet-700 px-4 py-3 text-xs font-semibold text-white hover:bg-violet-800">{user ? 'Open your workspace' : 'Enter MedScan'}<ArrowRight size={14} /></Link>
                {!user && <Link to="/login" className="rounded-md px-4 py-3 text-xs font-medium text-stone-700 hover:bg-stone-50">Sign in</Link>}
                <span className="inline-flex items-center gap-2 text-xs text-stone-500"><Stethoscope size={15} className="text-violet-700" />Discuss health information with your clinician.</span>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-24">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-violet-700">A considered process</p>
            <h2 className="editorial-heading mt-3 text-3xl text-stone-900 sm:text-4xl">From report to understanding, one step at a time.</h2>
          </div>
          <div className="mt-10 grid gap-0 border-y border-stone-200 md:grid-cols-3 md:divide-x md:divide-stone-200">
            {steps.map(({ number, icon: Icon, title, body }) => (
              <article key={number} className="py-6 md:px-6 md:py-8 first:md:pl-0 last:md:pr-0">
                <div className="flex items-center justify-between"><span className="font-serif text-sm text-violet-800">{number}</span><Icon size={18} className="text-stone-400" /></div>
                <h3 className="mt-6 text-sm font-semibold text-stone-900">{title}</h3>
                <p className="mt-2 max-w-xs text-xs leading-6 text-stone-500">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="trust" className="bg-[#eee9df]">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between md:py-16">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-violet-800">Thoughtful by design</p>
              <h2 className="editorial-heading mt-2 text-3xl text-stone-900">You decide what becomes part of your profile.</h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">Information extracted from an uploaded report remains separate until you review and confirm it.</p>
            </div>
            <Link to={entryPath} className="inline-flex shrink-0 items-center gap-2 self-start rounded-md bg-violet-700 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-800 md:self-center">{user ? 'Open workspace' : 'Create your account'}<ArrowRight size={15} /></Link>
          </div>
        </section>

        <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-[11px] text-stone-500 sm:px-8 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold text-stone-700"><Activity size={15} className="text-violet-700" />MedScan</Link>
          <p><ShieldCheck size={13} className="mr-1 inline text-emerald-700" />Information support, not a diagnosis. Speak with your healthcare professional.</p>
          <div className="flex gap-4"><Link to="/login" className="hover:text-violet-800">Sign in</Link><Link to="/register" className="hover:text-violet-800">Register</Link></div>
        </footer>
      </main>
    </>
  );
};
