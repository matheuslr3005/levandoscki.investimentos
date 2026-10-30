/* Levandoscki Investimentos — núcleo: utilidades, preloader, cursor, elevador, UI geral */
(function () {
  'use strict';

  var doc = document.documentElement;
  doc.classList.add('js');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  var Lev = window.Lev = {
    $: $, $$: $$, clamp: clamp, lerp: lerp, reduced: reduced, finePointer: finePointer,
    ready: false,
    brl: function (v) { return brl.format(Math.round(v)); },
    pct: function (v, d) { return v.toFixed(d == null ? 0 : d).replace('.', ',') + '%'; },
    sleep: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },
    onReady: function (fn) { if (Lev.ready) fn(); else window.addEventListener('lev:ready', fn, { once: true }); }
  };

  /* ---------- Toast & clipboard ---------- */
  var toastEl = $('#toast'), toastT;
  Lev.toast = function (msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 4200);
  };
  Lev.copy = function (text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
        return true;
      }
    } catch (e) { /* cai no fallback */ }
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;left:-999px';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { /* ignora */ }
    ta.remove();
    return ok;
  };
  Lev.WHATS = 'https://wa.link/2q9z90';

  /* ---------- Confete dourado ---------- */
  var cv = $('#confetti'), cx = cv.getContext('2d'), bits = [], confettiRaf = 0;
  function sizeConfetti() {
    var d = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = innerWidth * d; cv.height = innerHeight * d;
    cx.setTransform(d, 0, 0, d, 0, 0);
  }
  sizeConfetti();
  window.addEventListener('resize', sizeConfetti);
  Lev.confetti = function (ox, oy) {
    if (reduced) return;
    var colors = ['#f3dfb0', '#c9a66b', '#ffffff', '#e8c987', '#8f6b33'];
    ox = ox == null ? innerWidth / 2 : ox; oy = oy == null ? innerHeight * 0.55 : oy;
    for (var i = 0; i < 170; i++) {
      var a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 13;
      bits.push({ x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, w: 5 + Math.random() * 7, h: 3 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: colors[i % colors.length], life: 1 });
    }
    if (!confettiRaf) confettiRaf = requestAnimationFrame(tickConfetti);
  };
  function tickConfetti() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    bits = bits.filter(function (b) { return b.life > 0 && b.y < innerHeight + 40; });
    bits.forEach(function (b) {
      b.vy += .32; b.vx *= .985; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.life -= .0045;
      cx.save(); cx.translate(b.x, b.y); cx.rotate(b.r); cx.globalAlpha = Math.max(b.life, 0);
      cx.fillStyle = b.c; cx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); cx.restore();
    });
    confettiRaf = bits.length ? requestAnimationFrame(tickConfetti) : 0;
    if (!bits.length) cx.clearRect(0, 0, innerWidth, innerHeight);
  }

  /* ---------- Preloader ---------- */
  var pre = $('#preloader'), preCount = $('#preCount');
  var finished = false;
  function finishPreload() {
    if (finished) return; finished = true;
    pre.classList.add('is-done');
    doc.classList.remove('is-loading');
    doc.classList.add('is-ready');
    Lev.ready = true;
    window.dispatchEvent(new Event('lev:ready'));
    setTimeout(function () { pre.classList.add('is-gone'); }, 1200);
  }
  (function runPreloader() {
    if (reduced) { preCount.textContent = '100'; finishPreload(); return; }
    var t0 = performance.now(), dur = 1500;
    (function step(now) {
      var p = clamp((now - t0) / dur, 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      preCount.textContent = String(Math.round(e * 100)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(step); else setTimeout(finishPreload, 250);
    })(t0);
    setTimeout(finishPreload, 4000); // salvaguarda
  })();

  /* ---------- Divide títulos em palavras ---------- */
  function splitNode(node, idx) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'w';
          var i = document.createElement('span'); i.className = 'w__in'; i.textContent = part;
          i.style.setProperty('--i', idx.n++);
          w.appendChild(i); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) { splitNode(n, idx); }
    });
  }
  $$('[data-split]').forEach(function (el) {
    el.setAttribute('aria-label', el.textContent.trim());
    splitNode(el, { n: 0 });
    $$('.w', el).forEach(function (w) { w.setAttribute('aria-hidden', 'true'); });
  });

  /* ---------- Reveal ao rolar ---------- */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal],[data-split]').forEach(function (el) {
    if (el.closest('.hero')) {
      // elementos do hero entram quando o preloader acaba
      Lev.onReady(function () { setTimeout(function () { el.classList.add('in'); }, 150); });
    } else revealIO.observe(el);
  });

  /* ---------- Contadores ---------- */
  function countUp(el) {
    var to = parseFloat(el.dataset.count), dur = parseFloat(el.dataset.countDur || 1800), t0 = performance.now();
    if (reduced) { el.textContent = to; return; }
    (function f(now) {
      var p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }
  $$('[data-count]').forEach(function (el) {
    Lev.onReady(function () { setTimeout(function () { countUp(el); }, 700); });
  });

  /* ---------- Cursor personalizado ---------- */
  var cursor = $('#cursor');
  if (finePointer && cursor) {
    doc.classList.add('has-cursor');
    var dot = $('.cursor__dot', cursor), ring = $('.cursor__ring', cursor), lab = $('.cursor__label', cursor);
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    var target = null, shown = false, lastT = performance.now();
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY; target = e.target;
      if (!shown) { shown = true; rx = mx; ry = my; cursor.classList.add('is-on'); }
    }, { passive: true });
    document.addEventListener('pointerleave', function () { shown = false; cursor.classList.remove('is-on'); });
    window.addEventListener('pointerdown', function () { cursor.classList.add('is-down'); });
    window.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });

    var lastTarget = null;
    function updateHover() {
      if (target === lastTarget) return;
      lastTarget = target;
      var t = target && target.closest ? target.closest('a,button,summary,input,label,.floor,[data-cursor],[role=tab]') : null;
      var label = t && t.getAttribute('data-cursor');
      if (t && t.classList.contains('is-active') && t.classList.contains('floor')) label = null;
      cursor.classList.toggle('is-link', !!t);
      cursor.classList.toggle('is-label', !!label);
      if (label) lab.textContent = label;
    }
    // Ponto e anel na mesma passada de quadro; o anel segue rápido (suavização
    // independente do fps: ~55% da distância por quadro a 60fps).
    (function loop(now) {
      var k = 1 - Math.pow(1 - .55, Math.min(now - lastT, 50) / 16.67);
      lastT = now;
      rx += (mx - rx) * k; ry += (my - ry) * k;
      if (Math.abs(mx - rx) < .05) rx = mx;
      if (Math.abs(my - ry) < .05) ry = my;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      updateHover();
      requestAnimationFrame(loop);
    })(lastT);
  }

  /* ---------- Botões magnéticos ---------- */
  if (finePointer && !reduced) {
    $$('[data-magnetic]').forEach(function (el) {
      var strength = el.classList.contains('orb') ? .32 : .28;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * strength, y = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .7s cubic-bezier(.22,1,.36,1)';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 700);
      });
    });
  }

  /* ---------- Spotlight nos cards ---------- */
  $$('[data-spot]').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Menu mobile ---------- */
  var burger = $('#burger'), drawer = $('#drawer');
  function setDrawer(open) {
    burger.setAttribute('aria-expanded', open); drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', !open);
    doc.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function () { setDrawer(burger.getAttribute('aria-expanded') !== 'true'); });
  $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { setDrawer(false); }); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') setDrawer(false); });

  /* ---------- Marquee guiado pela rolagem ---------- */
  var track = $('.marquee__track'), mq = { x: 0, dir: -1, last: scrollY, vel: 0 };
  function marqueeStep() {
    var dy = scrollY - mq.last; mq.last = scrollY;
    mq.vel = lerp(mq.vel, Math.min(Math.abs(dy), 60), .12);
    if (Math.abs(dy) > 1) mq.dir = dy > 0 ? -1 : 1;
    mq.x += mq.dir * (reduced ? .2 : .7 + mq.vel * .22);
    var half = track.scrollWidth / 2;
    if (mq.x <= -half) mq.x += half; if (mq.x > 0) mq.x -= half;
    track.style.transform = 'translate3d(' + mq.x + 'px,0,0)';
    requestAnimationFrame(marqueeStep);
  }
  if (track) marqueeStep();

  /* ---------- Andares (Soluções) ---------- */
  var floors = $$('.floor');
  function activateFloor(f) {
    if (f.classList.contains('is-active')) return;
    floors.forEach(function (x) { x.classList.toggle('is-active', x === f); x.setAttribute('aria-expanded', x === f); });
  }
  var hoverT;
  floors.forEach(function (f) {
    f.setAttribute('role', 'button'); f.setAttribute('aria-expanded', f.classList.contains('is-active'));
    f.addEventListener('click', function () { activateFloor(f); });
    f.addEventListener('focus', function () { activateFloor(f); });
    f.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse' || window.innerWidth <= 980) return;
      clearTimeout(hoverT); hoverT = setTimeout(function () { activateFloor(f); }, 110);
    });
    f.addEventListener('pointerleave', function () { clearTimeout(hoverT); });
    f.addEventListener('keydown', function (e) {
      var i = floors.indexOf(f);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); floors[(i + 1) % floors.length].focus(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); floors[(i + floors.length - 1) % floors.length].focus(); }
    });
  });
  // links dentro dos painéis que escolhem o modo do simulador
  $$('[data-sim-mode]').forEach(function (a) {
    a.addEventListener('click', function () { if (Lev.setSimMode) Lev.setSimMode(a.dataset.simMode); });
  });

  // Arte dos andares (gerada por JS para manter o HTML enxuto)
  (function buildArt() {
    var NS = 'http://www.w3.org/2000/svg';
    var make = function (tag, attrs, parent) {
      var el = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      parent.appendChild(el); return el;
    };
    var wins = [], g = $('[data-windows]');
    if (g) {
      for (var r = 0; r < 7; r++) for (var c = 0; c < 4; c++) {
        wins.push(make('rect', { class: 'w', x: 48 + c * 36, y: 84 + r * 26, width: 22, height: 16, rx: 2 }, g));
      }
      wins.forEach(function (w) { if (Math.random() > .55) w.classList.add('lit'); });
      if (!reduced) setInterval(function () {
        for (var k = 0; k < 3; k++) wins[Math.floor(Math.random() * wins.length)].classList.toggle('lit');
      }, 650);
    }
    var tg = $('.ticks-g');
    if (tg) for (var i = 0; i <= 12; i++) {
      var a = Math.PI + i / 12 * Math.PI, r1 = i % 3 === 0 ? 80 : 88, r2 = 96;
      make('line', { x1: 130 + Math.cos(a) * r1, y1: 170 + Math.sin(a) * r1, x2: 130 + Math.cos(a) * r2, y2: 170 + Math.sin(a) * r2 }, tg);
    }
    var bg = $('.art-chart .bars');
    if (bg) for (var b = 0; b < 10; b++) {
      var h = 28 + b * 12 + (b % 3) * 10;
      var rect = make('rect', { x: 10 + b * 25, y: 175 - h, width: 14, height: h, rx: 2 }, bg);
      rect.style.animationDelay = (b * 0.12) + 's';
    }
  })();

  /* ---------- FAQ ---------- */
  $$('.faq__item').forEach(function (item) {
    var q = $('.faq__q', item);
    q.addEventListener('click', function () {
      var open = !item.classList.contains('is-open');
      $$('.faq__item.is-open').forEach(function (o) {
        if (o !== item) { o.classList.remove('is-open'); $('.faq__q', o).setAttribute('aria-expanded', 'false'); }
      });
      item.classList.toggle('is-open', open); q.setAttribute('aria-expanded', open);
    });
  });

  /* ---------- Elevador + nav + método (dirigidos pela rolagem) ---------- */
  var nav = $('#nav'), secs = $$('[data-floor]');
  var links = $$('[data-floor-link]'), car = $('#elevCar'), fill = $('#elevFill'), shaft = $('.elevator__shaft');
  var numEl = $('#floorNum'), labels = ['T', '1', '2', '3', '4', '5', 'C'], curFloor = -1;
  var steps = $$('.step'), mfloors = $$('.mfloor'), curStep = -1;
  var linkY = [], carH = 16;

  function measureElevator() {
    var sr = shaft.getBoundingClientRect();
    linkY = links.map(function (a) { var r = a.getBoundingClientRect(); return r.top + r.height / 2 - sr.top; });
  }
  function updateScroll() {
    var y = scrollY;
    nav.classList.toggle('is-scrolled', y > 40);

    // elevador
    var probe = y + innerHeight * 0.42, idx = 0;
    var tops = secs.map(function (s) { return s.getBoundingClientRect().top + y; });
    for (var i = 0; i < tops.length; i++) if (probe >= tops[i]) idx = i;
    var next = tops[idx + 1] != null ? tops[idx + 1] : document.documentElement.scrollHeight;
    var f = clamp((probe - tops[idx]) / Math.max(next - tops[idx], 1), 0, 1);
    if (idx === tops.length - 1) f = 0;
    if (linkY.length) {
      var yy = lerp(linkY[idx], linkY[idx + 1] != null ? linkY[idx + 1] : linkY[idx], f);
      car.style.transform = 'translateY(' + (yy - carH / 2) + 'px)';
      fill.style.height = Math.max(yy - linkY[0], 0) + 'px';
      fill.parentNode.style.top = linkY[0] + 'px';
      fill.parentNode.style.bottom = (shaft.offsetHeight - linkY[linkY.length - 1]) + 'px';
    }
    if (idx !== curFloor) {
      curFloor = idx;
      links.forEach(function (a, k) { a.classList.toggle('is-active', k === idx); });
      var span = document.createElement('span'); span.textContent = labels[idx];
      numEl.replaceWith(span); span.id = 'floorNum'; numEl = span;
    }

    // método
    if (steps.length) {
      var mid = innerHeight * 0.5, best = -1;
      steps.forEach(function (s, k) {
        var r = s.getBoundingClientRect();
        if (r.top < mid && r.bottom > mid) best = k;
      });
      var sec = $('#method').getBoundingClientRect();
      if (best === -1) best = sec.top > mid ? -1 : (sec.bottom < mid ? steps.length - 1 : curStep);
      if (best !== curStep) {
        curStep = best;
        steps.forEach(function (s, k) { s.classList.toggle('is-active', k === best); });
        mfloors.forEach(function (m) {
          var i = +m.dataset.i;
          m.classList.toggle('is-lit', i <= best);
          m.classList.toggle('is-now', i === best);
        });
      }
    }
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; updateScroll(); });
  }, { passive: true });
  window.addEventListener('resize', function () { measureElevator(); updateScroll(); });
  window.addEventListener('load', function () { measureElevator(); updateScroll(); });
  Lev.onReady(function () { setTimeout(function () { measureElevator(); updateScroll(); }, 100); });
  measureElevator(); updateScroll();

  /* ---------- Dica do hero some ao interagir ---------- */
  var hint = $('#heroHint');
  window.addEventListener('scroll', function () { if (scrollY > 80 && hint) hint.classList.add('is-off'); }, { passive: true });
  window.addEventListener('lev:hero-interact', function () { if (hint) hint.classList.add('is-off'); });

  var yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();
})();
