/* Simulador "Elevador de Patrimônio" */
(function () {
  'use strict';
  var Lev = window.Lev, $ = Lev.$, $$ = Lev.$$, clamp = Lev.clamp;
  var root = $('#sim');
  if (!root) return;

  /* ---------- Estado por modo ---------- */
  var MODES = {
    imovel: {
      cons: true, unit: 50000, noun: 'imóvel',
      label: 'Valor do imóvel (carta de crédito)',
      credit: { min: 100000, max: 1500000, step: 10000, val: 400000 },
      months: { min: 60, max: 240, step: 12, val: 180 },
      fee: 18, fin: 1.0
    },
    veiculo: {
      cons: true, unit: 10000, noun: 'veículo',
      label: 'Valor do veículo (carta de crédito)',
      credit: { min: 30000, max: 300000, step: 5000, val: 80000 },
      months: { min: 24, max: 96, step: 6, val: 60 },
      fee: 15, fin: 1.9
    },
    invest: { cons: false, aporte: 2000, years: 10, rate: 10 }
  };
  var S = {};
  Object.keys(MODES).forEach(function (k) { S[k] = JSON.parse(JSON.stringify(MODES[k])); });
  var mode = 'imovel';

  var el = {
    credit: $('#rCredit'), months: $('#rMonths'), fee: $('#rFee'), fin: $('#rFin'),
    aporte: $('#rAporte'), years: $('#rYears'), rate: $('#rRate'),
    oCredit: $('#oCredit'), oMonths: $('#oMonths'), oFee: $('#oFee'), oFin: $('#oFin'),
    oAporte: $('#oAporte'), oYears: $('#oYears'), oRate: $('#oRate'),
    lblCredit: $('#lblCredit')
  };

  /* ---------- Utilidades ---------- */
  function paint(r) { r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'); }
  var tweens = new WeakMap();
  function tween(node, to, fmt) {
    var st = tweens.get(node) || { v: 0, raf: 0 };
    cancelAnimationFrame(st.raf);
    if (Lev.reduced) { st.v = to; node.textContent = fmt(to); tweens.set(node, st); return; }
    var from = st.v, t0 = performance.now(), dur = 650;
    (function f(now) {
      var p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
      st.v = from + (to - from) * e; node.textContent = fmt(st.v);
      if (p < 1) st.raf = requestAnimationFrame(f);
    })(t0);
    tweens.set(node, st);
  }
  function setW(id, pct) { $(id).style.width = pct + '%'; }
  function niceUnit(v) {
    var steps = [1e3, 2e3, 2.5e3, 5e3, 1e4, 2e4, 2.5e4, 5e4, 1e5, 2e5, 2.5e5, 5e5, 1e6, 2e6, 2.5e6, 5e6, 1e7, 2e7, 5e7];
    for (var i = 0; i < steps.length; i++) if (steps[i] >= v) return steps[i];
    return steps[steps.length - 1];
  }
  function short(v) {
    if (v >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
    return 'R$ ' + Math.round(v / 1e3).toLocaleString('pt-BR') + ' mil';
  }

  /* ---------- Cálculos ---------- */
  function calcCons(s) {
    var consTotal = s.credit.val * (1 + s.fee / 100);
    var consPmt = consTotal / s.months.val;
    var i = s.fin / 100, n = s.months.val, P = s.credit.val;
    var finPmt = i === 0 ? P / n : P * i / (1 - Math.pow(1 + i, -n));
    var finTotal = finPmt * n;
    return { consTotal: consTotal, consPmt: consPmt, consCost: consTotal - P, finTotal: finTotal, finPmt: finPmt, finCost: finTotal - P, credit: P };
  }
  function calcInv(s) {
    var r = Math.pow(1 + s.rate / 100, 1 / 12) - 1, n = s.years * 12;
    var fv = function (k) { return r === 0 ? s.aporte * k : s.aporte * (Math.pow(1 + r, k) - 1) / r; };
    var total = fv(n), invested = s.aporte * n;
    return { r: r, n: n, fv: fv, total: total, invested: invested, gain: total - invested };
  }

  /* ---------- Torre ---------- */
  var stack = $('#towerStack'), blocks = [];
  function renderTower(value, unit) {
    var n = clamp(Math.round(value / unit), 1, 30);
    var first = blocks.length;
    while (blocks.length < n) {
      var i = blocks.length, b = document.createElement('div');
      b.className = 'blk';
      b.style.width = Math.max(40, 100 - Math.floor(i / 7) * 10) + '%';
      b.style.animationDelay = Math.min((i - first) * 22, 480) + 'ms';
      stack.appendChild(b); blocks.push(b);
    }
    while (blocks.length > n) {
      var gone = blocks.pop(); gone.classList.add('is-out');
      (function (g) { setTimeout(function () { g.remove(); }, 300); })(gone);
    }
    var cnt = $('#towerCount');
    cnt.textContent = n + (n === 1 ? ' andar' : ' andares');
    $('#towerUnit').textContent = 'cada andar = ' + short(unit);
  }

  /* ---------- Gráfico (investir) ---------- */
  function renderChart(c, s) {
    var W = 600, Hh = 240, pad = 8, pts = Math.min(c.n, 90), tot = [], inv = [];
    for (var j = 0; j <= pts; j++) {
      var k = Math.round(j / pts * c.n), x = j / pts * W;
      tot.push([x, Hh - pad - (c.fv(k) / c.total) * (Hh - pad * 2)]);
      inv.push([x, Hh - pad - (s.aporte * k / c.total) * (Hh - pad * 2)]);
    }
    var line = function (a) { return a.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' '); };
    $('#chTot').setAttribute('d', line(tot));
    $('#chInv').setAttribute('d', line(inv));
    $('#chArea').setAttribute('d', line(tot) + ' L' + W + ' ' + Hh + ' L0 ' + Hh + ' Z');
    var g = $('.chart__grid'), html = '';
    for (var q = 1; q < 5; q++) html += '<line x1="0" x2="' + W + '" y1="' + (q * Hh / 5) + '" y2="' + (q * Hh / 5) + '"/>';
    g.innerHTML = html;
  }
  function revealChart() {
    var svg = $('#chart svg');
    if (Lev.reduced || !svg.animate) return;
    svg.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1100, easing: 'cubic-bezier(.22,1,.36,1)' });
  }

  /* ---------- Render principal ---------- */
  var raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; render(); }); }

  function render() {
    var s = S[mode];
    if (s.cons) {
      var c = calcCons(s);
      el.oCredit.textContent = Lev.brl(s.credit.val);
      el.oMonths.textContent = s.months.val + ' meses';
      el.oFee.textContent = s.fee + '%';
      el.oFin.textContent = s.fin.toFixed(2).replace('.', ',') + '%';
      [el.credit, el.months, el.fee, el.fin].forEach(paint);

      tween($('#resConsPmt'), c.consPmt, Lev.brl);
      tween($('#resFinPmt'), c.finPmt, Lev.brl);
      tween($('#resConsFee'), c.consCost, function (v) { return 'taxas: ' + Lev.brl(v); });
      tween($('#resFinInt'), c.finCost, function (v) { return 'juros: ' + Lev.brl(v); });
      tween($('#barConsTot'), c.consTotal, Lev.brl);
      tween($('#barFinTot'), c.finTotal, Lev.brl);
      var mx = Math.max(c.consTotal, c.finTotal);
      setW('#barConsMain', c.credit / mx * 100); setW('#barConsCost', c.consCost / mx * 100);
      setW('#barFinMain', c.credit / mx * 100); setW('#barFinCost', c.finCost / mx * 100);

      var diff = c.finTotal - c.consTotal, less = diff >= 0;
      tween($('#resDiff'), Math.abs(diff), Lev.brl);
      $('#resDiffTxt').textContent = less ? 'a menos no consórcio, ao longo do prazo' : 'a mais no consórcio, ao longo do prazo';
      renderTower(c.credit, s.unit);
      $('#towerLabel').textContent = 'Sua carta equivale a';
    } else {
      var v = calcInv(s);
      el.oAporte.textContent = Lev.brl(s.aporte);
      el.oYears.textContent = s.years + (s.years === 1 ? ' ano' : ' anos');
      el.oRate.textContent = s.rate.toFixed(1).replace('.', ',') + '%';
      [el.aporte, el.years, el.rate].forEach(paint);
      tween($('#resInvIn'), v.invested, Lev.brl);
      tween($('#resInvGain'), v.gain, Lev.brl);
      tween($('#resInvTot'), v.total, Lev.brl);
      renderChart(v, s);
      renderTower(v.total, niceUnit(v.total / 26));
      $('#towerLabel').textContent = 'Seu patrimônio projetado equivale a';
    }
    window.dispatchEvent(new Event('lev:credit'));
  }

  /* ---------- Troca de modo ---------- */
  var tabs = $$('.sim__tabs button'), glow = $('.sim__tabs-glow');
  function moveGlow() {
    var on = $('.sim__tabs button.is-on');
    glow.style.width = on.offsetWidth + 'px';
    glow.style.transform = 'translateX(' + (on.offsetLeft - 5) + 'px)';
  }
  function applyPreset() {
    var m = S[mode];
    if (m.cons) {
      ['credit', 'months'].forEach(function (k) {
        var r = el[k]; r.min = m[k].min; r.max = m[k].max; r.step = m[k].step; r.value = m[k].val;
      });
      el.fee.value = m.fee; el.fin.value = m.fin;
      el.lblCredit.textContent = m.label;
    } else {
      el.aporte.value = m.aporte; el.years.value = m.years; el.rate.value = m.rate;
    }
    $$('[data-for="cons"]', root).forEach(function (n) { n.hidden = !m.cons; });
    $$('[data-for="inv"]', root).forEach(function (n) { n.hidden = m.cons; });
  }
  function setMode(next, silent) {
    if (!S[next]) return;
    mode = next;
    tabs.forEach(function (t) { var on = t.dataset.mode === next; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); });
    applyPreset(); moveGlow(); render();
    if (!S[next].cons && !silent) revealChart();
    root.classList.remove('is-swap'); void root.offsetWidth; root.classList.add('is-swap');
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { setMode(t.dataset.mode); }); });
  Lev.setSimMode = function (m) { setMode(m); };

  /* ---------- Controles ---------- */
  function bind(key, group, field, parse) {
    el[key].addEventListener('input', function () {
      var m = S[mode];
      var v = parse(el[key].value);
      if (group) m[group][field] = v; else m[field] = v;
      schedule();
    });
  }
  bind('credit', 'credit', 'val', Number);
  bind('months', 'months', 'val', Number);
  bind('fee', null, 'fee', Number);
  bind('fin', null, 'fin', parseFloat);
  bind('aporte', null, 'aporte', Number);
  bind('years', null, 'years', Number);
  bind('rate', null, 'rate', parseFloat);

  /* ---------- CTA ---------- */
  Lev.getCredit = function () { return S[mode].cons ? S[mode].credit.val : S.imovel.credit.val; };
  $('#simCta').addEventListener('click', function () {
    var s = S[mode], msg;
    if (s.cons) {
      var c = calcCons(s);
      msg = 'Olá! Fiz uma simulação no site: consórcio de ' + s.noun + ' de ' + Lev.brl(s.credit.val) + ' em ' + s.months.val +
        ' meses (parcela estimada de ' + Lev.brl(c.consPmt) + '). Quero entender melhor como funciona!';
    } else {
      var v = calcInv(s);
      msg = 'Olá! Simulei investir ' + Lev.brl(s.aporte) + ' por mês durante ' + s.years + (s.years === 1 ? ' ano' : ' anos') +
        ' (projeção ilustrativa de ' + Lev.brl(v.total) + '). Quero montar uma estratégia!';
    }
    Lev.copy(msg);
    Lev.toast('Resumo copiado! Cole na conversa do WhatsApp 😉');
    setTimeout(function () { window.open(Lev.WHATS, '_blank', 'noopener'); }, 700);
  });

  window.addEventListener('resize', moveGlow);
  window.addEventListener('load', moveGlow);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveGlow);

  applyPreset(); render(); moveGlow();
})();
