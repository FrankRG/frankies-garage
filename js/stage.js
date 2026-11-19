// stage.js — the animated scene: background, family, car, props, and the
// little "movies" that play for each phrase. Every scene plays exactly the same
// way each time (predictability helps kids who learn by memorizing scripts).
import { el, anim, part, buildPerson, buildCar, buildToyCar } from './avatar.js';
import { say, stopAll, sfx } from './audio.js';
import { CAR_COLORS } from './scenes.js';

const EASE = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  back: (t) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

const PX = 250;        // speaker x
const GROUND = 490;    // feet y
const ROAD = 578;      // car ground y
const CAR_X = 640;

export class Stage {
  constructor(container) {
    this.gen = 0;
    this.container = container;
    this.svg = el('svg', { viewBox: '0 0 1000 600', preserveAspectRatio: 'xMidYMid meet', class: 'stage-svg' });
    this.bubbleEl = document.createElement('div');
    this.bubbleEl.className = 'bubble hidden';
    container.appendChild(this.svg);
    container.appendChild(this.bubbleEl);
    this.layers = {};
    // Actors are clipped to a band slightly wider than the scene, so anything
    // parked "off-screen" stays hidden even on very wide screens.
    const defs = el('defs');
    const clip = el('clipPath', { id: 'stageClip' });
    clip.appendChild(el('rect', { x: -260, y: -1000, width: 1520, height: 2600 }));
    defs.appendChild(clip);
    this.svg.appendChild(defs);
    const actors = el('g', { 'clip-path': 'url(#stageClip)' });
    for (const name of ['bg', 'back', 'people', 'car', 'front', 'fx']) {
      this.layers[name] = el('g', { class: `layer-${name}` });
      (name === 'bg' ? this.svg : actors).appendChild(this.layers[name]);
    }
    this.svg.appendChild(actors);
    this.registry = []; // [anim, baseState]
    this.drawBackground();
    this.buildProps();
    this.startIdle();
  }

  // ---------- setup ----------
  reg(a, base) { this.registry.push([a, { x: 0, y: 0, r: 0, s: 1, sx: 1, sy: 1, o: 1, ...base }]); a.set(this.registry[this.registry.length - 1][1]); return a; }

  setFamily(family) {
    this.family = family;
    this.layers.people.innerHTML = '';
    this.layers.car.innerHTML = '';
    this.registry = this.registry.filter(([a]) => !a.isActor);
    this.people = {};
    for (const who of ['mom', 'dad', 'kid']) {
      const p = buildPerson(family[who]);
      this.layers.people.appendChild(p.g);
      for (const a of [p.root, p.body, p.armL, p.armR, p.head, p.brows]) a.isActor = true;
      this.people[who] = p;
    }
    this.car = buildCar(family.kid.car, family.kid);
    this.layers.car.appendChild(this.car.g);
    for (const a of [this.car.root, this.car.body, this.car.horn, ...this.car.wheels]) a.isActor = true;
    this.cast('mom');
    this.reset();
  }

  cast(speaker) {
    this.speaker = speaker;
    this.P = this.people[speaker === 'dad' ? 'dad' : 'mom'];
    this.H = this.people[speaker === 'dad' ? 'mom' : 'dad'];
    this.K = this.people.kid;
  }

  reset() {
    for (const [a, base] of this.registry) a.set(base);
    const P = this.P, H = this.H, K = this.K;
    for (const p of [P, H, K]) {
      p.body.set({ x: 0, y: 0, r: 0, sx: 1, sy: 1 });
      p.armL.set({ r: 8 }); p.armR.set({ r: -8 });
      p.head.set({ r: 0 }); p.brows.set({ y: 0 });
      p.setMouth(0);
    }
    P.root.set({ x: PX, y: GROUND, o: 1, s: P.baseScale });
    H.root.set({ x: 1500, y: GROUND, o: 1, s: H.baseScale });
    K.root.set({ x: 1500, y: GROUND, o: 1, s: K.baseScale });
    this.car.root.set({ x: CAR_X, y: ROAD, s: 0.9, o: 0, r: 0 });
    this.car.body.set({ x: 0, y: 0, r: 0 });
    this.car.horn.set({ o: 0, s: 1 });
    this.car.wheels.forEach((w) => w.set({ r: 0 }));
    for (const pr of Object.values(this.props)) pr.set({ o: 0 });
    this.layers.fx.innerHTML = '';
  }

  drawBackground() {
    const bg = this.layers.bg;
    const defs = el('defs');
    const sky = el('linearGradient', { id: 'skyGrad', x1: 0, y1: 0, x2: 0, y2: 1 });
    sky.appendChild(el('stop', { offset: '0%', 'stop-color': '#A9DcFb' }));
    sky.appendChild(el('stop', { offset: '100%', 'stop-color': '#E9F7FF' }));
    defs.appendChild(sky);
    bg.appendChild(defs);
    bg.appendChild(el('rect', { x: -1500, y: -1500, width: 4000, height: 2500, fill: 'url(#skyGrad)' }));
    bg.appendChild(el('circle', { cx: 880, cy: 90, r: 60, fill: '#FFE58A', opacity: 0.9 }));
    bg.appendChild(el('circle', { cx: 880, cy: 90, r: 85, fill: '#FFE58A', opacity: 0.25 }));
    // clouds drift slowly
    for (const [cx, cy, sc, dur] of [[180, 90, 1, 90], [560, 60, 0.8, 120]]) {
      const c = el('g', { transform: `translate(${cx} ${cy}) scale(${sc})`, fill: '#fff', opacity: 0.9 });
      const inner = el('g');
      inner.appendChild(el('ellipse', { cx: 0, cy: 0, rx: 60, ry: 24 }));
      inner.appendChild(el('ellipse', { cx: -30, cy: -14, rx: 30, ry: 22 }));
      inner.appendChild(el('ellipse', { cx: 20, cy: -20, rx: 34, ry: 26 }));
      inner.appendChild(el('animateTransform', { attributeName: 'transform', type: 'translate', values: '0 0; 80 0; 0 0', dur: `${dur}s`, repeatCount: 'indefinite' }));
      c.appendChild(inner);
      bg.appendChild(c);
    }
    bg.appendChild(el('path', { d: 'M -500 380 C 100 300, 300 360, 500 330 C 700 300, 900 350, 1500 320 L 1500 600 L -500 600 Z', fill: '#B9E3A6' }));
    bg.appendChild(el('path', { d: 'M -500 410 C 200 370, 600 420, 1500 380 L 1500 600 L -500 600 Z', fill: '#A3D88E' }));
    // trees
    for (const [tx, ts] of [[70, 1], [960, 0.8]]) {
      const t = el('g', { transform: `translate(${tx} 430) scale(${ts})` });
      t.appendChild(el('rect', { x: -9, y: -70, width: 18, height: 70, fill: '#9A6B45' }));
      t.appendChild(el('circle', { cx: 0, cy: -100, r: 48, fill: '#6CC27A' }));
      t.appendChild(el('circle', { cx: -26, cy: -80, r: 30, fill: '#62B870' }));
      bg.appendChild(t);
    }
    bg.appendChild(el('rect', { x: -500, y: 448, width: 2000, height: 56, fill: '#EDE5D8' }));
    bg.appendChild(el('rect', { x: -1500, y: 500, width: 4000, height: 1500, fill: '#87919E' }));
    for (let x = -480; x < 1500; x += 120) bg.appendChild(el('rect', { x, y: 560, width: 60, height: 8, rx: 4, fill: '#F4F4F4', opacity: 0.85 }));
  }

  buildProps() {
    const back = this.layers.back, front = this.layers.front;
    const P = {};
    const wrap = (layer) => { const g = el('g'); layer.appendChild(g); return anim(g); };

    // table
    P.table = wrap(back);
    P.table.el.appendChild(el('rect', { x: -100, y: -116, width: 14, height: 116, fill: '#A86F45' }));
    P.table.el.appendChild(el('rect', { x: 86, y: -116, width: 14, height: 116, fill: '#A86F45' }));
    P.table.el.appendChild(el('rect', { x: -115, y: -132, width: 230, height: 18, rx: 6, fill: '#C68B59' }));
    this.reg(P.table, { x: 640, y: GROUND });

    // shelf + toy for "want"
    P.shelf = wrap(back);
    P.shelf.el.appendChild(el('rect', { x: -90, y: 0, width: 180, height: 14, rx: 4, fill: '#B07A4F' }));
    P.shelf.el.appendChild(el('path', { d: 'M -70 14 L -70 44 L -40 14 Z M 70 14 L 70 44 L 40 14 Z', fill: '#8E5F3B' }));
    this.reg(P.shelf, { x: 740, y: 300 });

    // bin for "all done"
    P.bin = wrap(back);
    P.bin.el.appendChild(el('path', { d: 'M -78 -92 L 78 -92 L 62 0 L -62 0 Z', fill: '#6FB7E8' }));
    P.bin.el.appendChild(el('rect', { x: -84, y: -100, width: 168, height: 16, rx: 8, fill: '#4F9ED6' }));
    for (const x of [-40, 0, 40]) P.bin.el.appendChild(el('path', { d: `M ${x} -84 L ${x * 0.8} -6`, stroke: '#5AA6DC', 'stroke-width': 6 }));
    this.reg(P.bin, { x: 870, y: GROUND });

    // stop sign
    P.sign = wrap(back);
    P.sign.el.appendChild(el('rect', { x: -5, y: -170, width: 10, height: 170, fill: '#8a8f96' }));
    const oct = [];
    for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; oct.push(`${(Math.cos(a) * 46).toFixed(1)},${(Math.sin(a) * 46 - 210).toFixed(1)}`); }
    P.sign.el.appendChild(el('polygon', { points: oct.join(' '), fill: '#E2483D', stroke: '#fff', 'stroke-width': 5 }));
    const t = el('text', { x: 0, y: -202, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 800, fill: '#fff', 'font-family': 'system-ui, sans-serif' });
    t.textContent = 'STOP';
    P.sign.el.appendChild(t);
    this.reg(P.sign, { x: 905, y: GROUND });

    // box that opens
    P.box = wrap(front);
    const star = part(P.box.el, 0, -50);
    star.el.appendChild(el('path', { d: starPath(34, 15), fill: '#FFD447', stroke: '#F2A900', 'stroke-width': 3 }));
    P.box.el.appendChild(el('rect', { x: -62, y: -104, width: 124, height: 104, rx: 8, fill: '#F2B33D', stroke: '#D9951C', 'stroke-width': 3 }));
    P.box.el.appendChild(el('rect', { x: -10, y: -104, width: 20, height: 104, fill: '#E8634F' }));
    const lid = part(P.box.el, -66, -104);
    lid.el.appendChild(el('rect', { x: 0, y: -20, width: 132, height: 22, rx: 6, fill: '#E8A21F', stroke: '#D9951C', 'stroke-width': 3 }));
    lid.el.appendChild(el('rect', { x: 56, y: -20, width: 20, height: 22, fill: '#D5503D' }));
    this.boxStar = this.reg(star, { o: 0 });
    this.boxLid = this.reg(lid, {});
    this.reg(P.box, { x: 650, y: GROUND });

    // heavy box for "help"
    P.heavy = wrap(front);
    P.heavy.el.appendChild(el('rect', { x: -62, y: -112, width: 124, height: 112, rx: 6, fill: '#B9875A', stroke: '#93653E', 'stroke-width': 3 }));
    P.heavy.el.appendChild(el('rect', { x: -62, y: -66, width: 124, height: 16, fill: '#D7B07F' }));
    this.reg(P.heavy, { x: 460, y: GROUND });

    // ball
    P.ball = wrap(front);
    P.ball.el.appendChild(el('circle', { r: 26, fill: '#F25C54' }));
    P.ball.el.appendChild(el('path', { d: 'M -26 0 Q 0 -14 26 0 M -26 0 Q 0 14 26 0', stroke: '#fff', 'stroke-width': 5, fill: 'none' }));
    P.ball.el.appendChild(el('circle', { cx: -9, cy: -10, r: 5, fill: '#fff', opacity: 0.6 }));
    this.reg(P.ball, { x: 560, y: GROUND - 26 });

    // toys for "all done"
    P.block = wrap(front);
    P.block.el.appendChild(el('rect', { x: -26, y: -52, width: 52, height: 52, rx: 8, fill: '#9A6CE0' }));
    const bt = el('text', { x: 0, y: -16, 'text-anchor': 'middle', 'font-size': 32, 'font-weight': 800, fill: '#fff', 'font-family': 'system-ui, sans-serif' });
    bt.textContent = 'A';
    P.block.el.appendChild(bt);
    this.reg(P.block, { x: 520, y: GROUND });
    P.toyBall = wrap(front);
    P.toyBall.el.appendChild(el('circle', { cy: -20, r: 20, fill: '#4CB07A' }));
    P.toyBall.el.appendChild(el('circle', { cx: -6, cy: -27, r: 4, fill: '#fff', opacity: 0.6 }));
    this.reg(P.toyBall, { x: 610, y: GROUND });
    const tc = buildToyCar(CAR_COLORS[2]);
    front.appendChild(tc.g);
    P.toyCar = tc.root;
    this.reg(P.toyCar, { x: 710, y: GROUND, s: 0.3 });

    // toy car on the shelf ("I want car")
    const wc = buildToyCar(CAR_COLORS[0]);
    front.appendChild(wc.g);
    P.wantToy = wc.root;
    this.reg(P.wantToy, { x: 740, y: 300, s: 0.32 });

    // cars for "more"
    P.more = [];
    [CAR_COLORS[1], CAR_COLORS[3], CAR_COLORS[4]].forEach((c, i) => {
      const m = buildToyCar(c);
      front.appendChild(m.g);
      P['more' + i] = m.root;
      this.reg(m.root, { x: 560 + i * 140, y: GROUND, s: 0.35 });
    });

    this.props = P;
    delete this.props.more;
  }

  // ---------- idle blinking ----------
  startIdle() {
    const blink = () => {
      if (this.people) {
        for (const p of Object.values(this.people)) {
          p.eyes.set({ sy: 0.1 });
          setTimeout(() => p.eyes.set({ sy: 1 }), 130);
        }
      }
      setTimeout(blink, 2500 + Math.random() * 2500);
    };
    setTimeout(blink, 2000);
  }

  // ---------- animation helpers ----------
  tw(a, to, dur, ease = 'inOut') {
    const g = this.gen;
    return new Promise((res) => {
      const from = {};
      for (const k in to) from[k] = a[k];
      const t0 = performance.now();
      const step = (now) => {
        if (g !== this.gen) { res(); return; }
        const t = Math.min(1, (now - t0) / dur);
        const e = EASE[ease](t);
        for (const k in to) a[k] = from[k] + (to[k] - from[k]) * e;
        a.apply();
        if (t < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  alive(g) { return g === this.gen; }

  async loopUntil(p, fn) {
    let done = false;
    const g = this.gen;
    p.then(() => { done = true; });
    while (!done && this.alive(g)) await fn();
  }

  async driveTo(car, x, dur, ease = 'inOut') {
    const g = this.gen;
    const startX = car.root.x;
    const wheelStart = car.wheels.map((w) => w.r);
    await new Promise((res) => {
      const t0 = performance.now();
      const step = (now) => {
        if (g !== this.gen) { res(); return; }
        const t = Math.min(1, (now - t0) / dur);
        car.root.set({ x: startX + (x - startX) * EASE[ease](t) });
        const dist = car.root.x - startX;
        car.wheels.forEach((w, i) => w.set({ r: wheelStart[i] + (dist / (32 * 0.9)) * (180 / Math.PI) }));
        if (t < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  async arc(a, x, y, height, dur) {
    const sx = a.x, sy = a.y;
    const g = this.gen;
    await new Promise((res) => {
      const t0 = performance.now();
      const step = (now) => {
        if (g !== this.gen) { res(); return; }
        const t = Math.min(1, (now - t0) / dur);
        a.set({ x: sx + (x - sx) * t, y: sy + (y - sy) * t - Math.sin(Math.PI * t) * height });
        if (t < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  async wave(p, times = 2, arm = 'armR') {
    const up = arm === 'armR' ? -150 : 150;
    const mid = arm === 'armR' ? -115 : 115;
    await this.tw(p[arm], { r: up }, 220, 'out');
    for (let i = 0; i < times; i++) {
      await this.tw(p[arm], { r: mid }, 180);
      await this.tw(p[arm], { r: up }, 180);
    }
  }

  async jump(p, height = 110) {
    await this.tw(p.body, { sy: 0.92 }, 120);
    sfx('boing');
    await this.tw(p.body, { y: -height, sy: 1.04 }, 320, 'out');
    await this.tw(p.body, { y: 0, sy: 1 }, 300, 'in');
    await this.tw(p.body, { sy: 0.95 }, 80);
    await this.tw(p.body, { sy: 1 }, 100);
  }

  armsUp(p, dur = 260) {
    return Promise.all([this.tw(p.armL, { r: 145 }, dur, 'out'), this.tw(p.armR, { r: -145 }, dur, 'out')]);
  }

  armsDown(p, dur = 300) {
    return Promise.all([this.tw(p.armL, { r: 8 }, dur), this.tw(p.armR, { r: -8 }, dur)]);
  }

  burst(x, y, n = 12, kind = 'star') {
    const colors = ['#FFD447', '#FF8A8A', '#7FC8F8', '#8BE08B', '#C9A2FF'];
    for (let i = 0; i < n; i++) {
      const shape = kind === 'heart'
        ? el('path', { d: 'M 0 6 C -14 -6, -8 -18, 0 -10 C 8 -18, 14 -6, 0 6 Z', fill: '#FF7A90' })
        : el('path', { d: starPath(12, 5), fill: colors[i % colors.length] });
      const g = el('g');
      g.appendChild(shape);
      this.layers.fx.appendChild(g);
      const a = anim(g).set({ x, y, s: 0.3 });
      const ang = (i / n) * Math.PI * 2;
      const dist = 120 + (i % 3) * 40;
      const tx = x + Math.cos(ang) * dist, ty = y + Math.sin(ang) * dist * 0.8 - 40;
      // run without gen check so it always cleans itself up
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / 900);
        const e = EASE.out(t);
        a.set({ x: x + (tx - x) * e, y: y + (ty - y) * e, s: 0.3 + e * 1.1, r: e * 180, o: 1 - t * t });
        if (t < 1) requestAnimationFrame(step); else g.remove();
      };
      requestAnimationFrame(step);
    }
  }

  // ---------- speech bubble ----------
  bubble(lead, last, state) {
    const b = this.bubbleEl;
    if (lead == null && last == null) { b.className = 'bubble hidden'; return; }
    b.className = `bubble ${state || ''}`;
    b.innerHTML = '';
    if (lead) { const s = document.createElement('span'); s.className = 'lead'; s.textContent = lead + ' '; b.appendChild(s); }
    if (state === 'waiting') {
      const s = document.createElement('span'); s.className = 'blank'; s.textContent = '👂 …'; b.appendChild(s);
    } else if (last) {
      const s = document.createElement('span'); s.className = 'last'; s.textContent = last; b.appendChild(s);
    }
  }

  // ---------- poses ----------
  async expect(on) {
    const P = this.P;
    if (on) {
      await Promise.all([
        this.tw(P.head, { r: -9 }, 300),
        this.tw(P.brows, { y: -6 }, 300),
        this.tw(P.armL, { r: 140 }, 350, 'out'),
        this.tw(P.body, { r: 3 }, 300),
      ]);
    } else {
      await Promise.all([
        this.tw(P.head, { r: 0 }, 200),
        this.tw(P.brows, { y: 0 }, 200),
        this.tw(P.armL, { r: 8 }, 250),
        this.tw(P.body, { r: 0 }, 200),
      ]);
    }
  }

  async celebrate() {
    const P = this.P;
    sfx('cheer');
    this.burst(500, 250, 16, 'star');
    await Promise.all([this.armsUp(P), this.jump(P, 80)]);
    this.burst(PX, 160, 8, 'heart');
    await this.wait(300);
    await this.armsDown(P);
  }

  cancel() {
    this.gen++;
    stopAll();
  }

  // ---------- play a scene ----------
  // spec: { action, speaker, leadText, lastText, leadKey, lastKey, mode: 'say'|'finish'|'word', waitFor }
  async play(spec) {
    stopAll();
    const g = ++this.gen;
    this.cast(spec.speaker);
    this.reset();
    const A = spec.action === 'none' ? {} : (ACTIONS[spec.action] || ACTIONS.cheer);
    if (A.setup) A.setup(this);
    const who = this.P === this.people.dad ? 'dad' : 'mom';
    const mouth = (lv) => this.P.setMouth(lv);
    this.bubble(null, null);
    await this.wait(spec.quick ? 80 : 400);
    if (!this.alive(g)) return 'cancel';

    // lead part (or a short anticipation if there is no lead)
    let leadP;
    if (spec.leadText) {
      this.bubble(spec.leadText, '', 'pre');
      leadP = say(spec.leadKey, spec.leadText, who, mouth);
    } else {
      leadP = this.wait(spec.quick ? 250 : 1100);
    }
    await Promise.all([leadP, A.lead ? A.lead(this, leadP) : null]);
    if (!this.alive(g)) return 'cancel';

    let result = 'done';
    if (spec.mode === 'finish' && spec.waitFor) {
      this.bubble(spec.leadText, '', 'waiting');
      await this.expect(true);
      result = await spec.waitFor();
      if (!this.alive(g) || result === 'cancel') return 'cancel';
      await this.expect(false);
    } else {
      await this.wait(spec.leadText ? 120 : 0);
    }
    if (!this.alive(g)) return 'cancel';

    // payoff word
    this.bubble(spec.leadText, spec.lastText, 'done');
    const lastP = say(spec.lastKey, spec.lastText, who, mouth);
    await Promise.all([lastP, A.last ? A.last(this, lastP) : null]);
    if (!this.alive(g)) return 'cancel';
    if (result === 'said') await this.celebrate();
    return result;
  }
}

function starPath(R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    d += `${i === 0 ? 'M' : 'L'} ${(Math.cos(a) * rad).toFixed(1)} ${(Math.sin(a) * rad).toFixed(1)} `;
  }
  return d + 'Z';
}

// ---------- the little movies ----------
// setup(st): place props. lead(st, speechPromise): anticipation. last(st): the payoff.
const ACTIONS = {
  go: {
    setup(st) { st.car.root.set({ o: 1 }); },
    async lead(st, p) {
      st.tw(st.P.armR, { r: -150 }, 300, 'out');
      await st.loopUntil(p, async () => {
        await st.tw(st.car.body, { y: -6 }, 110, 'out');
        await st.tw(st.car.body, { y: 0 }, 110, 'in');
      });
    },
    async last(st) {
      st.tw(st.P.armR, { r: -95 }, 200, 'out');
      sfx('zoom');
      await st.driveTo(st.car, 1550, 650, 'in');
      st.car.root.set({ x: -520 });
      await st.driveTo(st.car, CAR_X, 900, 'out');
      await st.armsDown(st.P);
    },
  },
  stop: {
    setup(st) { st.car.root.set({ o: 1, x: -520 }); },
    async lead(st) { await st.driveTo(st.car, 500, 1300, 'linear'); },
    async last(st) {
      st.tw(st.P.armR, { r: -92 }, 200, 'out');
      st.props.sign.set({ o: 1, s: 0.2 });
      st.tw(st.props.sign, { s: 1 }, 350, 'back');
      await st.driveTo(st.car, CAR_X, 450, 'out');
      await st.tw(st.car.body, { r: 4 }, 120, 'out');
      await st.tw(st.car.body, { r: 0 }, 220, 'inOut');
      await st.wait(300);
      await st.armsDown(st.P);
    },
  },
  up: {
    async lead(st) {
      await Promise.all([
        st.tw(st.P.body, { sy: 0.9 }, 400),
        st.tw(st.P.armL, { r: 30 }, 400),
        st.tw(st.P.armR, { r: -30 }, 400),
      ]);
    },
    async last(st) {
      st.armsUp(st.P, 240);
      st.burst(PX, 120, 8, 'star');
      await st.jump(st.P, 130);
      await st.wait(200);
      await st.armsDown(st.P);
    },
  },
  uhoh: {
    setup(st) {
      st.props.table.set({ o: 1 });
      st.props.ball.set({ o: 1, x: 560, y: GROUND - 132 - 26, r: 0 });
    },
    async lead(st, p) {
      const b = st.props.ball;
      await st.tw(b, { x: 728, r: (168 / 26) * 57.3 }, 900, 'inOut');
      await st.loopUntil(p, async () => {
        await st.tw(b, { x: 734, r: b.r + 12 }, 160);
        await st.tw(b, { x: 726, r: b.r - 12 }, 160);
      });
    },
    async last(st) {
      const b = st.props.ball;
      Promise.all([
        st.tw(st.P.armL, { r: 170 }, 300, 'out'),
        st.tw(st.P.armR, { r: -170 }, 300, 'out'),
        st.tw(st.P.head, { r: 8 }, 300),
      ]);
      await st.tw(b, { x: 790, y: GROUND - 26, r: b.r + 120 }, 450, 'in');
      sfx('boing');
      await st.tw(b, { y: GROUND - 80, x: 820 }, 250, 'out');
      await st.tw(b, { y: GROUND - 26, x: 840 }, 250, 'in');
      await st.wait(350);
      await Promise.all([st.armsDown(st.P), st.tw(st.P.head, { r: 0 }, 300)]);
    },
  },
  beep: {
    setup(st) { st.car.root.set({ o: 1 }); },
    async lead(st, p) {
      await st.loopUntil(p, async () => {
        await st.tw(st.car.body, { y: -8 }, 160, 'out');
        await st.tw(st.car.body, { y: 0 }, 160, 'in');
      });
    },
    async last(st) {
      st.tw(st.P.armR, { r: -130 }, 250, 'out');
      sfx('beep');
      for (let i = 0; i < 2; i++) {
        st.car.horn.set({ o: 1, s: 0.6 });
        st.tw(st.car.body, { y: -10 }, 120, 'out').then(() => st.tw(st.car.body, { y: 0 }, 120, 'in'));
        await st.tw(st.car.horn, { s: 1.2, o: 0 }, 260, 'out');
      }
      await st.armsDown(st.P);
    },
  },
  open: {
    setup(st) { st.props.box.set({ o: 1 }); },
    async lead(st, p) {
      await st.loopUntil(p, async () => {
        await st.tw(st.props.box, { r: 4 }, 110);
        await st.tw(st.props.box, { r: -4 }, 110);
      });
      await st.tw(st.props.box, { r: 0 }, 80);
    },
    async last(st) {
      st.tw(st.boxLid, { r: -115 }, 320, 'back');
      st.boxStar.set({ o: 1 });
      sfx('sparkle');
      st.armsUp(st.P);
      await st.tw(st.boxStar, { y: -230, s: 1.4, r: 360 }, 650, 'out');
      st.burst(650, GROUND - 230, 10, 'star');
      await st.wait(300);
      await st.armsDown(st.P);
    },
  },
  more: {
    setup(st) {
      st.props.more0.set({ o: 1 });
      st.props.more1.set({ o: 0, s: 0 });
      st.props.more2.set({ o: 0, s: 0 });
    },
    async lead(st) { await st.tw(st.P.armR, { r: -100 }, 300, 'out'); },
    async last(st) {
      for (const k of ['more1', 'more2']) {
        st.props[k].set({ o: 1 });
        sfx('pop');
        await st.tw(st.props[k], { s: 0.35 }, 300, 'back');
      }
      await st.armsUp(st.P);
      await st.wait(250);
      await st.armsDown(st.P);
    },
  },
  help: {
    setup(st) {
      st.props.heavy.set({ o: 1 });
      st.P.armR.set({ r: -55 });
    },
    async lead(st, p) {
      await st.loopUntil(p, async () => {
        await Promise.all([st.tw(st.props.heavy, { r: 3 }, 140), st.tw(st.P.body, { r: 5 }, 140)]);
        await Promise.all([st.tw(st.props.heavy, { r: -2 }, 140), st.tw(st.P.body, { r: 2 }, 140)]);
      });
    },
    async last(st) {
      const H = st.H;
      H.root.set({ x: 1500 });
      const walk = st.tw(H.root, { x: 650 }, 900, 'out');
      for (let i = 0; i < 4; i++) {
        await st.tw(H.body, { y: -12 }, 100, 'out');
        await st.tw(H.body, { y: 0 }, 100, 'in');
      }
      await walk;
      await Promise.all([st.tw(H.armL, { r: 80 }, 250, 'out'), st.tw(st.props.heavy, { r: 0 }, 200), st.tw(st.P.body, { r: 0 }, 200)]);
      sfx('cheer');
      await st.tw(st.props.heavy, { y: GROUND - 80 }, 500, 'out');
      st.burst(460, GROUND - 200, 8, 'heart');
      await st.wait(400);
    },
  },
  alldone: {
    setup(st) {
      st.props.bin.set({ o: 1 });
      st.props.block.set({ o: 1 });
      st.props.toyBall.set({ o: 1 });
      st.props.toyCar.set({ o: 1 });
    },
    async lead(st, p) {
      await st.loopUntil(p, async () => {
        await st.tw(st.P.armR, { r: -60 }, 220);
        await st.tw(st.P.armR, { r: -100 }, 220);
      });
    },
    async last(st) {
      for (const k of ['block', 'toyBall', 'toyCar']) {
        sfx('pop');
        await st.arc(st.props[k], 870, GROUND - 60, 160, 380);
        st.tw(st.props[k], { o: 0 }, 150);
      }
      await Promise.all([st.tw(st.P.armL, { r: 100 }, 300, 'out'), st.tw(st.P.armR, { r: -100 }, 300, 'out')]);
      for (let i = 0; i < 2; i++) {
        await st.tw(st.P.body, { r: 3 }, 120);
        await st.tw(st.P.body, { r: -3 }, 120);
      }
      await st.tw(st.P.body, { r: 0 }, 100);
      await st.armsDown(st.P);
    },
  },
  bye: {
    setup(st) { st.car.root.set({ o: 1 }); },
    async lead(st, p) { await st.loopUntil(p, () => st.wave(st.P, 1)); },
    async last(st) {
      await Promise.all([st.driveTo(st.car, 1600, 1700, 'in'), st.wave(st.P, 3)]);
      await st.armsDown(st.P);
    },
  },
  myturn: {
    setup(st) { st.props.ball.set({ o: 1, x: 780, y: GROUND - 26 }); },
    async lead(st) { await st.tw(st.P.armR, { r: 50 }, 350, 'out'); },
    async last(st) {
      const b = st.props.ball;
      sfx('pop');
      await st.tw(b, { x: 360, r: -((420 / 26) * 57.3) }, 900, 'out');
      await Promise.all([st.armsUp(st.P), st.jump(st.P, 50)]);
      await st.armsDown(st.P);
    },
  },
  want: {
    setup(st) {
      st.props.shelf.set({ o: 1 });
      st.props.wantToy.set({ o: 1 });
    },
    async lead(st) {
      await Promise.all([st.tw(st.P.armR, { r: -120 }, 400, 'out'), st.tw(st.P.body, { r: 5 }, 400)]);
    },
    async last(st) {
      sfx('sparkle');
      await st.arc(st.props.wantToy, 330, GROUND - 110, 90, 600);
      await Promise.all([st.tw(st.P.armR, { r: 25 }, 250), st.tw(st.P.armL, { r: -25 }, 250), st.tw(st.P.body, { r: 0 }, 250)]);
      st.burst(330, 220, 8, 'heart');
      await st.wait(500);
    },
  },
  hi: {
    setup(st) { st.K.root.set({ x: 760 }); },
    async lead(st) { await st.tw(st.P.head, { r: 6 }, 300); },
    async last(st) {
      st.tw(st.P.head, { r: 0 }, 200);
      await Promise.all([st.wave(st.P, 3), st.wait(250).then(() => st.wave(st.K, 2))]);
      st.burst(500, 200, 8, 'heart');
      await Promise.all([st.armsDown(st.P), st.armsDown(st.K)]);
    },
  },
  me: {
    async lead(st) { await st.tw(st.P.armR, { r: 50 }, 300, 'out'); },
    async last(st) {
      await st.tw(st.P.head, { r: 6 }, 200);
      await st.wave(st.P, 2);
      st.burst(PX, 160, 6, 'heart');
      await Promise.all([st.armsDown(st.P), st.tw(st.P.head, { r: 0 }, 200)]);
    },
  },
  cheer: {
    async last(st) {
      st.burst(500, 220, 12, 'star');
      await Promise.all([st.armsUp(st.P), st.jump(st.P, 70)]);
      await st.armsDown(st.P);
    },
  },
};
