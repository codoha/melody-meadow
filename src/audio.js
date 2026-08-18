import { DEFAULT_AUDIO_MIX, MUSIC_MIX, getDrumBeat, sanitizeAudioMix } from "./audio-mix.js?v=0.15.0";
import { DEFAULT_PLAYBACK_RATE, MusicTransport } from "./music-transport.js?v=0.15.0";

const browserWindow = typeof window === "undefined" ? null : window;
const AudioContextClass = browserWindow?.AudioContext || browserWindow?.webkitAudioContext;
const DEFAULT_BPM = 88;
export const MEDIA_OUTPUT_GAIN = 1.5;

export class SongPlayer {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.musicBus = null;
    this.musicChannelGain = null;
    this.effectsChannelGain = null;
    this.compressor = null;
    this.schedulerTimer = null;
    this.nextBeatAt = 0;
    this.beatIndex = 0;
    this.noiseBuffer = null;
    this.muted = false;
    this.volume = 0.78;
    this.audioMix = { ...DEFAULT_AUDIO_MIX };
    this.beatEnabled = true;
    this.isPaused = false;
    this.bpm = DEFAULT_BPM;
    this.beatSeconds = 60 / DEFAULT_BPM;
    this.song = null;
    this.transport = new MusicTransport();
    this.mediaPlaying = false;
    this.playbackGeneration = 0;
    this.playbackRate = DEFAULT_PLAYBACK_RATE;
    this.mediaElement = null;
    this.mediaElementSource = null;
    this.mediaAnalyser = null;
    this.mediaOutputGain = null;
    this.mediaOutputBus = null;
    this.mediaFrequencyData = null;
    this.duckLevel = 1;
    this.calibrationSources = new Set();
    this.calibrationGeneration = 0;
  }

  get isMediaPlaying() {
    return this.mediaPlaying && !this.transport.failed;
  }

  get playbackPositionMs() {
    return this.isMediaPlaying ? this.transport.positionMs : null;
  }

  get mediaFailureReason() {
    return this.transport.failureReason || "";
  }

  get musicEnergy() {
    if (!this.mediaAnalyser?.getByteFrequencyData) return 0;
    const binCount = Math.min(24, this.mediaAnalyser.frequencyBinCount || 0);
    if (binCount <= 0) return 0;
    if (!this.mediaFrequencyData || this.mediaFrequencyData.length !== this.mediaAnalyser.frequencyBinCount) {
      this.mediaFrequencyData = new Uint8Array(this.mediaAnalyser.frequencyBinCount);
    }
    this.mediaAnalyser.getByteFrequencyData(this.mediaFrequencyData);
    let total = 0;
    for (let index = 0; index < binCount; index += 1) total += this.mediaFrequencyData[index];
    return Math.round((total / binCount / 255) * 1000) / 1000;
  }

  async startPlayback({ bpm = this.bpm, song = this.song, playbackRate = this.playbackRate } = {}) {
    const generation = ++this.playbackGeneration;
    this.song = song;
    this.setTempo(bpm);
    this.setPlaybackRate(playbackRate);
    const contextPromise = this.start({ bpm, song });
    let mediaPromise = null;
    if (song?.audio?.source) {
      this.transport.prepare(song.audio.source);
      this.connectMediaOutput();
      this.updateMediaVolume();
      mediaPromise = this.transport.play({ offsetMs: 0 });
    }
    await contextPromise;
    const mediaPlaying = mediaPromise ? await mediaPromise : false;
    if (generation !== this.playbackGeneration) return false;
    this.mediaPlaying = mediaPlaying;
    if (this.mediaPlaying) {
      this.stopBeat();
      return true;
    }
    this.restartBeat(bpm, song);
    return false;
  }

  async start({ bpm = this.bpm, song = this.song } = {}) {
    this.setTempo(bpm);
    this.song = song;
    if (!AudioContextClass) return;
    if (this.context) {
      await this.context.resume();
      return;
    }

    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = MUSIC_MIX.masterGain * this.volume;
    this.masterGain.connect(this.context.destination);
    this.createChannelGains();
    this.createMusicBus();
    this.noiseBuffer = this.createNoiseBuffer();
    await this.context.resume();
  }

  restartBeat(bpm = this.bpm, song = this.song) {
    this.setTempo(bpm);
    this.song = song;
    this.mediaPlaying = false;
    if (!this.context) return;
    this.stopBeat();
    this.replaceMusicBus();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    this.duckMusic(1);
    this.nextBeatAt = this.context.currentTime + 0.08;
    this.beatIndex = 0;
    this.isPaused = false;
    this.scheduleAhead();
    this.schedulerTimer = window.setInterval(() => this.scheduleAhead(), 50);
  }

  stopBeat() {
    browserWindow?.clearInterval(this.schedulerTimer);
    this.schedulerTimer = null;
  }

  async pause() {
    if (this.isPaused) return;
    this.isPaused = true;
    this.stopBeat();
    if (this.mediaPlaying) this.transport.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.pause();
    if (this.context?.state === "running") await this.context.suspend();
  }

  async resume() {
    if (!this.isPaused) return;
    const generation = this.playbackGeneration;
    if (this.context?.state === "suspended") await this.context.resume();
    const resumedMedia = !this.mediaPlaying || await this.transport.resume();
    if (generation !== this.playbackGeneration) return false;
    if (!resumedMedia) this.mediaPlaying = false;
    if ("speechSynthesis" in window) window.speechSynthesis.resume();
    this.isPaused = false;
    if (this.context && !this.mediaPlaying) {
      this.scheduleAhead();
      this.schedulerTimer = window.setInterval(() => this.scheduleAhead(), 50);
    }
    return true;
  }

  stop() {
    this.playbackGeneration += 1;
    this.stopBeat();
    this.isPaused = false;
    this.transport.stop();
    this.mediaPlaying = false;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    }
    if (this.context) this.replaceMusicBus();
    this.stopCalibration();
  }

  async startCalibration({ beatMs = 1400, countIn = 4, targets = 12 } = {}) {
    this.stopCalibration();
    const generation = this.calibrationGeneration;
    if (!AudioContextClass) return null;
    await this.start({ song: null });
    if (generation !== this.calibrationGeneration) return null;
    if (!this.context) return null;
    await this.context.resume();
    if (generation !== this.calibrationGeneration) return null;
    const beatSeconds = beatMs / 1000;
    const audioStartTime = this.context.currentTime + 0.35 + countIn * beatSeconds;
    for (let index = 0; index < countIn + targets; index += 1) {
      const at = audioStartTime - (countIn - index) * beatSeconds;
      this.playCalibrationClick(at, index >= countIn ? "target" : "count-in");
    }
    return { audioStartTime, beatMs, countIn, targets };
  }

  stopCalibration() {
    this.calibrationGeneration += 1;
    for (const source of this.calibrationSources) {
      try { source.stop(); } catch { /* already stopped */ }
      try { source.disconnect(); } catch { /* already disconnected */ }
    }
    this.calibrationSources.clear();
  }

  playCalibrationClick(at, kind = "target") {
    if (!this.context || !this.effectsChannelGain || this.muted || this.audioMix.effectsVolume <= 0) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = kind === "target" ? 1046.5 : 659.25;
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.exponentialRampToValueAtTime(kind === "target" ? 0.34 : 0.2, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.15);
    oscillator.connect(gain);
    gain.connect(this.effectsChannelGain);
    oscillator.start(at);
    oscillator.stop(at + 0.17);
    this.calibrationSources.add(oscillator);
    oscillator.addEventListener("ended", () => {
      this.calibrationSources.delete(oscillator);
      try { oscillator.disconnect(); gain.disconnect(); } catch { /* cleanup is best effort */ }
    }, { once: true });
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : MUSIC_MIX.masterGain * this.volume,
        this.context.currentTime,
        0.025,
      );
    }
    if (muted && "speechSynthesis" in window) window.speechSynthesis.cancel();
    this.updateMediaVolume();
  }

  setVolume(value) {
    const normalized = Math.min(1, Math.max(0, Number(value) || 0));
    this.volume = normalized;
    if (this.masterGain && this.context && !this.muted) {
      this.masterGain.gain.setTargetAtTime(
        MUSIC_MIX.masterGain * normalized,
        this.context.currentTime,
        0.025,
      );
    }
    this.updateMediaVolume();
  }

  setAudioMix(value = {}) {
    this.audioMix = sanitizeAudioMix({ ...this.audioMix, ...value });
    if (this.musicChannelGain && this.context) {
      this.musicChannelGain.gain.setTargetAtTime(this.audioMix.musicVolume, this.context.currentTime, 0.025);
    }
    if (this.effectsChannelGain && this.context) {
      this.effectsChannelGain.gain.setTargetAtTime(this.audioMix.effectsVolume, this.context.currentTime, 0.025);
    }
    this.updateMediaVolume();
  }

  setPlaybackRate(value) {
    this.playbackRate = this.transport.setPlaybackRate(value);
    return this.playbackRate;
  }

  setBeatEnabled(enabled) {
    this.beatEnabled = Boolean(enabled);
  }

  speakCue(item, phase) {
    const phrase = phase === "letters" ? `${item.letter}. ${item.word}.` : item.word;
    this.speak(phrase, 0.78, 1.14);
  }

  playHit(judgement, accentLevel = 0) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const notes = judgement === "perfect" ? [783.99, 1046.5] : [659.25, 783.99];
    notes.forEach((frequency, index) => {
      this.playTone(frequency, now + index * 0.035, 0.095, "sine", 0.17, "effects");
    });
    const safeAccent = Math.min(2, Math.max(0, Math.floor(Number(accentLevel) || 0)));
    if (safeAccent >= 1) {
      const glint = judgement === "perfect" ? 1318.51 : 987.77;
      this.playTone(glint, now + 0.015, 0.05, "triangle", 0.1, "effects");
    }
    if (safeAccent >= 2) {
      this.playTone(1567.98, now + 0.035, 0.035, "sine", 0.1, "effects");
    }
  }

  playMiss() {
    if (!this.context || this.muted) return;
    this.playTone(146.83, this.context.currentTime, 0.16, "square", 0.12, "effects");
  }

  playFanfare(phrase = this.song?.completionPhrase || "Song complete!") {
    if (this.context && !this.muted) {
      const now = this.context.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((note, index) => {
        this.playTone(note, now + index * 0.13, 0.52, "triangle", 0.28, "effects");
      });
    }
    this.speak(phrase, 0.82, 1.14);
  }

  scheduleAhead() {
    if (!this.context) return;
    const horizon = this.context.currentTime + 0.28;
    if (this.muted) {
      this.nextBeatAt = horizon;
      return;
    }
    while (this.nextBeatAt < horizon) {
      this.scheduleBeat(this.nextBeatAt, this.beatIndex);
      this.nextBeatAt += this.beatSeconds;
      this.beatIndex += 1;
    }
  }

  scheduleBeat(at, beat) {
    const beatSeconds = this.beatSeconds;
    const step = beat % 16;
    const beatInBar = beat % 4;
    const arrangement = this.song?.arrangement || {};
    const melody = arrangement.melody || [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
    const roots = arrangement.roots || [130.81, 174.61, 110, 196];
    const root = roots[Math.floor(beat / 4) % roots.length];
    const drumPattern = arrangement.drumPattern || "pop";

    if (this.beatEnabled) {
      const drumBeat = getDrumBeat(drumPattern, beatInBar);
      this.playKick(at, MUSIC_MIX.kickGain * drumBeat.kickScale);
      if (drumBeat.hat) this.playHat(at + beatSeconds / 2, MUSIC_MIX.hatGain);
      if (drumBeat.snareGain > 0) this.playSnare(at, drumBeat.snareGain);
    }
    this.playTone(root, at, beatSeconds * 0.72, "sine", MUSIC_MIX.bassGain);
    this.playTone(melody[step % melody.length], at, beatSeconds * 0.46, arrangement.melodyWave || "triangle", MUSIC_MIX.melodyGain);

    if (beatInBar === 0) {
      [root * 2, root * 2.5, root * 3].forEach((frequency) => {
        this.playTone(frequency, at, beatSeconds * 3.75, arrangement.chordWave || "triangle", MUSIC_MIX.chordGain / 3);
      });
    }
  }

  setTempo(bpm) {
    if (!Number.isFinite(bpm) || bpm <= 0) return;
    this.bpm = bpm;
    this.beatSeconds = 60 / bpm;
  }

  createChannelGains() {
    if (!this.context || !this.masterGain) return;
    this.musicChannelGain = this.context.createGain();
    this.effectsChannelGain = this.context.createGain();
    this.musicChannelGain.gain.value = this.audioMix.musicVolume;
    this.effectsChannelGain.gain.value = this.audioMix.effectsVolume;
    this.musicChannelGain.connect(this.masterGain);
    this.effectsChannelGain.connect(this.masterGain);
  }

  createMusicBus() {
    if (!this.context || !this.masterGain) return;
    this.musicBus = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 14;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.18;
    this.musicBus.gain.value = 1;
    this.musicBus.connect(this.compressor);
    this.compressor.connect(this.musicChannelGain || this.masterGain);
  }

  connectMediaOutput() {
    const media = this.transport.media;
    if (!media || !this.context || !this.musicBus || !this.context.createMediaElementSource) return false;
    try {
      if (media !== this.mediaElement) {
        this.disconnectMediaOutput();
        this.mediaElementSource = this.context.createMediaElementSource(media);
        this.mediaAnalyser = this.context.createAnalyser?.() || null;
        this.mediaOutputGain = this.context.createGain?.() || null;
        if (this.mediaAnalyser) {
          this.mediaAnalyser.fftSize = 64;
          this.mediaAnalyser.smoothingTimeConstant = 0.72;
          this.mediaElementSource.connect(this.mediaAnalyser);
        }
        const analyserOutput = this.mediaAnalyser || this.mediaElementSource;
        if (this.mediaOutputGain) {
          analyserOutput.connect(this.mediaOutputGain);
        }
        this.mediaElement = media;
      }
      const output = this.mediaOutputGain || this.mediaAnalyser || this.mediaElementSource;
      if (output && this.mediaOutputBus !== this.musicBus) {
        output.disconnect?.();
        output.connect(this.musicBus);
        this.mediaOutputBus = this.musicBus;
      }
      this.updateMediaVolume();
      return true;
    } catch {
      this.disconnectMediaOutput();
      return false;
    }
  }

  disconnectMediaOutput() {
    for (const node of [this.mediaElementSource, this.mediaAnalyser, this.mediaOutputGain]) {
      try { node?.disconnect?.(); } catch { /* media graph cleanup is best effort */ }
    }
    this.mediaElement = null;
    this.mediaElementSource = null;
    this.mediaAnalyser = null;
    this.mediaOutputGain = null;
    this.mediaOutputBus = null;
    this.mediaFrequencyData = null;
  }

  replaceMusicBus() {
    if (this.musicBus && this.context) {
      const oldBus = this.musicBus;
      oldBus.gain.cancelScheduledValues(this.context.currentTime);
      oldBus.gain.setTargetAtTime(0, this.context.currentTime, 0.015);
      window.setTimeout(() => oldBus.disconnect(), 160);
    }
    this.createMusicBus();
  }

  playKick(at, volume) {
    if (!this.context || !this.musicBus) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.setValueAtTime(145, at);
    oscillator.frequency.exponentialRampToValueAtTime(45, at + 0.16);
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.2);
    oscillator.connect(gain);
    gain.connect(this.musicBus);
    oscillator.start(at);
    oscillator.stop(at + 0.21);
  }

  playHat(at, volume) {
    this.playNoise(at, 0.045, volume, 6500);
  }

  playSnare(at, volume) {
    this.playNoise(at, 0.13, volume, 1800);
  }

  playNoise(at, duration, volume, frequency) {
    if (!this.context || !this.musicBus || !this.noiseBuffer) return;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    source.start(at);
    source.stop(at + duration);
  }

  playTone(frequency, at, duration, type, volume, bus = "music") {
    const destination = bus === "effects" ? this.effectsChannelGain : this.musicBus;
    if (!this.context || !destination || this.muted) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.025);
  }

  speak(text, rate, pitch) {
    if (this.muted || this.volume <= 0 || this.audioMix.voiceVolume <= 0 || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = Math.min(1, this.volume * this.audioMix.voiceVolume * 1.2);
    const preferredVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => /Samantha|Ava|Karen|Moira|Daniel/i.test(voice.name));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.addEventListener("start", () => this.duckMusic(MUSIC_MIX.voiceDuckGain));
    utterance.addEventListener("end", () => this.duckMusic(1));
    if (utterance.onerror !== undefined) {
      utterance.addEventListener("error", () => this.duckMusic(1));
    }
    window.speechSynthesis.speak(utterance);
  }

  duckMusic(value) {
    this.duckLevel = Math.min(1, Math.max(0, Number(value) || 0));
    this.updateMediaVolume();
    if (!this.musicBus || !this.context) return;
    this.musicBus.gain.setTargetAtTime(value, this.context.currentTime, 0.04);
  }

  updateMediaVolume() {
    if (this.mediaElement === this.transport.media && this.mediaOutputBus) {
      this.transport.setVolume(1);
      if (this.mediaOutputGain?.gain && this.context) {
        this.mediaOutputGain.gain.setTargetAtTime(
          MEDIA_OUTPUT_GAIN / MUSIC_MIX.masterGain,
          this.context.currentTime,
          0.025,
        );
      }
      return;
    }
    const level = this.muted
      ? 0
      : Math.min(1, MEDIA_OUTPUT_GAIN * this.volume * this.audioMix.musicVolume * this.duckLevel);
    this.transport.setVolume(level);
  }

  createNoiseBuffer() {
    const frameCount = Math.floor(this.context.sampleRate * 0.2);
    const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) channel[index] = Math.random() * 2 - 1;
    return buffer;
  }
}

export function playSuccessfulCue(player, { item, phase, judgement, audioAccent = 0 } = {}) {
  if (!player || !item || (judgement !== "perfect" && judgement !== "good")) return false;
  player.playHit(judgement, audioAccent);
  player.speakCue(item, phase);
  return true;
}
