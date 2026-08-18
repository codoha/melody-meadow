export const PROGRESS_KEY = "melody-meadow-progress-v1";
const PROGRESS_VERSION = 2;
const DIFFICULTIES = new Set(["learn", "play", "challenge"]);

export function createEmptyProgress() {
  return { version: PROGRESS_VERSION, songs: {}, words: {} };
}

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(PROGRESS_KEY) || "null");
    return sanitizeProgress(parsed);
  } catch {
    return createEmptyProgress();
  }
}

export function saveProgress(storage, progress) {
  storage?.setItem(PROGRESS_KEY, JSON.stringify(sanitizeProgress(progress)));
}

export function clearProgress(storage = globalThis.localStorage) {
  storage?.removeItem(PROGRESS_KEY);
}

export function getSongProgressDisplay(songProgress, difficulty) {
  return {
    difficultyBest: DIFFICULTIES.has(difficulty)
      ? songProgress?.bestByDifficulty?.[difficulty] || null
      : null,
    legacyBest: songProgress?.legacyBest || null,
  };
}

export function mergeResult(progress, summary) {
  const current = sanitizeProgress(progress);
  if (!summary?.songId) return current;
  const completedAt = summary.completedAt || new Date().toISOString();
  const songs = { ...current.songs };

  if (summary.isFullSong) {
    const existing = songs[summary.songId] || emptySongProgress();
    const difficulty = DIFFICULTIES.has(summary.mode) ? summary.mode : null;
    const bestByDifficulty = { ...existing.bestByDifficulty };
    const candidate = {
      bestScore: positive(summary.score),
      bestAccuracy: clamp(summary.accuracy),
      bestCombo: positive(summary.maxCombo),
      bestStars: Math.min(3, positive(summary.stars)),
      completionCount: 1,
      lastPlayedAt: completedAt,
    };
    if (difficulty) {
      bestByDifficulty[difficulty] = mergeSongBest(
        existing.bestByDifficulty[difficulty],
        candidate,
      );
    }
    songs[summary.songId] = {
      bestScore: Math.max(existing.bestScore, positive(summary.score)),
      bestAccuracy: Math.max(existing.bestAccuracy, clamp(summary.accuracy)),
      bestCombo: Math.max(existing.bestCombo, positive(summary.maxCombo)),
      bestStars: Math.max(existing.bestStars, positive(summary.stars)),
      completionCount: existing.completionCount + 1,
      lastPlayedAt: completedAt,
      legacyBest: existing.legacyBest,
      bestByDifficulty,
    };
  }

  const words = { ...current.words };
  for (const result of summary.wordResults || []) {
    if (!result?.itemId) continue;
    const existing = words[result.itemId] || emptyWordProgress();
    words[result.itemId] = {
      successes: existing.successes + positive(result.hits),
      attempts: existing.attempts + positive(result.attempts),
      lastPracticedAt: completedAt,
    };
  }

  return { version: PROGRESS_VERSION, songs, words };
}

export function getWordMastery(wordProgress) {
  const successes = positive(wordProgress?.successes);
  const attempts = positive(wordProgress?.attempts);
  if (successes >= 8 && attempts > 0 && successes / attempts >= 0.75) return "Great";
  if (successes > 0) return "Learning";
  return "New";
}

function sanitizeProgress(value) {
  if (!value || typeof value !== "object") return createEmptyProgress();
  if (value.version === 1) return migrateLegacyProgress(value);
  if (value.version !== PROGRESS_VERSION) return createEmptyProgress();
  const songs = {};
  for (const [id, song] of Object.entries(value.songs || {})) {
    if (!song || typeof song !== "object") continue;
    const bestByDifficulty = sanitizeDifficultyBests(song.bestByDifficulty);
    songs[id] = {
      bestScore: positive(song.bestScore),
      bestAccuracy: clamp(song.bestAccuracy),
      bestCombo: positive(song.bestCombo),
      bestStars: Math.min(3, positive(song.bestStars)),
      completionCount: positive(song.completionCount),
      lastPlayedAt: typeof song.lastPlayedAt === "string" ? song.lastPlayedAt : "",
      legacyBest: sanitizeSongBest(song.legacyBest),
      bestByDifficulty,
    };
  }
  const words = {};
  for (const [id, word] of Object.entries(value.words || {})) {
    if (!word || typeof word !== "object") continue;
    words[id] = {
      successes: positive(word.successes),
      attempts: positive(word.attempts),
      lastPracticedAt: typeof word.lastPracticedAt === "string" ? word.lastPracticedAt : "",
    };
  }
  return { version: PROGRESS_VERSION, songs, words };
}

function emptySongProgress() {
  return {
    bestScore: 0,
    bestAccuracy: 0,
    bestCombo: 0,
    bestStars: 0,
    completionCount: 0,
    lastPlayedAt: "",
    legacyBest: null,
    bestByDifficulty: {},
  };
}

function migrateLegacyProgress(value) {
  const legacy = sanitizeProgressV1(value);
  return {
    version: PROGRESS_VERSION,
    songs: Object.fromEntries(
      Object.entries(legacy.songs).map(([id, song]) => [id, {
        ...song,
        legacyBest: { ...song },
        bestByDifficulty: {},
      }]),
    ),
    words: legacy.words,
  };
}

function sanitizeProgressV1(value) {
  const songs = {};
  for (const [id, song] of Object.entries(value.songs || {})) {
    if (!song || typeof song !== "object") continue;
    songs[id] = {
      bestScore: positive(song.bestScore),
      bestAccuracy: clamp(song.bestAccuracy),
      bestCombo: positive(song.bestCombo),
      bestStars: Math.min(3, positive(song.bestStars)),
      completionCount: positive(song.completionCount),
      lastPlayedAt: typeof song.lastPlayedAt === "string" ? song.lastPlayedAt : "",
    };
  }
  const words = {};
  for (const [id, word] of Object.entries(value.words || {})) {
    if (!word || typeof word !== "object") continue;
    words[id] = {
      successes: positive(word.successes),
      attempts: positive(word.attempts),
      lastPracticedAt: typeof word.lastPracticedAt === "string" ? word.lastPracticedAt : "",
    };
  }
  return { songs, words };
}

function sanitizeDifficultyBests(value) {
  const bests = {};
  for (const difficulty of DIFFICULTIES) {
    const candidate = value?.[difficulty];
    if (!candidate || typeof candidate !== "object") continue;
    bests[difficulty] = mergeSongBest(null, {
      bestScore: positive(candidate.bestScore),
      bestAccuracy: clamp(candidate.bestAccuracy),
      bestCombo: positive(candidate.bestCombo),
      bestStars: Math.min(3, positive(candidate.bestStars)),
      completionCount: positive(candidate.completionCount),
      lastPlayedAt: typeof candidate.lastPlayedAt === "string" ? candidate.lastPlayedAt : "",
    });
  }
  return bests;
}

function sanitizeSongBest(value) {
  if (!value || typeof value !== "object") return null;
  return mergeSongBest(null, {
    bestScore: positive(value.bestScore),
    bestAccuracy: clamp(value.bestAccuracy),
    bestCombo: positive(value.bestCombo),
    bestStars: Math.min(3, positive(value.bestStars)),
    completionCount: positive(value.completionCount),
    lastPlayedAt: typeof value.lastPlayedAt === "string" ? value.lastPlayedAt : "",
  });
}

function mergeSongBest(existing, candidate) {
  if (!existing) return { ...candidate };
  return {
    bestScore: Math.max(existing.bestScore, candidate.bestScore),
    bestAccuracy: Math.max(existing.bestAccuracy, candidate.bestAccuracy),
    bestCombo: Math.max(existing.bestCombo, candidate.bestCombo),
    bestStars: Math.max(existing.bestStars, candidate.bestStars),
    completionCount: existing.completionCount + candidate.completionCount,
    lastPlayedAt: candidate.lastPlayedAt || existing.lastPlayedAt,
  };
}

function emptyWordProgress() {
  return { successes: 0, attempts: 0, lastPracticedAt: "" };
}

function positive(value) {
  return Math.max(0, Number(value) || 0);
}

function clamp(value) {
  return Math.min(1, positive(value));
}
