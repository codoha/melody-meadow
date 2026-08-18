export const MIN_PLAYBACK_RATE = 0.5;
export const MAX_PLAYBACK_RATE = 1.25;
export const DEFAULT_PLAYBACK_RATE = 0.6;
export const DEFAULT_PLAY_TIMEOUT_MS = 4000;

export function sanitizePlaybackRate(value, fallback = DEFAULT_PLAYBACK_RATE) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const bounded = Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, numeric));
  return Math.round(bounded * 100) / 100;
}

export function getEffectiveBpm(baseBpm, playbackRate = DEFAULT_PLAYBACK_RATE) {
  const bpm = Number(baseBpm);
  if (!Number.isFinite(bpm) || bpm <= 0) return 0;
  return Math.round(bpm * sanitizePlaybackRate(playbackRate));
}

export function realOffsetToMediaMs(offsetMs, playbackRate = DEFAULT_PLAYBACK_RATE) {
  const offset = Number(offsetMs);
  if (!Number.isFinite(offset)) return 0;
  return offset * sanitizePlaybackRate(playbackRate);
}

export class MusicTransport {
  constructor({ createMedia = defaultCreateMedia, playTimeoutMs = DEFAULT_PLAY_TIMEOUT_MS } = {}) {
    this.createMedia = createMedia;
    this.playTimeoutMs = sanitizeTimeout(playTimeoutMs);
    this.media = null;
    this.source = "";
    this.playbackRate = DEFAULT_PLAYBACK_RATE;
    this.failed = false;
    this.failureReason = "";
    this.generation = 0;
    this.playOperation = 0;
    this.cleanupMediaListeners = null;
  }

  get positionMs() {
    const seconds = Number(this.media?.currentTime);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
  }

  get durationMs() {
    const seconds = Number(this.media?.duration);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
  }

  prepare(source) {
    const nextSource = typeof source === "string" ? source : "";
    if (this.media && nextSource === this.source && !this.failed) return this.media;

    this.releaseMedia();
    this.generation += 1;
    const generation = this.generation;
    const media = this.createMedia();
    this.media = media;
    this.source = nextSource;
    this.failed = false;
    this.failureReason = "";

    media.preload = "auto";
    media.playsInline = true;
    media.preservesPitch = true;
    media.webkitPreservesPitch = true;
    media.playbackRate = this.playbackRate;
    media.src = nextSource;

    const onError = () => {
      if (generation === this.generation && media === this.media) {
        this.failed = true;
        this.failureReason = `media-error:${media.error?.code || "unknown"}`;
      }
    };
    media.addEventListener?.("error", onError);
    this.cleanupMediaListeners = () => media.removeEventListener?.("error", onError);
    media.load?.();
    return media;
  }

  setPlaybackRate(value) {
    this.playbackRate = sanitizePlaybackRate(value);
    if (this.media) this.media.playbackRate = this.playbackRate;
    return this.playbackRate;
  }

  setVolume(value) {
    const volume = Math.min(1, Math.max(0, Number(value) || 0));
    if (this.media) this.media.volume = volume;
    return volume;
  }

  async play({ offsetMs } = {}) {
    if (!this.media || this.failed) return false;
    const offset = Number(offsetMs);
    if (Number.isFinite(offset) && offset >= 0) this.media.currentTime = offset / 1000;
    this.media.playbackRate = this.playbackRate;
    return this.attemptPlayback("play");
  }

  pause() {
    this.media?.pause?.();
  }

  async resume() {
    if (!this.media || this.failed) return false;
    this.media.playbackRate = this.playbackRate;
    return this.attemptPlayback("resume");
  }

  stop() {
    this.playOperation += 1;
    if (!this.media) return;
    this.media.pause?.();
    try { this.media.currentTime = 0; } catch { /* unavailable media seek */ }
  }

  destroy() {
    this.playOperation += 1;
    this.releaseMedia();
    this.source = "";
    this.failed = false;
    this.failureReason = "";
    this.generation += 1;
  }

  releaseMedia() {
    this.playOperation += 1;
    this.cleanupMediaListeners?.();
    this.cleanupMediaListeners = null;
    if (this.media) {
      this.media.pause?.();
      this.media.removeAttribute?.("src");
      this.media.load?.();
    }
    this.media = null;
  }

  async attemptPlayback(action) {
    const media = this.media;
    const generation = this.generation;
    const operation = ++this.playOperation;
    try {
      await withTimeout(media?.play?.(), this.playTimeoutMs, action);
    } catch (error) {
      if (!this.isCurrentOperation(media, generation, operation)) return false;
      this.failed = true;
      this.failureReason = `${error?.name || "Error"}:${error?.message || `${action} rejected`}`;
      return false;
    }
    return this.isCurrentOperation(media, generation, operation);
  }

  isCurrentOperation(media, generation, operation) {
    return media === this.media
      && generation === this.generation
      && operation === this.playOperation
      && !this.failed;
  }
}

function defaultCreateMedia() {
  return document.createElement("audio");
}

function sanitizeTimeout(value) {
  const timeout = Number(value);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_PLAY_TIMEOUT_MS;
}

function withTimeout(operation, timeoutMs, action) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      const error = new Error(`media ${action} timed out after ${timeoutMs}ms`);
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([Promise.resolve(operation), timeout])
    .finally(() => globalThis.clearTimeout(timeoutId));
}
