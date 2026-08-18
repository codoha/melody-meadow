const THEMES = Object.freeze({
  "fruit-beat": Object.freeze({ className: "stage-theme-fruit", x: 0.62, y: 0.34, phase: 0.2 }),
  "animal-parade": Object.freeze({ className: "stage-theme-animal", x: -0.42, y: 0.72, phase: 0.8 }),
  "sky-sparkle": Object.freeze({ className: "stage-theme-sky", x: 0.86, y: -0.26, phase: 1.4 }),
  "color-train": Object.freeze({ className: "stage-theme-color", x: -0.92, y: 0.18, phase: 2.1 }),
  "body-boogie": Object.freeze({ className: "stage-theme-body", x: 0.38, y: 0.88, phase: 2.8 }),
  "toy-box-bounce": Object.freeze({ className: "stage-theme-toy", x: -0.66, y: -0.52, phase: 3.4 }),
});

const SECTION_INTENSITY = Object.freeze({
  "count-in": 0.16,
  "words-a": 0.3,
  "words-b": 0.36,
  chorus: 0.62,
  letters: 0.46,
  practice: 0.34,
  reward: 0.86,
});

export function getStageTheme(songId) {
  return THEMES[songId] || THEMES["fruit-beat"];
}

export function createStageFrame({
  songId,
  section = "count-in",
  beat = 0,
  reducedMotion = false,
  energy = 0,
  comboTier = 0,
  cueStrength = 0,
} = {}) {
  const theme = getStageTheme(songId);
  const safeBeat = Number.isFinite(Number(beat)) ? Number(beat) : 0;
  const baseIntensity = SECTION_INTENSITY[section] ?? SECTION_INTENSITY["words-a"];
  const lift = clamp01(energy) * 0.1 + clamp01(Number(comboTier) / 3) * 0.06 + clamp01(cueStrength) * 0.12;
  const intensity = round(Math.min(1, baseIntensity + lift));
  const beatFraction = ((safeBeat % 1) + 1) % 1;
  const pulse = reducedMotion ? 0 : Math.max(0, 1 - beatFraction * 3.5);
  const travel = reducedMotion ? 0 : 1;
  return Object.freeze({
    scale: round(reducedMotion ? 1 : 1 + intensity * (0.01 + pulse * 0.018)),
    xPercent: round(Math.sin(safeBeat * 0.16 + theme.phase) * theme.x * intensity * travel),
    yPercent: round(Math.cos(safeBeat * 0.13 + theme.phase) * theme.y * intensity * travel),
    pulse: round(pulse),
    intensity,
    sectionClass: `stage-section-${section}`,
    themeClass: theme.className,
  });
}

function round(value) {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
}
