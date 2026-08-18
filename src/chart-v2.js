import { buildChart } from "./rhythm.js?v=0.15.0";

const MODES = Object.freeze(["learn", "play", "challenge"]);
const SECTIONS = Object.freeze(["words-a", "words-b", "chorus", "letters"]);
const SECTION_BEATS = Object.freeze({
  "words-a": 4,
  "words-b": 40,
  chorus: 76,
  letters: 112,
  reward: 148,
});

const SONG_MOTIFS = Object.freeze({
  "fruit-beat": Object.freeze({ lanes: [0, 1, 2, 1, 3, 2, 0, 3], groove: [0, 0.25, 0, 0.5] }),
  "animal-parade": Object.freeze({ lanes: [0, 2, 1, 3, 1, 2, 3, 0], groove: [0, 0, 0.25, 0] }),
  "sky-sparkle": Object.freeze({ lanes: [3, 2, 0, 1, 2, 3, 1, 0], groove: [0, 0.5, 0.25, 0] }),
  "color-train": Object.freeze({ lanes: [0, 1, 2, 3, 2, 1, 0, 2], groove: [0, 0.25, 0.25, 0] }),
  "body-boogie": Object.freeze({ lanes: [1, 0, 3, 2, 0, 2, 1, 3], groove: [0, 0.5, 0, 0.25] }),
  "toy-box-bounce": Object.freeze({ lanes: [2, 0, 1, 3, 0, 3, 2, 1], groove: [0, 0.25, 0.5, 0.25] }),
});

const MODE_TIMING = Object.freeze({
  learn: Object.freeze({ holdEvery: 0, holdDuration: 0 }),
  play: Object.freeze({ holdEvery: 11, holdDuration: 1.5 }),
  challenge: Object.freeze({ holdEvery: 7, holdDuration: 1.5 }),
});

export function buildAuthoredChart(song, mode) {
  assertBuildInputs(song, mode);
  const noteCount = song.charts[mode].noteCount;
  const timing = MODE_TIMING[mode];
  const motif = SONG_MOTIFS[song.id] || deriveMotif(song.id);
  const sectionSize = noteCount / SECTIONS.length;
  const itemOccurrences = new Map();
  const events = [];

  for (let noteIndex = 0; noteIndex < noteCount; noteIndex += 1) {
    const sectionIndex = Math.min(SECTIONS.length - 1, Math.floor(noteIndex / sectionSize));
    const section = SECTIONS[sectionIndex];
    const sectionStep = noteIndex % sectionSize;
    const item = song.lesson[(sectionStep + sectionIndex) % song.lesson.length];
    const itemOccurrence = itemOccurrences.get(item.id) || 0;
    itemOccurrences.set(item.id, itemOccurrence + 1);

    const isHold = timing.holdEvery > 0 && (noteIndex + 1) % timing.holdEvery === 0;
    const sectionStart = SECTION_BEATS[section];
    const sectionEnd = SECTION_BEATS[SECTIONS[sectionIndex + 1] || "reward"];
    const sectionGap = sectionSize > 1 ? (sectionEnd - sectionStart - 3) / (sectionSize - 1) : 0;
    const groove = sectionStep === sectionSize - 1
      ? 0
      : motif.groove[noteIndex % motif.groove.length] * 0.3;
    const beat = roundBeat(sectionStart + 1 + sectionStep * sectionGap + groove);
    const lane = motif.lanes[(noteIndex + sectionIndex) % motif.lanes.length];
    const beginsSection = sectionStep === 0;

    if (beginsSection) {
      events.push(Object.freeze({
        id: `${song.id}-${mode}-${section}-cue`,
        kind: "section",
        beat: sectionStart,
        section,
        stageCue: sectionCue(section),
      }));
    }

    events.push(Object.freeze({
      id: `${song.id}-${mode}-note-${noteIndex + 1}`,
      kind: isHold ? "hold" : "tap",
      beat,
      durationBeats: isHold ? timing.holdDuration : 0,
      lane,
      itemId: item.id,
      section,
      motifStep: itemOccurrence % 4,
      accent: noteIndex % 4 === 0 ? "strong" : "light",
      stageCue: beginsSection ? sectionCue(section) : null,
    }));
  }

  return Object.freeze(events);
}

export function buildRuntimeChart(song, mode, options = {}) {
  const buildLegacyChart = options.buildLegacyChart || buildLegacyRuntimeChart;
  let authored;
  try {
    authored = Object.hasOwn(options, "authoredChart")
      ? options.authoredChart
      : buildAuthoredChart(song, mode);
  } catch {
    return buildLegacyChart(song, mode);
  }
  if (!validateAuthoredChart(authored, song, mode).valid) return buildLegacyChart(song, mode);
  const firstItemId = song.lesson[0].id;
  const profile = song.charts[mode];
  const countIn = Array.from({ length: 4 }, (_, index) => Object.freeze({
    id: `${song.id}-${mode}-count-in-${index + 1}`,
    beat: index,
    lane: null,
    kind: "lesson-cue",
    itemId: firstItemId,
    section: "count-in",
    phase: "words",
    cue: index === 3 ? "go" : "count",
    durationBeats: 0,
  }));
  const playable = authored.map((event) => {
    if (event.kind === "section") return Object.freeze({ ...event, lane: null, durationBeats: 0 });
    const phase = event.section === "letters" ? "letters" : "words";
    return Object.freeze({
      ...event,
      phase,
      cue: phase === "letters" ? "letter" : event.motifStep === 0 ? "image" : "repeat",
      hintLane: mode === "learn",
      judgement: profile.judgement,
      missFeedback: profile.missFeedback,
    });
  });
  const reward = Object.freeze({
    id: `${song.id}-${mode}-reward`,
    beat: SECTION_BEATS.reward,
    lane: null,
    kind: "lesson-cue",
    itemId: firstItemId,
    section: "reward",
    phase: "words",
    cue: "reward",
    durationBeats: 0,
  });
  return Object.freeze([...countIn, ...playable, reward].sort((first, second) => first.beat - second.beat));
}

function buildLegacyRuntimeChart(song, mode) {
  return Object.freeze(buildChart(song.lesson, "normal", song.charts[mode]));
}

export function validateAuthoredChart(chart, song, mode) {
  const errors = [];
  if (!Array.isArray(chart)) return { valid: false, errors: ["chart must be an array"] };
  if (!song?.charts?.[mode] || !MODES.includes(mode)) return { valid: false, errors: ["mode is not supported"] };

  const itemIds = new Set(song.lesson.map((item) => item.id));
  const notes = chart.filter((event) => event?.kind === "tap" || event?.kind === "hold");
  if (notes.length !== song.charts[mode].noteCount) {
    errors.push(`note count must be ${song.charts[mode].noteCount}`);
  }

  notes.forEach((event, index) => {
    if (!Number.isInteger(event.lane) || event.lane < 0 || event.lane >= song.charts[mode].lanes) {
      errors.push(`${event.id || `note ${index + 1}`} has an invalid lane`);
    }
    if (!itemIds.has(event.itemId)) errors.push(`${event.id || `note ${index + 1}`} has an invalid item`);
    if (!Number.isFinite(event.beat) || event.beat < 0) errors.push(`${event.id || `note ${index + 1}`} has an invalid beat`);
    if (!SECTIONS.includes(event.section)) errors.push(`${event.id || `note ${index + 1}`} has an invalid section`);
    if (event.kind === "tap" && event.durationBeats !== 0) {
      errors.push(`${event.id || `note ${index + 1}`} has an invalid tap duration`);
    }
    if (event.kind === "hold" && (!Number.isFinite(event.durationBeats) || event.durationBeats < 1 || event.durationBeats > 2)) {
      errors.push(`${event.id || `note ${index + 1}`} has an invalid hold duration`);
    }
    if (mode === "learn" && event.kind !== "tap") errors.push("Learn charts must be tap-only");

    const next = notes[index + 1];
    if (next && Number.isFinite(event.beat) && Number.isFinite(event.durationBeats)
      && event.beat + event.durationBeats > next.beat) {
      errors.push(`${event.id || `note ${index + 1}`} overlaps ${next.id || `note ${index + 2}`}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

function assertBuildInputs(song, mode) {
  if (!song?.id || !Array.isArray(song.lesson) || song.lesson.length === 0) {
    throw new TypeError("A song with lesson items is required");
  }
  if (!MODES.includes(mode) || !song.charts?.[mode]) throw new RangeError(`Unsupported chart mode: ${mode}`);
  if (song.charts[mode].noteCount % SECTIONS.length !== 0) {
    throw new RangeError("Chart note count must divide evenly across its sections");
  }
}

function deriveMotif(id) {
  const seed = [...id].reduce((total, character) => total + character.charCodeAt(0), 0);
  return {
    lanes: [0, 1, 2, 3].map((lane) => (lane + seed) % 4),
    groove: [0, 0.25, 0, 0.5],
  };
}

function sectionCue(section) {
  return {
    "words-a": "stage-enter",
    "words-b": "stage-shift",
    chorus: "stage-chorus",
    letters: "stage-letters",
  }[section];
}

function roundBeat(value) {
  return Math.round(value * 100) / 100;
}
