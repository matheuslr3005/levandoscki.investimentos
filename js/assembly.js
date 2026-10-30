/* Assembleia ao vivo — bombo de sorteio, lances e probabilidade (Monte Carlo) */
(function () {
  'use strict';
  var Lev = window.Lev, $ = Lev.$, $$ = Lev.$$, clamp = Lev.clamp, sleep = Lev.sleep;
  var root = $('#asm');
  if (!root) return;

  var N = 100;
  var level = .08;           // probabilidade mensal de cada concorrente dar lance
  var bid = 0;               // seu lance, % da carta
  var you = 0, gone = [], month = 0, done = false, busy = false, auto = false;

  var grid = $('#grid100'), timeline = $('#timeline');
  var cells = [];
  var pad = function (n) { return String(n + 1).padStart(3, '0'); };

  /* ---------- Modelo do lance dos concorrentes ---------- */
  var rndBid = function () { return 10 + 50 * Math.pow(Math.random(), 1.3); };

  /* ---------- Probabilidades (rápido, só contagens) ---------- */
  function simOnce(myBid, p) {
    var rem = N, m, k, comp, top, b;
    for (m = 1; m <= N; m++) {
      comp = rem - 1; top = 0;
      for (k = 0; k < comp; k++) if (Math.random() < p) { b = rndBid(); if (b > top) top = b; }
      if (myBid > 0 && myBid > top) return m;           // contemplado por lance
      if (top > 0) rem--;                               // um concorrente levou o lance
      if (Math.random() < 1 / rem) return m;            // sorteio
      rem--;
      if (rem <= 1) return m + 1;
    }
    return N;
  }
  function odds() {
    var runs = 1000, res = new Array(runs), within = 0;
    for (var i = 0; i < runs; i++) { res[i] = simOnce(bid, level); if (res[i] <= 12) within++; }
    res.sort(function (a, b) { return a - b; });
    var med = res[Math.floor(runs / 2)], p12 = within / runs * 100;
    $('#oddsYear').textContent = Lev.pct(p12, 0);
    $('#oddsMed').textContent = med + (med === 1 ? ' mês' : ' meses');
    $('#oddsBar').style.width = p12 + '%';
  }
  var oddsT;
  function scheduleOdds() { clearTimeout(oddsT); oddsT = setTimeout(odds, 110); }

  /* ---------- Grade de cotas ---------- */
  function buildGrid() {
    grid.innerHTML = ''; cells = [];
    for (var i = 0; i < N; i++) {
      var c = document.createElement('div');
      c.className = 'cota'; c.textContent = i + 1;
      grid.appendChild(c); cells.push(c);
    }
  }
  function reset() {
    you = 5 + Math.floor(Math.random() * 90);
    gone = new Array(N).fill(false); month = 0; done = false; busy = false; auto = false;
    buildGrid();
    cells[you].classList.add('you');
    timeline.innerHTML = '';
    $('#asmStat').textContent = '100 cotas · mês 0';
    $('#bomboBall').classList.remove('is-show');
    $('#logDraw').textContent = '—'; $('#logBid').textContent = '—';
    var y = $('#logYou'); y.textContent = 'Aguardando a primeira assembleia (sua cota: ' + pad(you) + ')';
    y.parentNode.classList.remove('win');
    $('#btnRun').disabled = false; $('#btnAuto').disabled = false;
    $('#btnRun span').textContent = 'Rodar assembleia';
    $('#btnAuto span').textContent = 'Simular até contemplar';
  }

  /* ---------- Uma assembleia ---------- */
  function remaining() { var r = []; for (var i = 0; i < N; i++) if (!gone[i]) r.push(i); return r; }

  function decide() {
    var rem = remaining(), top = { b: 0, i: -1 }, i, b;
    for (var k = 0; k < rem.length; k++) {
      i = rem[k]; if (i === you) continue;
      if (Math.random() < level) { b = rndBid(); if (b > top.b) top = { b: b, i: i }; }
    }
    var lanceWinner = -1, lanceVal = 0;
    if (bid > 0 && bid > top.b) { lanceWinner = you; lanceVal = bid; }
    else if (top.i >= 0) { lanceWinner = top.i; lanceVal = top.b; }
    var pool = rem.filter(function (x) { return x !== lanceWinner; });
    var draw = pool.length ? pool[Math.floor(Math.random() * pool.length)] : -1;
    return { lance: lanceWinner, lanceVal: lanceVal, topComp: top, draw: draw };
  }

  async function runMonth(fast) {
    if (done || busy) return;
    busy = true; $('#btnRun').disabled = true;
    month++;
    $('#asmStat').textContent = '100 cotas · mês ' + month;
    $('#bomboBall').classList.remove('is-show');
    bombo.shake = true;
    await sleep(fast ? 420 : 1300);
    bombo.shake = false;

    var r = decide();
    var credit = Lev.getCredit ? Lev.getCredit() : 400000;

    // lance
    if (r.lance >= 0) {
      cells[r.lance].classList.add('hit-b');
      $('#logBid').textContent = 'Cota ' + pad(r.lance) + (r.lance === you ? ' (você)' : '') + ' · ' + Lev.pct(r.lanceVal, 0) + ' · ' + Lev.brl(credit * r.lanceVal / 100);
    } else $('#logBid').textContent = 'Nenhum lance válido';
    if (!fast) await sleep(450);

    // sorteio
    if (r.draw >= 0) {
      cells[r.draw].classList.add('hit');
      $('#bomboNum').textContent = pad(r.draw);
      $('#bomboBall').classList.add('is-show');
      $('#logDraw').textContent = 'Cota ' + pad(r.draw) + (r.draw === you ? ' (você)' : '');
    } else $('#logDraw').textContent = '—';
    await sleep(fast ? 260 : 900);

    // aplica contemplações
    var winners = [r.lance, r.draw].filter(function (x) { return x >= 0; });
    winners.forEach(function (i) { gone[i] = true; cells[i].classList.remove('hit', 'hit-b'); cells[i].classList.add('off'); });

    var youWon = winners.indexOf(you) >= 0;
    var dot = document.createElement('i'); if (youWon) dot.className = 'win'; dot.title = 'Mês ' + month;
    timeline.appendChild(dot);

    var yl = $('#logYou'), row = yl.parentNode;
    if (youWon) {
      done = true;
      var how = r.lance === you ? 'por lance de ' + Lev.pct(bid, 0) + ' (' + Lev.brl(credit * bid / 100) + ')' : 'por sorteio';
      yl.textContent = 'Contemplado no mês ' + month + ' ' + how + '!';
      row.classList.add('win');
      var rc = cells[you].getBoundingClientRect();
      Lev.confetti(rc.left + rc.width / 2, rc.top + rc.height / 2);
      $('#btnRun span').textContent = 'Você foi contemplado!';
      $('#btnRun').disabled = true; $('#btnAuto').disabled = true;
      Lev.toast('Contemplado no mês ' + month + '! Quer transformar isso em plano real? Me chama 👇');
    } else {
      yl.textContent = 'Ainda não — sua cota segue no jogo (' + remaining().length + ' ativas)';
      $('#btnRun').disabled = false;
    }
    busy = false;
  }

  async function runAuto() {
    if (auto) { auto = false; return; }
    if (done) return;
    auto = true; $('#btnAuto span').textContent = 'Parar';
    while (auto && !done) { await runMonth(true); await sleep(90); }
    auto = false;
    $('#btnAuto span').textContent = 'Simular até contemplar';
  }

  $('#btnRun').addEventListener('click', function () { runMonth(false); });
  $('#btnAuto').addEventListener('click', runAuto);
  $('#btnReset').addEventListener('click', function () { auto = false; setTimeout(reset, 120); });

  /* ---------- Controles ---------- */
  var rBid = $('#rBid');
  function paintBid() {
    rBid.style.setProperty('--p', (rBid.value / rBid.max * 100) + '%');
    bid = +rBid.value;
    $('#oBid').textContent = bid + '%';
    var credit = Lev.getCredit ? Lev.getCredit() : 400000;
    $('#bidVal').textContent = bid === 0 ? 'Sem lance — só no sorteio' : 'Lance de ' + Lev.brl(credit * bid / 100) + ' sobre uma carta de ' + Lev.brl(credit);
  }
  rBid.addEventListener('input', function () { paintBid(); scheduleOdds(); });
  window.addEventListener('lev:credit', paintBid);
  $$('#seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('#seg button').forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-checked', x === b); });
      level = parseFloat(b.dataset.lvl); scheduleOdds();
    });
  });

  /* ---------- Bombo (canvas) ---------- */
  var bombo = { shake: false };
  (function initBombo() {
    var cv = $('#bombo'), ctx = cv.getContext('2d');
    var D = Math.min(window.devicePixelRatio || 1, 2), S = 320, R = 146, C = S / 2;
    cv.width = S * D; cv.height = S * D; ctx.setTransform(D, 0, 0, D, 0, 0);
    var balls = [], i;
    for (i = 0; i < 28; i++) {
      var a = Math.random() * 6.28, d = Math.random() * 90;
      balls.push({ x: C + Math.cos(a) * d, y: C + Math.sin(a) * d + 30, vx: 0, vy: 0, r: 16, n: 1 + Math.floor(Math.random() * 99) });
    }
    var ang = 0, visible = true;
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) tick(); }).observe(cv);

    function physics() {
      var b, j, dx, dy, d, nx, ny, dot, o, ov;
      for (i = 0; i < balls.length; i++) {
        b = balls[i];
        b.vy += .34;
        if (bombo.shake) {
          b.vx += (Math.random() - .5) * 4.2;
          b.vy += -Math.random() * 2.6;
        }
        b.vx *= .995; b.vy *= .995;
        b.x += b.vx; b.y += b.vy;
        dx = b.x - C; dy = b.y - C; d = Math.sqrt(dx * dx + dy * dy);
        if (d > R - b.r) {
          nx = dx / d; ny = dy / d;
          b.x = C + nx * (R - b.r); b.y = C + ny * (R - b.r);
          dot = b.vx * nx + b.vy * ny;
          if (dot > 0) { b.vx -= 1.75 * dot * nx; b.vy -= 1.75 * dot * ny; }
        }
      }
      for (i = 0; i < balls.length; i++) for (j = i + 1; j < balls.length; j++) {
        b = balls[i]; o = balls[j];
        dx = o.x - b.x; dy = o.y - b.y; d = Math.sqrt(dx * dx + dy * dy);
        if (d < b.r + o.r && d > 0) {
          nx = dx / d; ny = dy / d; ov = (b.r + o.r - d) / 2;
          b.x -= nx * ov; b.y -= ny * ov; o.x += nx * ov; o.y += ny * ov;
          var rv = (o.vx - b.vx) * nx + (o.vy - b.vy) * ny;
          if (rv < 0) { b.vx += nx * rv * .9; b.vy += ny * rv * .9; o.vx -= nx * rv * .9; o.vy -= ny * rv * .9; }
        }
      }
    }
    function draw() {
      ctx.clearRect(0, 0, S, S);
      // vidro
      var g = ctx.createRadialGradient(C - 40, C - 50, 10, C, C, R);
      g.addColorStop(0, 'rgba(243,223,176,.10)'); g.addColorStop(1, 'rgba(201,166,107,.02)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C, C, R, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(243,223,176,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
      // aro com marcas girando
      ctx.save(); ctx.translate(C, C); ctx.rotate(ang);
      ctx.strokeStyle = 'rgba(201,166,107,.35)'; ctx.lineWidth = 1;
      for (var t = 0; t < 36; t++) { ctx.rotate(6.283 / 36); ctx.beginPath(); ctx.moveTo(R + 4, 0); ctx.lineTo(R + (t % 3 === 0 ? 12 : 8), 0); ctx.stroke(); }
      ctx.restore();
      // bolas
      ctx.font = '600 10px JetBrains Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      balls.forEach(function (b) {
        var bg = ctx.createRadialGradient(b.x - 5, b.y - 6, 1, b.x, b.y, b.r);
        bg.addColorStop(0, '#fff6dc'); bg.addColorStop(.45, '#e5c88c'); bg.addColorStop(1, '#8f6b33');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#14110a'; ctx.fillText(b.n, b.x, b.y + .5);
      });
      // brilho
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(C, C, R - 10, 3.6, 4.5); ctx.stroke();
    }
    var raf = 0;
    function tick() {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (!visible) return;
        ang += bombo.shake ? .05 : .006;
        if (!Lev.reduced) physics();
        draw(); tick();
      });
    }
    tick();
  })();

  /* ---------- Início ---------- */
  reset(); paintBid(); odds();
})();
