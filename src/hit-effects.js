export const MAX_PARTICLES_PER_HIT = 16;
export const MAX_ACTIVE_PARTICLES = 48;
export const MAX_ACTIVE_EFFECTS = 8;

const DISABLED_PLAN = Object.freeze({
  enabled: false,
  tier: 0,
  ringCount: 0,
  particleCount: 0,
  lifeMs: 0,
  lineStrength: 0,
  stageStrength: 0,
  audioAccent: 0,
});

export function createHitEffectPlan(input = {}) {
  const { judgement, lane, color } = input;
  if (!isCelebrationJudgement(judgement) || !isLane(lane) || !isHexColor(color)) {
    return { ...DISABLED_PLAN };
  }

  const combo = Number.isFinite(input.combo) && input.combo >= 0 ? Math.floor(input.combo) : 0;
  const tier = combo >= 20 ? 3 : combo >= 10 ? 2 : combo >= 5 ? 1 : 0;
  const isPerfect = judgement === "perfect";
  const audioAccent = isPerfect ? (tier >= 2 ? 2 : 1) : (tier >= 2 ? 1 : 0);

  if (input.reducedMotion === true) {
    return {
      enabled: true,
      tier,
      ringCount: 1,
      particleCount: 0,
      lifeMs: 180,
      lineStrength: isPerfect ? 0.9 : 0.65,
      stageStrength: 0,
      audioAccent,
    };
  }

  return {
    enabled: true,
    tier,
    ringCount: isPerfect ? 2 : 1,
    particleCount: Math.min(MAX_PARTICLES_PER_HIT, (isPerfect ? 8 : 4) + tier * 2),
    lifeMs: Math.min(640, (isPerfect ? 520 : 420) + tier * 40),
    lineStrength: Math.min(1, (isPerfect ? 0.82 : 0.62) + tier * 0.06),
    stageStrength: Math.min(0.24, (isPerfect ? 0.1 : 0.06) + tier * 0.04),
    audioAccent,
  };
}

export function createParticleGeometry({ count = 0, seed = 0, speed = 90 } = {}) {
  const safeCount = Math.min(MAX_PARTICLES_PER_HIT, Math.max(0, Math.floor(Number(count) || 0)));
  const safeSpeed = Math.min(160, Math.max(40, Number(speed) || 90));
  let state = (Number.isFinite(seed) ? Math.floor(seed) : 0) >>> 0;

  return Array.from({ length: safeCount }, (_, index) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const random = state / 4294967296;
    const angle = ((index + random * 0.45) / Math.max(1, safeCount)) * Math.PI * 2;
    const velocity = safeSpeed * (0.72 + random * 0.28);
    return {
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size: 2 + random * 3,
    };
  });
}

export class HitEffectsRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.context = canvas?.getContext?.("2d") || null;
    this.effects = [];
    this.frameId = null;
    this.destroyed = false;
    this.requestFrame = options.requestFrame || defaultRequestFrame;
    this.cancelFrame = options.cancelFrame || defaultCancelFrame;
    this.now = options.now || defaultNow;
    this.getDpr = options.getDpr || (() => globalThis.devicePixelRatio || 1);
    this.createResizeObserver = options.createResizeObserver || defaultCreateResizeObserver;
    this.addResizeListener = options.addResizeListener
      ? options.addResizeListener.bind(options)
      : defaultAddResizeListener;
    this.removeResizeListener = options.removeResizeListener
      ? options.removeResizeListener.bind(options)
      : defaultRemoveResizeListener;
    this.handleResize = () => this.resize();
    this.resizeObserver = null;
    this.usesResizeFallback = false;

    if (!this.context) return;
    this.resize();
    if (this.createResizeObserver) this.resizeObserver = this.createResizeObserver(this.handleResize);
    if (this.resizeObserver) {
      this.resizeObserver?.observe?.(this.canvas);
    } else {
      this.addResizeListener(this.handleResize);
      this.usesResizeFallback = true;
    }
  }

  get activeEffectCount() {
    return this.effects.length;
  }

  get activeParticleCount() {
    return this.effects.reduce((total, effect) => total + effect.particles.length, 0);
  }

  get isAnimating() {
    return this.frameId !== null;
  }

  emit({ x, y, color, plan, seed = 0 } = {}) {
    if (
      this.destroyed
      || !this.context
      || !plan?.enabled
      || !Number.isFinite(x)
      || !Number.isFinite(y)
      || !isHexColor(color)
    ) return false;

    const particles = createParticleGeometry({
      count: plan.particleCount,
      seed,
      speed: 92 + plan.tier * 16,
    });
    while (this.effects.length >= MAX_ACTIVE_EFFECTS) this.effects.shift();
    while (this.effects.length && this.activeParticleCount + particles.length > MAX_ACTIVE_PARTICLES) {
      this.effects.shift();
    }
    this.effects.push({
      x,
      y,
      color,
      plan,
      particles,
      startedAt: this.now(),
    });
    this.scheduleFrame();
    return true;
  }

  resize() {
    if (!this.context || this.destroyed) return;
    this.clear();
    const bounds = this.canvas.getBoundingClientRect?.() || {};
    const width = Math.max(1, Math.round(Number(bounds.width) || 1));
    const height = Math.max(1, Math.round(Number(bounds.height) || 1));
    const dpr = Math.min(2, Math.max(1, Number(this.getDpr()) || 1));
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.context.clearRect(0, 0, width, height);
  }

  clear() {
    if (this.frameId !== null) {
      this.cancelFrame(this.frameId);
      this.frameId = null;
    }
    this.effects.length = 0;
    if (!this.context || !this.canvas) return;
    const bounds = this.canvas.getBoundingClientRect?.() || {};
    this.context.clearRect(0, 0, Number(bounds.width) || 0, Number(bounds.height) || 0);
  }

  destroy() {
    if (this.destroyed) return;
    this.clear();
    this.resizeObserver?.disconnect?.();
    if (this.usesResizeFallback) this.removeResizeListener(this.handleResize);
    this.destroyed = true;
  }

  scheduleFrame() {
    if (this.frameId !== null || this.effects.length === 0 || this.destroyed) return;
    this.frameId = this.requestFrame((at) => this.render(at));
  }

  render(at) {
    this.frameId = null;
    if (!this.context || this.destroyed) return;
    const bounds = this.canvas.getBoundingClientRect?.() || {};
    this.context.clearRect(0, 0, Number(bounds.width) || 0, Number(bounds.height) || 0);

    const active = [];
    for (const effect of this.effects) {
      const age = Math.max(0, at - effect.startedAt);
      if (age >= effect.plan.lifeMs) continue;
      this.drawEffect(effect, age / effect.plan.lifeMs);
      active.push(effect);
    }
    this.effects = active;
    this.scheduleFrame();
  }

  drawEffect(effect, progress) {
    const { context } = this;
    context.save();
    context.globalCompositeOperation = "lighter";
    context.shadowColor = effect.color;
    const staticGlow = effect.particles.length === 0 && effect.plan.lifeMs <= 180;
    context.shadowBlur = staticGlow
      ? 8 + effect.plan.lineStrength * 10
      : 12 + effect.plan.tier * 3;

    for (let ring = 0; ring < effect.plan.ringCount; ring += 1) {
      const ringProgress = staticGlow ? 0 : Math.min(1, progress * (1.08 + ring * 0.08));
      context.beginPath();
      const staticRadius = 14 + effect.plan.lineStrength * 8;
      context.arc(effect.x, effect.y, staticGlow ? staticRadius : 9 + ringProgress * (28 + ring * 9), 0, Math.PI * 2);
      const baseAlpha = staticGlow ? 0.45 + effect.plan.lineStrength * 0.5 : (ring === 0 ? 0.95 : 0.62);
      context.globalAlpha = (1 - (staticGlow ? progress : ringProgress)) * baseAlpha;
      context.lineWidth = staticGlow ? 2 + effect.plan.lineStrength * 2 : (ring === 0 ? 3 : 2);
      context.strokeStyle = ring === 0 ? "#ffffff" : effect.color;
      context.stroke();
    }

    for (const particle of effect.particles) {
      const seconds = progress * effect.plan.lifeMs / 1000;
      const x = effect.x + particle.vx * seconds;
      const y = effect.y + particle.vy * seconds + 70 * seconds * seconds;
      const size = particle.size * (1 - progress * 0.45);
      context.globalAlpha = 1 - progress;
      context.fillStyle = effect.color;
      drawSpark(context, x, y, size);
    }
    context.restore();
  }
}

function drawSpark(context, x, y, size) {
  context.beginPath();
  context.moveTo(x, y - size * 1.6);
  context.lineTo(x + size * 0.55, y - size * 0.55);
  context.lineTo(x + size * 1.6, y);
  context.lineTo(x + size * 0.55, y + size * 0.55);
  context.lineTo(x, y + size * 1.6);
  context.lineTo(x - size * 0.55, y + size * 0.55);
  context.lineTo(x - size * 1.6, y);
  context.lineTo(x - size * 0.55, y - size * 0.55);
  context.closePath();
  context.fill();
}

function defaultRequestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === "function") return globalThis.requestAnimationFrame(callback);
  return globalThis.setTimeout(() => callback(defaultNow()), 16);
}

function defaultCancelFrame(id) {
  if (typeof globalThis.cancelAnimationFrame === "function") globalThis.cancelAnimationFrame(id);
  else globalThis.clearTimeout(id);
}

function defaultNow() {
  return globalThis.performance?.now?.() || Date.now();
}

function defaultCreateResizeObserver(callback) {
  if (typeof globalThis.ResizeObserver !== "function") return null;
  return new globalThis.ResizeObserver(callback);
}

function defaultAddResizeListener(callback) {
  globalThis.addEventListener?.("resize", callback);
}

function defaultRemoveResizeListener(callback) {
  globalThis.removeEventListener?.("resize", callback);
}

function isCelebrationJudgement(value) {
  return value === "perfect" || value === "good";
}

function isLane(value) {
  return Number.isInteger(value) && value >= 0 && value <= 3;
}

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
