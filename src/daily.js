export const DAILY_KEY = "melody-meadow-daily-v1";
export const DAILY_VERSION = 1;
export const DAILY_PLAN_SIZE = 3;

const FALLBACK_DATE_KEY = "1970-01-01";

export function getLocalDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return FALLBACK_DATE_KEY;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDailyPlan(dateKey, songIds) {
  const catalog = sanitizeSongIds(songIds);
  if (catalog.length <= DAILY_PLAN_SIZE) return catalog;
  const start = dayNumber(normalizeDateKey(dateKey)) % catalog.length;
  return Array.from({ length: DAILY_PLAN_SIZE }, (_, index) => catalog[(start + index) % catalog.length]);
}

export function sanitizeDailyRecord(value, dateKey, songIds) {
  const normalizedDateKey = normalizeDateKey(dateKey);
  const plan = createDailyPlan(normalizedDateKey, songIds);
  const eligible = new Set(plan);
  const source = value?.version === DAILY_VERSION && value?.dateKey === normalizedDateKey && Array.isArray(value.completedSongIds)
    ? value.completedSongIds
    : [];
  const completedSongIds = [...new Set(source.filter((id) => typeof id === "string" && eligible.has(id)))];
  return Object.freeze({
    version: DAILY_VERSION,
    dateKey: normalizedDateKey,
    completedSongIds: Object.freeze(completedSongIds),
  });
}

export function completeDailyRun(record, {
  songId,
  startDateKey,
  songIds,
} = {}) {
  const normalizedStart = normalizeDateKey(startDateKey);
  const current = sanitizeDailyRecord(record, normalizedStart, songIds);
  const plan = createDailyPlan(normalizedStart, songIds);
  if (!plan.includes(songId) || current.completedSongIds.includes(songId)) {
    return current;
  }
  return sanitizeDailyRecord({
    ...current,
    completedSongIds: [...current.completedSongIds, songId],
  }, normalizedStart, songIds);
}

export function getDailySummary(record, songIds) {
  const dateKey = normalizeDateKey(record?.dateKey);
  const current = sanitizeDailyRecord(record, dateKey, songIds);
  const planSongIds = createDailyPlan(dateKey, songIds);
  return Object.freeze({
    dateKey,
    planSongIds: Object.freeze(planSongIds),
    completedSongIds: current.completedSongIds,
    completedCount: current.completedSongIds.length,
    total: planSongIds.length,
    isComplete: planSongIds.length > 0 && current.completedSongIds.length === planSongIds.length,
  });
}

export function getNextDailySong(record, songIds, currentSongId = null) {
  const summary = getDailySummary(record, songIds);
  if (summary.isComplete || summary.planSongIds.length === 0) return null;
  const completed = new Set(summary.completedSongIds);
  const currentIndex = summary.planSongIds.indexOf(currentSongId);
  const start = currentIndex >= 0 ? currentIndex + 1 : 0;
  for (let offset = 0; offset < summary.planSongIds.length; offset += 1) {
    const songId = summary.planSongIds[(start + offset) % summary.planSongIds.length];
    if (!completed.has(songId)) return songId;
  }
  return null;
}

export function loadDaily(storage = globalThis.localStorage, dateKey = getLocalDateKey(), songIds = []) {
  try {
    return sanitizeDailyRecord(JSON.parse(storage?.getItem(DAILY_KEY) || "null"), dateKey, songIds);
  } catch {
    return sanitizeDailyRecord(null, dateKey, songIds);
  }
}

export function saveDaily(storage, record, dateKey = record?.dateKey, songIds = []) {
  const sanitized = sanitizeDailyRecord(record, dateKey, songIds);
  try {
    storage?.setItem(DAILY_KEY, JSON.stringify(sanitized));
  } catch {
    return sanitized;
  }
  return sanitized;
}

function sanitizeSongIds(songIds) {
  if (!Array.isArray(songIds)) return [];
  return [...new Set(songIds.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()))];
}

function normalizeDateKey(value) {
  if (typeof value !== "string") return FALLBACK_DATE_KEY;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return FALLBACK_DATE_KEY;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() + 1 === Number(month)
    && date.getUTCDate() === Number(day)
    ? value
    : FALLBACK_DATE_KEY;
}

function dayNumber(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}
