import { SongPlayer, playSuccessfulCue } from "./audio.js?v=0.15.0";
import { buildRuntimeChart } from "./chart-v2.js?v=0.15.0";
import { HitEffectsRenderer, createHitEffectPlan } from "./hit-effects.js?v=0.15.0";
import { advanceHold, cancelHold, createHoldState, pressHold, releaseHold } from "./hold-judgement.js?v=0.15.0";
import { DEFAULT_GAME_MODE, SONGS, getSong } from "./songs.js?v=0.15.0";
import { realOffsetToMediaMs, sanitizePlaybackRate } from "./music-transport.js?v=0.15.0";
import {
  createPracticeRange,
  createSectionPractice,
  createWeakWordPractice,
  getPracticeRepeatLimit,
  sanitizePracticeRepeat,
} from "./practice.js?v=0.15.0";
import {
  applyJudgement,
  getJudgementWindows,
  getLaneForKey,
  getRhythmConfig,
  judgeTap,
  resolveCorrectedElapsed,
  shouldExpireMiss,
} from "./rhythm.js?v=0.15.0";
import {
  canSelectSong,
  createPracticeChart,
  createResultSummary,
  createSession,
  transitionSession,
} from "./session.js?v=0.15.0";
import { getSongProgressDisplay, getWordMastery, loadProgress, mergeResult, saveProgress } from "./progress.js?v=0.15.0";
import { createDefaultSettings, loadSettings, resetCalibration, saveSettings } from "./settings.js?v=0.15.0";
import {
  CALIBRATION_BEAT_MS,
  estimateCalibrationOffset,
  getCalibrationStatus,
  getOffsetBucket,
  matchCalibrationTap,
  summarizeSync,
} from "./timing.js?v=0.15.0";
import { SongClock } from "./song-clock.js?v=0.15.0";
import { createStageFrame, getStageTheme } from "./stage-director.js?v=0.15.0";
import {
  clearReplay,
  createReplayEvent,
  createReplayRecord,
  loadReplay,
  saveReplay,
  selectWeakPracticeRange,
} from "./replay.js?v=0.15.0";
import {
  completeDailyRun,
  getDailySummary,
  getLocalDateKey,
  getNextDailySong,
  loadDaily,
  saveDaily,
} from "./daily.js?v=0.15.0";

const elements = {
  app: document.querySelector(".rhythm-app"),
  accuracy: document.querySelector("#accuracy-value"),
  bad: document.querySelector("#bad-value"),
  beat: document.querySelector("#beat-button"),
  combo: document.querySelector("#combo-value"),
  comboPop: document.querySelector("#combo-pop"),
  completeScreen: document.querySelector("#complete-screen"),
  completeTitle: document.querySelector("#complete-title"),
  countdown: document.querySelector("#countdown"),
  currentWord: document.querySelector("#current-word"),
  currentWordImage: document.querySelector("#current-word-image"),
  exit: document.querySelector("#exit-button"),
  feedback: document.querySelector("#judgement-feedback"),
  finalScore: document.querySelector("#final-score"),
  finalAccuracy: document.querySelector("#final-accuracy"),
  finalBest: document.querySelector("#final-best"),
  finalCombo: document.querySelector("#final-combo"),
  finalDifficulty: document.querySelector("#final-difficulty"),
  finalGood: document.querySelector("#final-good"),
  finalMiss: document.querySelector("#final-miss"),
  finalPerfect: document.querySelector("#final-perfect"),
  hudProgress: document.querySelector("#hud-progress-value"),
  hitEffectsCanvas: document.querySelector("#hit-effects-canvas"),
  judgementLine: document.querySelector(".judgement-line"),
  laneFrame: document.querySelector("#lane-frame"),
  learnedRow: document.querySelector("#learned-row"),
  learningTargets: document.querySelector("#learning-targets"),
  libraryViewSongbook: document.querySelector("#library-view-songbook"),
  libraryViewToday: document.querySelector("#library-view-today"),
  lyric: document.querySelector("#lyric-line"),
  miss: document.querySelector("#miss-value"),
  pause: document.querySelector("#pause-button"),
  parentSettings: document.querySelector("#parent-settings-screen"),
  parentSettingsButton: document.querySelector("#parent-settings-button"),
  parentSettingsClose: document.querySelector("#parent-settings-close-button"),
  parentSettingsDone: document.querySelector("#parent-settings-done-button"),
  parentSettingsReset: document.querySelector("#parent-settings-reset-button"),
  calibrationStatus: document.querySelector("#calibration-status"),
  calibrationOpen: document.querySelector("#calibration-open-button"),
  calibrationReset: document.querySelector("#calibration-reset-button"),
  calibrationScreen: document.querySelector("#calibration-screen"),
  calibrationClose: document.querySelector("#calibration-close-button"),
  calibrationInstructions: document.querySelector("#calibration-instructions"),
  calibrationAudioNote: document.querySelector("#calibration-audio-note"),
  calibrationStep: document.querySelector("#calibration-step"),
  calibrationResult: document.querySelector("#calibration-result"),
  calibrationTarget: document.querySelector("#calibration-target"),
  calibrationCancel: document.querySelector("#calibration-cancel-button"),
  calibrationRetry: document.querySelector("#calibration-retry-button"),
  calibrationStart: document.querySelector("#calibration-start-button"),
  calibrationConfirm: document.querySelector("#calibration-confirm-button"),
  practiceButton: document.querySelector("#practice-button"),
  practiceClose: document.querySelector("#practice-close-button"),
  practiceExit: document.querySelector("#practice-exit-button"),
  practiceTitle: document.querySelector("#practice-title"),
  practiceStart: document.querySelector("#practice-start-button"),
  practiceLoopStatus: document.querySelector("#practice-loop-status"),
  practiceRangeTrack: document.querySelector("#practice-range-track"),
  practiceRangeStart: document.querySelector("#practice-range-start"),
  practiceRangeEnd: document.querySelector("#practice-range-end"),
  practiceRangeLabel: document.querySelector("#practice-range-label"),
  practiceOptions: [...document.querySelectorAll("[data-practice]")],
  practiceRepeatOptions: [...document.querySelectorAll("[data-practice-repeat]")],
  practiceReturn: document.querySelector("#practice-return-button"),
  practiceScreen: document.querySelector("#practice-screen"),
  resultPractice: document.querySelector("#result-practice-button"),
  resultWeakPractice: document.querySelector("#result-weak-practice-button"),
  phase: document.querySelector("#phase-label"),
  playAgain: document.querySelector("#play-again-button"),
  progressBar: document.querySelector("#top-progress-bar"),
  progressLabel: document.querySelector("#top-progress-label"),
  previewCards: document.querySelector("#preview-cards"),
  previewEnabled: document.querySelector("#preview-enabled-control"),
  previewNext: document.querySelector("#preview-next-button"),
  previewScreen: document.querySelector("#preview-screen"),
  previewSkip: document.querySelector("#preview-skip-button"),
  previewStart: document.querySelector("#preview-start-button"),
  previewStep: document.querySelector("#preview-step"),
  restart: document.querySelector("#restart-button"),
  resultExit: document.querySelector("#result-exit-button"),
  resultNextLesson: document.querySelector("#result-next-lesson-button"),
  resultReview: document.querySelector("#result-review-button"),
  resultStars: document.querySelector("#result-stars"),
  syncResult: document.querySelector("#sync-result"),
  syncRate: document.querySelector("#sync-rate"),
  syncCoaching: document.querySelector("#sync-coaching"),
  syncEarly: document.querySelector("#sync-early"),
  syncOnTime: document.querySelector("#sync-on-time"),
  syncLate: document.querySelector("#sync-late"),
  syncMisses: document.querySelector("#sync-misses"),
  score: document.querySelector("#score-value"),
  section: document.querySelector("#section-label"),
  sectionBanner: document.querySelector("#section-banner"),
  setupBpm: document.querySelector("#setup-bpm"),
  setupCover: document.querySelector("#setup-cover-image"),
  setupDuration: document.querySelector("#setup-duration"),
  setupNoteCount: document.querySelector("#setup-note-count"),
  setupPreviewEnabled: document.querySelector("#setup-preview-enabled-control"),
  setupTitle: document.querySelector("#setup-title"),
  setupTopic: document.querySelector("#setup-topic"),
  setupSpeedOutput: document.querySelector("#setup-speed-output"),
  gameSpeedOutput: document.querySelector("#game-speed-output"),
  replayClose: document.querySelector("#replay-close-button"),
  replayBack: document.querySelector("#replay-back-button"),
  replayDetail: document.querySelector("#replay-detail"),
  replayPractice: document.querySelector("#replay-practice-button"),
  replayScreen: document.querySelector("#replay-screen"),
  replaySections: document.querySelector("#replay-sections"),
  setupBest: document.querySelector("#setup-best"),
  setupMastery: document.querySelector("#setup-mastery"),
  songTime: document.querySelector("#song-time"),
  songDuration: document.querySelector("#song-duration"),
  songTitle: document.querySelector("#song-title"),
  musicVolume: document.querySelector("#music-volume-control"),
  musicVolumeOutput: document.querySelector("#music-volume-output"),
  voiceVolume: document.querySelector("#voice-volume-control"),
  voiceVolumeOutput: document.querySelector("#voice-volume-output"),
  effectsVolume: document.querySelector("#effects-volume-control"),
  effectsVolumeOutput: document.querySelector("#effects-volume-output"),
  star: document.querySelector("#star-value"),
  startButton: document.querySelector("#start-button"),
  startScreen: document.querySelector("#start-screen"),
  tempo: document.querySelector("#tempo-label"),
  todayProgress: document.querySelector("#today-progress"),
  todayResultStatus: document.querySelector("#today-result-status"),
  todayLearned: document.querySelector("#today-learned"),
  practiceNext: document.querySelector("#practice-next"),
  volume: document.querySelector("#volume-control"),
};

const laneNoteContainers = [...document.querySelectorAll(".lane-notes")];
const laneButtons = [...document.querySelectorAll(".lane-pad")];
const speedSliders = [...document.querySelectorAll(".speed-slider")];
const modeButtons = [...document.querySelectorAll(".mode-option")];
const songButtons = [...document.querySelectorAll(".song-choice")];
const libraryViewButtons = [...document.querySelectorAll("[data-library-view]")];
const timelineSections = [...document.querySelectorAll(".timeline-sections i")];
const catalogSongIds = SONGS.map((song) => song.id);
const player = new SongPlayer();
const hitEffects = new HitEffectsRenderer(elements.hitEffectsCanvas);
const songClock = new SongClock();
const effectTimers = new Set();
const effectFrames = new Set();
const effectClassTimers = new WeakMap();
const storage = getSafeStorage();
let settings = loadSettings(storage);

let chart = [];
let noteEvents = [];
let stats = emptyStats();
let misses = 0;
let badTaps = 0;
let nextCueIndex = 0;
let nextSpawnIndex = 0;
let completedNotes = 0;
let animationFrame = 0;
let feedbackTimer = 0;
let finishTimer = 0;
let previewTimer = 0;
let chartEvents = [];
let runTrace = [];
let runTimingEvents = [];
let isRunning = false;
let isPaused = false;
let pauseTransition = false;
let isBeatEnabled = true;
let runId = 0;
let runDailyContext = null;
let runDailyKey = null;
let selectedPlaybackRate = settings.playbackRate;
let selectedGameMode = DEFAULT_GAME_MODE;
let selectedSong = SONGS[0];
let selectedPracticeSection = "words-a";
let selectedPracticeRepeat = "once";
let selectedPracticeSource = "section";
let lastResultSummary = null;
let lastReplayRecord = loadReplay(storage);
let practiceNotes = [];
let replayPracticeNotes = null;
let practiceRangeReady = false;
let previewIndex = 0;
let progress = loadProgress(storage);
let dailyDateKey = getLocalDateKey();
let dailyRecord = loadDaily(storage, dailyDateKey, catalogSongIds);
let activeLibraryView = "today";
let nextDailySongId = null;
let previewDailyKey = dailyDateKey;
let activeSession = createSession({ songId: selectedSong.id, mode: selectedGameMode });
let rhythmConfig = getRhythmConfig(selectedPlaybackRate, selectedSong.charts[selectedGameMode], selectedSong.bpms);
let songDurationMs = estimateDuration(selectedSong, rhythmConfig);
let lastSection = "";
let currentStageSection = "count-in";
let currentStageClass = "";
let stageCueUntilMs = 0;
let calibrationRun = null;
let calibrationRetryPending = false;
const activeLaneInputs = new Map();
const heldNotesByLane = new Map();

player.setAudioMix(settings);
syncAudioMixControls();
syncCalibrationStatus();

elements.startButton.addEventListener("click", prepareSongPreview);
elements.previewNext.addEventListener("click", advancePreview);
elements.previewSkip.addEventListener("click", beginSongFromPreview);
elements.previewStart.addEventListener("click", beginSongFromPreview);
elements.previewEnabled.addEventListener("change", () => {
  setPreviewEnabled(elements.previewEnabled.checked);
});
elements.setupPreviewEnabled.addEventListener("change", () => {
  setPreviewEnabled(elements.setupPreviewEnabled.checked);
});
elements.parentSettingsButton.addEventListener("click", openParentSettings);
elements.parentSettingsClose.addEventListener("click", closeParentSettings);
elements.parentSettingsDone.addEventListener("click", closeParentSettings);
elements.parentSettingsReset.addEventListener("click", resetAudioMix);
elements.calibrationOpen.addEventListener("click", openCalibration);
elements.calibrationClose.addEventListener("click", () => closeCalibration());
elements.calibrationCancel.addEventListener("click", () => closeCalibration());
elements.calibrationStart.addEventListener("click", startCalibration);
elements.calibrationRetry.addEventListener("click", () => {
  stopCalibrationRun();
  startCalibration();
});
elements.calibrationConfirm.addEventListener("click", confirmCalibration);
elements.calibrationReset.addEventListener("click", resetDeviceCalibration);
elements.calibrationTarget.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  recordCalibrationTap(performance.now());
});
for (const control of [elements.musicVolume, elements.voiceVolume, elements.effectsVolume]) {
  control.addEventListener("input", saveAudioMixFromControls);
}
document.addEventListener("keydown", (event) => {
  if (!elements.calibrationScreen.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCalibration();
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (calibrationRun?.phase === "targets") recordCalibrationTap(performance.now());
      return;
    }
    if (event.key === "Tab") {
      trapCalibrationFocus(event);
      return;
    }
  }
  if (event.key === "Escape" && !elements.parentSettings.hidden) closeParentSettings();
  if (event.key === "Escape" && !elements.replayScreen.hidden) closeReplayReview();
});

document.addEventListener("visibilitychange", () => {
  if (!elements.calibrationScreen.hidden && document.hidden) interruptCalibration();
  if (document.hidden) {
    cancelInterruptedHolds();
    clearLaneInputs();
    clearTransientEffects();
    if (isRunning && !isPaused) void togglePause();
  }
});
window.addEventListener("pagehide", () => {
  if (!elements.calibrationScreen.hidden) interruptCalibration();
  cancelInterruptedHolds();
  clearLaneInputs();
  clearTransientEffects();
  if (isRunning && !isPaused) void togglePause();
});
window.addEventListener("blur", () => {
  cancelInterruptedHolds();
  clearLaneInputs();
  clearTransientEffects();
  if (isRunning && !isPaused) void togglePause();
});

function prepareSongPreview() {
  refreshDailyState();
  if (activeLibraryView === "today") ensureTodaySelection();
  previewDailyKey = dailyDateKey;
  openWordPreview();
}

function captureDailyRunContext() {
  const summary = getDailySummary(dailyRecord, catalogSongIds);
  runDailyKey = summary.dateKey;
  runDailyContext = Object.freeze({
    dateKey: summary.dateKey,
    orderedSongIds: summary.planSongIds,
    originView: activeLibraryView,
    record: dailyRecord,
  });
}

function refreshDailyState(now = new Date()) {
  dailyDateKey = getLocalDateKey(now);
  dailyRecord = loadDaily(storage, dailyDateKey, catalogSongIds);
  renderDailyLibrary();
}

function setLibraryView(view, { focusSelection = false } = {}) {
  if (!canSelectSong(activeSession) || !["today", "songbook"].includes(view)) return;
  activeLibraryView = view;
  if (view === "today") ensureTodaySelection();
  renderDailyLibrary();
  if (focusSelection) {
    songButtons.find((button) => button.dataset.song === selectedSong.id)?.focus();
  }
}

function ensureTodaySelection() {
  if (!canSelectSong(activeSession)) return;
  const summary = getDailySummary(dailyRecord, catalogSongIds);
  if (summary.planSongIds.includes(selectedSong.id)) return;
  const nextSongId = getNextDailySong(dailyRecord, catalogSongIds) || summary.planSongIds[0];
  if (nextSongId) selectSong(nextSongId);
}

function renderDailyLibrary() {
  const summary = getDailySummary(dailyRecord, catalogSongIds);
  const completed = new Set(summary.completedSongIds);
  elements.todayProgress.textContent = `Today: ${summary.completedCount} of ${summary.total} lessons`;
  libraryViewButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.libraryView === activeLibraryView));
  });
  songButtons.forEach((button) => {
    const inToday = summary.planSongIds.includes(button.dataset.song);
    const isComplete = completed.has(button.dataset.song);
    button.hidden = activeLibraryView === "today" && !inToday;
    button.dataset.dailyComplete = String(isComplete);
    const badge = button.querySelector("b");
    if (badge) badge.textContent = isComplete ? "Done" : inToday ? "Today" : "Easy";
  });
}

function setPreviewEnabled(enabled) {
  try {
    settings = saveSettings(storage, { ...settings, previewEnabled: Boolean(enabled) });
  } catch {
    // Private browsing can reject localStorage writes.
    settings = { ...settings, previewEnabled: Boolean(enabled) };
  }
  elements.previewEnabled.checked = settings.previewEnabled;
  elements.setupPreviewEnabled.checked = settings.previewEnabled;
}

function openParentSettings() {
  if (!canSelectSong(activeSession) || elements.startScreen.classList.contains("is-hidden")) return;
  elements.parentSettings.hidden = false;
  elements.app.inert = true;
  elements.startScreen.inert = true;
  elements.parentSettingsClose.focus();
}

function closeParentSettings() {
  if (!elements.calibrationScreen.hidden) closeCalibration();
  if (elements.parentSettings.hidden) return;
  elements.parentSettings.hidden = true;
  elements.app.inert = false;
  elements.startScreen.inert = false;
  elements.parentSettingsButton.focus();
}

function calibrationStatusLabel() {
  const status = getCalibrationStatus(settings.inputOffsetMs, settings.calibrationVersion);
  return {
    "not-calibrated": "Not calibrated",
    balanced: "Balanced",
    early: "Taps arrive early",
    late: "Taps arrive late",
  }[status];
}

function syncCalibrationStatus() {
  elements.calibrationStatus.textContent = calibrationStatusLabel();
}

function openCalibration() {
  if (!canSelectSong(activeSession) || elements.startScreen.classList.contains("is-hidden")) return;
  elements.calibrationScreen.hidden = false;
  elements.parentSettings.inert = true;
  elements.app.inert = true;
  elements.startScreen.inert = true;
  resetCalibrationSurface({ retry: calibrationRetryPending });
  elements.calibrationClose.focus();
}

function closeCalibration({ interrupted = false, saved = false } = {}) {
  if (elements.calibrationScreen.hidden && !calibrationRun) return;
  if (calibrationRun && !saved) calibrationRetryPending = true;
  stopCalibrationRun();
  elements.calibrationScreen.hidden = true;
  elements.parentSettings.inert = false;
  elements.app.inert = true;
  elements.startScreen.inert = true;
  if (interrupted) {
    elements.parentSettings.hidden = true;
    elements.app.inert = false;
    elements.startScreen.inert = false;
    calibrationRetryPending = true;
    elements.parentSettingsButton.focus();
    return;
  }
  elements.calibrationOpen.focus();
}

function interruptCalibration() {
  closeCalibration({ interrupted: true });
}

function resetCalibrationSurface({ retry = false } = {}) {
  elements.calibrationStep.textContent = retry ? "Retry when ready" : "Ready";
  elements.calibrationResult.textContent = "";
  elements.calibrationInstructions.textContent = retry
    ? "The last attempt was not saved. Tap every beat when you are ready."
    : "Tap the large target on every beat. This is saved only after you confirm.";
  elements.calibrationTarget.hidden = true;
  elements.calibrationStart.hidden = false;
  elements.calibrationRetry.hidden = true;
  elements.calibrationConfirm.hidden = true;
  elements.calibrationCancel.hidden = false;
  const calibrationAudioMuted = settings.effectsVolume <= 0 || player.muted || player.volume <= 0;
  elements.calibrationAudioNote.hidden = !calibrationAudioMuted;
  elements.calibrationAudioNote.textContent = !calibrationAudioMuted
    ? ""
    : "Audio is muted. Raise Tap sounds or game volume for audio timing, or continue with visual targets.";
}

async function startCalibration() {
  if (calibrationRun) return;
  const token = Symbol("calibration");
  const targetCount = 12;
  calibrationRun = { token, phase: "starting", samples: [], claimed: new Set(), targetTimes: [], timers: [] };
  resetCalibrationSurface();
  elements.calibrationStart.hidden = true;
  elements.calibrationCancel.hidden = false;
  elements.calibrationStep.textContent = "Listening…";
  let schedule;
  const audioTimeout = Symbol("audio-timeout");
  try {
    schedule = await Promise.race([
      player.startCalibration({ beatMs: CALIBRATION_BEAT_MS, countIn: 4, targets: targetCount }),
      new Promise((resolve) => window.setTimeout(() => resolve(audioTimeout), 450)),
    ]);
  } catch {
    schedule = null;
  }
  if (schedule === audioTimeout) {
    player.stopCalibration();
    schedule = null;
    elements.calibrationAudioNote.hidden = false;
    elements.calibrationAudioNote.textContent = "Audio could not start. You can continue with visual targets or try again.";
  }
  if (!calibrationRun || calibrationRun.token !== token) return;
  const performanceAnchor = schedule?.audioStartTime != null && player.context
    ? performance.now() + (schedule.audioStartTime - player.context.currentTime) * 1000
    : performance.now() + (4 * CALIBRATION_BEAT_MS);
  if (!Number.isFinite(performanceAnchor)) {
    interruptCalibration();
    return;
  }
  calibrationRun.phase = "targets";
  calibrationRun.anchor = performanceAnchor;
  calibrationRun.targetTimes = Array.from({ length: targetCount }, (_, index) => performanceAnchor + index * CALIBRATION_BEAT_MS);
  if (schedule && player.context) {
    const onContextStateChange = () => {
      if (calibrationRun?.token === token && player.context?.state !== "running") interruptCalibration();
    };
    player.context.addEventListener("statechange", onContextStateChange);
    calibrationRun.contextStateTarget = player.context;
    calibrationRun.contextStateHandler = onContextStateChange;
  }
  calibrationRun.targetTimes.forEach((targetTime, index) => {
    const delay = Math.max(0, targetTime - performance.now());
    const timer = window.setTimeout(() => showCalibrationTarget(token, index), delay);
    calibrationRun?.timers.push(timer);
  });
  const finishDelay = Math.max(0, performanceAnchor + targetCount * CALIBRATION_BEAT_MS + 650 - performance.now());
  calibrationRun.timers.push(window.setTimeout(() => finishCalibration(token), finishDelay));
}

function showCalibrationTarget(token, index) {
  if (!calibrationRun || calibrationRun.token !== token || calibrationRun.phase !== "targets") return;
  elements.calibrationTarget.hidden = false;
  elements.calibrationStep.textContent = `Beat ${index + 1} of 12`;
  elements.calibrationTarget.classList.remove("is-beat");
  void elements.calibrationTarget.offsetWidth;
  elements.calibrationTarget.classList.add("is-beat");
}

function recordCalibrationTap(tapTime) {
  if (!calibrationRun || calibrationRun.phase !== "targets") return;
  const match = matchCalibrationTap(tapTime, calibrationRun.targetTimes, calibrationRun.claimed);
  if (!match) return;
  calibrationRun.claimed.add(match.id);
  calibrationRun.samples.push(match.offsetMs);
  elements.calibrationResult.textContent = `${calibrationRun.samples.length} captured`;
  elements.calibrationTarget.hidden = true;
}

function finishCalibration(token) {
  if (!calibrationRun || calibrationRun.token !== token) return;
  calibrationRun.phase = "result";
  const result = estimateCalibrationOffset(calibrationRun.samples);
  calibrationRun.result = result;
  calibrationRetryPending = result.shouldRetry;
  elements.calibrationTarget.hidden = true;
  elements.calibrationStep.textContent = result.shouldRetry ? "Try again" : "Timing found";
  elements.calibrationResult.textContent = result.shouldRetry
    ? `${result.sampleCount} of 12 beats · spread too wide`
    : `Offset ${result.offsetMs > 0 ? "+" : ""}${result.offsetMs} ms · ${result.sampleCount} beats`;
  elements.calibrationInstructions.textContent = result.shouldRetry
    ? "Tap more steadily so the game can find a reliable setting."
    : "Listen to the result, then use it or try again.";
  elements.calibrationRetry.hidden = false;
  elements.calibrationConfirm.hidden = result.shouldRetry;
  elements.calibrationStart.hidden = true;
  elements.calibrationCancel.hidden = false;
}

function confirmCalibration() {
  const result = calibrationRun?.result;
  if (!result || result.shouldRetry) return;
  try {
    settings = saveSettings(storage, { ...settings, inputOffsetMs: result.offsetMs, calibrationVersion: 1 });
  } catch {
    settings = { ...settings, inputOffsetMs: result.offsetMs, calibrationVersion: 1 };
  }
  calibrationRetryPending = false;
  syncCalibrationStatus();
  closeCalibration({ saved: true });
}

function resetDeviceCalibration() {
  stopCalibrationRun();
  settings = resetCalibration(storage, settings);
  calibrationRetryPending = false;
  syncCalibrationStatus();
  resetCalibrationSurface();
}

function stopCalibrationRun() {
  if (calibrationRun) {
    calibrationRun.timers.forEach((timer) => window.clearTimeout(timer));
    calibrationRun.contextStateTarget?.removeEventListener("statechange", calibrationRun.contextStateHandler);
  }
  calibrationRun = null;
  player.stopCalibration();
  elements.calibrationTarget.hidden = true;
}

function trapCalibrationFocus(event) {
  const focusable = [...elements.calibrationScreen.querySelectorAll("button:not([hidden]), [href], input:not([hidden])")]
    .filter((node) => !node.disabled);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function saveAudioMixFromControls() {
  updateAudioMix({
    musicVolume: Number(elements.musicVolume.value) / 100,
    voiceVolume: Number(elements.voiceVolume.value) / 100,
    effectsVolume: Number(elements.effectsVolume.value) / 100,
  });
}

function resetAudioMix() {
  const defaults = createDefaultSettings();
  updateAudioMix({
    musicVolume: defaults.musicVolume,
    voiceVolume: defaults.voiceVolume,
    effectsVolume: defaults.effectsVolume,
  });
}

function updateAudioMix(audioMix) {
  try {
    settings = saveSettings(storage, { ...settings, ...audioMix });
  } catch {
    settings = { ...settings, ...audioMix };
  }
  player.setAudioMix(settings);
  syncAudioMixControls();
}

function syncAudioMixControls() {
  for (const [control, output, value] of [
    [elements.musicVolume, elements.musicVolumeOutput, settings.musicVolume],
    [elements.voiceVolume, elements.voiceVolumeOutput, settings.voiceVolume],
    [elements.effectsVolume, elements.effectsVolumeOutput, settings.effectsVolume],
  ]) {
    const percentage = Math.round(value * 100);
    control.value = String(percentage);
    output.textContent = `${percentage}%`;
  }
}

async function beginSongFromPreview() {
  clearPreviewTimer();
  if (activeLibraryView === "today" && getLocalDateKey() !== previewDailyKey) {
    showSongSetup();
    return;
  }
  refreshDailyState();
  captureDailyRunContext();
  elements.previewScreen.hidden = true;
  elements.previewScreen.removeAttribute("aria-busy");
  elements.app.inert = false;
  elements.startScreen.inert = false;
  elements.startButton.disabled = true;
  elements.startButton.disabled = false;
  activeSession = transitionSession(activeSession, "start");
  elements.startScreen.classList.add("is-hidden");
  await startSong();
}

elements.restart.addEventListener("click", () => {
  activeSession = transitionSession(activeSession, "restart");
  startSong();
});
elements.playAgain.addEventListener("click", () => {
  if (activeSession.mode === "practice") {
    runDailyContext = null;
    activeSession = createSession({
      songId: selectedSong.id,
      mode: "practice",
      practice: selectedPracticeSource === "weak" ? "weak-words" : selectedPracticeSection,
      practiceRepeat: selectedPracticeRepeat,
    });
    activeSession = transitionSession(activeSession, "start");
  } else {
    refreshDailyState();
    captureDailyRunContext();
    activeSession = transitionSession(activeSession, "restart");
  }
  elements.completeScreen.hidden = true;
  startSong();
});
elements.exit.addEventListener("click", showSongSetup);
elements.resultExit.addEventListener("click", showSongSetup);
elements.practiceButton.addEventListener("click", openPracticeChooser);
elements.resultPractice.addEventListener("click", openPracticeChooser);
elements.resultWeakPractice.addEventListener("click", openWeakPracticeChooser);
elements.resultReview.addEventListener("click", openReplayReview);
elements.resultNextLesson.addEventListener("click", openNextDailyLesson);
elements.replayClose.addEventListener("click", closeReplayReview);
elements.replayBack.addEventListener("click", closeReplayReview);
elements.replayPractice.addEventListener("click", openPracticeFromReplay);
elements.practiceClose.addEventListener("click", closePracticeChooser);
elements.practiceExit.addEventListener("click", closePracticeChooser);
elements.practiceReturn.addEventListener("click", () => {
  refreshDailyState();
  captureDailyRunContext();
  activeSession = transitionSession(activeSession, "return-to-song");
  activeSession = createSession({ songId: selectedSong.id, mode: selectedGameMode });
  rhythmConfig = getRhythmConfig(selectedPlaybackRate, selectedSong.charts[selectedGameMode], selectedSong.bpms);
  updateModeControls();
  updateSpeedControls();
  elements.setupNoteCount.textContent = String(selectedSong.charts[selectedGameMode].noteCount);
  activeSession = transitionSession(activeSession, "start");
  elements.completeScreen.hidden = true;
  startSong();
});
elements.practiceOptions.forEach((button) => {
  button.addEventListener("click", () => selectPracticeSection(button.dataset.practice));
});
elements.practiceRepeatOptions.forEach((button) => {
  button.addEventListener("click", () => selectPracticeRepeat(button.dataset.practiceRepeat));
});
elements.practiceStart.addEventListener("click", startPractice);
for (const control of [elements.practiceRangeStart, elements.practiceRangeEnd]) {
  control.addEventListener("input", updatePracticeRangeFromControls);
}
elements.pause.addEventListener("click", togglePause);

speedSliders.forEach((slider) => {
  slider.addEventListener("input", () => setPlaybackRate(slider.value));
});

songButtons.forEach((button) => {
  button.addEventListener("click", () => selectSong(button.dataset.song));
});

libraryViewButtons.forEach((button) => {
  button.addEventListener("click", () => setLibraryView(button.dataset.libraryView, { focusSelection: true }));
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setGameMode(button.dataset.mode));
});

elements.volume.addEventListener("input", () => {
  player.setVolume(Number(elements.volume.value) / 100);
});

elements.beat.addEventListener("click", () => {
  isBeatEnabled = !isBeatEnabled;
  player.setBeatEnabled(isBeatEnabled);
  elements.beat.classList.toggle("is-active", isBeatEnabled);
  elements.beat.setAttribute("aria-pressed", String(isBeatEnabled));
  elements.beat.setAttribute("aria-label", isBeatEnabled ? "Turn beat off" : "Turn beat on");
});

laneButtons.forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    pressLaneInput(Number(button.dataset.lane), `pointer:${event.pointerId}`);
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(eventName, (event) => {
      event.preventDefault();
      releaseLaneInput(`pointer:${event.pointerId}`);
    });
  }
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && !elements.previewScreen.hidden) {
    beginSongFromPreview();
    return;
  }
  if (event.code === "Escape" && isRunning) {
    togglePause();
    return;
  }
  const lane = getLaneForKey(event.code, event.repeat);
  if (lane !== null) {
    event.preventDefault();
    pressLaneInput(lane, `key:${event.code}`);
  }
});

window.addEventListener("keyup", (event) => {
  const lane = getLaneForKey(event.code);
  if (lane === null) return;
  event.preventDefault();
  releaseLaneInput(`key:${event.code}`);
});

async function startSong() {
  runId += 1;
  const currentRun = runId;
  elements.startScreen.inert = true;
  clearRunTimers();
  player.stop();
  if (activeSession.mode !== "practice") {
    clearReplay(storage);
    lastReplayRecord = null;
  }
  laneNoteContainers.forEach((lane) => lane.replaceChildren());
  clearPlayEffects();

  const chartProfile = selectedSong.charts[selectedGameMode] || selectedSong.charts.play;
  const baseChart = activeSession.mode === "practice"
    ? createPracticeChart(getPracticeNotes())
    : buildRuntimeChart(selectedSong, selectedGameMode);

  chart = baseChart.map((event) => ({
    ...event,
    eventAt: event.beat * rhythmConfig.beatMs,
    tailAt: event.kind === "hold"
      ? (event.beat + event.durationBeats) * rhythmConfig.beatMs
      : null,
    spawnAt: event.kind === "tap" || event.kind === "hold"
      ? event.beat * rhythmConfig.beatMs - rhythmConfig.travelMs
      : null,
    travelMs: rhythmConfig.travelMs,
    travelBeats: rhythmConfig.travelBeats,
    status: event.kind === "tap" || event.kind === "hold" ? "waiting" : "pending",
    holdState: event.kind === "hold" ? createHoldState({
      ...event,
      eventAt: event.beat * rhythmConfig.beatMs,
      tailAt: (event.beat + event.durationBeats) * rhythmConfig.beatMs,
    }) : null,
    element: null,
  }));
  noteEvents = chart.filter((event) => event.kind === "tap" || event.kind === "hold");
  songDurationMs = chart.at(-1)?.eventAt || estimateDuration(selectedSong, rhythmConfig, chartProfile);
  elements.songDuration.textContent = formatDuration(songDurationMs);
  stats = emptyStats();
  misses = 0;
  badTaps = 0;
  nextCueIndex = 0;
  nextSpawnIndex = 0;
  completedNotes = 0;
  chartEvents = [];
  runTrace = [];
  runTimingEvents = [];
  lastSection = "";
  currentStageSection = "count-in";
  currentStageClass = "";
  stageCueUntilMs = 0;
  isRunning = true;
  isPaused = false;
  pauseTransition = false;
  clearLaneInputs();

  elements.completeScreen.hidden = true;
  elements.startScreen.classList.add("is-hidden");
  elements.app.classList.remove("is-paused");
  elements.pause.classList.remove("pause-button-is-paused");
  elements.pause.setAttribute("aria-label", "Pause song");
  updatePracticeLoopStatus();
  elements.feedback.textContent = "";
  elements.countdown.hidden = false;
  elements.countdown.textContent = "3";
  updateCue(selectedSong.lesson[0], { phase: "words", section: "count-in", cue: "image" });
  updateTimelineSection("count-in");
  updateHud();

  const audioLeadMs = 60;
  player.setVolume(Number(elements.volume.value) / 100);
  player.setBeatEnabled(isBeatEnabled);
  try {
    const usedPremixedAudio = await player.startPlayback({
      bpm: rhythmConfig.bpm,
      song: selectedSong,
      playbackRate: selectedPlaybackRate,
    });
    elements.app.dataset.audioMode = usedPremixedAudio ? "premixed" : "fallback";
    elements.app.dataset.audioError = usedPremixedAudio ? "" : player.mediaFailureReason;
  } catch {
    player.restartBeat(rhythmConfig.bpm, selectedSong);
    elements.app.dataset.audioMode = "fallback";
    elements.app.dataset.audioError = player.mediaFailureReason || "start-error";
  }
  elements.app.dataset.audioSong = selectedSong.id;
  if (currentRun !== runId) return;
  songClock.start(performance.now() + audioLeadMs, selectedPlaybackRate);
  animationFrame = window.requestAnimationFrame((now) => runFrame(now, currentRun));
}

function getCanonicalElapsed(now = performance.now()) {
  const mediaElapsed = player.playbackPositionMs;
  return typeof mediaElapsed === "number" && Number.isFinite(mediaElapsed)
    ? mediaElapsed
    : songClock.elapsed(now);
}

function runFrame(now, currentRun) {
  if (!isRunning || isPaused || currentRun !== runId) return;
  const elapsed = getCanonicalElapsed(now);
  const mediaOffsetMs = realOffsetToMediaMs(settings.inputOffsetMs, selectedPlaybackRate);
  const correctedElapsed = resolveCorrectedElapsed(elapsed, mediaOffsetMs);
  if (elapsed >= rhythmConfig.beatMs * 4 && !isPaused) elements.countdown.hidden = true;

  while (nextSpawnIndex < noteEvents.length && noteEvents[nextSpawnIndex].spawnAt <= elapsed) {
    spawnNote(noteEvents[nextSpawnIndex]);
    nextSpawnIndex += 1;
  }
  positionActiveNotes(elapsed);
  renderStage(elapsed);

  while (nextCueIndex < chart.length && chart[nextCueIndex].eventAt <= elapsed) {
    processChartEvent(chart[nextCueIndex], currentRun);
    nextCueIndex += 1;
  }

  noteEvents.forEach((event) => {
    const windows = getJudgementWindows(event.judgement);
    if (event.status === "active" && shouldExpireMiss(elapsed, event.eventAt, windows.good, mediaOffsetMs)) {
      settleNote(event, "miss", correctedElapsed - event.eventAt);
    }
    if (event.status === "holding") {
      const result = advanceHold(event.holdState, elapsed);
      if (result.didComplete) {
        event.holdState = result.state;
        heldNotesByLane.delete(event.lane);
        settleNote(event, result.state.finalJudgement, result.state.headOffsetMs, { speak: false });
      }
    }
  });

  updateTimeline(elapsed);
  animationFrame = window.requestAnimationFrame((nextNow) => runFrame(nextNow, currentRun));
}

function processChartEvent(event, currentRun) {
  if (event.kind === "tap" || event.kind === "hold") return;
  event.status = "complete";
  if (event.section === "count-in") {
    const count = Number(event.id.split("-").at(-1));
    elements.countdown.hidden = false;
    elements.countdown.textContent = count < 4 ? String(4 - count) : "GO";
    return;
  }
  if (event.kind === "section") {
    currentStageSection = event.section;
    if (event.stageCue) stageCueUntilMs = Math.max(stageCueUntilMs, event.eventAt + rhythmConfig.beatMs * 2);
    updateTimelineSection(event.section);
    return;
  }
  if (event.section === "reward") {
    currentStageSection = "reward";
    renderStage(event.eventAt);
    finishSong(currentRun);
  }
}

function spawnNote(event) {
  const item = getItem(event.itemId);
  const container = laneNoteContainers[event.lane];
  if (!item || !container) return;

  const noteElement = document.createElement("div");
  noteElement.className = `falling-note ${event.phase === "letters" ? "letter-note" : "word-note"}${event.kind === "hold" ? " hold-note" : ""}`;
  event.travelPx = Math.max(220, container.clientHeight + 10);
  noteElement.style.setProperty("--travel", `${event.travelPx}px`);
  if (event.kind === "hold") {
    const holdLength = Math.max(54, event.travelPx * event.durationBeats / event.travelBeats);
    noteElement.style.setProperty("--hold-length", `${holdLength}px`);
  }

  if (event.phase === "letters") {
    const letter = document.createElement("strong");
    letter.textContent = item.letter;
    const word = document.createElement("small");
    word.textContent = item.displayWord;
    noteElement.append(letter, word);
  } else {
    const image = document.createElement("img");
    image.src = `assets/${item.id}.png`;
    image.alt = "";
    const word = document.createElement("strong");
    word.textContent = item.displayWord;
    noteElement.append(image, word);
  }

  event.status = "active";
  event.element = noteElement;
  container.append(noteElement);
  if (event.hintLane) {
    noteElement.closest(".lane")?.classList.add("is-hinted");
    event.hintedLane = noteElement.closest(".lane");
  }
  updateCue(item, event);
  if (activeSession.mode === "practice") {
    currentStageSection = "practice";
    updateTimelineSection(event.section);
  }
}

function positionActiveNotes(elapsed) {
  for (const event of noteEvents) {
    if (!["active", "holding"].includes(event.status) || !event.element) continue;
    const progress = Math.min(1, Math.max(0, (elapsed - event.spawnAt) / event.travelMs));
    const travel = (event.travelPx || 220) * progress;
    event.element.style.transform = `translate(-50%, ${travel}px)`;
  }
}

function renderStage(elapsed) {
  const frame = createStageFrame({
    songId: selectedSong.id,
    section: currentStageSection,
    beat: elapsed / rhythmConfig.beatMs,
    reducedMotion: prefersReducedMotion(),
    energy: player.musicEnergy,
    comboTier: Math.min(3, Math.floor(stats.combo / 8)),
    cueStrength: elapsed <= stageCueUntilMs ? 1 : 0,
  });
  elements.laneFrame.style.setProperty("--stage-scale", String(frame.scale));
  elements.laneFrame.style.setProperty("--stage-x", `${frame.xPercent}%`);
  elements.laneFrame.style.setProperty("--stage-y", `${frame.yPercent}%`);
  elements.laneFrame.style.setProperty("--stage-pulse", String(frame.pulse));
  elements.laneFrame.style.setProperty("--stage-intensity", String(frame.intensity));
  if (frame.sectionClass !== currentStageClass) {
    if (currentStageClass) elements.laneFrame.classList.remove(currentStageClass);
    currentStageClass = frame.sectionClass;
    elements.laneFrame.classList.add(currentStageClass);
  }
}

function pressLane(lane) {
  if (!isRunning || isPaused) return;
  const mediaOffsetMs = realOffsetToMediaMs(settings.inputOffsetMs, selectedPlaybackRate);
  const elapsed = resolveCorrectedElapsed(getCanonicalElapsed(), mediaOffsetMs);
  const active = noteEvents
    .filter((event) => event.status === "active")
    .sort((first, second) => Math.abs(elapsed - first.eventAt) - Math.abs(elapsed - second.eventAt));
  const nearest = active[0];

  pulseLane(lane);
  const nearestWindows = nearest ? getJudgementWindows(nearest.judgement) : null;
  if (!nearest || Math.abs(elapsed - nearest.eventAt) > nearestWindows.good) {
    registerBadTap();
    return;
  }

  const judgement = judgeTap(
    { lane: nearest.lane, hitAt: nearest.eventAt },
    lane,
    elapsed,
    nearestWindows,
  );
  if (judgement === "wrong-lane") {
    registerBadTap();
    return;
  }
  if (nearest.kind === "hold") {
    const result = pressHold(nearest.holdState, lane, elapsed, nearestWindows);
    if (!result.shouldSpeak) {
      registerBadTap();
      return;
    }
    nearest.holdState = result.state;
    nearest.status = "holding";
    heldNotesByLane.set(lane, nearest);
    nearest.element?.classList.add("is-holding");
    const item = getItem(nearest.itemId);
    if (item) playSuccessfulCue(player, {
      item,
      phase: nearest.phase,
      judgement: result.state.headJudgement,
      audioAccent: 1,
    });
    showFeedback("Hold!", "good");
    return;
  }
  settleNote(nearest, judgement, elapsed - nearest.eventAt);
}

function settleNote(event, judgement, offsetMs = 0, { speak = true } = {}) {
  if (event.status !== "active" && event.status !== "holding") return;
  event.status = judgement;
  heldNotesByLane.delete(event.lane);
  completedNotes += 1;
  stats = applyJudgement(stats, judgement);
  chartEvents.push({ itemId: event.itemId, judgement });
  if (runTimingEvents.length < 128) runTimingEvents.push({ judgement, offsetMs });
  runTrace.push(createReplayEvent({
    ...event,
    index: noteEvents.indexOf(event),
    judgement,
    offsetMs,
  }));

  const item = judgement === "miss" ? null : getItem(event.itemId);
  const hitPlan = createHitEffectPlan({
    judgement,
    combo: stats.combo,
    lane: event.lane,
    color: item?.color || selectedSong.stageAccent,
    reducedMotion: prefersReducedMotion(),
  });

  if (judgement === "miss") {
    misses += 1;
    if (event.missFeedback !== "gentle") {
      player.playMiss();
      showFeedback("Miss", "miss");
    } else {
      showFeedback("Keep going!", "gentle");
    }
  } else {
    if (item && speak) playSuccessfulCue(player, {
      item,
      phase: event.phase,
      judgement,
      audioAccent: hitPlan.audioAccent,
    });
    const bucket = getOffsetBucket(judgement, offsetMs);
    const direction = bucket === "early" ? "A little early" : bucket === "late" ? "A little late" : "On the beat";
    showFeedback(`${judgement === "perfect" ? "Perfect!" : "Good!"} · ${direction}`, judgement);
  }

  if (event.element) {
    event.element.classList.add(judgement === "miss" ? "is-missed" : "is-hit");
    scheduleEffectTimeout(() => event.element?.remove(), 220);
  }
  event.hintedLane?.classList.remove("is-hinted");
  if (judgement !== "miss") {
    if (event.stageCue) stageCueUntilMs = Math.max(stageCueUntilMs, event.eventAt + rhythmConfig.beatMs * 2);
    if (item) celebrateHit(event, item, judgement, hitPlan);
    showComboMilestone();
  }
  updateHud();
}

function registerBadTap() {
  badTaps += 1;
  stats = { ...stats, combo: 0 };
  if (activeSession.mode !== "play") {
    showFeedback("Keep going!", "gentle");
  } else {
    player.playMiss();
    showFeedback("Bad", "bad");
  }
  updateHud();
}

function pulseLane(lane) {
  const button = laneButtons[lane];
  const laneElement = button.closest(".lane");
  button.classList.remove("is-pressed");
  laneElement?.classList.remove("is-flashing");
  scheduleEffectFrame(() => {
    button.classList.add("is-pressed");
    laneElement?.classList.add("is-flashing");
  });
  scheduleEffectTimeout(() => {
    button.classList.remove("is-pressed");
    laneElement?.classList.remove("is-flashing");
  }, 150);
}

function pressLaneInput(lane, inputId) {
  if (activeLaneInputs.has(inputId)) return;
  activeLaneInputs.set(inputId, lane);
  laneButtons[lane]?.classList.add("is-held");
  pressLane(lane);
}

function releaseLaneInput(inputId) {
  const lane = activeLaneInputs.get(inputId);
  if (lane == null) return;
  activeLaneInputs.delete(inputId);
  if ([...activeLaneInputs.values()].includes(lane)) return;
  laneButtons[lane]?.classList.remove("is-held");
  const event = heldNotesByLane.get(lane);
  if (!event || event.status !== "holding") return;
  const mediaOffsetMs = realOffsetToMediaMs(settings.inputOffsetMs, selectedPlaybackRate);
  const elapsed = resolveCorrectedElapsed(getCanonicalElapsed(), mediaOffsetMs);
  const result = releaseHold(event.holdState, elapsed, getJudgementWindows(event.judgement).perfect);
  event.holdState = result.state;
  heldNotesByLane.delete(lane);
  settleNote(event, result.state.finalJudgement || "miss", result.state.headOffsetMs || 0, { speak: false });
}

function clearLaneInputs() {
  activeLaneInputs.clear();
  heldNotesByLane.clear();
  laneButtons.forEach((button) => button.classList.remove("is-held"));
}

function cancelInterruptedHolds() {
  for (const event of noteEvents) {
    if (event.status !== "holding") continue;
    event.holdState = cancelHold(event.holdState);
    heldNotesByLane.delete(event.lane);
    settleNote(event, "miss", event.holdState.headOffsetMs || 0, { speak: false });
  }
}

function celebrateHit(event, item, judgement, plan) {
  if (!plan.enabled) return;
  const laneElement = laneButtons[event.lane]?.closest(".lane");
  const laneBounds = laneElement?.getBoundingClientRect();
  const frameBounds = elements.laneFrame.getBoundingClientRect();
  const lineBounds = elements.judgementLine.getBoundingClientRect();
  const x = laneBounds ? laneBounds.left + laneBounds.width / 2 - frameBounds.left : 0;
  const y = lineBounds.top + lineBounds.height / 2 - frameBounds.top;
  const color = item.color || selectedSong.stageAccent;

  hitEffects.emit({
    x,
    y,
    color,
    plan,
    seed: completedNotes * 17 + stats.combo * 31 + event.lane,
  });
  elements.laneFrame.style.setProperty("--stage-hit-strength", String(plan.stageStrength));
  elements.judgementLine.style.setProperty("--line-hit-strength", String(plan.lineStrength));
  laneElement?.style.setProperty("--lane-hit-color", color);
  retriggerEffectClass(laneElement, "is-celebrating", plan.lifeMs);
  retriggerEffectClass(elements.laneFrame, "is-celebrating", Math.min(plan.lifeMs, 360));
  retriggerEffectClass(elements.judgementLine, "is-celebrating", Math.min(plan.lifeMs, 360));
  retriggerEffectClass(elements.combo.closest("div"), "is-combo-hit", 360);
  createWordEcho(event, item, judgement, x, y, color, plan.lifeMs);
}

function createWordEcho(event, item, judgement, x, y, color, lifeMs) {
  const echo = document.createElement("span");
  echo.className = `word-echo ${judgement}`;
  echo.textContent = event.phase === "letters" ? `${item.letter} · ${item.displayWord}` : item.displayWord;
  echo.style.left = `${x}px`;
  echo.style.top = `${Math.max(36, y - 18)}px`;
  echo.style.setProperty("--word-hit-color", color);
  elements.laneFrame.append(echo);
  const echoes = [...elements.laneFrame.querySelectorAll(".word-echo")];
  echoes.slice(0, Math.max(0, echoes.length - 4)).forEach((oldEcho) => oldEcho.remove());
  scheduleEffectTimeout(() => echo.remove(), Math.min(700, Math.max(180, lifeMs + 60)));
}

function retriggerEffectClass(element, className, duration) {
  if (!element) return;
  const classTimers = effectClassTimers.get(element) || new Map();
  const previousTimer = classTimers.get(className);
  if (previousTimer) {
    window.clearTimeout(previousTimer);
    effectTimers.delete(previousTimer);
  }
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  const timer = scheduleEffectTimeout(() => {
    element.classList.remove(className);
    classTimers.delete(className);
  }, duration);
  classTimers.set(className, timer);
  effectClassTimers.set(element, classTimers);
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function showComboMilestone() {
  if (stats.combo < 5 || stats.combo % 5 !== 0) return;
  elements.comboPop.textContent = `${stats.combo} COMBO`;
  elements.comboPop.classList.remove("is-visible");
  scheduleEffectFrame(() => elements.comboPop.classList.add("is-visible"));
  scheduleEffectTimeout(() => elements.comboPop.classList.remove("is-visible"), 650);
}

function showFeedback(text, kind) {
  window.clearTimeout(feedbackTimer);
  elements.feedback.textContent = text;
  elements.feedback.className = `judgement-feedback is-visible ${kind}`;
  feedbackTimer = window.setTimeout(() => {
    elements.feedback.className = "judgement-feedback";
  }, 420);
}

function updateCue(item, event) {
  elements.currentWordImage.src = `assets/${item.id}.png`;
  elements.currentWord.textContent = event.phase === "letters"
    ? `${item.letter} · ${item.displayWord}`
    : item.displayWord;
  elements.phase.textContent = event.phase === "letters" ? "Letter round" : sectionName(event.section);
  elements.lyric.textContent = event.phase === "letters"
    ? `${item.letter} is for ${item.displayWord}`
    : item.lyric;
}

function updateTimelineSection(section) {
  const indexBySection = { "words-a": 0, "words-b": 1, chorus: 2, letters: 3, reward: 4 };
  const activeIndex = indexBySection[section] ?? 0;
  timelineSections.forEach((item, index) => item.classList.toggle("is-active", index === activeIndex));
  elements.section.textContent = sectionName(section);
  if (section !== "count-in" && section !== "reward" && section !== lastSection) {
    lastSection = section;
    elements.sectionBanner.textContent = sectionName(section);
    elements.sectionBanner.classList.remove("is-visible");
    scheduleEffectFrame(() => elements.sectionBanner.classList.add("is-visible"));
    scheduleEffectTimeout(() => elements.sectionBanner.classList.remove("is-visible"), 900);
  }
}

function updateTimeline(elapsed) {
  const progress = Math.min(1, elapsed / songDurationMs);
  elements.progressBar.style.width = `${progress * 100}%`;
  elements.songTime.textContent = formatTime(elapsed);
}

function updateHud() {
  const total = noteEvents.length || selectedSong.chart.noteCount;
  const accuracy = getAccuracy();
  elements.score.textContent = String(stats.score);
  elements.accuracy.textContent = `${accuracy}%`;
  elements.combo.textContent = String(stats.combo);
  elements.miss.textContent = String(misses);
  elements.bad.textContent = String(badTaps);
  elements.star.textContent = String(Math.max(0, completedNotes - misses));
  elements.progressLabel.textContent = `${completedNotes} / ${total}`;
  elements.hudProgress.textContent = `${completedNotes} / ${total}`;
}

async function togglePause() {
  if (!isRunning || pauseTransition) return;
  pauseTransition = true;
  const currentRun = runId;
  if (!isPaused) {
    isPaused = true;
    activeSession = transitionSession(activeSession, "pause");
    songClock.pause(performance.now());
    cancelInterruptedHolds();
    clearLaneInputs();
    clearTransientEffects();
    elements.app.classList.add("is-paused");
    elements.pause.classList.add("pause-button-is-paused");
    elements.pause.setAttribute("aria-label", "Resume song");
    elements.countdown.hidden = false;
    elements.countdown.textContent = "PAUSED";
    try {
      await player.pause();
    } finally {
      if (currentRun === runId) pauseTransition = false;
    }
    return;
  }

  try {
    await player.resume();
  } catch {
    pauseTransition = false;
    return;
  }
  if (currentRun !== runId) return;
  activeSession = transitionSession(activeSession, "resume");
  songClock.resume(performance.now());
  isPaused = false;
  elements.app.classList.remove("is-paused");
  elements.pause.classList.remove("pause-button-is-paused");
  elements.pause.setAttribute("aria-label", "Pause song");
  elements.countdown.hidden = true;
  pauseTransition = false;
  animationFrame = window.requestAnimationFrame((now) => runFrame(now, currentRun));
}

function finishSong(currentRun) {
  if (!isRunning || currentRun !== runId) return;
  isRunning = false;
  isPaused = false;
  pauseTransition = false;
  clearLaneInputs();
  clearTransientEffects();
  player.stop();
  elements.app.dataset.audioMode = "idle";
  elements.app.dataset.audioError = "";
  delete elements.app.dataset.audioSong;
  activeSession = transitionSession(activeSession, "finish");
  if (activeSession.mode === "practice") {
    const repeatLimit = getPracticeRepeatLimit(activeSession.practiceRepeat);
    if (repeatLimit === Infinity || activeSession.practiceLoopIndex + 1 < repeatLimit) {
      activeSession = transitionSession(activeSession, "continue");
      startSong();
      return;
    }
  }
  const summary = createResultSummary({
    songId: selectedSong.id,
    mode: activeSession.mode,
    stats: { ...stats, accuracy: getAccuracy() },
    lesson: selectedSong.lesson,
    events: chartEvents,
  });
  const syncSummary = summary.isFullSong ? summarizeSync(runTimingEvents) : null;
  if (summary.isFullSong) {
    lastReplayRecord = saveReplay(storage, createReplayRecord({
      songId: selectedSong.id,
      mode: activeSession.mode,
      trace: runTrace,
    }));
  }
  updateDailyResult(summary);
  progress = mergeResult(progress, summary);
  lastResultSummary = syncSummary ? { ...summary, syncSummary } : summary;
  try {
    saveProgress(storage, progress);
  } catch {
    // Private browsing can reject localStorage writes.
  }
  player.playFanfare(activeSession.mode === "practice" ? "Practice complete!" : selectedSong.completionPhrase);
  elements.completeTitle.textContent = activeSession.mode === "practice"
    ? "Practice complete!"
    : selectedSong.resultTitle;
  elements.finalScore.textContent = String(stats.score);
  elements.finalAccuracy.textContent = `${getAccuracy()}%`;
  elements.finalCombo.textContent = String(stats.maxCombo);
  elements.finalDifficulty.textContent = `${difficultyLabel(activeSession.mode)} difficulty`;
  elements.finalPerfect.textContent = String(stats.judgements.perfect);
  elements.finalGood.textContent = String(stats.judgements.good);
  elements.finalMiss.textContent = String(stats.judgements.miss);
  elements.resultStars.textContent = `${summary.stars} / 3 stars`;
  elements.resultStars.setAttribute("aria-label", `${summary.stars} out of 3 stars`);
  const resultProgress = getSongProgressDisplay(progress.songs[selectedSong.id], activeSession.mode);
  elements.finalBest.textContent = resultProgress.difficultyBest
    ? formatBest(`Best ${difficultyLabel(activeSession.mode)}`, resultProgress.difficultyBest)
    : "Practice does not change song best";
  elements.resultPractice.hidden = activeSession.mode === "practice";
  elements.resultWeakPractice.hidden = activeSession.mode === "practice" || summary.weakWords.length === 0;
  elements.resultReview.hidden = activeSession.mode === "practice" || !lastReplayRecord?.trace.length;
  elements.practiceReturn.hidden = activeSession.mode !== "practice";
  elements.playAgain.querySelector("span").textContent = activeSession.mode === "practice"
    ? "Practice again"
    : "Play again";
  elements.learnedRow.replaceChildren(...selectedSong.lesson.map((item) => createResultWord(item, summary)));
  updateResultCallouts(summary);
  renderSyncResult(syncSummary);
  updateSongProgress();
  updateTimeline(songDurationMs);
  finishTimer = window.setTimeout(() => {
    if (currentRun !== runId || isRunning) return;
    elements.completeScreen.hidden = false;
    elements.playAgain.focus();
  }, 520);
  if (summary.isFullSong) recordPicnic();
}

function updateDailyResult(summary) {
  elements.todayResultStatus.hidden = true;
  elements.resultNextLesson.hidden = true;
  elements.todayResultStatus.textContent = "";
  nextDailySongId = null;
  if (!summary.isFullSong || !runDailyContext || !runDailyContext.orderedSongIds.includes(selectedSong.id)) return;

  const completed = completeDailyRun(runDailyContext.record, {
    songId: selectedSong.id,
    startDateKey: runDailyKey || runDailyContext.dateKey,
    songIds: catalogSongIds,
  });
  saveDaily(storage, completed, runDailyKey || runDailyContext.dateKey, catalogSongIds);
  const finishDateKey = getLocalDateKey();
  const startDaySummary = getDailySummary(completed, catalogSongIds);
  if (finishDateKey !== (runDailyKey || runDailyContext.dateKey)) {
    elements.todayResultStatus.textContent = "Saved for the starting day · A new day is ready";
    elements.todayResultStatus.hidden = false;
    return;
  }

  dailyDateKey = runDailyKey || runDailyContext.dateKey;
  dailyRecord = completed;
  renderDailyLibrary();
  if (startDaySummary.isComplete) {
    elements.todayResultStatus.textContent = `All done today · ${startDaySummary.completedCount} of ${startDaySummary.total}`;
    elements.todayResultStatus.hidden = false;
    return;
  }
  nextDailySongId = getNextDailySong(completed, catalogSongIds, selectedSong.id);
  elements.todayResultStatus.textContent = `Today · ${startDaySummary.completedCount} of ${startDaySummary.total} lessons`;
  elements.todayResultStatus.hidden = false;
  elements.resultNextLesson.hidden = !nextDailySongId;
}

function openNextDailyLesson() {
  const nextSongId = nextDailySongId;
  if (!nextSongId) return;
  const isStaleDailyResult = Boolean(runDailyKey && getLocalDateKey() !== runDailyKey);
  activeLibraryView = "today";
  runDailyContext = null;
  runDailyKey = null;
  showSongSetup();
  if (isStaleDailyResult) return;
  selectSong(nextSongId);
  renderDailyLibrary();
  elements.startButton.focus();
}

function showSongSetup() {
  const returnView = runDailyContext?.originView || activeLibraryView;
  const completedFullSong = activeSession.status === "finished" && activeSession.mode !== "practice";
  runId += 1;
  activeSession = transitionSession(activeSession, "exit");
  activeSession = createSession({ songId: selectedSong.id, mode: selectedGameMode });
  isRunning = false;
  isPaused = false;
  pauseTransition = false;
  clearRunTimers();
  player.stop();
  elements.app.dataset.audioMode = "idle";
  elements.app.dataset.audioError = "";
  delete elements.app.dataset.audioSong;
  laneNoteContainers.forEach((lane) => lane.replaceChildren());
  clearPlayEffects();
  elements.app.classList.remove("is-paused");
  elements.completeScreen.hidden = true;
  closeReplayReview();
  elements.previewScreen.hidden = true;
  elements.app.inert = false;
  elements.startScreen.inert = false;
  closePracticeChooser();
  if (!completedFullSong) {
    clearReplay(storage);
    lastReplayRecord = null;
  }
  selectedPracticeSource = "section";
  selectedPracticeSection = "words-a";
  selectedPracticeRepeat = "once";
  replayPracticeNotes = null;
  practiceNotes = [];
  practiceRangeReady = false;
  elements.startScreen.classList.remove("is-hidden");
  runDailyContext = null;
  runDailyKey = null;
  nextDailySongId = null;
  elements.todayResultStatus.hidden = true;
  elements.resultNextLesson.hidden = true;
  activeLibraryView = returnView;
  refreshDailyState();
  if (activeLibraryView === "today") ensureTodaySelection();
  renderDailyLibrary();
  elements.startButton.focus();
}

function clearRunTimers() {
  cancelInterruptedHolds();
  window.cancelAnimationFrame(animationFrame);
  window.clearTimeout(feedbackTimer);
  window.clearTimeout(finishTimer);
  clearPreviewTimer();
  cancelEffectSchedules();
  clearLaneInputs();
  songClock.reset();
}

function cancelEffectSchedules() {
  effectTimers.forEach((timer) => window.clearTimeout(timer));
  effectFrames.forEach((frame) => window.cancelAnimationFrame(frame));
  effectTimers.clear();
  effectFrames.clear();
}

function scheduleEffectTimeout(callback, delay) {
  const timer = window.setTimeout(() => {
    effectTimers.delete(timer);
    callback();
  }, delay);
  effectTimers.add(timer);
  return timer;
}

function scheduleEffectFrame(callback) {
  const frame = window.requestAnimationFrame(() => {
    effectFrames.delete(frame);
    callback();
  });
  effectFrames.add(frame);
  return frame;
}

function clearTransientEffects() {
  cancelEffectSchedules();
  hitEffects.clear();
  elements.laneFrame.querySelectorAll(".word-echo").forEach((echo) => echo.remove());
  elements.comboPop.classList.remove("is-visible");
  elements.sectionBanner.classList.remove("is-visible");
  elements.laneFrame.classList.remove("is-celebrating");
  elements.judgementLine.classList.remove("is-celebrating");
  elements.combo.closest("div")?.classList.remove("is-combo-hit");
  laneNoteContainers.forEach((lane) => {
    lane.querySelectorAll(".is-hit, .is-missed").forEach((note) => note.remove());
  });
  laneButtons.forEach((button) => {
    button.classList.remove("is-pressed");
    button.closest(".lane")?.classList.remove("is-flashing", "is-celebrating");
  });
}

function clearPlayEffects() {
  clearTransientEffects();
  laneButtons.forEach((button) => {
    button.closest(".lane")?.classList.remove("is-hinted");
  });
}

function getItem(id) {
  return selectedSong.lesson.find((item) => item.id === id);
}

function emptyStats() {
  return {
    score: 0,
    combo: 0,
    maxCombo: 0,
    hits: 0,
    accuracyPoints: 0,
    judgements: { perfect: 0, good: 0, miss: 0 },
  };
}

function setPlaybackRate(value) {
  const nextRate = sanitizePlaybackRate(value);
  if (nextRate === selectedPlaybackRate) return;
  selectedPlaybackRate = nextRate;
  songClock.setPlaybackRate(nextRate, performance.now());
  player.setPlaybackRate(nextRate);
  settings = saveSettings(storage, { ...settings, playbackRate: nextRate });
  rhythmConfig = getRhythmConfig(nextRate, selectedSong.charts[selectedGameMode], selectedSong.bpms);
  player.setTempo(rhythmConfig.bpm);
  updateSpeedControls();
}

function updateSpeedControls() {
  speedSliders.forEach((slider) => { slider.value = selectedPlaybackRate.toFixed(2); });
  const speedLabel = `${selectedPlaybackRate.toFixed(2)}×`;
  elements.setupSpeedOutput.textContent = speedLabel;
  elements.gameSpeedOutput.textContent = speedLabel;
  elements.tempo.textContent = `${rhythmConfig.bpm} BPM · 4K`;
  elements.setupBpm.textContent = String(rhythmConfig.bpm);
  const sourceDuration = estimateDuration(selectedSong, rhythmConfig, selectedSong.charts[selectedGameMode]);
  elements.songDuration.textContent = formatDuration(sourceDuration / selectedPlaybackRate);
  elements.setupDuration.textContent = formatDuration(sourceDuration / selectedPlaybackRate);
}

function selectSong(songId) {
  if (!canSelectSong(activeSession)) return;
  selectedSong = getSong(songId);
  lastResultSummary = null;
  selectedPracticeSource = "section";
  selectedPracticeSection = "words-a";
  selectedPracticeRepeat = "once";
  replayPracticeNotes = null;
  practiceRangeReady = false;
  activeSession = createSession({ songId: selectedSong.id, mode: selectedGameMode });
  elements.previewEnabled.checked = settings.previewEnabled;
  elements.setupPreviewEnabled.checked = settings.previewEnabled;
  rhythmConfig = getRhythmConfig(selectedPlaybackRate, selectedSong.charts[selectedGameMode], selectedSong.bpms);
  document.documentElement.style.setProperty("--song-accent", selectedSong.accent);
  document.documentElement.style.setProperty("--stage-accent", selectedSong.stageAccent);
  document.documentElement.style.setProperty("--stage-background", `url("${selectedSong.stageBackground}")`);
  document.documentElement.style.setProperty("--stage-surface", selectedSong.stageSurface);
  const stageThemeClasses = SONGS.map((song) => getStageTheme(song.id).className);
  elements.laneFrame.classList.remove(...stageThemeClasses);
  elements.laneFrame.classList.add(getStageTheme(selectedSong.id).className);
  document.title = `${selectedSong.title} | Melody Meadow`;
  elements.songTitle.textContent = selectedSong.title;
  elements.setupTitle.textContent = selectedSong.title;
  elements.setupTopic.textContent = selectedSong.topic;
  elements.setupCover.src = selectedSong.cover;
  elements.setupCover.alt = `${selectedSong.title} cover`;
  elements.setupBpm.textContent = String(rhythmConfig.bpm);
  elements.setupNoteCount.textContent = String(selectedSong.charts[selectedGameMode].noteCount);
  elements.currentWordImage.src = `assets/${selectedSong.lesson[0].id}.png`;
  elements.currentWord.textContent = selectedSong.lesson[0].displayWord;
  elements.lyric.textContent = selectedSong.lesson[0].lyric;
  elements.learningTargets.replaceChildren(...selectedSong.lesson.map(createLearningTarget));
  elements.learnedRow.replaceChildren(...selectedSong.lesson.map(createLearnedItem));
  songButtons.forEach((button) => {
    const selected = button.dataset.song === selectedSong.id;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  updateSpeedControls();
  updateSongProgress();
  updateHud();
}

function setGameMode(mode) {
  if (!mode || mode === selectedGameMode || !selectedSong.charts[mode]) return;
  selectedGameMode = mode;
  activeSession = createSession({ songId: selectedSong.id, mode: selectedGameMode });
  rhythmConfig = getRhythmConfig(selectedPlaybackRate, selectedSong.charts[selectedGameMode], selectedSong.bpms);
  updateModeControls();
  updateSpeedControls();
  elements.setupNoteCount.textContent = String(selectedSong.charts[selectedGameMode].noteCount);
  elements.startButton.querySelector("span").textContent = selectedGameMode === "learn"
    ? "Start Learn"
    : selectedGameMode === "challenge" ? "Try Challenge" : "Play full song";
  updateSongProgress();
  updateHud();
}

function updateModeControls() {
  modeButtons.forEach((button) => {
    const selected = button.dataset.mode === selectedGameMode;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function updateSongProgress() {
  const songProgress = progress.songs[selectedSong.id];
  const mastered = selectedSong.lesson.filter((item) => getWordMastery(progress.words[item.id]) === "Great").length;
  const { difficultyBest, legacyBest } = getSongProgressDisplay(songProgress, selectedGameMode);
  const difficultyText = difficultyBest
    ? formatBest(`Best ${difficultyLabel(selectedGameMode)}`, difficultyBest)
    : `Best ${difficultyLabel(selectedGameMode)}: —`;
  const legacyText = legacyBest ? ` · ${formatBest("Legacy overall", legacyBest)}` : "";
  elements.setupBest.textContent = `${difficultyText}${legacyText}`;
  elements.setupMastery.textContent = `Words mastered: ${mastered} / ${selectedSong.lesson.length}`;
}

function formatBest(label, best) {
  return `${label}: ${best.bestStars} / 3 stars · ${Math.round(best.bestAccuracy * 100)}%`;
}

function openPracticeChooser() {
  openPracticeChooserFor("section");
}

function openPracticeChooserFor(source = "section", focusNotes = null) {
  selectedPracticeSource = source === "weak" && lastResultSummary?.wordResults?.length ? "weak" : "section";
  replayPracticeNotes = Array.isArray(focusNotes) && focusNotes.length ? focusNotes.map((event) => ({ ...event })) : null;
  practiceRangeReady = false;
  elements.practiceScreen.hidden = false;
  updatePracticeChooser();
  elements.practiceTitle.focus();
}

function openWeakPracticeChooser() {
  openPracticeChooserFor("weak");
}

function updatePracticeChooser() {
  const isWeak = selectedPracticeSource === "weak";
  const sourceChart = buildRuntimeChart(selectedSong, selectedGameMode);
  practiceNotes = isWeak
    ? createWeakWordPractice(sourceChart, lastResultSummary?.wordResults)
    : replayPracticeNotes || createSectionPractice(sourceChart, selectedPracticeSection);

  elements.practiceTitle.textContent = isWeak ? "Practice tricky words" : "Choose a section";
  elements.practiceOptions.forEach((button) => {
    const selected = !isWeak && button.dataset.practice === selectedPracticeSection;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.hidden = isWeak;
  });
  const hasNotes = practiceNotes.length > 0;
  const maxIndex = Math.max(0, practiceNotes.length - 1);
  elements.practiceRangeStart.max = String(maxIndex);
  elements.practiceRangeEnd.max = String(maxIndex);
  if (!practiceRangeReady) {
    elements.practiceRangeStart.value = "0";
    elements.practiceRangeEnd.value = String(maxIndex);
    practiceRangeReady = true;
  }
  const start = Math.min(Number(elements.practiceRangeStart.value) || 0, maxIndex);
  const end = Math.min(Number(elements.practiceRangeEnd.value) || maxIndex, maxIndex);
  elements.practiceRangeStart.value = String(Math.min(start, end));
  elements.practiceRangeEnd.value = String(Math.max(start, end));
  elements.practiceRangeStart.disabled = !hasNotes;
  elements.practiceRangeEnd.disabled = !hasNotes;
  elements.practiceStart.disabled = !hasNotes;
  updatePracticeRangeFromControls();
  updatePracticeLoopStatus();
}

function updatePracticeRangeFromControls() {
  if (!practiceNotes.length) {
    elements.practiceRangeLabel.textContent = "No tricky words yet";
    elements.practiceRangeTrack.style.setProperty("--range-start", "0%");
    elements.practiceRangeTrack.style.setProperty("--range-end", "0%");
    return;
  }
  let start = Math.min(Number(elements.practiceRangeStart.value) || 0, practiceNotes.length - 1);
  let end = Math.min(Number(elements.practiceRangeEnd.value) || practiceNotes.length - 1, practiceNotes.length - 1);
  if (start > end) {
    [start, end] = [end, start];
    elements.practiceRangeStart.value = String(start);
    elements.practiceRangeEnd.value = String(end);
  }
  const denominator = Math.max(1, practiceNotes.length - 1);
  elements.practiceRangeTrack.style.setProperty("--range-start", `${(start / denominator) * 100}%`);
  elements.practiceRangeTrack.style.setProperty("--range-end", `${(end / denominator) * 100}%`);
  elements.practiceRangeLabel.textContent = `${start + 1}-${end + 1} of ${practiceNotes.length} notes`;
}

function updatePracticeLoopStatus() {
  if (!elements.practiceLoopStatus) return;
  const limit = getPracticeRepeatLimit(selectedPracticeRepeat);
  const label = limit === Infinity ? "∞" : String(limit);
  const current = activeSession.mode === "practice" ? activeSession.practiceLoopIndex + 1 : 1;
  elements.practiceLoopStatus.textContent = `Loop ${Math.min(current, limit === Infinity ? current : limit)} / ${label}`;
}

function selectPracticeSection(section) {
  if (!section) return;
  selectedPracticeSource = "section";
  selectedPracticeSection = section;
  replayPracticeNotes = null;
  practiceRangeReady = false;
  updatePracticeChooser();
}

function selectPracticeRepeat(repeat) {
  selectedPracticeRepeat = sanitizePracticeRepeat(repeat);
  elements.practiceRepeatOptions.forEach((button) => {
    const selected = button.dataset.practiceRepeat === selectedPracticeRepeat;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  updatePracticeLoopStatus();
}

function getPracticeNotes() {
  const sourceChart = buildRuntimeChart(selectedSong, selectedGameMode);
  const sourceNotes = replayPracticeNotes || (selectedPracticeSource === "weak"
    ? createWeakWordPractice(sourceChart, lastResultSummary?.wordResults)
    : createSectionPractice(sourceChart, selectedPracticeSection));
  const start = Number(elements.practiceRangeStart.value) || 0;
  const end = Number(elements.practiceRangeEnd.value) || sourceNotes.length - 1;
  return createPracticeRange(sourceNotes, start, end).notes;
}

function startPractice() {
  const notes = getPracticeNotes();
  if (!notes.length) return;
  runDailyContext = null;
  activeSession = createSession({
    songId: selectedSong.id,
    mode: "practice",
    practice: selectedPracticeSource === "weak" ? "weak-words" : selectedPracticeSection,
    practiceRepeat: selectedPracticeRepeat,
  });
  activeSession = transitionSession(activeSession, "start");
  closePracticeChooser();
  elements.completeScreen.hidden = true;
  elements.startScreen.classList.add("is-hidden");
  startSong();
}

function closePracticeChooser() {
  elements.practiceScreen.hidden = true;
}

function openReplayReview() {
  if (!lastReplayRecord?.trace?.length) return;
  renderReplayReview();
  elements.replayScreen.hidden = false;
  elements.app.inert = true;
  elements.completeScreen.inert = true;
  elements.replayClose.focus();
}

function closeReplayReview() {
  if (elements.replayScreen.hidden) return;
  elements.replayScreen.hidden = true;
  elements.app.inert = false;
  elements.completeScreen.inert = false;
  if (!elements.resultReview.hidden) elements.resultReview.focus();
}

function renderReplayReview() {
  const groups = new Map();
  for (const event of lastReplayRecord.trace) {
    if (!groups.has(event.section)) groups.set(event.section, []);
    groups.get(event.section).push(event);
  }
  elements.replaySections.replaceChildren();
  for (const [section, events] of groups) {
    const article = document.createElement("article");
    const heading = document.createElement("h3");
    const lanes = document.createElement("div");
    heading.textContent = sectionName(section);
    lanes.className = "replay-lane-grid";
    for (let lane = 0; lane < 4; lane += 1) {
      const laneColumn = document.createElement("div");
      laneColumn.className = "replay-lane-column";
      laneColumn.setAttribute("aria-label", `Lane ${lane + 1}`);
      for (const event of events.filter((candidate) => candidate.lane === lane)) {
        const marker = document.createElement("button");
        marker.type = "button";
        marker.className = `replay-marker ${event.judgement}`;
        marker.textContent = judgementSymbol(event.judgement);
        marker.setAttribute("aria-label", replayEventLabel(event));
        marker.addEventListener("click", () => showReplayDetail(event));
        laneColumn.append(marker);
      }
      lanes.append(laneColumn);
    }
    article.append(heading, lanes);
    elements.replaySections.append(article);
  }
  elements.replayDetail.textContent = "Choose a note to see its word.";
}

function showReplayDetail(event) {
  const item = getItem(event.itemId);
  const word = item ? `${item.letter} · ${item.displayWord}` : event.itemId;
  elements.replayDetail.textContent = `${sectionName(event.section)} · Lane ${event.lane + 1} · ${word} · ${judgementLabel(event.judgement)} · ${offsetLabel(event.offsetBucket)}`;
}

function openPracticeFromReplay() {
  if (!lastReplayRecord?.trace?.length) return;
  const sourceChart = buildRuntimeChart(selectedSong, lastReplayRecord.mode);
  const focus = selectWeakPracticeRange(sourceChart, lastReplayRecord.trace);
  if (!focus) return;
  selectedPracticeSource = "section";
  selectedPracticeSection = focus.section;
  closeReplayReview();
  openPracticeChooserFor("section", focus.notes);
}

function replayEventLabel(event) {
  const item = getItem(event.itemId);
  const word = item ? `${item.letter} ${item.displayWord}` : event.itemId;
  return `${word}, lane ${event.lane + 1}, ${judgementLabel(event.judgement)}`;
}

function judgementSymbol(judgement) {
  return { perfect: "P", good: "G", miss: "·" }[judgement] || "·";
}

function judgementLabel(judgement) {
  return { perfect: "Perfect", good: "Good", miss: "Keep trying" }[judgement] || "Keep trying";
}

function offsetLabel(bucket) {
  return { early: "a little early", "on-time": "on time", late: "a little late", miss: "missed" }[bucket] || "missed";
}

function openWordPreview() {
  if (!settings.previewEnabled) {
    beginSongFromPreview();
    return;
  }
  previewIndex = 0;
  elements.previewScreen.hidden = false;
  elements.previewEnabled.checked = settings.previewEnabled;
  elements.setupPreviewEnabled.checked = settings.previewEnabled;
  elements.app.inert = true;
  elements.startScreen.inert = true;
  renderPreviewCard();
  elements.previewCards.querySelector("button")?.focus();
  schedulePreviewAdvance();
}

function renderPreviewCard() {
  const item = selectedSong.lesson[previewIndex];
  const card = document.createElement("button");
  const image = document.createElement("img");
  const word = document.createElement("strong");
  const letter = document.createElement("small");
  card.className = "preview-card";
  card.type = "button";
  card.setAttribute("aria-label", `Hear ${item.displayWord}`);
  image.src = `assets/${item.id}.png`;
  image.alt = item.displayWord;
  word.textContent = item.displayWord;
  letter.textContent = `${item.letter} · Tap to hear`;
  card.append(image, word, letter);
  card.addEventListener("click", () => player.speakCue(item, "preview"));
  elements.previewCards.replaceChildren(card);
  elements.previewStep.textContent = `${previewIndex + 1} / ${selectedSong.lesson.length}`;
  elements.previewNext.textContent = previewIndex === selectedSong.lesson.length - 1 ? "Start song" : "Next word";
}

function advancePreview() {
  clearPreviewTimer();
  if (previewIndex >= selectedSong.lesson.length - 1) {
    beginSongFromPreview();
    return;
  }
  previewIndex += 1;
  renderPreviewCard();
  schedulePreviewAdvance();
}

function schedulePreviewAdvance() {
  clearPreviewTimer();
  previewTimer = window.setTimeout(advancePreview, 7000);
}

function clearPreviewTimer() {
  window.clearTimeout(previewTimer);
  previewTimer = 0;
}

function createLearningTarget(item) {
  const target = document.createElement("span");
  const image = document.createElement("img");
  image.src = `assets/${item.id}.png`;
  image.alt = "";
  target.append(image, item.displayWord);
  return target;
}

function createLearnedItem(item) {
  const learned = document.createElement("span");
  learned.textContent = `${item.letter} · ${item.displayWord}`;
  return learned;
}

function createResultWord(item, summary) {
  const result = summary.wordResults.find((entry) => entry.itemId === item.id);
  const learned = document.createElement("span");
  const hits = result?.hits || 0;
  const state = getWordMastery(progress.words[item.id]);
  learned.textContent = `${item.letter} · ${item.displayWord} · ${state} (${hits})`;
  learned.dataset.mastery = state.toLowerCase();
  return learned;
}

function updateResultCallouts(summary) {
  const learned = summary.wordResults
    .filter((result) => result.hits > 0)
    .map((result) => getItem(result.itemId)?.displayWord)
    .filter(Boolean);
  const next = summary.weakWords
    .map((id) => getItem(id)?.displayWord)
    .filter(Boolean);
  elements.todayLearned.textContent = `Today learned: ${learned.length ? learned.join(", ") : "Keep trying"}`;
  elements.practiceNext.textContent = `Practice next: ${next.length ? next.join(", ") : "You are doing great"}`;
}

function renderSyncResult(syncSummary) {
  if (!syncSummary) {
    elements.syncResult.hidden = true;
    return;
  }
  elements.syncResult.hidden = false;
  elements.syncRate.textContent = syncSummary.syncRate == null ? "--" : `${syncSummary.syncRate}%`;
  elements.syncCoaching.textContent = syncSummary.coaching || "";
  elements.syncEarly.textContent = String(syncSummary.early);
  elements.syncOnTime.textContent = String(syncSummary.onTime);
  elements.syncLate.textContent = String(syncSummary.late);
  elements.syncMisses.textContent = String(syncSummary.misses);
}

function estimateDuration(song, config, chartProfile = song.chart) {
  const mode = Object.entries(song.charts).find(([, profile]) => profile === chartProfile)?.[0] || "play";
  return buildRuntimeChart(song, mode).at(-1).beat * config.beatMs;
}

function getAccuracy() {
  return stats.hits ? Math.round((stats.accuracyPoints / stats.hits) * 100) : 100;
}

function sectionName(section) {
  const labels = {
    "count-in": "Get ready",
    "words-a": "Words A",
    "words-b": "Words B",
    chorus: `${selectedSong.topic.split(" ")[0]} chorus`,
    letters: "Letter round",
    reward: "Reward",
  };
  if (section === "practice") {
    return `${selectedPracticeSource === "weak" ? "Tricky words" : labels[selectedPracticeSection] || "Words"} practice`;
  }
  return labels[section] || "Words";
}

function difficultyLabel(mode) {
  return {
    learn: "Learn",
    play: "Play",
    challenge: "Challenge",
    practice: "Practice",
  }[mode] || "Learn";
}

function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatDuration(milliseconds) {
  return formatTime(Math.ceil(milliseconds / 1000) * 1000);
}

function recordPicnic() {
  try {
    const total = Number.parseInt(window.localStorage.getItem("melody-meadow-picnics") || "0", 10);
    window.localStorage.setItem("melody-meadow-picnics", String(total + 1));
  } catch {
    // Storage can be unavailable in private browsing.
  }
}

function getSafeStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

player.setVolume(Number(elements.volume.value) / 100);
selectSong(selectedSong.id);
refreshDailyState();
setLibraryView("today");
