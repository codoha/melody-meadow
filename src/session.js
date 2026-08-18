import { sanitizePracticeRepeat, selectWeakWords } from "./practice.js?v=0.15.0";

const VALID_MODES = new Set(["learn", "play", "challenge", "practice"]);

export function createSession({ songId, mode = "learn", practice = null, practiceRepeat = "once", practiceLoopIndex = 0 } = {}) {
  const selectedMode = VALID_MODES.has(mode) ? mode : "learn";
  return Object.freeze({
    songId: songId || "fruit-beat",
    mode: selectedMode,
    practice: selectedMode === "practice" ? practice : null,
    practiceRepeat: selectedMode === "practice" ? sanitizePracticeRepeat(practiceRepeat) : null,
    practiceLoopIndex: selectedMode === "practice" ? Math.max(0, Math.trunc(Number(practiceLoopIndex) || 0)) : 0,
    returnMode: selectedMode === "practice" ? "learn" : selectedMode,
    status: "idle",
    run: 0,
  });
}

export function transitionSession(session, action) {
  const next = transitionFor(session, action);
  return next ? Object.freeze({ ...session, ...next }) : session;
}

export function canSelectSong(session) {
  return session?.status === "idle";
}

export function createWordResults(lesson, events) {
  const eventList = Array.isArray(events) ? events : [];
  return (Array.isArray(lesson) ? lesson : []).map((item) => {
    const itemEvents = eventList.filter((event) => event.itemId === item.id);
    const hits = itemEvents.filter((event) => event.judgement === "perfect" || event.judgement === "good").length;
    const misses = itemEvents.filter((event) => event.judgement === "miss").length;
    const attempts = hits + misses;
    return {
      itemId: item.id,
      hits,
      misses,
      attempts,
      accuracy: attempts ? hits / attempts : 0,
    };
  });
}

export function createPracticeChart(notes, noteGapBeats = 3) {
  if (!Array.isArray(notes) || notes.length === 0) return [];
  const firstItemId = notes[0].itemId;
  const countIn = Array.from({ length: 4 }, (_, index) => ({
    id: `practice-count-in-${index + 1}`,
    beat: index,
    lane: null,
    kind: "lesson-cue",
    itemId: firstItemId,
    section: "count-in",
    phase: "words",
    cue: index === 3 ? "go" : "count",
    durationBeats: 0,
  }));
  const taps = notes.map((event, index) => ({
    ...event,
    id: `practice-note-${index + 1}`,
    beat: 5 + index * noteGapBeats,
    section: "practice",
  }));
  const reward = {
    id: "practice-reward",
    beat: 5 + taps.length * noteGapBeats + 2,
    lane: null,
    kind: "lesson-cue",
    itemId: firstItemId,
    section: "reward",
    phase: "words",
    cue: "reward",
    durationBeats: 0,
  };
  return [...countIn, ...taps, reward];
}

export function createResultSummary({
  songId,
  mode,
  stats = {},
  lesson = [],
  events = [],
  completedAt = new Date().toISOString(),
}) {
  const wordResults = createWordResults(lesson, events);
  const accuracy = normalizeAccuracy(stats.accuracy);
  return Object.freeze({
    songId,
    mode,
    score: Math.max(0, Number(stats.score) || 0),
    accuracy,
    maxCombo: Math.max(0, Number(stats.maxCombo) || 0),
    stars: accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1,
    wordResults,
    weakWords: selectWeakWords(wordResults),
    completedAt,
    isFullSong: mode === "learn" || mode === "play" || mode === "challenge",
  });
}

export function getBestCandidate(summary) {
  if (!summary?.isFullSong) return null;
  return {
    score: summary.score,
    accuracy: summary.accuracy,
    maxCombo: summary.maxCombo,
    stars: summary.stars,
    completedAt: summary.completedAt,
  };
}

function transitionFor(session, action) {
  if (!session || session.status === "exited") return null;
  if (action === "start" && session.status === "idle") return { status: "running", run: session.run + 1 };
  if (action === "pause" && session.status === "running") return { status: "paused" };
  if (action === "resume" && session.status === "paused") return { status: "running" };
  if (action === "restart" && ["running", "paused", "finished"].includes(session.status)) {
    return { status: "running", run: session.run + 1 };
  }
  if (action === "finish" && session.status === "running") return { status: "finished" };
  if (action === "continue" && session.status === "finished" && session.mode === "practice") {
    return { status: "running", run: session.run + 1, practiceLoopIndex: session.practiceLoopIndex + 1 };
  }
  if (action === "return-to-song" && session.status === "finished") {
    return { status: "idle", mode: session.returnMode, practice: null };
  }
  if (action === "exit") return { status: "exited" };
  return null;
}

function normalizeAccuracy(value) {
  const numeric = Number(value) || 0;
  return Math.min(1, Math.max(0, numeric > 1 ? numeric / 100 : numeric));
}
