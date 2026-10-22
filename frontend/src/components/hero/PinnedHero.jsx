import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import useCinematicScroll from '../../hooks/useCinematicScroll';
import { getStageLayout } from '../../data/stageConfig';
import { CINEMATIC_FILM } from '../../data/cinematicFootage';
import { createVideoScrubber } from '../../hooks/videoScrubber';
import './cinematicHero.css';

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return reducedMotion;
}

function StageContent() {
  return (
    <>
      <header className="film-header">
        <a href="#story-start" className="film-brand" aria-label="MedScan story beginning">
          <span className="film-brand__mark" aria-hidden="true">m</span> medscan
        </a>
      </header>

      <section className="film-beat film-opening" data-film-beat="opening" id="story-start" aria-labelledby="film-title">
        <div className="film-copy film-copy--opening">
          <p className="film-eyebrow"><span /> HEALTH INFORMATION, MADE CLEARER</p>
          <h1 id="film-title">Understanding your health <i>shouldn’t be complex.</i></h1>
          <p className="film-lede">A report can hold a lot of information.</p>
        </div>
        <article className="film-report" aria-label="Fictional sample laboratory report">
          <div className="film-report__top"><span>LABORATORY SUMMARY</span><span>DEMO COPY</span></div>
          <h2>General health panel</h2>
          <p className="film-report__sub">Illustrative sample · not a real report</p>
          <div className="film-report__rows">
            <div><span>HbA1c</span><b>5.8 %</b><small>sample</small></div>
            <div><span>LDL-C</span><b>112 mg/dL</b><small>sample</small></div>
            <div><span>Blood pressure</span><b>122 / 78</b><small>sample</small></div>
            <div><span>Kidney function</span><b>eGFR 94</b><small>sample</small></div>
          </div>
          <p className="film-report__foot">FICTIONAL VALUES · FOR VISUAL DEMONSTRATION</p>
        </article>
      </section>

      <section className="film-beat film-confusion" data-film-beat="confusion" aria-label="A report full of unfamiliar terms">
        <div className="film-copy film-copy--confusion">
          <p className="film-eyebrow">A PAGE FULL OF NUMBERS</p>
          <h2>Where do you<br /><i>even begin?</i></h2>
          <p className="film-lede">Acronyms, ranges, and results—without much explanation.</p>
        </div>
      </section>

      <section className="film-beat film-overload" data-film-beat="overload" aria-label="Medical information becomes overwhelming">
        <p className="film-overload__line film-overload__line--a"><b>HbA1c</b><span>5.8%</span></p>
        <p className="film-overload__line film-overload__line--b"><b>LDL-C</b><span>112 mg/dL</span></p>
        <p className="film-overload__line film-overload__line--c"><b>BP SYS / DIA</b><span>122 / 78</span></p>
        <p className="film-overload__line film-overload__line--d"><b>eGFR</b><span>94 mL/min</span></p>
        <p className="film-overload__line film-overload__line--e"><b>TRIGLYCERIDES</b><span>136 mg/dL</span></p>
        <p className="film-overload__caption">SAMPLE VALUES · TOO MUCH TO DECODE AT A GLANCE</p>
      </section>

      <section className="film-beat film-discovery" data-film-beat="discovery" aria-label="MedScan enters the story">
        <p className="film-discovery__eyebrow">MEET MEDSCAN</p>
        <h2>A calmer way<br />to make sense of it.</h2>
        <p>Medical information, made human.</p>
      </section>

      <section className="film-beat film-scan" data-film-beat="scan" aria-label="A sample report is scanned">
        <div className="film-scan__copy">
          <p className="film-eyebrow">FROM REPORT TO READING</p>
          <h2>Bring the report<br /><i>into focus.</i></h2>
          <p className="film-lede">MedScan helps make technical results easier to follow.</p>
        </div>
        <article className="film-scan-document" aria-label="Fictional sample report values during a scan">
          <div className="film-scan-document__head"><span>MEDSCAN · SAMPLE</span><span>DEMO</span></div>
          <h3>General health panel</h3>
          <p>Illustrative values · not a real report</p>
          <div><span>HbA1c</span><b>5.8 %</b><small>sample</small></div>
          <div><span>LDL-C</span><b>112 mg/dL</b><small>sample</small></div>
          <div><span>Blood pressure</span><b>122 / 78</b><small>sample</small></div>
          <div><span>Kidney function</span><b>eGFR 94</b><small>sample</small></div>
          <i className="film-scan-document__beam" aria-hidden="true" />
          <small className="film-scan-document__foot">FICTIONAL VALUES · FOR VISUAL DEMONSTRATION</small>
        </article>
      </section>

      <section className="film-beat film-clarity" data-film-beat="clarity" aria-labelledby="clarity-title">
        <div className="film-clarity__heading">
          <p className="film-eyebrow"><span className="film-eyebrow__mint" /> THE SAME INFORMATION, CLEARER</p>
          <h2 id="clarity-title">Complex terms.<br /><i>Clearer meaning.</i></h2>
        </div>
        <div className="film-explanations">
          <article><span>01</span><div><h3>Blood sugar</h3><p>Average blood sugar over time.</p></div></article>
          <article><span>02</span><div><h3>Cholesterol</h3><p>Different fats that travel through your blood.</p></div></article>
          <article><span>03</span><div><h3>Blood pressure</h3><p>A reading of the force of blood moving through you.</p></div></article>
          <article><span>04</span><div><h3>Kidney function</h3><p>Values that help describe how your kidneys are working.</p></div></article>
        </div>
        <p className="film-clarity__note">Helpful context for understanding a report. Not a diagnosis.</p>
      </section>

      <section className="film-beat film-final" data-film-beat="final" aria-labelledby="final-title">
        <p className="film-eyebrow"><span className="film-eyebrow__mint" /> CLARITY, AT YOUR PACE</p>
        <h2 id="final-title">Clear information.<br /><i>More confidence.</i></h2>
        <p className="film-lede">Understand your health, without the complexity.</p>
        <a className="film-cta" href="#experience-title">Explore your health <ArrowUpRight size={16} /></a>
        <small>Visual concept · sample medical information only</small>
      </section>

      <p className="film-scroll-cue"><ArrowDownRight size={15} /> Scroll to follow the story</p>
      <div className="film-progress" aria-hidden="true"><span /></div>
      <p className="sr-only">A visual story follows a person trying to understand a fictional medical report. MedScan helps organize sample terms into plain-language explanations. The information shown is illustrative and is not a diagnosis.</p>
    </>
  );
}

export default function PinnedHero() {
  const shellRef = useRef(null);
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const videoScrubberRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  const [layout, setLayout] = useState(() => getStageLayout());
  const updateProgress = useCallback((progress) => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.dataset.progress = progress.toFixed(3);
    const scene = progress < 0.061 ? 'reading'
      : progress < 0.129 ? 'confusion'
        : progress < 0.178 ? 'overload'
          : progress < 0.355 ? 'discovery'
            : progress < 0.494 ? 'interaction'
              : progress < 0.66 ? 'scan'
                : progress < 0.83 ? 'clarity' : 'final';
    stage.dataset.scene = scene;
    stage.style.setProperty('--stage-progress', `${(progress * 100).toFixed(2)}%`);
    const scanProgress = Math.max(0, Math.min(1, (progress - 0.494) / (0.684 - 0.494)));
    stage.style.setProperty('--scan-progress', `${(scanProgress * 100).toFixed(1)}%`);
    if (!reducedMotion) videoScrubberRef.current?.setProgress(progress);
  }, [reducedMotion]);

  useEffect(() => {
    const video = videoRef.current;
    if (reducedMotion || !video) return undefined;
    const scrubber = createVideoScrubber(video, CINEMATIC_FILM.duration);
    videoScrubberRef.current = scrubber;
    return () => {
      scrubber.destroy();
      videoScrubberRef.current = null;
    };
  }, [reducedMotion]);

  useCinematicScroll({ shellRef, stageRef, reducedMotion, onProgress: updateProgress });

  useEffect(() => {
    const updateLayout = () => setLayout(getStageLayout());
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  return (
    <section ref={shellRef} className="cinematic-pin-shell" aria-label="MedScan cinematic introduction">
      <div ref={stageRef} className="cinematic-stage film-stage" style={layout} data-progress="0.000">
        <video
          ref={videoRef}
          className="cinematic-film"
          data-film
          src={CINEMATIC_FILM.src}
          muted
          playsInline
          preload="auto"
          poster="/assets/videos/derived/medscan-film-poster.webp"
          aria-hidden="true"
          tabIndex={-1}
        />
        <div className="film-vignette" aria-hidden="true" />
        <div className="film-atmosphere" aria-hidden="true" />
        <StageContent />
      </div>
    </section>
  );
}
