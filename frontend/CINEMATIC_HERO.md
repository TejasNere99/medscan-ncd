# Cinematic hero boundary

The pinned video hero is an existing, self-contained experience. Its preserved source of truth remains in the separate `MedScan-Hero` project; this frontend contains the runtime integration snapshot required to serve it at `/`.

## Runtime files in this application

- `src/components/hero/PinnedHero.jsx` — cinematic stage, story overlays, report, and CTA.
- `src/components/hero/cinematicHero.css` — hero-only styles; it intentionally does not set global `main` overflow rules.
- `src/animations/cinematicTimeline.js` — ScrollTrigger pin, scrub, and release timeline.
- `src/data/cinematicFootage.js` — master film URL, selected source ranges, and story beat positions.
- `src/data/stageConfig.js` — responsive stage composition settings.
- `src/hooks/useCinematicScroll.js` and `src/hooks/videoScrubber.js` — timeline setup and bounded video seeking.
- `public/assets/videos/derived/medscan-story-master.mp4` — production runtime film.
- `public/assets/videos/derived/medscan-film-poster.webp` — loading poster and fallback image.

`LandingPage.jsx` mounts the hero before the product entry content. Keep changes to dashboards, authentication, and application pages outside these hero files. The CTA targets the product entry section below the pinned stage.

## Original footage and reproducible edit

The untouched originals, selected sub-clips, poster, master, footage map, and reproducible FFmpeg build script remain in `../../MedScan_frontend/MedScan-Hero/` (relative to this frontend), under `public/assets/videos/` and `analysis/footage/`. Edit the film there, then deliberately refresh only the two runtime assets listed above. Do not regenerate or replace the footage as part of application UI work.

The master is the existing 1600×900, H.264, 24 fps, muted, approximately 12.96-second crossfaded edit. Story-range metadata in `cinematicFootage.js` is aligned with that master.
