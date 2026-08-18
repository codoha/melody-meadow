export const MUSIC_MIX = Object.freeze({
  masterGain: 0.68,
  voiceDuckGain: 0.72,
  melodyGain: 0.3,
  chordGain: 0.32,
  bassGain: 0.28,
  kickGain: 0.55,
  hatGain: 0.16,
});

export const DEFAULT_AUDIO_MIX = Object.freeze({
  musicVolume: 0.82,
  voiceVolume: 1,
  effectsVolume: 0.8,
});

export function sanitizeAudioMix(value = {}) {
  return {
    musicVolume: clamp(value.musicVolume, DEFAULT_AUDIO_MIX.musicVolume),
    voiceVolume: clamp(value.voiceVolume, DEFAULT_AUDIO_MIX.voiceVolume),
    effectsVolume: clamp(value.effectsVolume, DEFAULT_AUDIO_MIX.effectsVolume),
  };
}

export function getDrumBeat(pattern, beatInBar) {
  const beat = ((Math.trunc(beatInBar) % 4) + 4) % 4;
  const defaultKick = beat === 0 ? 1 : 0.72;

  if (pattern === "march") {
    return { kickScale: defaultKick, hat: true, snareGain: beat > 0 ? 0.2 : 0 };
  }
  if (pattern === "air") {
    return { kickScale: defaultKick, hat: beat % 2 === 0, snareGain: beat % 2 === 1 ? 0.25 : 0 };
  }
  if (pattern === "train") {
    return { kickScale: [1, 0.62, 0.9, 0.62][beat], hat: true, snareGain: beat === 2 ? 0.22 : 0 };
  }
  if (pattern === "funk") {
    return { kickScale: [1, 0.48, 0.86, 0.62][beat], hat: true, snareGain: beat % 2 === 1 ? 0.28 : 0 };
  }
  if (pattern === "bounce") {
    return { kickScale: [1, 0.5, 0.74, 0.5][beat], hat: beat !== 1, snareGain: beat === 3 ? 0.3 : 0 };
  }
  return { kickScale: defaultKick, hat: true, snareGain: beat % 2 === 1 ? 0.25 : 0 };
}

function clamp(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(1, Math.max(0, numeric));
}
