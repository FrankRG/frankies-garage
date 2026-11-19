// app.js — screens, navigation, parent area.
import { kv, audioStore, clearAll, requestPersistence } from './storage.js';
import {
  DEFAULT_PHRASES, DEFAULT_WORDS, DEFAULT_FAMILY, DEFAULT_SETTINGS, ACTIONS,
  SKIN_TONES, HAIR_COLORS, SHIRT_COLORS, CAR_COLORS, HAIR_STYLES, BEARDS, fill, phraseText,
} from './scenes.js';
import { Stage } from './stage.js';
import { buildPerson, el } from './avatar.js';
import * as audio from './audio.js';

const $ = (s) => document.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : String(k));
  return n;
};

const state = {
  settings: null, family: null, phrases: [], words: [], log: [],
  screen: 'home', mode: 'say', current: 0,
  wordMode: 1, firstWord: null, lastWord: null, wordTurn: 0,
  sessionStart: null, waiting: null, waitTimer: null, playing: false,
  parentTab: 'family',
};
let stage;

// ---------- load / save ----------
function mergeList(defaults, saved) {
  if (!Array.isArray(saved)) return defaults.map((d) => ({ ...d, enabled: true }));
  const out = saved.map((s) => {
    const d = defaults.find((x) => x.id === s.id);
    return d ? { ...d, ...s } : s;
  });
  for (const d of defaults) if (!out.find((x) => x.id === d.id)) out.push({ ...d, enabled: true });
  return out;
}

async function load() {
  state.settings = { ...DEFAULT_SETTINGS, ...((await kv.get('settings')) || {}) };
  const fam = (await kv.get('family')) || {};
  state.family = {
    mom: { ...DEFAULT_FAMILY.mom, ...(fam.mom || {}) },
    dad: { ...DEFAULT_FAMILY.dad, ...(fam.dad || {}) },
    kid: { ...DEFAULT_FAMILY.kid, ...(fam.kid || {}), child: true },
  };
  state.phrases = mergeList(DEFAULT_PHRASES, await kv.get('phrases'));
  state.words = mergeList(DEFAULT_WORDS, await kv.get('words'));
  state.log = (await kv.get('log')) || [];
}

const save = (key) => kv.set(key, state[key]);
let logTimer = null;
function logEvent(type, kind, id, mode) {
  state.log.push({ t: Date.now(), type, kind, id, mode });
  if (state.log.length > 20000) state.log.splice(0, state.log.length - 20000);
  clearTimeout(logTimer);
  logTimer = setTimeout(() => save('log'), 800);
}

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.add('hidden'), ms);
}

const enabledPhrases = () => state.phrases.filter((p) => p.enabled !== false);
const enabledWords = () => state.words.filter((w) => w.enabled !== false);
const nameOf = (who) => state.family[who]?.name || (who === 'dad' ? 'Dad' : 'Mom');

// ---------- navigation ----------
const TITLES = { home: '', play: '', words: 'Word garage', parent: 'Grown-ups', alldone: '' };

function show(screen) {
  if (state.screen !== screen) {
    stage.cancel();
    cancelWait();
  }
  state.screen = screen;
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${screen}`));
  const slot = document.querySelector(`#screen-${screen} .stage-slot`);
  const host = $('#stageHost');
  if (slot) slot.appendChild(host); else $('#app').appendChild(host);
  $('#homeBtn').classList.toggle('hidden', screen === 'home' || screen === 'parent' || screen === 'alldone');
  $('#lockBtn').classList.toggle('hidden', screen === 'parent');
  $('#doneBtn').classList.toggle('hidden', screen !== 'parent');
  $('#topTitle').textContent = screen === 'play' ? (state.mode === 'say' ? 'Say it with me' : 'Finish it') : TITLES[screen];
  $('#saidBtn').classList.toggle('hidden', screen === 'alldone');
  stage.bubble(null, null);
}

function startActivity(kind) {
  if (!state.sessionStart) state.sessionStart = Date.now();
  if (kind === 'words') {
    show('words');
    renderWords();
    return;
  }
  state.mode = kind;
  if (state.current >= enabledPhrases().length) state.current = 0;
  show('play');
  renderStrip();
  stage.reset();
}

function checkSession() {
  const m = Number(state.settings.sessionMinutes) || 0;
  if (!m || !state.sessionStart) return false;
  if (Date.now() - state.sessionStart >= m * 60000) {
    showAllDone();
    return true;
  }
  return false;
}

async function showAllDone() {
  show('alldone');
  const p = state.phrases.find((x) => x.id === 'alldone') || DEFAULT_PHRASES.find((x) => x.id === 'alldone');
  const sp = p.speaker || 'mom';
  await stage.play({
    action: 'alldone', speaker: sp, mode: 'say',
    leadText: fill(p.lead, state.settings), lastText: fill(p.last, state.settings),
    leadKey: audio.keys.phrase(p.id, sp, 'lead'), lastKey: audio.keys.phrase(p.id, sp, 'last'),
  });
  if (state.screen === 'alldone') await stage.play({ action: 'hi', speaker: sp, mode: 'say', leadText: '', lastText: 'Bye-bye!', quick: true });
}

// ---------- home ----------
function renderHome() {
  $('#homeTitle').textContent = `${state.settings.childName || 'Frankie'}'s Garage`;
  document.title = `${state.settings.childName || 'Frankie'}'s Garage`;
  const box = $('#homeFamily');
  box.innerHTML = '';
  const svg = el('svg', { viewBox: '0 -400 640 410' });
  const spots = [['mom', 130], ['kid', 320], ['dad', 510]];
  for (const [who, x] of spots) {
    const p = buildPerson(state.family[who]);
    p.root.set({ x, y: 0 });
    if (who === 'kid') { p.armL.set({ r: 140 }); p.armR.set({ r: -140 }); }
    else if (who === 'mom') p.armR.set({ r: -40 });
    else p.armL.set({ r: 40 });
    svg.appendChild(p.g);
  }
  box.appendChild(svg);
  $('#saidName').textContent = state.settings.childName || 'Frankie';
}

// ---------- say it / finish it ----------
let lastTap = 0;
function debounce() {
  const now = Date.now();
  if (now - lastTap < 280) return false;
  lastTap = now;
  return true;
}

function renderStrip() {
  const strip = $('#phraseStrip');
  strip.innerHTML = '';
  enabledPhrases().forEach((p, i) => {
    const b = h('button', { class: `chip${i === state.current ? ' active' : ''}`, 'aria-label': phraseText(p, state.settings) },
      h('span', { class: 'ci' }, p.icon || '💬'),
      h('span', { class: 'ct' }, phraseText(p, state.settings)));
    b.addEventListener('click', () => {
      if (!debounce()) return;
      state.current = i;
      strip.querySelectorAll('.chip').forEach((c, j) => c.classList.toggle('active', j === i));
      playCurrent();
    });
    strip.appendChild(b);
  });
}

async function playCurrent() {
  const list = enabledPhrases();
  if (!list.length) { toast('No phrases are turned on. A grown-up can add some in settings.'); return; }
  const p = list[state.current] || list[0];
  const sp = p.speaker || 'mom';
  cancelWait();
  logEvent('play', 'phrase', p.id, state.mode);
  state.playing = true;
  const res = await stage.play({
    action: p.action, speaker: sp, mode: state.mode,
    leadText: fill(p.lead, state.settings), lastText: fill(p.last, state.settings),
    leadKey: audio.keys.phrase(p.id, sp, 'lead'), lastKey: audio.keys.phrase(p.id, sp, 'last'),
    waitFor: state.mode === 'finish' ? waitForChild : null,
  });
  if (res === 'cancel') return;
  state.playing = false;
  checkSession();
}

function waitForChild() {
  return new Promise((resolve) => {
    state.waiting = resolve;
    const btn = $('#saidBtn');
    btn.classList.add('waiting');
    const bar = $('#waitBar');
    const inner = bar.firstElementChild;
    bar.classList.add('on');
    inner.style.transition = 'none';
    inner.style.transform = 'scaleX(1)';
    void inner.offsetWidth;
    const secs = Number(state.settings.waitSeconds) || 4;
    inner.style.transition = `transform ${secs}s linear`;
    inner.style.transform = 'scaleX(0)';
    state.waitTimer = setTimeout(() => finishWait('timeout'), secs * 1000);
  });
}

function finishWait(result) {
  clearTimeout(state.waitTimer);
  $('#saidBtn').classList.remove('waiting');
  $('#waitBar').classList.remove('on');
  if (!state.waiting) return;
  const r = state.waiting;
  state.waiting = null;
  r(result);
}
const cancelWait = () => finishWait('cancel');

function onSaid() {
  const btn = $('#saidBtn');
  btn.classList.add('flash');
  setTimeout(() => btn.classList.remove('flash'), 600);
  if (state.screen === 'play') {
    const p = enabledPhrases()[state.current];
    if (p) logEvent('said', 'phrase', p.id, state.mode);
  } else if (state.screen === 'words' && state.lastWord) {
    logEvent('said', 'word', state.lastWord.id, 'word');
  }
  if (state.waiting) { finishWait('said'); return; }
  if (!state.playing) stage.celebrate();
}

// ---------- word garage ----------
function renderWords() {
  const grid = $('#wordGrid');
  grid.innerHTML = '';
  for (const w of enabledWords()) {
    const b = h('button', { class: 'tile', 'aria-label': w.text },
      h('span', { class: 'ti' }, w.icon || '💬'),
      h('span', { class: 'tt' }, w.text));
    b.addEventListener('click', () => { if (debounce()) onWord(w); });
    grid.appendChild(b);
  }
  setWordMode(state.wordMode);
}

function setWordMode(m) {
  state.wordMode = m;
  state.firstWord = null;
  $('#mode1').classList.toggle('active', m === 1);
  $('#mode2').classList.toggle('active', m === 2);
  renderSentence([]);
}

function renderSentence(words, pending = false) {
  const s = $('#sentence');
  s.innerHTML = '';
  for (const w of words) s.appendChild(h('span', { class: 'sw' }, `${w.icon || ''} ${w.text}`));
  if (pending) s.appendChild(h('span', { class: 'sw', style: 'opacity:.4' }, '+ ?'));
}

function wordSpeaker(w) {
  if (w.speaker) return w.speaker;
  const pref = state.settings.wordSpeaker || 'alternate';
  if (pref !== 'alternate') return pref;
  state.wordTurn = (state.wordTurn + 1) % 2;
  return state.wordTurn ? 'mom' : 'dad';
}

async function onWord(w) {
  state.lastWord = w;
  logEvent('play', 'word', w.id, 'word');
  if (state.wordMode === 1) {
    const sp = wordSpeaker(w);
    renderSentence([w]);
    state.playing = true;
    const r = await stage.play({ action: w.action, speaker: sp, mode: 'word', quick: true, leadText: '', lastText: w.text, lastKey: audio.keys.word(w.id, sp) });
    if (r !== 'cancel') { state.playing = false; checkSession(); }
    return;
  }
  // two-word mode
  if (!state.firstWord) {
    state.firstWord = w;
    renderSentence([w], true);
    const sp = wordSpeaker(w);
    state.firstSpeaker = sp;
    state.playing = true;
    const r = await stage.play({ action: 'none', speaker: sp, mode: 'word', quick: true, leadText: '', lastText: w.text, lastKey: audio.keys.word(w.id, sp) });
    if (r !== 'cancel') state.playing = false;
    return;
  }
  const first = state.firstWord;
  state.firstWord = null;
  renderSentence([first, w]);
  const sp = state.firstSpeaker || 'mom';
  state.playing = true;
  const r = await stage.play({
    action: w.action, speaker: sp, mode: 'word', quick: true,
    leadText: first.text, leadKey: audio.keys.word(first.id, sp),
    lastText: w.text, lastKey: audio.keys.word(w.id, sp),
  });
  if (r === 'cancel') return;
  state.playing = false;
  setTimeout(() => { if (!state.firstWord && state.screen === 'words') renderSentence([]); }, 1800);
  checkSession();
}

// ---------- grown-up lock ----------
function setupLock() {
  const b = $('#lockBtn');
  let timer = null;
  const start = (e) => {
    e.preventDefault();
    b.classList.add('holding');
    timer = setTimeout(() => { b.classList.remove('holding'); openParent(); }, 3000);
  };
  const end = () => { clearTimeout(timer); b.classList.remove('holding'); };
  b.addEventListener('pointerdown', start);
  b.addEventListener('pointerup', end);
  b.addEventListener('pointerleave', end);
  b.addEventListener('pointercancel', end);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  b.addEventListener('click', () => { if (!b.classList.contains('holding')) toast('Grown-ups: press and hold ⚙️ for 3 seconds', 1800); });
}

function openParent() {
  show('parent');
  renderParent();
}

function closeParent() {
  audio.releaseMic();
  state.sessionStart = null;
  stage.setFamily(state.family);
  renderHome();
  show('home');
}

// ---------- parent area ----------
const TABS = [
  ['family', '👪 Family'], ['voices', '🎙️ Voices'], ['phrases', '💬 Phrases'], ['words', '🔤 Words'],
  ['progress', '📈 Progress'], ['settings', '⚙️ Settings'], ['tips', '💡 Tips'],
];

function renderParent() {
  const nav = $('#parentTabs');
  nav.innerHTML = '';
  for (const [id, label] of TABS) {
    nav.appendChild(h('button', { class: `tab${state.parentTab === id ? ' active' : ''}`, onclick: () => { state.parentTab = id; renderParent(); } }, label));
  }
  const body = $('#parentBody');
  body.innerHTML = '';
  body.scrollTop = 0;
  ({ family: tabFamily, voices: tabVoices, phrases: tabPhrases, words: tabWords, progress: tabProgress, settings: tabSettings, tips: tabTips })[state.parentTab](body);
}

// ----- family -----
function tabFamily(body) {
  body.appendChild(h('div', { class: 'panel' },
    h('h2', {}, 'Make your cartoon family'),
    h('p', {}, 'Pick colors and styles so the cartoons look like you. Kids often respond better to video models of people they know.')));
  const grid = h('div', { class: 'avatar-grid' });
  for (const who of ['mom', 'dad', 'kid']) {
    const card = h('div', { class: 'panel avatar-card' });
    grid.appendChild(card);
    renderAvatarCard(who, card);
  }
  body.appendChild(grid);
}

function renderAvatarCard(who, card) {
  card.innerHTML = '';
  const cfg = state.family[who];
  const update = (patch) => {
    Object.assign(cfg, patch);
    if (who === 'kid' && patch.name !== undefined) { state.settings.childName = patch.name || 'Frankie'; save('settings'); }
    save('family');
    if (patch.name === undefined) renderAvatarCard(who, card);
    else drawPreview();
  };
  const preview = h('div', { class: 'preview' });
  const drawPreview = () => {
    preview.innerHTML = '';
    const svg = el('svg', { viewBox: '-110 -400 220 410', width: 130, height: 240 });
    const p = buildPerson({ ...cfg, child: false });
    svg.appendChild(p.g);
    preview.appendChild(svg);
  };
  drawPreview();

  const swatches = (list, key) => h('div', { class: 'swatches' }, list.map((c) =>
    h('button', { class: `swatch${cfg[key] === c ? ' on' : ''}`, style: `background:${c}`, 'aria-label': c, onclick: () => update({ [key]: c }) })));
  const opts = (list, key) => h('div', { class: 'opts' }, list.map((o) =>
    h('button', { class: `opt${cfg[key] === o.id ? ' on' : ''}`, onclick: () => update({ [key]: o.id }) }, o.label)));

  const nameInput = h('input', { type: 'text', value: who === 'kid' ? (state.settings.childName || cfg.name) : cfg.name, maxlength: 20 });
  nameInput.addEventListener('change', () => update({ name: nameInput.value.trim() || DEFAULT_FAMILY[who].name }));

  const controls = h('div', { class: 'controls' },
    h('div', { class: 'label' }, who === 'kid' ? "Child's name" : 'Name'), nameInput,
    h('div', { class: 'label' }, 'Skin'), swatches(SKIN_TONES, 'skin'),
    h('div', { class: 'label' }, 'Hair'), opts(HAIR_STYLES, 'hair'),
    h('div', { class: 'label' }, 'Hair color'), swatches(HAIR_COLORS, 'hairColor'),
    who !== 'kid' ? h('div', { class: 'label' }, 'Beard') : null,
    who !== 'kid' ? opts(BEARDS, 'beard') : null,
    h('div', { class: 'label' }, 'Glasses'),
    h('button', { class: `toggle${cfg.glasses ? ' on' : ''}`, 'aria-label': 'Glasses', onclick: () => update({ glasses: !cfg.glasses }) }),
    h('div', { class: 'label' }, 'Shirt'), swatches(SHIRT_COLORS, 'shirt'),
    who === 'kid' ? h('div', { class: 'label' }, `${state.settings.childName || 'Frankie'}'s car`) : null,
    who === 'kid' ? swatches(CAR_COLORS, 'car') : null,
  );
  card.append(preview, controls);
}

// ----- voices -----
let rec = null; // { btn, key, label }

function recButton(label, key, onDone) {
  const b = h('button', { class: 'btn rec' }, `● ${label}`);
  audio.hasClip(key).then((has) => { if (has) b.classList.add('has'); });
  b.addEventListener('click', async () => {
    audio.unlock();
    if (rec && rec.btn === b) { await stopRec(); return; }
    if (rec) return;
    try {
      rec = { btn: b, key, label, onDone };
      await audio.startRecording(5000, () => stopRec());
      b.classList.add('recording');
      b.textContent = '■ Stop';
    } catch (e) {
      rec = null;
      toast(e.message && e.message.includes('https') ? e.message : 'Could not use the microphone. Check that Safari has microphone permission, and open the app from its https:// address.', 5000);
    }
  });
  return b;
}

async function stopRec() {
  if (!rec) return;
  const { btn, key, label, onDone } = rec;
  rec = null;
  btn.classList.remove('recording');
  btn.textContent = '… saving';
  try {
    const buf = await audio.stopRecording();
    await audioStore.set(key, { buf, type: 'audio/wav' });
    audio.invalidate(key);
    btn.classList.add('has');
    btn.textContent = `● ${label}`;
    onDone && onDone();
    await audio.playKey(key);
  } catch (e) {
    btn.textContent = `● ${label}`;
    toast("That recording didn't work. Please try again.");
  }
}

async function deleteClips(keys, row) {
  for (const k of keys) { await audioStore.del(k); audio.invalidate(k); }
  row.querySelectorAll('.btn.rec').forEach((b) => b.classList.remove('has'));
  toast('Recording deleted. The built-in voice will be used instead.');
}

function tabVoices(body) {
  body.appendChild(h('div', { class: 'panel' },
    h('h2', {}, 'Record your voices'),
    h('p', {}, 'Tap ●, say the words, then tap ■ (it stops on its own after 5 seconds). It plays back so you can check it. Green means it’s recorded. Anything not recorded uses the iPad’s built-in voice.'),
    h('p', {}, h('b', {}, 'Tips: '), 'Say it the same cheerful way you’d say it to him in real life. Keep it short and clear, a little slower than normal. A quiet room helps. Recordings stay on this iPad only.'),
    !audio.recordingSupported() ? h('p', { style: 'color:#B33A28;font-weight:700' }, 'Recording isn’t available here. Open the app from its https:// web address in Safari.') : null,
  ));

  const pp = h('div', { class: 'panel' }, h('h2', {}, 'Phrases'),
    h('p', {}, 'Phrases are recorded in two parts so “Finish it” can pause before the last word. Each phrase uses the parent chosen in the Phrases tab.'));
  for (const p of state.phrases) {
    const sp = p.speaker || 'mom';
    const kLead = audio.keys.phrase(p.id, sp, 'lead');
    const kLast = audio.keys.phrase(p.id, sp, 'last');
    const row = h('div', { class: 'row' },
      h('span', { class: 'emoji' }, p.icon || '💬'),
      h('span', { class: 'grow' }, phraseText(p, state.settings), p.enabled === false ? h('span', { class: 'hint' }, ' (off)') : null),
      h('span', { class: 'who' }, nameOf(sp)));
    if (p.lead) row.appendChild(recButton(`“${fill(p.lead, state.settings)}”`, kLead));
    row.appendChild(recButton(`“${fill(p.last, state.settings)}”`, kLast));
    row.appendChild(h('button', { class: 'btn', 'aria-label': 'Play', onclick: async () => {
      audio.unlock();
      if (p.lead) await audio.say(kLead, fill(p.lead, state.settings), sp);
      await audio.say(kLast, fill(p.last, state.settings), sp);
    } }, '▶'));
    row.appendChild(h('button', { class: 'btn danger', 'aria-label': 'Delete recording', onclick: () => deleteClips([kLead, kLast], row) }, '✕'));
    pp.appendChild(row);
  }
  body.appendChild(pp);

  const wp = h('div', { class: 'panel' }, h('h2', {}, 'Words'));
  for (const w of state.words) {
    const speakers = w.speaker ? [w.speaker] : (state.settings.wordSpeaker && state.settings.wordSpeaker !== 'alternate' ? [state.settings.wordSpeaker] : ['mom', 'dad']);
    const row = h('div', { class: 'row' }, h('span', { class: 'emoji' }, w.icon || '💬'), h('span', { class: 'grow' }, w.text));
    const ks = [];
    for (const sp of speakers) {
      const k = audio.keys.word(w.id, sp);
      ks.push(k);
      row.appendChild(h('span', { class: 'who' }, nameOf(sp)));
      row.appendChild(recButton(`“${w.text}”`, k));
    }
    row.appendChild(h('button', { class: 'btn danger', 'aria-label': 'Delete recording', onclick: () => deleteClips(ks, row) }, '✕'));
    wp.appendChild(row);
  }
  body.appendChild(wp);
}

// ----- phrases -----
const speakerSelect = (value, onChange, withAlt = false) => {
  const s = h('select', {},
    h('option', { value: 'mom' }, nameOf('mom')),
    h('option', { value: 'dad' }, nameOf('dad')),
    withAlt ? h('option', { value: 'alternate' }, 'Take turns') : null);
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return s;
};
const actionSelect = (value, onChange) => {
  const s = h('select', {}, ACTIONS.map((a) => h('option', { value: a.id }, a.label)));
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return s;
};
const toggle = (on, onChange) => {
  const b = h('button', { class: `toggle${on ? ' on' : ''}`, 'aria-label': 'On or off' });
  b.addEventListener('click', () => { const v = !b.classList.contains('on'); b.classList.toggle('on', v); onChange(v); });
  return b;
};

function tabPhrases(body) {
  body.appendChild(h('div', { class: 'panel' },
    h('h2', {}, 'Phrases'),
    h('p', {}, 'Turn phrases on or off, choose who says them, and pick the little movie that plays. Good phrases are short (1–3 words), useful every day, and fun to say. Ask his speech therapist which phrases to work on, and add lines he already says from shows.')));
  const list = h('div', { class: 'panel' });
  for (const p of state.phrases) {
    const row = h('div', { class: 'row' },
      h('span', { class: 'emoji' }, p.icon || '💬'),
      h('span', { class: 'grow' }, phraseText(p, state.settings)),
      toggle(p.enabled !== false, (v) => { p.enabled = v; save('phrases'); }),
      speakerSelect(p.speaker || 'mom', (v) => { p.speaker = v; save('phrases'); }),
      actionSelect(p.action, (v) => { p.action = v; save('phrases'); }),
      p.id.startsWith('c_') ? h('button', { class: 'btn danger', onclick: async () => {
        if (!confirm(`Delete “${phraseText(p, state.settings)}”?`)) return;
        state.phrases = state.phrases.filter((x) => x !== p);
        await save('phrases');
        for (const sp of ['mom', 'dad']) for (const part of ['lead', 'last']) await audioStore.del(audio.keys.phrase(p.id, sp, part));
        renderParent();
      } }, 'Delete') : null);
    list.appendChild(row);
  }
  body.appendChild(list);

  const icon = h('input', { type: 'text', class: 'emoji-in', value: '⭐', maxlength: 4 });
  const lead = h('input', { type: 'text', placeholder: 'First part, e.g. “Push the”', maxlength: 40 });
  const last = h('input', { type: 'text', placeholder: 'Last word, e.g. “button”', maxlength: 24 });
  let action = 'cheer', speaker = 'mom';
  body.appendChild(h('div', { class: 'panel' },
    h('h2', {}, 'Add a phrase'),
    h('p', {}, 'The last word is the part he’ll fill in during “Finish it.” Leave the first part empty for one-word phrases. Type {name} to use his name.'),
    h('div', { class: 'row' }, icon, lead, last),
    h('div', { class: 'row' }, actionSelect(action, (v) => { action = v; }), speakerSelect(speaker, (v) => { speaker = v; }),
      h('button', { class: 'btn primary', onclick: async () => {
        if (!last.value.trim()) { toast('Please type at least the last word.'); return; }
        state.phrases.push({ id: 'c_' + Date.now().toString(36), lead: lead.value.trim(), last: last.value.trim(), icon: icon.value.trim() || '⭐', action, speaker, enabled: true });
        await save('phrases');
        toast('Added! Record it in the Voices tab.');
        renderParent();
      } }, 'Add phrase'))));
}

// ----- words -----
function tabWords(body) {
  body.appendChild(h('div', { class: 'panel' },
    h('h2', {}, 'Word garage'),
    h('p', {}, 'Single words he can tap and hear. In “2 words” mode he taps two tiles to build a little sentence like “more car” or “go up.” Pick words he uses often or needs every day.'),
    h('div', { class: 'row' }, h('span', { class: 'grow' }, 'Who says the words'),
      speakerSelect(state.settings.wordSpeaker || 'alternate', (v) => { state.settings.wordSpeaker = v; save('settings'); }, true))));
  const list = h('div', { class: 'panel' });
  for (const w of state.words) {
    list.appendChild(h('div', { class: 'row' },
      h('span', { class: 'emoji' }, w.icon || '💬'),
      h('span', { class: 'grow' }, w.text),
      toggle(w.enabled !== false, (v) => { w.enabled = v; save('words'); }),
      actionSelect(w.action, (v) => { w.action = v; save('words'); }),
      w.id.startsWith('c_') ? h('button', { class: 'btn danger', onclick: async () => {
        state.words = state.words.filter((x) => x !== w);
        await save('words');
        renderParent();
      } }, 'Delete') : null));
  }
  body.appendChild(list);

  const icon = h('input', { type: 'text', class: 'emoji-in', value: '⭐', maxlength: 4 });
  const text = h('input', { type: 'text', placeholder: 'Word, e.g. “juice”', maxlength: 20 });
  let action = 'cheer';
  body.appendChild(h('div', { class: 'panel' },
    h('h2', {}, 'Add a word'),
    h('p', {}, 'Tip: on iPad, tap the 🌐 or 😀 key on the keyboard to pick an emoji picture.'),
    h('div', { class: 'row' }, icon, text, actionSelect(action, (v) => { action = v; }),
      h('button', { class: 'btn primary', onclick: async () => {
        if (!text.value.trim()) { toast('Please type a word.'); return; }
        state.words.push({ id: 'c_' + Date.now().toString(36), text: text.value.trim(), icon: icon.value.trim() || '⭐', action, enabled: true });
        await save('words');
        toast('Added! Record it in the Voices tab.');
        renderParent();
      } }, 'Add word'))));
}

// ----- progress -----
function stats() {
  const weekAgo = Date.now() - 7 * 86400000;
  const map = new Map();
  for (const e of state.log) {
    const k = `${e.kind}:${e.id}`;
    if (!map.has(k)) map.set(k, { kind: e.kind, id: e.id, plays: 0, said: 0, said7: 0, plays7: 0, lastSaid: 0 });
    const s = map.get(k);
    if (e.type === 'play') { s.plays++; if (e.t > weekAgo) s.plays7++; }
    if (e.type === 'said') { s.said++; if (e.t > weekAgo) s.said7++; s.lastSaid = Math.max(s.lastSaid, e.t); }
  }
  return [...map.values()];
}

function labelFor(s) {
  if (s.kind === 'phrase') {
    const p = state.phrases.find((x) => x.id === s.id) || DEFAULT_PHRASES.find((x) => x.id === s.id);
    return p ? `${p.icon || ''} ${phraseText(p, state.settings)}` : s.id;
  }
  const w = state.words.find((x) => x.id === s.id) || DEFAULT_WORDS.find((x) => x.id === s.id);
  return w ? `${w.icon || ''} ${w.text}` : s.id;
}

function summaryText() {
  const name = state.settings.childName || 'Frankie';
  const st = stats();
  const weekAgo = Date.now() - 7 * 86400000;
  const days = new Set(state.log.filter((e) => e.t > weekAgo).map((e) => new Date(e.t).toDateString())).size;
  const lines = [`${name}'s Garage: practice summary (${new Date().toLocaleDateString()})`, `Practiced on ${days} of the last 7 days.`, ''];
  const said = st.filter((s) => s.said7 > 0).sort((a, b) => b.said7 - a.said7);
  lines.push(said.length ? 'Said in the last 7 days (times said / times played):' : 'No “said it” taps recorded in the last 7 days.');
  for (const s of said) lines.push(`• ${labelFor(s).trim()}: ${s.said7} / ${s.plays7}`);
  return lines.join('\n');
}

function tabProgress(body) {
  const st = stats();
  const weekAgo = Date.now() - 7 * 86400000;
  const plays7 = state.log.filter((e) => e.type === 'play' && e.t > weekAgo).length;
  const said7 = state.log.filter((e) => e.type === 'said' && e.t > weekAgo).length;
  body.appendChild(h('div', { class: 'panel' },
    h('h2', {}, 'This week'),
    h('p', {}, `${plays7} scenes played · ${said7} times ${state.settings.childName || 'Frankie'} said it 👍`),
    h('p', {}, 'Tap “👍 said it!” whenever he says the word or phrase, even partly or approximately. Attempts count. Bring this to his speech therapist.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: async () => {
        const txt = summaryText();
        try { await navigator.clipboard.writeText(txt); toast('Summary copied. Paste it into a message or email.'); }
        catch (_) { prompt('Copy this summary:', txt); }
      } }, '📋 Copy summary for therapist'),
      h('button', { class: 'btn danger', onclick: async () => {
        if (!confirm('Clear all progress history?')) return;
        state.log = []; await save('log'); renderParent();
      } }, 'Clear history'))));

  const table = (kind, title) => {
    const rows = st.filter((s) => s.kind === kind).sort((a, b) => b.said - a.said || b.plays - a.plays);
    const p = h('div', { class: 'panel' }, h('h2', {}, title));
    if (!rows.length) { p.appendChild(h('p', {}, 'Nothing yet.')); return p; }
    p.appendChild(h('table', { class: 'stats' },
      h('tr', {}, h('th', {}, ''), h('th', { class: 'num' }, 'Played'), h('th', { class: 'num' }, 'Said 👍'), h('th', { class: 'num' }, 'Said this week'), h('th', {}, 'Last said')),
      rows.map((s) => h('tr', {},
        h('td', {}, labelFor(s)),
        h('td', { class: 'num' }, s.plays),
        h('td', { class: 'num' }, s.said),
        h('td', { class: 'num' }, s.said7),
        h('td', {}, s.lastSaid ? new Date(s.lastSaid).toLocaleDateString() : '—')))));
    return p;
  };
  body.appendChild(table('phrase', 'Phrases'));
  body.appendChild(table('word', 'Words'));
}

// ----- settings -----
function tabSettings(body) {
  const s = state.settings;
  const sel = (value, options, onChange) => {
    const e = h('select', {}, options.map(([v, l]) => h('option', { value: v }, l)));
    e.value = String(value);
    e.addEventListener('change', () => onChange(e.value));
    return e;
  };
  const set = (patch) => { Object.assign(s, patch); save('settings'); audio.setAudioSettings(s); };
  body.appendChild(h('div', { class: 'panel' },
    h('h2', {}, 'Practice settings'),
    h('div', { class: 'row' }, h('span', { class: 'grow' }, '“Finish it” wait time', h('div', { class: 'hint' }, 'How long the cartoon waits for him before saying the word. Many kids need 5+ seconds to respond.')),
      sel(s.waitSeconds, [[2, '2 sec'], [3, '3 sec'], [4, '4 sec'], [5, '5 sec'], [6, '6 sec'], [8, '8 sec'], [10, '10 sec']], (v) => set({ waitSeconds: Number(v) }))),
    h('div', { class: 'row' }, h('span', { class: 'grow' }, 'Session timer', h('div', { class: 'hint' }, 'Shows a gentle “All done!” screen after this long.')),
      sel(s.sessionMinutes, [[0, 'Off'], [5, '5 min'], [10, '10 min'], [15, '15 min'], [20, '20 min']], (v) => set({ sessionMinutes: Number(v) }))),
    h('div', { class: 'row' }, h('span', { class: 'grow' }, 'Sound effects'), toggle(s.sounds, (v) => set({ sounds: v }))),
    h('div', { class: 'row' }, h('span', { class: 'grow' }, 'Built-in voice speed', h('div', { class: 'hint' }, 'Only used for anything you haven’t recorded.')),
      sel(s.speechRate, [[0.65, 'Slow'], [0.8, 'Relaxed'], [0.95, 'Normal']], (v) => set({ speechRate: Number(v) })),
      h('button', { class: 'btn', onclick: () => { audio.unlock(); audio.say(null, `Hi ${s.childName}! Ready, set, go!`, 'mom'); } }, '▶ Test')),
  ));
  body.appendChild(h('div', { class: 'panel' },
    h('h2', {}, 'Privacy'),
    h('p', {}, 'Everything (recordings, cartoons and progress) is saved only on this iPad. Nothing is uploaded or shared. If you delete the app from your Home Screen or clear Safari website data, the recordings are erased.')));
  body.appendChild(h('div', { class: 'panel' },
    h('h2', {}, 'Reset'),
    h('div', { class: 'row' },
      h('button', { class: 'btn danger', onclick: async () => {
        if (!confirm('Delete ALL voice recordings?')) return;
        await audioStore.clear(); audio.invalidateAll(); toast('All recordings deleted.');
      } }, 'Delete all recordings'),
      h('button', { class: 'btn danger', onclick: async () => {
        if (!confirm('Reset EVERYTHING: recordings, cartoons, phrases and progress?')) return;
        await clearAll(); audio.invalidateAll(); location.reload();
      } }, 'Reset everything'))));
}

// ----- tips -----
function tabTips(body) {
  const name = state.settings.childName || 'Frankie';
  const tip = (title, text) => h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', {}, title), h('div', { class: 'hint' }, text)));
  body.appendChild(h('div', { class: 'panel' },
    h('h2', {}, 'How to use it'),
    tip('1. Sit with him.', `Use it together for 5–10 minutes. Say the words along with the cartoon. ${name} learns best from you, and the app is just a prop.`),
    tip('2. Start with “Say it with me.”', 'Let him pick scenes and watch the same ones over and over. Repetition is the point. Copying the words and moves is a great sign.'),
    tip('3. Then try “Finish it.”', 'Once he knows a scene, the cartoon pauses before the last word. Wait quietly and look expectant. If he says anything close, tap 👍. If not, the cartoon says it for him. No pressure.'),
    tip('4. Take it off the screen.', 'Use the same phrases in real life with the same tune: “Ready, set… go!” before pushing him on the swing, or “Uh-oh!” when something drops. This is where the learning really sticks.'),
    tip('5. Build up slowly.', 'When he says a single word, add one more: he says “car,” you say “red car” or “car go.” The “2 words” mode in Word Garage models this.'),
    tip('6. Use your recordings.', 'Your voice is the most familiar and motivating one. Record the phrases he likes most first.'),
  ));
  body.appendChild(h('div', { class: 'panel' },
    h('h2', {}, 'Why this approach'),
    h('p', {}, 'Repeating whole movie lines (with the timing and movements) is called delayed echolalia. Many speech therapists see it as a sign of “gestalt language processing”: learning language in whole chunks first, then gradually breaking chunks into single words and making new combinations. This app gives him short, useful chunks modeled by familiar people (video modeling), then gently pauses so he can fill in the end.'),
    h('p', {}, 'Ask his speech therapist about gestalt language processing and Natural Language Acquisition (NLA). They can tell you which stage he’s at and which phrases to put in the app.'),
    h('p', {}, 'This app supports his therapy. It does not replace it.')));
  body.appendChild(h('div', { class: 'panel' },
    h('h2', {}, 'Keep him in the app'),
    h('p', {}, 'On iPad, turn on Guided Access (Settings → Accessibility → Guided Access). Then triple-click the top or side button while the app is open to lock the iPad to this app.')));
}

// ---------- boot ----------
async function boot() {
  await load();
  requestPersistence();
  audio.setAudioSettings(state.settings);
  stage = new Stage($('#stageHost'));
  stage.setFamily(state.family);

  document.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
  document.addEventListener('contextmenu', (e) => { if (state.screen !== 'parent') e.preventDefault(); });

  document.querySelectorAll('.home-card').forEach((b) => b.addEventListener('click', () => startActivity(b.dataset.go)));
  $('#homeBtn').addEventListener('click', () => { renderHome(); show('home'); });
  $('#doneBtn').addEventListener('click', closeParent);
  $('#againBtn').addEventListener('click', () => { if (debounce()) playCurrent(); });
  $('#saidBtn').addEventListener('click', onSaid);
  $('#mode1').addEventListener('click', () => setWordMode(1));
  $('#mode2').addEventListener('click', () => setWordMode(2));
  setupLock();

  renderHome();
  show('home');

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
