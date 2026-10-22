const FRAME_INTERVAL = 1000 / 24;
const SEEK_EPSILON = 1 / 30;

/** Keeps one media seek in flight and always follows the latest scroll target. */
export function createVideoScrubber(video, duration) {
  let targetTime = 0;
  let frameId = 0;
  let lastSeekAt = -Infinity;
  let disposed = false;

  const schedule = () => {
    if (!disposed && !frameId && !document.hidden) {
      frameId = requestAnimationFrame(tick);
    }
  };

  const tick = (now) => {
    frameId = 0;
    if (disposed || video.readyState < 2 || !Number.isFinite(video.duration)) return;
    if (video.seeking) return;

    const delta = targetTime - video.currentTime;
    if (Math.abs(delta) <= SEEK_EPSILON) return;
    if (now - lastSeekAt < FRAME_INTERVAL) {
      schedule();
      return;
    }

    lastSeekAt = now;
    video.currentTime = Math.max(0, Math.min(video.duration - 0.001, targetTime));
  };

  const onSeeked = () => {
    if (Math.abs(targetTime - video.currentTime) > SEEK_EPSILON) schedule();
  };
  const onVisibilityChange = () => {
    if (document.hidden) {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    } else {
      schedule();
    }
  };

  video.addEventListener('seeked', onSeeked);
  video.addEventListener('loadeddata', schedule, { once: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    setProgress(progress) {
      targetTime = Math.max(0, Math.min(duration, progress * duration));
      schedule();
    },
    destroy() {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadeddata', schedule);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}
