// avatar.js — original cartoon people and cars, built from simple SVG layers.
// Every movable part is wrapped so it can be animated around a pivot point.

export const SVGNS = 'http://www.w3.org/2000/svg';
let uid = 0;

export function el(tag, attrs = {}, children = []) {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null) n.setAttribute(k, v);
  }
  for (const c of children) if (c) n.appendChild(c);
  return n;
}

// An animatable handle: state {x,y,r,s,sx,sy,o} applied as a transform.
export function anim(node) {
  const a = {
    el: node, x: 0, y: 0, r: 0, s: 1, sx: 1, sy: 1, o: 1,
    apply() {
      node.setAttribute('transform',
        `translate(${a.x.toFixed(2)} ${a.y.toFixed(2)}) rotate(${a.r.toFixed(2)}) scale(${(a.s * a.sx).toFixed(3)} ${(a.s * a.sy).toFixed(3)})`);
      node.setAttribute('opacity', a.o.toFixed(3));
    },
    set(p) { Object.assign(a, p); a.apply(); return a; },
    base: null,
  };
  a.apply();
  return a;
}

// Create a pivot wrapper at (tx,ty) inside parent; returns anim handle of inner group.
export function part(parent, tx, ty, cls) {
  const inner = el('g', cls ? { class: cls } : {});
  const outer = el('g', { transform: `translate(${tx} ${ty})` }, [inner]);
  parent.appendChild(outer);
  return anim(inner);
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + amt)));
  g = Math.max(0, Math.min(255, Math.round(g + amt)));
  b = Math.max(0, Math.min(255, Math.round(b + amt)));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// ---------- Head (radius 55, centered at 0,0) ----------
export function buildHead(cfg) {
  const g = el('g', { class: 'head' });
  const hc = cfg.hairColor;
  const skin = cfg.skin;

  // hair behind the face
  if (cfg.hair === 'long') {
    g.appendChild(el('path', { d: 'M -62 -10 C -70 -70, 70 -70, 62 -10 L 66 70 C 40 84, -40 84, -66 70 Z', fill: hc }));
  } else if (cfg.hair === 'bun') {
    g.appendChild(el('circle', { cx: 0, cy: -66, r: 26, fill: hc }));
  } else if (cfg.hair === 'ponytail') {
    g.appendChild(el('path', { d: 'M 40 -40 C 90 -40, 95 20, 70 60 C 65 30, 60 0, 40 -10 Z', fill: hc }));
  }

  // ears + face
  g.appendChild(el('circle', { cx: -54, cy: 6, r: 12, fill: shade(skin, -12) }));
  g.appendChild(el('circle', { cx: 54, cy: 6, r: 12, fill: shade(skin, -12) }));
  g.appendChild(el('circle', { cx: 0, cy: 0, r: 55, fill: skin }));

  // cheeks
  g.appendChild(el('circle', { cx: -30, cy: 20, r: 9, fill: '#FF8A8A', opacity: 0.3 }));
  g.appendChild(el('circle', { cx: 30, cy: 20, r: 9, fill: '#FF8A8A', opacity: 0.3 }));

  // stubble / beard (behind mouth)
  if (cfg.beard === 'stubble') {
    g.appendChild(el('path', { d: 'M -46 8 C -44 50, 44 50, 46 8 C 34 30, -34 30, -46 8 Z', fill: hc, opacity: 0.13 }));
  } else if (cfg.beard === 'full') {
    g.appendChild(el('path', { d: 'M -54 0 C -56 70, 56 70, 54 0 C 44 26, 24 18, 0 18 C -24 18, -44 26, -54 0 Z', fill: hc }));
  }

  // eyes (blink by scaling eyes group)
  const eyesOuter = el('g', { transform: 'translate(0 -4)' });
  const eyes = el('g');
  eyesOuter.appendChild(eyes);
  for (const ex of [-20, 20]) {
    eyes.appendChild(el('ellipse', { cx: ex, cy: 0, rx: 10, ry: 12, fill: '#fff' }));
    eyes.appendChild(el('circle', { cx: ex + 1, cy: 2, r: 6.5, fill: '#2a1d16' }));
    eyes.appendChild(el('circle', { cx: ex + 3, cy: -1, r: 2.2, fill: '#fff' }));
  }
  g.appendChild(eyesOuter);
  const eyesA = anim(eyes);

  // brows
  const browsOuter = el('g', { transform: 'translate(0 -22)' });
  const brows = el('g');
  brows.appendChild(el('path', { d: 'M -30 0 Q -20 -6 -10 -1', stroke: shade(hc, -10), 'stroke-width': 4.5, fill: 'none', 'stroke-linecap': 'round' }));
  brows.appendChild(el('path', { d: 'M 10 -1 Q 20 -6 30 0', stroke: shade(hc, -10), 'stroke-width': 4.5, fill: 'none', 'stroke-linecap': 'round' }));
  browsOuter.appendChild(brows);
  g.appendChild(browsOuter);
  const browsA = anim(brows);

  // nose
  g.appendChild(el('path', { d: 'M -2 6 Q 4 14 -3 17', stroke: shade(skin, -45), 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }));

  // mouth: smile when closed, open ellipse when talking
  const mouthG = el('g', { transform: 'translate(0 30)' });
  const smile = el('path', { d: 'M -14 -2 Q 0 10 14 -2', stroke: '#7a2f2f', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' });
  const open = el('g', { opacity: 0 });
  const openShape = el('ellipse', { cx: 0, cy: 2, rx: 13, ry: 8, fill: '#6b2525' });
  const tongue = el('ellipse', { cx: 0, cy: 7, rx: 8, ry: 4, fill: '#E77B7B' });
  open.appendChild(openShape);
  open.appendChild(tongue);
  mouthG.appendChild(smile);
  mouthG.appendChild(open);
  g.appendChild(mouthG);

  // glasses
  if (cfg.glasses) {
    const gl = el('g', { stroke: '#333', 'stroke-width': 3.5, fill: 'rgba(255,255,255,0.18)' });
    gl.appendChild(el('circle', { cx: -20, cy: -4, r: 15 }));
    gl.appendChild(el('circle', { cx: 20, cy: -4, r: 15 }));
    gl.appendChild(el('path', { d: 'M -5 -6 Q 0 -10 5 -6', fill: 'none' }));
    g.appendChild(gl);
  }

  // hair in front
  const fh = frontHair(cfg.hair, hc);
  if (fh) g.appendChild(fh);

  function setMouth(level) {
    const lv = Math.max(0, Math.min(1, level));
    if (lv < 0.06) {
      smile.setAttribute('opacity', 1);
      open.setAttribute('opacity', 0);
    } else {
      smile.setAttribute('opacity', 0);
      open.setAttribute('opacity', 1);
      openShape.setAttribute('ry', (4 + lv * 13).toFixed(1));
      openShape.setAttribute('rx', (11 + lv * 4).toFixed(1));
      tongue.setAttribute('cy', (4 + lv * 8).toFixed(1));
    }
  }

  return { g, eyes: eyesA, brows: browsA, setMouth };
}

function frontHair(style, hc) {
  switch (style) {
    case 'short':
    case 'ponytail':
    case 'bun':
      return el('path', { d: 'M -57 2 C -62 -52, -28 -72, 0 -70 C 30 -72, 62 -52, 57 2 C 50 -22, 34 -36, 8 -36 C -6 -26, -30 -30, -57 2 Z', fill: hc });
    case 'long':
      return el('path', { d: 'M -60 30 C -66 -56, -26 -72, 0 -70 C 30 -72, 66 -56, 60 30 C 56 -10, 46 -30, 20 -34 C 0 -24, -30 -28, -46 -10 C -52 0, -56 14, -60 30 Z', fill: hc });
    case 'curly': {
      const g = el('g', { fill: hc });
      const pts = [[-50, -18], [-44, -40], [-26, -56], [-4, -62], [18, -60], [38, -48], [50, -28], [54, -8], [-54, 2]];
      for (const [x, y] of pts) g.appendChild(el('circle', { cx: x, cy: y, r: 18 }));
      return g;
    }
    case 'buzz':
      return el('path', { d: 'M -55 -6 C -58 -52, -26 -64, 0 -63 C 26 -64, 58 -52, 55 -6 C 46 -28, 26 -40, 0 -40 C -26 -40, -46 -28, -55 -6 Z', fill: hc, opacity: 0.75 });
    default:
      return null;
  }
}

// ---------- Full person (origin at feet, ~340 tall for adults) ----------
export function buildPerson(cfg) {
  const root = el('g', { class: 'person' });
  const rootA = anim(root);
  const body = part(root, 0, 0);      // whole body (pivot at feet) for jump / crouch / lean
  const shirt = cfg.shirt;
  const pants = '#3d4b6e';

  // legs
  body.el.appendChild(el('rect', { x: -36, y: -112, width: 30, height: 104, rx: 14, fill: pants }));
  body.el.appendChild(el('rect', { x: 6, y: -112, width: 30, height: 104, rx: 14, fill: pants }));
  body.el.appendChild(el('ellipse', { cx: -24, cy: -6, rx: 24, ry: 11, fill: '#2b2b33' }));
  body.el.appendChild(el('ellipse', { cx: 24, cy: -6, rx: 24, ry: 11, fill: '#2b2b33' }));

  // back arm (viewer's left)
  const armL = part(body.el, -46, -204);
  drawArm(armL.el, shirt, cfg.skin);

  // torso + neck
  body.el.appendChild(el('rect', { x: -12, y: -232, width: 24, height: 22, fill: shade(cfg.skin, -10) }));
  body.el.appendChild(el('rect', { x: -50, y: -222, width: 100, height: 120, rx: 34, fill: shirt }));
  body.el.appendChild(el('path', { d: 'M -18 -220 Q 0 -204 18 -220', stroke: shade(shirt, -30), 'stroke-width': 4, fill: 'none' }));

  // front arm (viewer's right)
  const armR = part(body.el, 46, -204);
  drawArm(armR.el, shirt, cfg.skin);

  // head (pivot at neck)
  const headPivot = part(body.el, 0, -228);
  const head = buildHead(cfg);
  head.g.setAttribute('transform', 'translate(0 -52)');
  headPivot.el.appendChild(head.g);

  if (cfg.child) rootA.set({ s: 0.68 });
  const baseScale = cfg.child ? 0.68 : 1;

  return {
    g: root, root: rootA, body, armL, armR, head: headPivot,
    eyes: head.eyes, brows: head.brows, setMouth: head.setMouth, baseScale,
  };
}

function drawArm(g, shirt, skin) {
  g.appendChild(el('rect', { x: -14, y: -8, width: 28, height: 54, rx: 14, fill: shirt }));
  g.appendChild(el('rect', { x: -10, y: 36, width: 20, height: 52, rx: 10, fill: skin }));
  g.appendChild(el('circle', { cx: 0, cy: 92, r: 14, fill: skin }));
}

// ---------- Car (origin at ground, center; faces right) ----------
export function buildCar(color, driverCfg) {
  const id = `win${++uid}`;
  const root = el('g', { class: 'car' });
  const rootA = anim(root);
  const bodyA = part(root, 0, 0);
  const b = bodyA.el;
  const dark = shade(color, -45);

  // clip path for window
  const defs = el('defs');
  const clip = el('clipPath', { id });
  clip.appendChild(el('path', { d: 'M -72 -118 L -60 -178 Q -56 -190 -42 -190 L 40 -190 Q 54 -190 62 -176 L 92 -118 Z' }));
  defs.appendChild(clip);
  b.appendChild(defs);

  // shadow
  b.appendChild(el('ellipse', { cx: 0, cy: 2, rx: 160, ry: 12, fill: 'rgba(0,0,0,0.15)' }));
  // cabin
  b.appendChild(el('path', { d: 'M -92 -112 L -76 -186 Q -70 -206 -48 -206 L 46 -206 Q 66 -206 78 -186 L 118 -112 Z', fill: color }));
  // window + driver
  b.appendChild(el('path', { d: 'M -72 -118 L -60 -178 Q -56 -190 -42 -190 L 40 -190 Q 54 -190 62 -176 L 92 -118 Z', fill: '#BFE6FF' }));
  let driver = null;
  if (driverCfg) {
    const dg = el('g', { 'clip-path': `url(#${id})` });
    driver = buildHead(driverCfg);
    driver.g.setAttribute('transform', 'translate(6 -138) scale(0.62)');
    dg.appendChild(driver.g);
    b.appendChild(dg);
  }
  b.appendChild(el('path', { d: 'M 30 -190 L 4 -118', stroke: 'rgba(255,255,255,0.55)', 'stroke-width': 10 }));
  // body
  b.appendChild(el('path', { d: 'M -160 -40 Q -164 -110 -110 -118 L 120 -118 Q 168 -112 170 -60 L 170 -40 Q 170 -24 154 -24 L -146 -24 Q -160 -24 -160 -40 Z', fill: color }));
  b.appendChild(el('path', { d: 'M -150 -70 L 160 -70', stroke: shade(color, 25), 'stroke-width': 6, opacity: 0.6 }));
  b.appendChild(el('path', { d: 'M 10 -116 L 10 -30', stroke: dark, 'stroke-width': 3, opacity: 0.5 }));
  b.appendChild(el('rect', { x: 26, y: -96, width: 22, height: 6, rx: 3, fill: dark, opacity: 0.6 }));
  // lights + bumpers
  b.appendChild(el('ellipse', { cx: 160, cy: -88, rx: 10, ry: 13, fill: '#FFF6B0', stroke: dark, 'stroke-width': 2 }));
  b.appendChild(el('rect', { x: -164, y: -96, width: 10, height: 22, rx: 4, fill: '#FF6B5B' }));
  b.appendChild(el('rect', { x: 150, y: -44, width: 30, height: 14, rx: 7, fill: '#9aa3ad' }));
  b.appendChild(el('rect', { x: -172, y: -44, width: 30, height: 14, rx: 7, fill: '#9aa3ad' }));

  // horn waves (hidden until beep)
  const horn = part(b, 190, -86);
  for (const r of [16, 30, 44]) {
    horn.el.appendChild(el('path', { d: `M 0 ${-r} Q ${r * 0.8} 0 0 ${r}`, stroke: '#F2B33D', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round', transform: `translate(${r * 0.6} 0)` }));
  }
  horn.set({ o: 0 });

  // wheels
  const wheels = [];
  for (const wx of [-96, 104]) {
    const w = part(b, wx, -28);
    w.el.appendChild(el('circle', { r: 32, fill: '#2b2b33' }));
    w.el.appendChild(el('circle', { r: 15, fill: '#cfd6de' }));
    w.el.appendChild(el('rect', { x: -3, y: -15, width: 6, height: 30, fill: '#8f99a4' }));
    w.el.appendChild(el('rect', { x: -15, y: -3, width: 30, height: 6, fill: '#8f99a4' }));
    wheels.push(w);
  }

  return { g: root, root: rootA, body: bodyA, wheels, horn, driver };
}

// Small toy car (no driver) for props.
export function buildToyCar(color) {
  const c = buildCar(color, null);
  c.root.set({ s: 0.35 });
  return c;
}

// A static portrait (used in the parent avatar editor and home screen).
export function portraitSVG(cfg, { width = 160, height = 220 } = {}) {
  const svg = el('svg', { viewBox: '-110 -400 220 410', width, height, class: 'portrait' });
  const p = buildPerson({ ...cfg, child: false });
  svg.appendChild(p.g);
  return { svg, person: p };
}
