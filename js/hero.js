/* Hero — monograma "L" em partículas de ouro + skyline interativo */
(function () {
  'use strict';
  var Lev = window.Lev, clamp = Lev.clamp, lerp = Lev.lerp;
  var hero = document.getElementById('terreo');
  var logoCv = document.getElementById('logoCanvas');
  var skyCv = document.getElementById('skyCanvas');
  if (!hero || !logoCv || !skyCv) return;

  var lctx = logoCv.getContext('2d'), sctx = skyCv.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, SW = 0, SH = 0;
  var visible = true, started = false, startAt = 0;

  // Ponteiro relativo ao hero
  var mouse = { x: -9999, y: -9999, nx: 0, ny: 0, active: false };
  var shift = { x: 0, y: 0 };

  /* ---------- Geometria do monograma (mesma do SVG do logo) ---------- */
  var OUTER = new Path2D('M8 0 L28 10 L28 92 L82 92 L82 108 L8 108 Z');
  var INNER = new Path2D('M36 26 L48 32 L48 76 L82 76 L82 84 L36 84 Z');
  var probe = document.createElement('canvas').getContext('2d');

  var parts = [];       // partículas
  var BUCKETS = 7;
  var palette = ['#8f6b33', '#a98249', '#b98f52', '#c9a66b', '#dcbd85', '#ecd3a0', '#f3dfb0'];

  function buildLogo() {
    parts = [];
    var mobile = W < 760;
    var Lh = Math.min(H * (mobile ? .8 : .66), mobile ? 400 : 580);
    var scale = Lh / 108;
    var cx = mobile ? W * .56 : W * .73, cy = H * .5;
    var ox = cx - 45 * scale, oy = cy - 54 * scale;
    var step = mobile ? 1.5 : 1.12;
    var size = Math.max(1.5, scale * .38);
    for (var gy = 0; gy <= 108; gy += step) {
      for (var gx = 8; gx <= 82; gx += step) {
        var x = gx + (Math.random() - .5) * step * .6, y = gy + (Math.random() - .5) * step * .6;
        var inInner = probe.isPointInPath(INNER, x, y);
        var inOuter = probe.isPointInPath(OUTER, x, y);
        if (!inInner && !inOuter) continue;
        var t = clamp((x - 8) / 74 * .45 + y / 108 * .55, 0, 1);
        var b = inInner ? Math.floor(t * 3) : 2 + Math.floor((1 - t) * (BUCKETS - 2.01));
        parts.push({
          hx: ox + x * scale, hy: oy + y * scale,
          x: cx + (Math.random() - .5) * W * 1.1, y: cy + (Math.random() - .5) * H * 1.1,
          vx: 0, vy: 0, s: size * (.7 + Math.random() * .7), b: clamp(b, 0, BUCKETS - 1),
          ph: Math.random() * 6.28, depth: .4 + Math.random() * .6
        });
      }
    }
  }

  /* ---------- Skyline ---------- */
  var bars = [];
  var skyGrad;
  function buildSky() {
    bars = [];
    var bw = clamp(SW / 56, 11, 26), gap = 3, n = Math.ceil(SW / (bw + gap)) + 1;
    for (var i = 0; i < n; i++) {
      var r = Math.sin(i * 1.7) * .5 + Math.sin(i * .43 + 2) * .8 + Math.sin(i * 3.1) * .25;
      bars.push({ x: i * (bw + gap), w: bw, base: clamp(.2 + (r + 1.4) / 5, .12, .62), h: 0, delay: i * 14 });
    }
    skyGrad = sctx.createLinearGradient(0, 0, 0, SH);
    skyGrad.addColorStop(0, 'rgba(236,211,160,.68)');
    skyGrad.addColorStop(.55, 'rgba(201,166,107,.2)');
    skyGrad.addColorStop(1, 'rgba(201,166,107,.02)');
  }

  function resize() {
    var r = hero.getBoundingClientRect();
    W = logoCv.clientWidth; H = logoCv.clientHeight;
    SW = skyCv.clientWidth; SH = skyCv.clientHeight;
    logoCv.width = W * DPR; logoCv.height = H * DPR;
    skyCv.width = SW * DPR; skyCv.height = SH * DPR;
    lctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildLogo(); buildSky();
    if (Lev.reduced || started) settleStatic();
  }

  function settleStatic() {
    parts.forEach(function (p) { p.x = p.hx; p.y = p.hy; });
    bars.forEach(function (b) { b.h = b.base * SH; });
    if (Lev.reduced) { drawLogo(0); drawSky(0); }
  }

  /* ---------- Entrada do ponteiro ---------- */
  function setPointer(e) {
    var r = logoCv.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    mouse.nx = clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
    mouse.ny = clamp((e.clientY / innerHeight) * 2 - 1, -1, 1);
    mouse.active = mouse.y > -40 && mouse.y < H + 40;
  }
  window.addEventListener('pointermove', setPointer, { passive: true });
  document.addEventListener('pointerleave', function () { mouse.active = false; mouse.x = mouse.y = -9999; });

  var burstPending = null;
  hero.addEventListener('pointerdown', function (e) {
    if (e.target.closest('a,button')) return;
    setPointer(e);
    burstPending = { x: mouse.x, y: mouse.y };
    window.dispatchEvent(new Event('lev:hero-interact'));
  });

  var io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) loop(); }, { threshold: 0 });
  io.observe(hero);

  /* ---------- Desenho ---------- */
  function drawLogo(t) {
    lctx.clearRect(0, 0, W, H);
    var i, p, k, buckets = [];
    for (k = 0; k < BUCKETS; k++) buckets.push([]);
    var fast = [];
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      var sp = Math.abs(p.vx) + Math.abs(p.vy);
      (sp > 2.2 ? fast : buckets[p.b]).push(p);
    }
    for (k = 0; k < BUCKETS; k++) {
      lctx.fillStyle = palette[k];
      var arr = buckets[k];
      for (i = 0; i < arr.length; i++) lctx.fillRect(arr[i].x, arr[i].y, arr[i].s, arr[i].s);
    }
    lctx.fillStyle = '#fff7e0';
    for (i = 0; i < fast.length; i++) lctx.fillRect(fast[i].x - .5, fast[i].y - .5, fast[i].s + 1, fast[i].s + 1);
  }

  function drawSky(t) {
    sctx.clearRect(0, 0, SW, SH);
    sctx.fillStyle = skyGrad;
    var i, b;
    for (i = 0; i < bars.length; i++) {
      b = bars[i];
      sctx.fillRect(b.x, SH - b.h, b.w, b.h);
    }
    sctx.fillStyle = 'rgba(243,223,176,.95)';
    for (i = 0; i < bars.length; i++) {
      b = bars[i];
      if (b.h > 3) sctx.fillRect(b.x, SH - b.h, b.w, 2);
    }
  }

  /* ---------- Física ---------- */
  function stepLogo(t, dt) {
    var intro = clamp((t - startAt) / 1800, 0, 1);
    var K = .012 + .05 * intro * intro, DAMP = .86;
    var R = Math.min(150, Math.max(90, W * .11)), R2 = R * R;
    shift.x = lerp(shift.x, mouse.nx * 14, .05); shift.y = lerp(shift.y, mouse.ny * 10, .05);
    var burst = burstPending; burstPending = null;
    var i, p, dx, dy, d2, d, f, ax, ay, tx, ty;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      tx = p.hx + shift.x * p.depth + Math.sin(t * .0011 + p.ph) * .7;
      ty = p.hy + shift.y * p.depth + Math.cos(t * .0009 + p.ph) * .7;
      ax = (tx - p.x) * K; ay = (ty - p.y) * K;
      if (mouse.active) {
        dx = p.x - mouse.x; dy = p.y - mouse.y; d2 = dx * dx + dy * dy;
        if (d2 < R2) { d = Math.sqrt(d2) || 1; f = (1 - d / R); f = f * f * 5.2; ax += dx / d * f; ay += dy / d * f; }
      }
      if (burst) {
        dx = p.x - burst.x; dy = p.y - burst.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
        f = 16 * Math.exp(-d / (W * .26)) + 3 + Math.random() * 7;
        var a = Math.atan2(dy, dx) + (Math.random() - .5) * 1.4;
        p.vx += Math.cos(a) * f; p.vy += Math.sin(a) * f;
      }
      p.vx = (p.vx + ax) * DAMP; p.vy = (p.vy + ay) * DAMP;
      p.x += p.vx; p.y += p.vy;
    }
  }

  function stepSky(t) {
    var mx = mouse.x, active = mouse.active, topY = H - SH;
    var yF = active ? clamp(1 - Math.max(0, topY - mouse.y) / (H * .75), .2, 1) : 0;
    var sigma = Math.max(110, SW * .09), intro = clamp((t - startAt) / 1000, 0, 1);
    for (var i = 0; i < bars.length; i++) {
      var b = bars[i], target = 0;
      if (t - startAt > b.delay) {
        target = b.base * SH;
        if (active) {
          var dx = (b.x + b.w / 2) - mx;
          target += SH * .62 * yF * Math.exp(-(dx * dx) / (2 * sigma * sigma));
        }
        target = Math.min(target, SH - 6) * (.35 + .65 * intro) ;
      }
      b.h = lerp(b.h, target, .1);
    }
  }

  /* ---------- Loop ---------- */
  var raf = 0;
  function loop() {
    if (raf || Lev.reduced) return;
    raf = requestAnimationFrame(frame);
  }
  function frame(t) {
    raf = 0;
    if (!visible) return;
    if (!started) { started = true; startAt = t; }
    stepLogo(t); stepSky(t);
    drawLogo(t); drawSky(t);
    loop();
  }

  // Sem animação: estado estático
  function init() {
    resize();
    if (Lev.reduced) { settleStatic(); return; }
    // fica invisível até o preloader terminar
    logoCv.style.opacity = 0; skyCv.style.opacity = 0;
    Lev.onReady(function () {
      started = false;
      logoCv.style.transition = skyCv.style.transition = 'opacity 1.2s';
      logoCv.style.opacity = skyCv.style.opacity = 1;
      loop();
    });
  }
  var rT;
  window.addEventListener('resize', function () {
    clearTimeout(rT);
    rT = setTimeout(function () { var was = started; resize(); if (was) { parts.forEach(function (p) { p.x = p.hx; p.y = p.hy; }); } }, 160);
  });
  init();
})();
