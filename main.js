// Polku · scroll-driven story that also works as a slide deck.
// One virtual scroll position `pos` (in "steps") drives everything. Arrows / Space / PageDown (presenter clickers)
// move one step; the wheel and trackpad scroll freely and snap to the nearest step.
(() => {
  const GEO = window.POLKU_GEO;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  /* ---------------- scenes and steps ---------------- */
  let acc = 0;
  const S = $$('.scene').map((el) => {
    const n = Math.max(1, +el.dataset.steps || 1);
    const s = { el, n, start: acc, bg: el.dataset.bg, steps: $$('[data-step]', el), track: $$('[data-track]', el), trackw: $$('[data-trackw]', el), on: $$('[data-on]', el) };
    acc += n;
    return s;
  });
  const TOTAL = acc;
  $('#tot').textContent = '/ ' + String(S.length).padStart(2, '0');

  /* ---------------- background runs (consecutive scenes sharing a clip) ---------------- */
  const runs = [];
  for (const s of S) {
    const last = runs[runs.length - 1];
    if (last && last.bg === s.bg) last.n += s.n;
    else runs.push({ bg: s.bg, start: s.start, n: s.n });
  }
  const bgs = $('#bgs');
  for (const r of runs) {
    const d = document.createElement('div');
    d.className = 'bg';
    r.videos = [];
    if (r.bg === 'night') d.classList.add('night');
    else {
      const clips = r.bg.split('|');
      if (clips.length > 1) d.classList.add('split');
      for (const c of clips) {
        const v = document.createElement('video');
        Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto', poster: `media/${c}.jpg`, src: `media/${c}.mp4` });
        v.setAttribute('muted', '');
        if (clips.length > 1) { const h = document.createElement('div'); h.className = 'half'; h.append(v); d.append(h); } else d.append(v);
        r.videos.push(v);
      }
    }
    bgs.append(d);
    r.el = d;
    r.playing = false;
  }

  /* ---------------- maps (real geography: Statistics Finland 2026 boundaries, Natural Earth lakes) ---------------- */
  const days = (window.POLKU_NUMBERS && window.POLKU_NUMBERS.regionDays) || {};
  const ramp = (v) => {
    const t = clamp((v - 135) / 41);
    const stops = [[45, 212, 191], [251, 191, 36], [251, 113, 133]];
    const i = t < 0.5 ? 0 : 1, f = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const c = stops[i].map((a, k) => Math.round(a + (stops[i + 1][k] - a) * f));
    return `rgb(${c.join(',')})`;
  };
  const vb = (GEO && GEO.viewBox) || [0, 0, 1000, 1746];
  const regionPaths = {};
  if (GEO) {
    // locator (HUD)
    const loc = $('#locator');
    loc.setAttribute('viewBox', vb.join(' '));
    for (const r of GEO.regions) { const p = svgEl('path', { d: r.d }); regionPaths[r.id] = p; loc.append(p); }
    loc.append(svgEl('g', { id: 'locdots' }));
    // big choropleth
    const big = $('#bigmap');
    big.setAttribute('viewBox', vb.join(' '));
    for (const nb of GEO.neighbours || []) big.append(svgEl('path', { d: nb.d, class: 'nb' }));
    const order = [...GEO.regions].sort((a, b) => a.cy - b.cy); // reveal north → south
    for (const r of GEO.regions) {
      const p = svgEl('path', { d: r.d, class: 'r', fill: 'rgba(238,244,250,.08)' });
      p.dataset.fill = ramp(days[r.id] ?? 155);
      p.style.transitionDelay = `${order.indexOf(r) * 45}ms`;
      big.append(p);
    }
    for (const l of GEO.lakes || []) big.append(svgEl('path', { d: l.d, class: 'lake' }));
    const labels = [
      { id: 'lappi', dx: 0, dy: 40 },
      { id: 'pohjois-pohjanmaa', dx: -40, dy: 20 },
      { id: 'pohjois-karjala', dx: 30, dy: 10 },
      { id: 'paijat-hame', dx: 0, dy: -20 },
      { id: 'helsinki', dx: -150, dy: 60 },
    ];
    const lg = svgEl('g', { class: 'labels', opacity: 0 });
    for (const L of labels) {
      const r = GEO.regions.find((x) => x.id === L.id);
      if (!r || days[L.id] == null) continue;
      const t1 = svgEl('text', { x: r.cx + L.dx, y: r.cy + L.dy - 34, 'text-anchor': 'middle' });
      t1.textContent = r.name.replace('City of ', '');
      const t2 = svgEl('text', { x: r.cx + L.dx, y: r.cy + L.dy + 22, 'text-anchor': 'middle', class: 'v' });
      t2.textContent = days[L.id];
      lg.append(t1, t2);
    }
    big.append(lg);
    big._labels = lg;
  }
  let mapLit = false;
  const lightMap = (on) => {
    if (on === mapLit || !GEO) return;
    mapLit = on;
    for (const p of $$('#bigmap path.r')) p.setAttribute('fill', on ? p.dataset.fill : 'rgba(238,244,250,.08)');
    const lg = $('#bigmap')._labels;
    lg.style.transition = 'opacity .8s ' + (on ? '1s' : '0s');
    lg.setAttribute('opacity', on ? 1 : 0);
  };

  /* ---------------- HUD ---------------- */
  const trail = $('.trail');
  for (const s of S) { const d = document.createElement('span'); d.style.top = `${(s.start / (TOTAL - 1)) * 100}%`; trail.append(d); s.dot = d; }
  let hudScene = -1;
  const setHud = (i) => {
    if (i === hudScene) return;
    hudScene = i;
    const el = S[i].el, ds = el.dataset;
    $('#cur').textContent = String(i + 1).padStart(2, '0');
    $('#where').textContent = ds.where || '';
    $('#fi').textContent = ds.fi || '';
    $('#en').textContent = ds.en ? '— ' + ds.en : '';
    const hi = (ds.region || '').split(',').filter(Boolean);
    for (const id in regionPaths) regionPaths[id].classList.toggle('hi', hi.includes(id));
    const g = $('#locdots');
    if (g) {
      g.replaceChildren();
      for (const name of (ds.place || '').split(',').filter(Boolean)) {
        const pt = GEO.places && GEO.places[name];
        if (!pt) continue;
        g.append(svgEl('circle', { cx: pt[0], cy: pt[1], r: 48, class: 'pulse' }), svgEl('circle', { cx: pt[0], cy: pt[1], r: 40 }));
      }
    }
    $('.loc').style.opacity = ds.bg === 'night' ? 0 : 1;
    S.forEach((s, k) => s.dot.classList.toggle('done', k <= i));
    if (!location.hash.startsWith('#@')) history.replaceState(null, '', '#' + (i + 1));
  };

  /* ---------------- render ---------------- */
  let vh = innerHeight;
  addEventListener('resize', () => { vh = innerHeight; resizeSnow(); render(true); });
  let lastPos = NaN;
  function render(force) {
    if (!force && Math.abs(pos - lastPos) < 1e-4) return;
    lastPos = pos;

    for (const r of runs) {
      const e = clamp(pos - (r.start - 1)), x = clamp(pos - (r.start + r.n - 1));
      const vis = e > 0 && x < 1;
      r.el.style.opacity = vis ? ease(e) : 0;
      r.el.style.visibility = vis ? 'visible' : 'hidden';
      r.el.style.setProperty('--e', ease(e).toFixed(4));
      const q = clamp((pos - r.start) / Math.max(1, r.n));
      r.el.style.setProperty('--zoom', (1.16 - 0.16 * ease(e) + 0.05 * x + 0.03 * q).toFixed(4));
      r.el.style.setProperty('--drift', `${(-q * 2.2 - x * 2).toFixed(3)}%`);
      if (vis !== r.playing) {
        r.playing = vis;
        for (const v of r.videos) { if (vis) v.play().catch(() => {}); else v.pause(); }
      }
    }

    let best = 0, bestD = Infinity;
    S.forEach((s, i) => {
      const p = pos - s.start;
      const e = clamp(p + 1), x = clamp(p - (s.n - 1));
      const on = e > 0.001 && x < 0.999;
      s.el.classList.toggle('on', on);
      const mid = s.start + (s.n - 1) / 2, d = Math.abs(pos - mid) - (s.n - 1) / 2;
      if (d < bestD) { bestD = d; best = i; }
      if (!on) return;
      const st = s.el.style;
      st.setProperty('--e', ease(e).toFixed(4));
      st.setProperty('--x', ease(x).toFixed(4));
      st.setProperty('--t', `${(((1 - ease(e)) * 0.62 - ease(x) * 0.62) * vh).toFixed(1)}px`);
      st.setProperty('--o', (clamp(e * 1.85 - 0.85) * clamp(1 - x * 1.85)).toFixed(4));
      st.setProperty('--k0', ease(clamp(e * 1.25 - 0.2)).toFixed(4));
      // fragments and counters
      for (const el of s.steps) {
        const k = +el.dataset.step;
        let v = k === 0 ? clamp(e * 1.25 - 0.2) : clamp(p - (k - 1));
        if (el.dataset.seq) { const [a, n] = el.dataset.seq.split(',').map(Number); v = clamp(v * n - a); }
        if (el.dataset.count) el.textContent = Math.round(+el.dataset.count * easeIO(v));
        else el.style.setProperty('--s', ease(v).toFixed(4));
      }
      // multi-stage numbers (result)
      const q = clamp(p, 0, s.n - 1), qi = Math.min(s.n - 2, Math.floor(q)), qf = q - qi;
      for (const el of s.track) {
        const a = el.dataset.track.split(',').map(Number);
        el.textContent = Math.round(a[qi] + (a[qi + 1] - a[qi]) * easeIO(clamp(qf)));
      }
      for (const el of s.trackw) {
        const a = el.dataset.trackw.split(',').map(Number);
        el.style.setProperty('--w', (a[qi] + (a[qi + 1] - a[qi]) * easeIO(clamp(qf))).toFixed(2));
      }
      // one-at-a-time items (product walkthrough)
      if (s.on.length) {
        const cur = clamp(Math.round(p), 0, s.n - 1);
        for (const el of s.on) el.classList.toggle('cur', +el.dataset.on === cur);
      }
      if (s.el.classList.contains('s-map')) lightMap(p > -0.35);
    });
    setHud(best);
    $('#trailfill').style.height = `${(pos / (TOTAL - 1)) * 100}%`;
  }

  /* ---------------- motion: a critically damped spring toward the target step ---------------- */
  let pos = 0, tgt = 0, vel = 0;
  const fromHash = () => { if (location.hash.startsWith('#@')) return clamp(+location.hash.slice(2) || 0, 0, TOTAL - 1); const i = clamp((parseInt(location.hash.slice(1), 10) || 1) - 1, 0, S.length - 1); return S[i].start; };
  pos = tgt = fromHash();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const w = 6.2;
    const a = w * w * (tgt - pos) - 2 * w * vel;
    vel += a * dt;
    pos += vel * dt;
    if (Math.abs(tgt - pos) < 2e-4 && Math.abs(vel) < 1e-3) { pos = tgt; vel = 0; }
    render();
    snow(dt);
    requestAnimationFrame(frame);
  }

  /* ---------------- input ---------------- */
  const hint = $('#hint');
  const go = (k) => { tgt = clamp(Math.round(k), 0, TOTAL - 1); hint.classList.add('gone'); };
  const sceneOf = (k) => S.reduce((acc, s, i) => (k >= s.start ? i : acc), 0);
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); go(Math.round(tgt) + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); go(Math.round(tgt) - 1); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(TOTAL - 1);
    else if (k === 'n' || k === 'N') go(S[Math.min(S.length - 1, sceneOf(Math.round(tgt)) + 1)].start);
    else if (k === 'b' || k === 'B') go(S[Math.max(0, sceneOf(Math.round(tgt)) - 1)].start);
    else if (k === 'f' || k === 'F') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }
  });
  let snapT;
  addEventListener('wheel', (e) => {
    e.preventDefault();
    const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? vh : 1);
    tgt = clamp(tgt + dy / 520, 0, TOTAL - 1);
    hint.classList.add('gone');
    clearTimeout(snapT);
    snapT = setTimeout(() => { tgt = Math.round(tgt); }, 160);
  }, { passive: false });
  let ty = null;
  addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (ty == null) return;
    const dy = ty - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) go(Math.round(tgt) + (dy > 0 ? 1 : -1));
    ty = null;
  });
  addEventListener('click', (e) => { if (!e.target.closest('a')) go(Math.round(tgt) + 1); });
  addEventListener('hashchange', () => { const k = fromHash(); if (sceneOf(Math.round(tgt)) !== sceneOf(k)) go(k); });
  let idle;
  addEventListener('mousemove', () => { document.body.classList.remove('cursorless'); clearTimeout(idle); idle = setTimeout(() => document.body.classList.add('cursorless'), 2200); });

  /* ---------------- snow: reacts to the scroll speed ---------------- */
  const cv = $('#snow'), cx = cv.getContext('2d');
  let W = 0, H = 0, flakes = [];
  function resizeSnow() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
    flakes = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (0.5 + Math.random() * 1.1) * dpr, s: 0.25 + Math.random() * 0.9, ph: Math.random() * 6.28 }));
  }
  resizeSnow();
  let tt = 0;
  function snow(dt) {
    tt += dt;
    cx.clearRect(0, 0, W, H);
    const lift = vel * H * 0.15; // moving forward through the story pushes the snow up
    for (const f of flakes) {
      f.y += (f.s * 38 * (H / 1000)) * dt - lift * dt * f.s;
      f.x += Math.sin(tt * 0.6 + f.ph) * 0.25 * f.s;
      if (f.y > H + 10) { f.y = -10; f.x = Math.random() * W; }
      if (f.y < -12) { f.y = H + 8; f.x = Math.random() * W; }
      const stretch = Math.min(12, Math.abs(lift) * 0.02 * f.s);
      cx.globalAlpha = 0.08 + f.s * 0.17;
      cx.fillStyle = '#eef4fa';
      if (stretch > 1.5) { cx.fillRect(f.x - f.r * 0.5, f.y, f.r, stretch); }
      else { cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 6.283); cx.fill(); }
    }
  }

  render(true);
  requestAnimationFrame(frame);
})();
