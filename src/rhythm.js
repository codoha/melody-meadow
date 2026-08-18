import { applyInputOffset } from "./timing.js?v=0.15.0";
import { getEffectiveBpm, sanitizePlaybackRate } from "./music-transport.js?v=0.15.0";

export const RHYTHM_MODES = Object.freeze({
  slow: Object.freeze({
    id: "slow",
    label: "Slow",
    multiplier: 0.75,
    bpm: 88,
    travelBeats: 4.75,
    noteSpacingBeats: 4,
  }),
  normal: Object.freeze({
    id: "normal",
    label: "Normal",
    multiplier: 1,
    bpm: 116,
    travelBeats: 4,
    noteSpacingBeats: 3,
  }),
  fast: Object.freeze({
    id: "fast",
    label: "Fast",
    multiplier: 1.25,
    bpm: 140,
    travelBeats: 4,
    noteSpacingBeats: 3,
  }),
});

export const SONG_BPM = RHYTHM_MODES.normal.bpm;
export const BEAT_MS = 60_000 / SONG_BPM;
export const NOTE_TRAVEL_MS = BEAT_MS * RHYTHM_MODES.normal.travelBeats;
export const PERFECT_WINDOW_MS = 260;
export const GOOD_WINDOW_MS = 560;
const LENIENT_PERFECT_WINDOW_MS = 360;
const LENIENT_GOOD_WINDOW_MS = 760;
const CHALLENGE_PERFECT_WINDOW_MS = 190;
const CHALLENGE_GOOD_WINDOW_MS = 420;

export const CHART_META = Object.freeze({
  id: "fruit-beat",
  title: "Fruit Beat",
  artist: "Melody Meadow",
  difficulty: "Easy",
  lanes: 4,
  baseBpm: RHYTHM_MODES.slow.bpm,
  noteCount: 48,
  scoredNotes: 48,
  durationSeconds: 87,
  approxDurationSeconds: 87,
});

const COUNT_IN_BEATS = [0, 1, 2, 3];
const NOTE_START_BEAT = 5;
const NOTE_GAP_BEATS = 2.5;
const NOTE_COUNT = CHART_META.scoredNotes;
const SECTION_NOTE_COUNT = 12;
const laneOrder = [0, 2, 1, 3, 1, 3, 0, 2];
const cueOrder = ["image", "repeat", "repeat"];

export function getRhythmConfig(mode = "slow", songChart = null, songBpms = null) {
  if (typeof mode === "number") {
    const playbackRate = sanitizePlaybackRate(mode);
    const baseBpm = songBpms?.normal || RHYTHM_MODES.normal.bpm;
    const beatMs = 60_000 / baseBpm;
    const travelBeats = playbackRate <= 0.75 ? RHYTHM_MODES.slow.travelBeats : RHYTHM_MODES.normal.travelBeats;
    const travelMs = beatMs * travelBeats;
    return {
      id: "custom",
      label: "Custom",
      multiplier: playbackRate,
      playbackRate,
      baseBpm,
      bpm: getEffectiveBpm(baseBpm, playbackRate),
      beatMs,
      travelBeats,
      travelMs,
      wallTravelMs: travelMs / playbackRate,
      noteSpacingBeats: songChart?.noteGapBeats || RHYTHM_MODES.normal.noteSpacingBeats,
      noteSpacingMs: beatMs * (songChart?.noteGapBeats || RHYTHM_MODES.normal.noteSpacingBeats),
    };
  }
  const selected = RHYTHM_MODES[mode] || RHYTHM_MODES.slow;
  const bpm = songBpms?.[selected.id] || selected.bpm;
  const beatMs = 60_000 / bpm;

  return {
    ...selected,
    bpm,
    beatMs,
    travelMs: beatMs * selected.travelBeats,
    wallTravelMs: beatMs * selected.travelBeats,
    noteSpacingMs: beatMs * (songChart?.noteGapBeats || selected.noteSpacingBeats),
  };
}

export function getLaneForKey(code, isRepeat = false) {
  if (isRepeat) return null;
  const lanes = { KeyA: 0, KeyS: 1, KeyD: 2, KeyF: 3 };
  return lanes[code] ?? null;
}

export function getJudgementWindows(profile = "standard") {
  if (profile === "lenient") {
    return { perfect: LENIENT_PERFECT_WINDOW_MS, good: LENIENT_GOOD_WINDOW_MS };
  }
  if (profile === "challenge") {
    return { perfect: CHALLENGE_PERFECT_WINDOW_MS, good: CHALLENGE_GOOD_WINDOW_MS };
  }
  return { perfect: PERFECT_WINDOW_MS, good: GOOD_WINDOW_MS };
}

export function buildChart(lesson, mode = "normal", songChart = null) {
  if (!Array.isArray(lesson) || lesson.length === 0) return [];

  const firstNoteBeat = Math.max(NOTE_START_BEAT, getRhythmConfig(mode, songChart).travelBeats);
  const noteCount = songChart?.noteCount || NOTE_COUNT;
  const noteGapBeats = songChart?.noteGapBeats || NOTE_GAP_BEATS;
  const sectionNoteCount = noteCount / 4;
  const firstItemId = lesson[0].id;
  const countIn = COUNT_IN_BEATS.map((beat, index) => createEvent({
    id: `count-in-${index + 1}`,
    beat,
    itemId: firstItemId,
    section: "count-in",
    cue: index === COUNT_IN_BEATS.length - 1 ? "go" : "count",
  }));

  const notes = Array.from({ length: noteCount }, (_, index) => {
    const itemIndex = songChart?.pairedItems
      ? Math.floor(index / 2) % lesson.length
      : index % lesson.length;
    const section = getNoteSection(index, sectionNoteCount);
    const isLetter = songChart?.pairedItems ? index % 2 === 1 : section === "letters";
    const itemRepetition = Math.floor(index / lesson.length);

    return createEvent({
      id: `${isLetter ? "letter" : "word"}-${index + 1}`,
      beat: firstNoteBeat + index * noteGapBeats,
      lane: laneOrder[index % laneOrder.length],
      kind: "tap",
      itemId: lesson[itemIndex].id,
      section,
      cue: isLetter ? "letter" : cueOrder[itemRepetition % cueOrder.length],
      phase: isLetter ? "letters" : "words",
      hintLane: Boolean(songChart?.hintLanes),
      judgement: songChart?.judgement || "standard",
      missFeedback: songChart?.missFeedback || "scored",
    });
  });

  const reward = createEvent({
    id: "reward-1",
    beat: firstNoteBeat + noteCount * noteGapBeats + 2,
    itemId: firstItemId,
    section: "reward",
    cue: "reward",
  });

  return [...countIn, ...notes, reward];
}

function getNoteSection(index, sectionNoteCount = SECTION_NOTE_COUNT) {
  if (index < sectionNoteCount) return "words-a";
  if (index < sectionNoteCount * 2) return "words-b";
  if (index < sectionNoteCount * 3) return "chorus";
  return "letters";
}

function createEvent({
  id,
  beat,
  lane = null,
  kind = "lesson-cue",
  itemId,
  section,
  cue,
  phase,
  hintLane = false,
  judgement = "standard",
  missFeedback = "scored",
}) {
  return {
    id,
    beat,
    lane,
    kind,
    itemId,
    section,
    phase: phase || (section === "letters" ? "letters" : "words"),
    cue,
    hintLane,
    judgement,
    missFeedback,
    durationBeats: 0,
  };
}

export function judgeTap(note, tappedLane, now, windows = getJudgementWindows("standard")) {
  if (tappedLane !== note.lane) return "wrong-lane";
  const distance = Math.abs(now - note.hitAt);
  const thresholds = typeof windows === "string" ? getJudgementWindows(windows) : windows;
  if (distance <= thresholds.perfect) return "perfect";
  if (distance <= thresholds.good) return "good";
  return "miss";
}

export function resolveCorrectedElapsed(rawElapsed, inputOffsetMs = 0) {
  return applyInputOffset(rawElapsed, inputOffsetMs);
}

export function shouldExpireMiss(rawElapsed, eventAt, goodWindow, inputOffsetMs = 0) {
  const correctedElapsed = resolveCorrectedElapsed(rawElapsed, inputOffsetMs);
  return Number.isFinite(correctedElapsed)
    && Number.isFinite(eventAt)
    && Number.isFinite(goodWindow)
    && correctedElapsed > eventAt + goodWindow;
}

export function applyJudgement(stats, judgement) {
  const values = {
    perfect: { points: 1000, accuracy: 1, keepsCombo: true },
    good: { points: 500, accuracy: 0.7, keepsCombo: true },
    miss: { points: 0, accuracy: 0, keepsCombo: false },
    "wrong-lane": { points: 0, accuracy: 0, keepsCombo: false },
  };
  const value = values[judgement] || values.miss;
  const combo = value.keepsCombo ? stats.combo + 1 : 0;
  const judgementCounts = stats.judgements
    ? { ...stats.judgements, [judgement]: (stats.judgements[judgement] || 0) + 1 }
    : undefined;

  return {
    ...stats,
    score: stats.score + value.points,
    combo,
    maxCombo: Math.max(stats.maxCombo, combo),
    hits: stats.hits + 1,
    accuracyPoints: stats.accuracyPoints + value.accuracy,
    ...(judgementCounts ? { judgements: judgementCounts } : {}),
  };
}
