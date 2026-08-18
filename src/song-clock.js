export class SongClock {
  constructor() {
    this.reset();
  }

  start(now, playbackRate = 1) {
    this.startedAt = now;
    this.anchorAt = now;
    this.sourcePosition = 0;
    this.playbackRate = sanitizeRate(playbackRate);
    this.pausedAt = null;
    this.pausedDuration = 0;
    this.isPaused = false;
  }

  pause(now) {
    if (this.isPaused || this.startedAt === null) return;
    this.sourcePosition = this.elapsed(now);
    this.anchorAt = now;
    this.pausedAt = now;
    this.isPaused = true;
  }

  resume(now) {
    if (!this.isPaused || this.pausedAt === null) return;
    this.pausedDuration += now - this.pausedAt;
    this.anchorAt = now;
    this.pausedAt = null;
    this.isPaused = false;
  }

  setPlaybackRate(playbackRate, now) {
    const nextRate = sanitizeRate(playbackRate);
    if (this.startedAt !== null && !this.isPaused) {
      this.sourcePosition = this.elapsed(now);
      this.anchorAt = now;
    }
    this.playbackRate = nextRate;
  }

  elapsed(now) {
    if (this.startedAt === null) return 0;
    if (this.isPaused) return this.sourcePosition;
    return Math.max(0, this.sourcePosition + (now - this.anchorAt) * this.playbackRate);
  }

  reset() {
    this.startedAt = null;
    this.anchorAt = null;
    this.sourcePosition = 0;
    this.playbackRate = 1;
    this.pausedAt = null;
    this.pausedDuration = 0;
    this.isPaused = false;
  }
}

function sanitizeRate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
}
