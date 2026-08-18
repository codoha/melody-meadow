import { judgeTap } from "./rhythm.js?v=0.15.0";

export function createHoldState(note) {
  return Object.freeze({
    id: note.id,
    lane: note.lane,
    eventAt: note.eventAt,
    tailAt: note.tailAt,
    status: "waiting",
    headJudgement: null,
    headOffsetMs: null,
    finalJudgement: null,
  });
}

export function pressHold(state, lane, elapsed, windows) {
  if (state?.status !== "waiting") return { state, shouldSpeak: false, reason: "already-started" };
  const judgement = judgeTap({ lane: state.lane, hitAt: state.eventAt }, lane, elapsed, windows);
  if (judgement !== "perfect" && judgement !== "good") {
    return { state, shouldSpeak: false, reason: judgement };
  }
  return {
    state: Object.freeze({
      ...state,
      status: "holding",
      headJudgement: judgement,
      headOffsetMs: elapsed - state.eventAt,
    }),
    shouldSpeak: true,
    reason: judgement,
  };
}

export function advanceHold(state, elapsed) {
  if (state?.status !== "holding" || !Number.isFinite(elapsed) || elapsed < state.tailAt) {
    return { state, didComplete: false };
  }
  return { state: completeState(state), didComplete: true };
}

export function releaseHold(state, elapsed, releaseWindowMs = 260) {
  if (state?.status !== "holding") return { state, didComplete: false };
  const boundedWindow = Math.max(0, Number(releaseWindowMs) || 0);
  if (Number.isFinite(elapsed) && elapsed >= state.tailAt - boundedWindow) {
    return { state: completeState(state), didComplete: true };
  }
  return {
    state: Object.freeze({ ...state, status: "miss", finalJudgement: "miss" }),
    didComplete: false,
  };
}

export function cancelHold(state) {
  if (state?.status !== "holding") return state;
  return Object.freeze({ ...state, status: "miss", finalJudgement: "miss" });
}

function completeState(state) {
  return Object.freeze({ ...state, status: "complete", finalJudgement: state.headJudgement });
}
