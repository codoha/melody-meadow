export const PRACTICE_SECTIONS = Object.freeze([
  "words-a",
  "words-b",
  "chorus",
  "letters",
]);

export const PRACTICE_REPEAT_MODES = Object.freeze(["once", "three", "infinite"]);

export function sanitizePracticeRepeat(value) {
  return PRACTICE_REPEAT_MODES.includes(value) ? value : "once";
}

export function getPracticeRepeatLimit(value) {
  const mode = sanitizePracticeRepeat(value);
  return mode === "three" ? 3 : mode === "infinite" ? Infinity : 1;
}

export function createPracticeRange(notes, start = 0, end = Array.isArray(notes) ? notes.length - 1 : -1) {
  const source = Array.isArray(notes) ? notes : [];
  if (source.length === 0) return { start: 0, end: -1, notes: [] };
  const first = clampIndex(start, source.length - 1);
  const last = clampIndex(end, source.length - 1);
  const rangeStart = Math.min(first, last);
  const rangeEnd = Math.max(first, last);
  return {
    start: rangeStart,
    end: rangeEnd,
    notes: source.slice(rangeStart, rangeEnd + 1).map((event) => ({ ...event })),
  };
}

export function createSectionPractice(chart, section, limit = 12) {
  if (!PRACTICE_SECTIONS.includes(section) || !Array.isArray(chart)) return [];
  const boundedLimit = Math.min(12, Math.max(8, Number(limit) || 12));
  return chart
    .filter((event) => (event.kind === "tap" || event.kind === "hold") && event.section === section)
    .slice(0, boundedLimit)
    .map(toPracticeTap);
}

export function selectWeakWords(wordResults, limit = 2) {
  if (!Array.isArray(wordResults)) return [];
  const boundedLimit = Math.min(2, Math.max(1, Number(limit) || 2));
  return [...wordResults]
    .filter((result) => result?.itemId)
    .sort((first, second) => {
      const accuracyDifference = wordAccuracy(first) - wordAccuracy(second);
      if (accuracyDifference) return accuracyDifference;
      const missDifference = (second.misses || 0) - (first.misses || 0);
      if (missDifference) return missDifference;
      return first.itemId.localeCompare(second.itemId);
    })
    .slice(0, boundedLimit)
    .map((result) => result.itemId);
}

export function createWeakWordPractice(chart, wordResults, targetNotes = 8) {
  if (!Array.isArray(chart)) return [];
  const weakWords = new Set(selectWeakWords(wordResults));
  const source = chart.filter((event) => (event.kind === "tap" || event.kind === "hold") && weakWords.has(event.itemId));
  if (source.length === 0) return [];

  const noteCount = Math.min(12, Math.max(8, Number(targetNotes) || 8));
  return Array.from({ length: noteCount }, (_, index) => ({
    ...toPracticeTap(source[index % source.length]),
    id: `weak-practice-${index + 1}`,
    beat: 5 + index * 3,
    section: "practice",
  }));
}

function toPracticeTap(event) {
  return { ...event, kind: "tap", durationBeats: 0 };
}

function wordAccuracy(result) {
  const hits = Math.max(0, Number(result.hits) || 0);
  const misses = Math.max(0, Number(result.misses) || 0);
  const attempts = hits + misses;
  return attempts ? hits / attempts : 0;
}

function clampIndex(value, maximum) {
  return Math.min(maximum, Math.max(0, Math.trunc(Number(value) || 0)));
}
