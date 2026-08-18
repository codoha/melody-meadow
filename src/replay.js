export const REPLAY_KEY = "melody-meadow-replay-v1";
export const REPLAY_VERSION = 1;
export const MAX_REPLAY_EVENTS = 64;

import { getOffsetBucket } from "./timing.js?v=0.15.0";

const VALID_JUDGEMENTS = new Set(["perfect", "good", "miss"]);
const VALID_OFFSET_BUCKETS = new Set(["early", "on-time", "late", "miss"]);
const VALID_MODES = new Set(["learn", "play", "challenge"]);

export { getOffsetBucket } from "./timing.js?v=0.15.0";

export function createReplayEvent({
  noteId,
  id,
  itemId,
  section,
  phase = "words",
  lane,
  judgement = "miss",
  offsetMs = 0,
  index = 0,
} = {}) {
  const normalizedJudgement = VALID_JUDGEMENTS.has(judgement) ? judgement : "miss";
  return {
    noteId: String(noteId || id || ""),
    itemId: String(itemId || ""),
    section: String(section || "words-a"),
    phase: phase === "letters" ? "letters" : "words",
    lane: clampLane(lane),
    judgement: normalizedJudgement,
    offsetBucket: getOffsetBucket(normalizedJudgement, offsetMs),
    index: clampIndex(index),
  };
}

export function sanitizeReplayTrace(events, limit = MAX_REPLAY_EVENTS) {
  const boundedLimit = Math.min(MAX_REPLAY_EVENTS, Math.max(1, Math.trunc(Number(limit) || MAX_REPLAY_EVENTS)));
  if (!Array.isArray(events)) return [];
  const candidates = events
    .map((event, position) => sanitizeReplayEvent(event, position))
    .filter(Boolean)
    .sort((first, second) => first.index - second.index);
  const seen = new Set();
  const result = [];
  for (const event of candidates) {
    if (seen.has(event.noteId)) continue;
    seen.add(event.noteId);
    result.push(event);
    if (result.length >= boundedLimit) break;
  }
  return result;
}

export function createReplayRecord({ songId, mode, trace = [], completedAt = new Date().toISOString() } = {}) {
  if (!songId || !VALID_MODES.has(mode)) return null;
  return Object.freeze({
    version: REPLAY_VERSION,
    songId: String(songId),
    mode,
    completedAt: typeof completedAt === "string" ? completedAt : new Date().toISOString(),
    trace: sanitizeReplayTrace(trace),
  });
}

export function sanitizeReplayRecord(value) {
  if (!value || typeof value !== "object" || value.version !== REPLAY_VERSION) return null;
  return createReplayRecord(value);
}

export function loadReplay(storage = globalThis.localStorage) {
  try {
    return sanitizeReplayRecord(JSON.parse(storage?.getItem(REPLAY_KEY) || "null"));
  } catch {
    return null;
  }
}

export function saveReplay(storage, record) {
  const sanitized = sanitizeReplayRecord(record);
  if (!sanitized) return null;
  try {
    storage?.setItem(REPLAY_KEY, JSON.stringify(sanitized));
  } catch {
    return sanitized;
  }
  return sanitized;
}

export function clearReplay(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(REPLAY_KEY);
  } catch {
    // Private browsing can reject localStorage removal.
  }
}

export function selectWeakPracticeRange(chart, trace, minimum = 8, maximum = 12) {
  const notes = Array.isArray(chart)
    ? chart
      .filter((event) => event?.kind === "tap" || event?.kind === "hold")
      .map((event) => ({ ...event, kind: "tap", durationBeats: 0 }))
    : [];
  const minNotes = Math.max(1, Math.trunc(Number(minimum) || 8));
  const maxNotes = Math.max(minNotes, Math.trunc(Number(maximum) || 12));
  if (notes.length < minNotes) return null;

  const misses = new Set((Array.isArray(trace) ? trace : [])
    .filter((event) => event?.judgement === "miss")
    .map((event) => event.noteId));
  const groups = groupBySection(notes);
  let best = null;
  for (const group of groups) {
    if (group.notes.length < minNotes) continue;
    const windowSize = Math.min(maxNotes, group.notes.length);
    for (let start = 0; start <= group.notes.length - windowSize; start += 1) {
      const window = group.notes.slice(start, start + windowSize);
      const missCount = window.reduce((count, event) => count + (misses.has(event.id) ? 1 : 0), 0);
      const candidate = { section: group.section, start, end: start + windowSize - 1, notes: window, missCount, groupIndex: group.index };
      if (!best || candidate.missCount > best.missCount || (candidate.missCount === best.missCount && candidate.groupIndex < best.groupIndex) || (candidate.missCount === best.missCount && candidate.groupIndex === best.groupIndex && candidate.start < best.start)) {
        best = candidate;
      }
    }
  }
  if (!best) return null;
  return { section: best.section, start: best.start, end: best.end, notes: best.notes.map((event) => ({ ...event })) };
}

function sanitizeReplayEvent(event, fallbackIndex) {
  if (!event || typeof event !== "object") return null;
  const noteId = typeof event.noteId === "string" ? event.noteId.trim() : "";
  const itemId = typeof event.itemId === "string" ? event.itemId.trim() : "";
  const section = typeof event.section === "string" ? event.section.trim() : "";
  const lane = Number(event.lane);
  const judgement = VALID_JUDGEMENTS.has(event.judgement) ? event.judgement : null;
  const offsetBucket = VALID_OFFSET_BUCKETS.has(event.offsetBucket) ? event.offsetBucket : null;
  if (!noteId || !itemId || !section || !Number.isInteger(lane) || lane < 0 || lane > 3 || !judgement || !offsetBucket) return null;
  return {
    noteId,
    itemId,
    section,
    phase: event.phase === "letters" ? "letters" : "words",
    lane,
    judgement,
    offsetBucket: judgement === "miss" ? "miss" : offsetBucket === "miss" ? "on-time" : offsetBucket,
    index: clampIndex(Number.isFinite(Number(event.index)) ? event.index : fallbackIndex),
  };
}

function groupBySection(notes) {
  const groups = [];
  const bySection = new Map();
  notes.forEach((note) => {
    let group = bySection.get(note.section);
    if (!group) {
      group = { section: note.section, notes: [], index: groups.length };
      bySection.set(note.section, group);
      groups.push(group);
    }
    group.notes.push(note);
  });
  return groups;
}

function clampLane(value) {
  const lane = Math.trunc(Number(value));
  return Number.isInteger(lane) && lane >= 0 && lane <= 3 ? lane : 0;
}

function clampIndex(value) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}
