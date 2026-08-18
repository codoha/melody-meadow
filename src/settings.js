import { clampInputOffset } from "./timing.js?v=0.15.0";
import { DEFAULT_PLAYBACK_RATE, sanitizePlaybackRate } from "./music-transport.js?v=0.15.0";

// Keep this key stable so existing family-device preferences migrate in place.
export const SETTINGS_KEY = "melody-meadow-settings-v1";
export const SETTINGS_VERSION = 3;

export function createDefaultSettings() {
  return {
    version: SETTINGS_VERSION,
    musicVolume: 0.82,
    voiceVolume: 1,
    effectsVolume: 0.8,
    playbackRate: DEFAULT_PLAYBACK_RATE,
    hintsEnabled: true,
    judgement: "lenient",
    previewEnabled: true,
    inputOffsetMs: 0,
    calibrationVersion: 0,
  };
}

export function loadSettings(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage?.getItem(SETTINGS_KEY) || "null");
    let settings;
    if (value?.version === 0) settings = migrateLegacySettings(value);
    else if (value?.version === 1) settings = sanitizeSettings({ ...value, inputOffsetMs: 0, calibrationVersion: 0 });
    else if (value?.version === 2) settings = sanitizeSettings(value);
    else if (value?.version === SETTINGS_VERSION) settings = sanitizeSettings(value);
    else settings = createDefaultSettings();
    if (value?.version !== SETTINGS_VERSION && settings.version === SETTINGS_VERSION) {
      try { storage?.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* private storage */ }
    }
    return settings;
  } catch {
    return createDefaultSettings();
  }
}

export function saveSettings(storage, settings) {
  const value = sanitizeSettings({ ...createDefaultSettings(), ...settings });
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(value));
  } catch {
    // Safari private storage can reject writes; return the sanitized value anyway.
  }
  return value;
}

export function resetSettings(storage) {
  return saveSettings(storage, createDefaultSettings());
}

export function resetCalibration(storage, settings = loadSettings(storage)) {
  return saveSettings(storage, { ...settings, inputOffsetMs: 0, calibrationVersion: 0 });
}

function migrateLegacySettings(value) {
  const volume = clamp(value.volume, createDefaultSettings().musicVolume);
  return sanitizeSettings({
    musicVolume: volume,
    voiceVolume: volume,
    effectsVolume: volume,
    hintsEnabled: value.hints,
    judgement: value.judgement,
    previewEnabled: value.previewEnabled,
  });
}

function sanitizeSettings(value) {
  const defaults = createDefaultSettings();
  const rawOffset = Number(value.inputOffsetMs);
  const calibrationVersion = Number(value.calibrationVersion) === 1 && Number.isFinite(rawOffset) ? 1 : 0;
  return {
    version: SETTINGS_VERSION,
    musicVolume: clamp(value.musicVolume, defaults.musicVolume),
    voiceVolume: clamp(value.voiceVolume, defaults.voiceVolume),
    effectsVolume: clamp(value.effectsVolume, defaults.effectsVolume),
    playbackRate: sanitizePlaybackRate(value.playbackRate),
    hintsEnabled: typeof value.hintsEnabled === "boolean" ? value.hintsEnabled : defaults.hintsEnabled,
    judgement: value.judgement === "standard" ? "standard" : "lenient",
    previewEnabled: typeof value.previewEnabled === "boolean" ? value.previewEnabled : defaults.previewEnabled,
    inputOffsetMs: calibrationVersion === 1 ? clampInputOffset(value.inputOffsetMs, defaults.inputOffsetMs) : 0,
    calibrationVersion,
  };
}

function clamp(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(1, Math.max(0, numeric));
}
