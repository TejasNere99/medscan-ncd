import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createCinematicTimeline } from '../animations/cinematicTimeline';

gsap.registerPlugin(ScrollTrigger);

export default function useCinematicScroll({ shellRef, stageRef, reducedMotion, onProgress }) {
  useEffect(() => {
    const shell = shellRef.current;
    const stage = stageRef.current;
    if (!shell || !stage) return undefined;

    const context = gsap.context(() => {
      createCinematicTimeline({ shell, stage, reducedMotion, onProgress });
    }, shell);

    return () => context.revert();
  }, [shellRef, stageRef, reducedMotion, onProgress]);
}
