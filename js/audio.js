// audio.js — playback of parents' recorded voices (with mouth movement),
// a built-in voice fallback, recording, and soft sound effects.
import { audioStore } from './storage.js';

let ctx = null;
const bufferCache = new Map();
let settingsRef = { sounds: true, speechRate: 0.8 };

export function setAudioSettings(s) { settingsRef = s; }

export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

// Must be called from a user tap (iPad requirement).
let unlocked = false;
export function unlock() {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
  if (unlocked) return;
  unlocked = true;
  const b = c.createBuffer(1, 1, 22050);
  const s = c.createBufferSource();
  s.buffer = b; s.connect(c.destination); s.start(0);
  try {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  } catch (_) { /* ignore */ }
}

// ---------- clip keys ----------
export const keys = {
  phrase: (id, speaker, part) => `p:${id}:${speaker}:${part}`,
  word: (id, speaker) => `w:${id}:${speaker}`,
};

export async function hasClip(key) {
  if (bufferCache.has(key)) return true;
  const rec = await audioStore.get(key);
  return !!rec;
}

async function loadBuffer(key) {
  if (bufferCache.has(key)) return bufferCache.get(key);
  const rec = await audioStore.get(key);
  if (!rec) return null;
  const buf = await decode(rec.buf.slice(0));
  bufferCache.set(key, buf);
  return buf;
}

export function invalidate(key) { bufferCache.delete(key); }
export function invalidateAll() { bufferCache.clear(); }

function decode(arrayBuffer) {
  const c = getCtx();
  return new Promise((resolve, reject) => {
    const p = c.decodeAudioData(arrayBuffer, resolve, reject);
    if (p && p.then) p.then(resolve, reject);
  });
}

// ---------- playback ----------
let current = null; // { stop() }

export function stopAll() {
  if (current) { current.stop(); current = null; }
  try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (_) { /* ignore */ }
}

function playBuffer(buf, onLevel) {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
  return new Promise((resolve) => {
    const src = c.createBufferSource();
    src.buffer = buf;
    const an = c.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    an.connect(c.destination);
    const data = new Float32Array(an.fftSize);
    let raf = 0, done = false, smooth = 0;
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      onLevel && onLevel(0);
      try { src.disconnect(); an.disconnect(); } catch (_) { /* ignore */ }
      resolve();
    };
    const tick = () => {
      an.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      const target = Math.min(1, rms * 7);
      smooth = smooth * 0.5 + target * 0.5;
      onLevel && onLevel(smooth);
      raf = requestAnimationFrame(tick);
    };
    src.onended = finish;
    current = { stop: () => { try { src.stop(); } catch (_) { /* ignore */ } finish(); } };
    src.start(0);
    tick();
    setTimeout(finish, buf.duration * 1000 + 800);
  });
}

// ---------- built-in voice fallback ----------
const MOM_HINTS = /samantha|karen|victoria|allison|ava|susan|zira|moira|tessa|serena|kate|female|nicky|shelley|flo|sandy/i;
const DAD_HINTS = /daniel|aaron|alex|fred|tom|david|mark|arthur|rishi|male|reed|eddy|rocko|oliver|gordon/i;

function pickVoice(speaker) {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  if (!voices.length) return null;
  const re = speaker === 'dad' ? DAD_HINTS : MOM_HINTS;
  const us = voices.filter((v) => /en[-_]US/i.test(v.lang));
  return us.find((v) => re.test(v.name)) || voices.find((v) => re.test(v.name)) || us[0] || voices[0];
}

function speakTTS(text, speaker, onLevel) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window) || !text.trim()) { resolve(); return; }
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(speaker);
    if (v) u.voice = v;
    u.rate = settingsRef.speechRate || 0.8;
    u.pitch = speaker === 'dad' ? 0.9 : speaker === 'kid' ? 1.5 : 1.2;
    let done = false, raf = 0, started = performance.now();
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      onLevel && onLevel(0);
      resolve();
    };
    const tick = () => {
      const t = (performance.now() - started) / 1000;
      const lv = 0.35 + 0.35 * Math.abs(Math.sin(t * 11)) + 0.15 * Math.sin(t * 23);
      onLevel && onLevel(lv);
      raf = requestAnimationFrame(tick);
    };
    u.onstart = () => { started = performance.now(); };
    u.onend = finish;
    u.onerror = finish;
    current = { stop: () => { try { speechSynthesis.cancel(); } catch (_) { /* ignore */ } finish(); } };
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    tick();
    // Safety: iPad sometimes never fires onend.
    const est = 900 + text.split(/\s+/).length * 650 / (settingsRef.speechRate || 0.8);
    setTimeout(finish, est + 1500);
  });
}

// Say something: use the parent's recording if present, otherwise the built-in voice.
export async function say(key, text, speaker, onLevel) {
  let buf = null;
  try { buf = key ? await loadBuffer(key) : null; } catch (_) { buf = null; }
  if (buf) return playBuffer(buf, onLevel);
  return speakTTS(text, speaker, onLevel);
}

export async function playKey(key) {
  const buf = await loadBuffer(key);
  if (buf) await playBuffer(buf, null);
}

// ---------- sound effects (soft, synthesized) ----------
export function sfx(name) {
  if (!settingsRef.sounds) return;
  const c = getCtx();
  const now = c.currentTime;
  const tone = (freq, start, dur, type = 'sine', vol = 0.12, slideTo = null) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now + start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, now + start + dur);
    g.gain.setValueAtTime(0.0001, now + start);
    g.gain.exponentialRampToValueAtTime(vol, now + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    o.connect(g); g.connect(c.destination);
    o.start(now + start); o.stop(now + start + dur + 0.05);
  };
  switch (name) {
    case 'cheer': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.35, 'triangle', 0.1)); break;
    case 'pop': tone(500, 0, 0.12, 'sine', 0.12, 900); break;
    case 'beep': tone(440, 0, 0.18, 'square', 0.05); tone(440, 0.25, 0.22, 'square', 0.05); break;
    case 'zoom': tone(180, 0, 0.6, 'sawtooth', 0.04, 700); break;
    case 'sparkle': [1200, 1500, 1800].forEach((f, i) => tone(f, i * 0.06, 0.2, 'sine', 0.06)); break;
    case 'boing': tone(300, 0, 0.3, 'sine', 0.12, 120); break;
    case 'tick': tone(880, 0, 0.06, 'sine', 0.05); break;
    default: break;
  }
}

// ---------- recording ----------
let mediaStream = null;
let recorder = null;
let chunks = [];
let autoStopTimer = null;

function pickMime() {
  if (!window.MediaRecorder) return '';
  const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
  for (const t of types) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
  return '';
}

export function recordingSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

export async function startRecording(maxMs = 5000, onAutoStop) {
  if (!recordingSupported()) throw new Error('Recording is not supported here. Open the app from its https:// address in Safari.');
  if (!mediaStream) {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  }
  chunks = [];
  const mime = pickMime();
  recorder = mime ? new MediaRecorder(mediaStream, { mimeType: mime }) : new MediaRecorder(mediaStream);
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  recorder.start();
  clearTimeout(autoStopTimer);
  autoStopTimer = setTimeout(() => onAutoStop && onAutoStop(), maxMs);
}

// Stops, trims silence, evens out volume, and returns a WAV ArrayBuffer.
export function stopRecording() {
  clearTimeout(autoStopTimer);
  return new Promise((resolve, reject) => {
    if (!recorder) { reject(new Error('Not recording')); return; }
    const r = recorder;
    r.onstop = async () => {
      try {
        const blob = new Blob(chunks, { type: r.mimeType || 'audio/mp4' });
        const ab = await blob.arrayBuffer();
        const buf = await decode(ab);
        const processed = trimAndNormalize(buf);
        resolve(encodeWAV(processed.data, processed.sampleRate));
      } catch (e) {
        reject(e);
      }
    };
    r.stop();
    recorder = null;
  });
}

export function releaseMic() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
}

function trimAndNormalize(buf) {
  const sr = buf.sampleRate;
  const src = buf.getChannelData(0);
  // find speech start/end using short-window energy
  const win = Math.floor(sr * 0.02);
  let peak = 0;
  for (let i = 0; i < src.length; i++) peak = Math.max(peak, Math.abs(src[i]));
  const thresh = Math.max(0.01, peak * 0.08);
  let start = 0, end = src.length;
  for (let i = 0; i < src.length; i += win) {
    let m = 0;
    for (let j = i; j < Math.min(i + win, src.length); j++) m = Math.max(m, Math.abs(src[j]));
    if (m > thresh) { start = i; break; }
  }
  for (let i = src.length - win; i > 0; i -= win) {
    let m = 0;
    for (let j = i; j < Math.min(i + win, src.length); j++) m = Math.max(m, Math.abs(src[j]));
    if (m > thresh) { end = i + win; break; }
  }
  const pad = Math.floor(sr * 0.08);
  start = Math.max(0, start - pad);
  end = Math.min(src.length, end + pad);
  if (end <= start) { start = 0; end = src.length; }
  const out = new Float32Array(end - start);
  const gain = peak > 0 ? Math.min(6, 0.9 / peak) : 1;
  const fade = Math.floor(sr * 0.01);
  for (let i = 0; i < out.length; i++) {
    let v = src[start + i] * gain;
    if (i < fade) v *= i / fade;
    if (i > out.length - fade) v *= (out.length - i) / fade;
    out[i] = v;
  }
  return { data: out, sampleRate: sr };
}

function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE');
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}
