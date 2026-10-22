export const CINEMATIC_FILM = {
  src: '/assets/videos/derived/medscan-story-master.mp4',
  duration: 12.958008,
  crossfadeSeconds: 0.16,
  segments: [
    { role: 'reading', source: 'clip1.mp4', in: 2, out: 2.96 },
    { role: 'confusion', source: 'clip3.mp4', in: 0.3, out: 1.2 },
    { role: 'brand-reveal', source: 'clip1.mp4', in: 5, out: 5.96 },
    { role: 'discovery', source: 'clip2.mp4', in: 0, out: 2.46 },
    { role: 'letter-to-phone', source: 'clip1.mp4', in: 6, out: 7.96 },
    { role: 'scan', source: 'clip2.mp4', in: 2.5, out: 4.95 },
    { role: 'understanding', source: 'clip2.mp4', in: 7.5, out: 9.7 },
    { role: 'pointing', source: 'clip4.mp4', in: 5.75, out: 7.96 },
  ],
};

// Normalized beats for DOM choreography, aligned to the crossfaded master edit.
export const STORY_BEATS = {
  reading: [0, 0.074],
  confusion: [0.061, 0.129],
  overload: [0.129, 0.178],
  discovery: [0.178, 0.365],
  interaction: [0.355, 0.506],
  scan: [0.494, 0.684],
  clarity: [0.66, 0.842],
  final: [0.83, 1],
};
