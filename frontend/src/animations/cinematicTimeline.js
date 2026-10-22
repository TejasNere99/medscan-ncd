import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STORY_BEATS } from '../data/cinematicFootage';

gsap.registerPlugin(ScrollTrigger);

const PIN_VIEWPORTS = {
  desktop: 3.4,
  mobile: 2.7,
  reducedMotion: 0.65,
};

function getScrubSmoothing(reducedMotion) {
  if (reducedMotion) return 0.2;
  return window.matchMedia('(max-width: 700px)').matches ? 0.22 : 0.32;
}

const BEAT_ELEMENTS = {
  opening: '[data-film-beat="opening"]',
  confusion: '[data-film-beat="confusion"]',
  overload: '[data-film-beat="overload"]',
  discovery: '[data-film-beat="discovery"]',
  scan: '[data-film-beat="scan"]',
  clarity: '[data-film-beat="clarity"]',
  final: '[data-film-beat="final"]',
};

export function createCinematicTimeline({ shell, stage, reducedMotion, onProgress }) {
  const getPinViewports = () => {
    if (reducedMotion) return PIN_VIEWPORTS.reducedMotion;
    return window.matchMedia('(max-width: 700px)').matches ? PIN_VIEWPORTS.mobile : PIN_VIEWPORTS.desktop;
  };

  const progress = { value: 0 };
  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: shell,
      pin: stage,
      pinSpacing: true,
      start: 'top top',
      end: () => `+=${Math.round(window.innerHeight * getPinViewports())}`,
      scrub: getScrubSmoothing(reducedMotion),
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefresh: (self) => onProgress(self.progress),
    },
  });

  Object.entries(BEAT_ELEMENTS).forEach(([name, selector]) => {
    const [start, end] = STORY_BEATS[name === 'opening' ? 'reading' : name === 'scan' ? 'scan' : name === 'final' ? 'final' : name];
    const element = stage.querySelector(selector);
    if (!element) return;
    gsap.set(element, { autoAlpha: name === 'opening' ? 1 : 0, y: name === 'opening' ? 0 : 10 });
    if (name === 'opening') {
      timeline.to(element, { autoAlpha: 0, y: -6, duration: 0.026, ease: 'power1.in' }, Math.max(0.015, end - 0.026));
    } else {
      timeline.to(element, { autoAlpha: 1, y: 0, duration: 0.032, ease: 'power1.out' }, start + 0.003);
      if (name !== 'final') timeline.to(element, { autoAlpha: 0, y: -6, duration: 0.026, ease: 'power1.in' }, Math.max(start + 0.04, end - 0.026));
    }
  });

  timeline.to(progress, {
    value: 1,
    duration: 1,
    onUpdate: () => {
      stage.dataset.sceneProgress = progress.value.toFixed(3);
      onProgress(progress.value);
    },
  }, 0);

  return timeline;
}

export { PIN_VIEWPORTS };
