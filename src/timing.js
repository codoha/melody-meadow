/**
 * Pure contracts shared by calibration, live judgement, and replay.
 * Times are milliseconds in one monotonic clock domain; positive offsets are late.
 */

export const CALIBRATION_BEAT_MS = 1400;
export const CALIBRATION_TARGET_COUNT = 12;
export const CALIBRATION_MIN_SAMPLES = 8;
export const CALIBRATION_MATCH_RADIUS_MS = 600;
export const MAX_CALIBRATION_SAMPLE_MS = CALIBRATION_MATCH_RADIUS_MS;
export const MAX_INPUT_OFFSET_MS = 250;
export const MAX_CALIBRATION_IQR_MS = 160;

export const CALIBRATION_RETRY_IQR_MS = MAX_CALIBRATION_IQR_MS;

/** Clamp a persisted or user supplied correction to the supported device range. */
export function clampInputOffset(value, fallback = 0) {
  const numeric = Number(value);
  const safeFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
  const rounded = Number.isFinite(numeric) ? roundHalfAwayFromZero(numeric) : roundHalfAwayFromZero(safeFallback);
  return Math.min(MAX_INPUT_OFFSET_MS, Math.max(-MAX_INPUT_OFFSET_MS, rounded));
}

export const clampOffset = clampInputOffset;

/** Apply a saved positive (late) correction exactly once to a clock reading. */
export function applyInputOffset(rawElapsed, inputOffsetMs = 0) {
  const elapsed = Number(rawElapsed);
  return Number.isFinite(elapsed) ? elapsed - clampInputOffset(inputOffsetMs) : elapsed;
}

export const correctElapsed = applyInputOffset;

/** Calibration samples are handler-entry time minus target time. */
export function isValidCalibrationSample(value, maxAbsMs = MAX_CALIBRATION_SAMPLE_MS) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && Math.abs(numeric) <= maxAbsMs;
}

export function normalizeCalibrationSamples(samples, maxAbsMs = MAX_CALIBRATION_SAMPLE_MS) {
  return (Array.isArray(samples) ? samples : [])
    .map(Number)
    .filter((value) => isValidCalibrationSample(value, maxAbsMs));
}

/**
 * Pair a tap with the nearest unclaimed target. A target can be consumed once.
 * The return value is null for an extra tap or a tap outside the matching radius.
 */
export function matchCalibrationTap(tapTime, targetTimes, claimed = new Set(), radiusMs = CALIBRATION_MATCH_RADIUS_MS) {
  const tap = Number(tapTime);
  const targets = Array.isArray(targetTimes) ? targetTimes : [];
  if (!Number.isFinite(tap)) return null;
  const claimedSet = claimed instanceof Set ? claimed : new Set(claimed || []);
  let best = null;
  targets.forEach((target, index) => {
    const expected = typeof target === "object" ? Number(target.time ?? target.expectedTime) : Number(target);
    const targetId = typeof target === "object" && target.id != null ? target.id : index;
    if (claimedSet.has(targetId) || !Number.isFinite(expected)) return;
    const offsetMs = tap - expected;
    const distance = Math.abs(offsetMs);
    if (distance > radiusMs) return;
    if (!best || distance < best.distance || (distance === best.distance && index < best.index)) {
      best = { index, id: targetId, expectedTime: expected, tapTime: tap, offsetMs, distance };
    }
  });
  return best;
}

export const pairCalibrationTap = matchCalibrationTap;

/** Pair an ordered set of taps to target times, ignoring extra taps. */
export function pairCalibrationSamples(taps, targetTimes, radiusMs = CALIBRATION_MATCH_RADIUS_MS) {
  const claimed = new Set();
  const matches = [];
  (Array.isArray(taps) ? taps : []).forEach((tap) => {
    const value = typeof tap === "object" ? Number(tap.time ?? tap.tapTime) : Number(tap);
    const match = matchCalibrationTap(value, targetTimes, claimed, radiusMs);
    if (!match) return;
    claimed.add(match.id);
    matches.push(match);
  });
  return matches;
}

function median(values) {
  if (!values.length) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

/** Tukey hinges: split an odd sample count around (and excluding) its median. */
export function tukeyHinges(samples) {
  const sorted = normalizeCalibrationSamples(samples).sort((a, b) => a - b);
  if (!sorted.length) return { q1: null, median: null, q3: null, sorted };
  const center = median(sorted);
  const middle = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, middle);
  const upper = sorted.slice(sorted.length % 2 ? middle + 1 : middle);
  return { q1: median(lower) ?? center, median: center, q3: median(upper) ?? center, sorted };
}

/** Round halves away from zero (unlike bankers rounding). */
export function roundHalfAwayFromZero(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.sign(numeric) * Math.floor(Math.abs(numeric) + 0.5);
}

export const roundHalfAway = roundHalfAwayFromZero;

/** Estimate the final offset and confidence from bounded calibration samples. */
export function estimateCalibrationOffset(samples, options = {}) {
  const minSamples = Math.max(1, Math.trunc(Number(options.minSamples) || CALIBRATION_MIN_SAMPLES));
  const validSamples = normalizeCalibrationSamples(samples, options.maxSampleMs ?? MAX_CALIBRATION_SAMPLE_MS).sort((a, b) => a - b);
  const hinges = tukeyHinges(validSamples);
  const iqrMs = hinges.q1 == null ? null : hinges.q3 - hinges.q1;
  const enoughSamples = validSamples.length >= minSamples;
  const confident = enoughSamples && iqrMs <= (options.maxIqrMs ?? MAX_CALIBRATION_IQR_MS);
  const shouldRetry = !confident;
  const reason = !enoughSamples ? "not-enough-samples" : confident ? null : "spread-too-wide";
  const medianMs = hinges.median;
  const offsetMs = medianMs == null ? 0 : clampInputOffset(roundHalfAwayFromZero(medianMs));
  return {
    validSamples,
    sampleCount: validSamples.length,
    medianMs,
    offsetMs,
    q1Ms: hinges.q1,
    q3Ms: hinges.q3,
    iqrMs,
    confident,
    shouldRetry,
    accepted: confident,
    reason,
  };
}

export const estimateCalibration = estimateCalibrationOffset;

/** Replay-compatible bucket boundaries: -100 and +100 are on beat. */
export function getOffsetBucket(judgement, offsetMs = 0) {
  if (judgement === "miss") return "miss";
  const offset = Number(offsetMs) || 0;
  if (offset < -100) return "early";
  if (offset > 100) return "late";
  return "on-time";
}

export const classifyOffset = getOffsetBucket;

export function getCalibrationStatus(inputOffsetMs = 0, calibrationVersion = 0) {
  if (Number(calibrationVersion) !== 1) return "not-calibrated";
  const offset = clampInputOffset(inputOffsetMs);
  if (Math.abs(offset) <= 20) return "balanced";
  return offset < 0 ? "early" : "late";
}

export function summarizeSync(input = {}) {
  const source = Array.isArray(input) ? input : null;
  let counts;
  if (source) {
    counts = source.reduce((result, event) => {
      const bucket = event?.judgement === "miss" || event?.bucket === "miss"
        ? "miss"
        : getOffsetBucket(event?.judgement, event?.offsetMs ?? event?.offset ?? 0);
      if (bucket === "early") result.early += 1;
      else if (bucket === "late") result.late += 1;
      else if (bucket === "on-time") result.onTime += 1;
      else result.misses += 1;
      return result;
    }, { early: 0, onTime: 0, late: 0, misses: 0 });
  } else {
    counts = {
      early: nonNegativeCount(input.early),
      onTime: nonNegativeCount(input.onTime ?? input.ontime ?? input.onBeat),
      late: nonNegativeCount(input.late),
      misses: nonNegativeCount(input.misses ?? input.miss),
    };
  }
  const total = counts.early + counts.onTime + counts.late + counts.misses;
  const syncRate = total === 0 ? null : Math.round((100 * (counts.onTime + 0.6 * (counts.early + counts.late))) / total);
  const order = ["misses", "early", "late", "onTime"];
  const largest = order.reduce((best, key) => counts[key] > counts[best] ? key : best, order[0]);
  const coaching = total === 0 ? null : {
    misses: "Keep trying!",
    early: "Tap a little later.",
    late: "Tap a little earlier.",
    onTime: "Great timing!",
  }[largest];
  return { ...counts, total, syncRate, coaching, coach: coaching };
}

export const createSyncSummary = summarizeSync;

function nonNegativeCount(value) {
  const numeric = Math.trunc(Number(value));
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}
