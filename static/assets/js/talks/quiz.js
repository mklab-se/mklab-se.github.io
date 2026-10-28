/* ============================================================
   MKLab Living Canvas: Quiz edition
   One particle system behind the whole game. The controller in
   quiz-game.js drives scenes through the `mk-scene` event and
   shares live state on window.MKQuiz (teams, clock, bursts).
   Scenes: setup, pick, board, question, answer, award, podium.
   Based on mklab.se assets/js/canvas.js. No dependencies.
   Decorative only (canvas is aria-hidden).
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('mk-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 720px)').matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var W = 0, H = 0, MN = 0;
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var clamp01 = function (x) { return x < 0 ? 0 : (x > 1 ? 1 : x); };
  var TAU = Math.PI * 2;

  // ---------- glow sprites ----------
  function sprite(color) {
    var s = document.createElement('canvas'); s.width = s.height = 64;
    var c = s.getContext('2d');
    var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color);
    g.addColorStop(0.22, color);
    g.addColorStop(0.5, color.replace('1)', '0.5)'));
    g.addColorStop(1, color.replace('1)', '0)'));
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    return s;
  }
  function hexToRgba(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  var emberS  = sprite('rgba(255,77,28,1)');
  var flameS  = sprite('rgba(255,138,102,1)');
  var whiteS  = sprite('rgba(215,215,225,1)');
  var candleS = sprite('rgba(245,166,35,1)');
  var hotS    = sprite('rgba(255,40,20,1)');
  var tintCache = {};
  function tint(hex) {
    if (!tintCache[hex]) tintCache[hex] = sprite(hexToRgba(hex, 1));
    return tintCache[hex];
  }

  // ---------- particles ----------
  var N = isMobile ? 320 : 760;
  var P = [];
  (function () {
    for (var i = 0; i < N; i++) {
      var r = Math.random();
      P.push({
        x: 0, y: 0, tx: 0, ty: 0,
        k: rand(0.03, 0.08),
        size: rand(0.9, 2.4),
        phase: rand(0, TAU),
        speed: rand(0.4, 1.0),
        base: r < 0.40 ? emberS : (r < 0.52 ? flameS : (r < 0.94 ? whiteS : candleS)),
        sprite: null,
        seed: Math.random(),
        alpha: 0, baseAlpha: 1, sizeMul: 1, fast: false,
        role: 0, u: 0
      });
    }
    P.forEach(function (p) { p.sprite = p.base; });
  })();

  var sceneName = 'setup';
  var sceneT0 = 0;
  var board = {};
  var frameCount = 0;

  var Q = function () {
    return window.MKQuiz || { scene: 'setup', teams: [], clock: 1, clockDone: false, spent: 0, total: 30, picked: 0 };
  };

  // ---------- geometry read from the DOM ----------
  // The light has to land exactly where the interface is, so positions come
  // from real element rects rather than guesses about the layout.
  function centresOf(sel) {
    var out = [];
    var nodes = document.querySelectorAll(sel);
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect();
      if (r.width || r.height) out.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, r: r });
    }
    return out;
  }
  function centreOf(sel) { return centresOf(sel)[0] || null; }

  // ---------- layouts ----------
  var layouts = {};

  // teams gather, one cluster each, in their own colour
  layouts.setup = function () {
    var teams = Q().teams;
    var n = Math.max(1, teams.length);
    board.sig = teams.map(function (t) { return t.hex; }).join(',');
    board.centres = [];
    for (var i = 0; i < n; i++) {
      board.centres.push({
        x: W * ((i + 1) / (n + 1)),
        y: H * 0.62,
        hex: teams[i] ? teams[i].hex : null
      });
    }
    P.forEach(function (p, i) {
      p.role = i % n;
      p.u = rand(0, TAU);
      p.rad = rand(0.03, 0.13) * MN;
      p.baseAlpha = rand(0.35, 0.85);
      p.sizeMul = rand(0.7, 1.2);
      p.fast = false;
      var c = board.centres[p.role];
      p.sprite = c.hex ? tint(c.hex) : p.base;
    });
  };

  // a slow field of motes, one per category, brightening as picks land
  layouts.pick = function () {
    P.forEach(function (p, i) {
      p.u = rand(0, TAU);
      p.hx = rand(0.06, 0.94) * W;
      p.hy = rand(0.10, 0.92) * H;
      p.rad = rand(6, 26);
      p.baseAlpha = rand(0.07, 0.24);
      p.sizeMul = rand(0.5, 0.95);
      p.fast = false;
      p.sprite = p.base;
      p.role = i % 28;
    });
  };

  // a faint lattice behind the board, with embers rising through spent slots
  layouts.board = function () {
    var cols = 6, rows = 5;
    board.nodes = [];
    for (var c = 0; c < cols; c++) {
      for (var r = 0; r < rows; r++) {
        board.nodes.push({
          x: W * (0.08 + 0.84 * ((c + 0.5) / cols)),
          y: H * (0.20 + 0.56 * ((r + 0.5) / rows))
        });
      }
    }
    P.forEach(function (p, i) {
      if (i % 5 === 0) {           // risers: embers drifting up the screen
        p.role = 1;
        p.hx = rand(0.05, 0.95) * W;
        p.hy = rand(0, 1) * H;
        p.speed = rand(0.010, 0.030);
        p.baseAlpha = rand(0.16, 0.44);
        p.sizeMul = rand(0.5, 1.1);
        p.sprite = Math.random() < 0.7 ? emberS : candleS;
      } else {                     // lattice: sit near a grid node
        p.role = 0;
        var nd = board.nodes[i % board.nodes.length];
        p.hx = nd.x + rand(-26, 26);
        p.hy = nd.y + rand(-18, 18);
        p.baseAlpha = rand(0.05, 0.16);
        p.sizeMul = rand(0.4, 0.8);
        p.sprite = whiteS;
      }
      p.u = rand(0, TAU);
      p.fast = false;
    });
  };

  // the clock: a track of light around the whole screen edge, burning down
  layouts.question = function () {
    board.inset = Math.max(14, MN * 0.035);
    P.forEach(function (p, i) {
      p.u = i / P.length;               // position along the perimeter, 0..1
      p.role = 0;
      p.drop = rand(0.6, 1.6);
      p.baseAlpha = rand(0.7, 1);
      p.sizeMul = rand(0.7, 1.3);
      p.fast = false;
      p.sprite = emberS;
    });
  };

  // the answer lands: particles leave the edge and pool beneath it
  layouts.answer = function () {
    var a = centreOf('#q-answer-text');
    board.bandY = a ? a.r.bottom + Math.max(26, H * 0.045) : H * 0.78;
    board.bandW = a ? Math.min(a.r.width * 0.62, W * 0.42) : Math.min(W * 0.42, 620);
    P.forEach(function (p) {
      p.u = rand(0, 1);
      p.baseAlpha = rand(0.3, 0.9);
      p.sizeMul = rand(0.6, 1.3);
      p.fast = false;
      p.sprite = Math.random() < 0.62 ? emberS : flameS;
    });
  };

  // one rising column of light per team, in their colour
  layouts.award = function () {
    var teams = Q().teams;
    var tiles = centresOf('#scr-award .q-award-team');
    var n = Math.max(1, tiles.length || teams.length + 1);
    board.cols = [];
    for (var i = 0; i < n; i++) {
      board.cols.push({
        x: tiles[i] ? tiles[i].x : W * ((i + 0.5) / n),
        hex: teams[i] ? teams[i].hex : null
      });
    }
    P.forEach(function (p, i) {
      p.role = i % n;
      var c = board.cols[p.role];
      p.hx = c.x + rand(-W * 0.035, W * 0.035);
      p.hy = rand(0, 1) * H;
      p.speed = rand(0.012, 0.034);
      p.baseAlpha = c.hex ? rand(0.3, 0.8) : rand(0.06, 0.2);
      p.sizeMul = rand(0.5, 1.1);
      p.fast = false;
      p.sprite = c.hex ? tint(c.hex) : whiteS;
    });
  };

  // three plateaus, the winner's blooming upward
  layouts.podium = function () {
    var teams = Q().teams.slice().sort(function (a, b) { return b.score - a.score; });
    var order = teams.length >= 3 ? [teams[1], teams[0], teams[2]]
              : teams.length === 2 ? [teams[1], teams[0]] : teams;
    var heights = teams.length >= 3 ? [0.74, 1.0, 0.56] : (teams.length === 2 ? [0.74, 1.0] : [1.0]);
    var cards = centresOf('#q-podium .q-step');
    order = order.filter(Boolean);
    board.steps = order.map(function (tm, i) {
      var n = order.length;
      var card = cards[i];
      return {
        x: card ? card.x : W * ((i + 0.5) / n),
        top: card ? card.r.top : H * (0.88 - 0.42 * heights[i]),
        w: card ? card.r.width : W * 0.12,
        hex: tm ? tm.hex : '#6b6b74',
        win: heights[i] === 1
      };
    });
    if (!board.steps.length) { P.forEach(function (p) { p.alpha = 0; }); return; }
    P.forEach(function (p, i) {
      p.role = i % board.steps.length;
      var st = board.steps[p.role];
      p.hx = st.x + rand(-1, 1) * (st.w ? st.w * 0.42 : W * 0.06);
      p.hy = st.top + rand(-8, H * 0.34);
      p.u = rand(0, TAU);
      p.speed = rand(0.008, 0.026);
      p.baseAlpha = st.win ? rand(0.4, 0.95) : rand(0.14, 0.4);
      p.sizeMul = st.win ? rand(0.8, 1.5) : rand(0.5, 0.9);
      p.fast = false;
      p.sprite = tint(st.hex);
    });
  };

  var settleTimer = null;
  function layoutScene(name) {
    board = {};
    if (layouts[name]) layouts[name]();
    sceneT0 = performance.now();
    // The podium steps rise into place; read their rects again once they land,
    // otherwise the light is aimed at where the cards started, not where they are.
    clearTimeout(settleTimer);
    if (name === 'podium') {
      settleTimer = setTimeout(function () {
        if (sceneName === 'podium' && layouts.podium) {
          var keep = sceneT0;
          board = {};
          layouts.podium();
          sceneT0 = keep;
        }
      }, 1100);
    }
  }

  // ---------- point on the screen-edge track, 0..1 clockwise from top centre ----------
  function trackPoint(u) {
    var m = board.inset || 20;
    var w = W - m * 2, h = H - m * 2;
    var per = 2 * (w + h);
    var d = ((u % 1) + 1) % 1 * per;
    var half = w / 2;
    if (d < half) return { x: W / 2 + d, y: m };
    d -= half;
    if (d < h) return { x: W - m, y: m + d };
    d -= h;
    if (d < w) return { x: W - m - d, y: H - m };
    d -= w;
    if (d < h) return { x: m, y: H - m - d };
    d -= h;
    return { x: m + d, y: m };
  }

  // ---------- award burst ----------
  var burst = null;
  function takeBurst() {
    var b = Q().burst;
    if (!b) return;
    window.MKQuiz.burst = null;
    var target = b.teamId != null
      ? centreOf('#q-scores .q-flaps[data-team="' + b.teamId + '"]') : null;
    burst = {
      t0: performance.now(),
      x: target ? target.x : W / 2,
      y: target ? target.y : H * 0.88,
      hex: b.hex
    };
    P.forEach(function (p) {
      if (Math.random() < 0.45) {
        p.role = 99;
        p.fast = true;
        p.sprite = tint(b.hex);
        p.baseAlpha = 1;
        p.sizeMul = rand(0.9, 1.8);
      }
    });
  }

  // ---------- per-frame targets ----------
  function targets(t) {
    var te = t - sceneT0;
    var q = Q();
    takeBurst();

    if (burst) {
      var age = t - burst.t0;
      if (age > 1150) {
        burst = null;
        layoutScene(sceneName);
      }
    }

    // teams changed while on setup: re-cluster
    if (sceneName === 'setup') {
      var sig = q.teams.map(function (x) { return x.hex; }).join(',');
      if (sig !== board.sig) layoutScene('setup');
    }

    for (var i = 0; i < P.length; i++) {
      var p = P[i];

      if (p.role === 99 && burst) {
        p.tx = burst.x + rand(-26, 26);
        p.ty = burst.y + rand(-20, 20);
        p.alpha = p.baseAlpha * clamp01(1 - (t - burst.t0) / 1150);
        continue;
      }

      switch (sceneName) {

        case 'setup': {
          var c = board.centres[p.role] || { x: W / 2, y: H / 2 };
          var a = p.u + t * 0.00022 * (0.6 + p.seed);
          var br = p.rad * (1 + 0.16 * Math.sin(t * 0.0009 + p.phase));
          p.tx = c.x + Math.cos(a) * br;
          p.ty = c.y + Math.sin(a) * br * 0.62;
          p.alpha = p.baseAlpha * (0.72 + 0.28 * Math.sin(t * 0.0016 + p.phase));
          break;
        }

        case 'pick': {
          p.tx = p.hx + Math.cos(t * 0.00035 + p.u) * p.rad;
          p.ty = p.hy + Math.sin(t * 0.00028 + p.u) * p.rad;
          var lit = p.role < q.picked * 6;   // picks light up a share of the field
          p.alpha = p.baseAlpha * (lit ? 2.4 : 1) * (0.7 + 0.3 * Math.sin(t * 0.0013 + p.phase));
          p.sprite = lit ? emberS : p.base;
          break;
        }

        case 'board': {
          if (p.role === 1) {
            var frac = q.spent / Math.max(1, q.total);
            p.hy -= (0.6 + 2.4 * frac) * p.speed * 26;
            if (p.hy < -20) { p.hy = H + rand(0, 60); p.hx = rand(0.05, 0.95) * W; }
            p.tx = p.hx + Math.sin(t * 0.0008 + p.phase) * 16;
            p.ty = p.hy;
            p.alpha = p.baseAlpha * (0.35 + 0.9 * frac) * (0.6 + 0.4 * Math.sin(t * 0.002 + p.phase));
          } else {
            p.tx = p.hx + Math.cos(t * 0.0004 + p.u) * 7;
            p.ty = p.hy + Math.sin(t * 0.0005 + p.u) * 5;
            p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0011 + p.phase));
          }
          break;
        }

        case 'question': {
          var left = clamp01(q.clock);
          var lit2 = p.u <= left;
          var pt = trackPoint(p.u);
          if (lit2) {
            p.tx = pt.x + Math.cos(t * 0.002 + p.phase) * 2.2;
            p.ty = pt.y + Math.sin(t * 0.002 + p.phase) * 2.2;
            var urgent = left < 0.3;
            p.sprite = urgent ? hotS : emberS;
            p.sizeMul = urgent ? 1.5 : 1;
            p.alpha = p.baseAlpha * (urgent ? (0.7 + 0.5 * Math.sin(t * 0.012 + p.phase)) : 1);
          } else {
            // burnt: fall inward and fade out
            var over = clamp01((p.u - left) * 5);
            p.tx = pt.x + (W / 2 - pt.x) * 0.12 * over;
            p.ty = pt.y + (H / 2 - pt.y) * 0.12 * over + over * 40 * p.drop;
            p.alpha = p.baseAlpha * (1 - over) * 0.5;
          }
          if (q.clockDone) {
            var pulse = 0.5 + 0.5 * Math.sin(t * 0.006);
            var pt2 = trackPoint(p.u);
            p.tx = pt2.x; p.ty = pt2.y;
            p.sprite = hotS;
            p.sizeMul = 1.1 + 0.5 * pulse;
            p.alpha = 0.10 + 0.30 * pulse;
          }
          break;
        }

        case 'answer': {
          var bandY = board.bandY || H * 0.78;
          var spread = board.bandW || Math.min(W * 0.42, 620);
          var xx = W / 2 + (p.u - 0.5) * 2 * spread;
          var settle = clamp01(te / 900);
          p.tx = xx + Math.sin(t * 0.0011 + p.phase) * 12;
          p.ty = bandY + Math.sin(p.u * 9 + t * 0.0013) * 16 * (1 - settle * 0.55)
                 + (1 - settle) * rand(-2, 2);
          var edge = 1 - Math.abs(p.u - 0.5) * 2;
          p.alpha = p.baseAlpha * settle * (0.25 + 0.75 * edge);
          break;
        }

        case 'award': {
          p.hy -= p.speed * 24;
          if (p.hy < -20) p.hy = H + rand(0, 50);
          p.tx = p.hx + Math.sin(t * 0.0009 + p.phase) * 12;
          p.ty = p.hy;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0018 + p.phase));
          break;
        }

        case 'podium': {
          var st = board.steps && board.steps[p.role];
          if (!st) { p.alpha = 0; break; }
          p.hy -= p.speed * (st.win ? 22 : 11);
          if (p.hy < st.top - H * 0.30) p.hy = H * 0.90 + rand(0, 30);
          p.tx = p.hx + Math.sin(t * 0.0011 + p.phase) * (st.win ? 16 : 8);
          p.ty = p.hy;
          var above = clamp01((st.top - p.hy) / (H * 0.3));
          p.alpha = p.baseAlpha * (1 - above * 0.75) * (0.6 + 0.4 * Math.sin(t * 0.0017 + p.phase));
          break;
        }

        default:
          p.alpha = 0;
      }
    }
  }

  // ---------- structure: hairlines that carry meaning ----------
  function drawStructure(t) {
    var q = Q();

    if (sceneName === 'board' && board.nodes) {
      // column hairlines under the category heads
      ctx.strokeStyle = 'rgba(255,77,28,0.10)';
      ctx.lineWidth = 1;
      for (var c = 0; c < 6; c++) {
        var x = W * (0.08 + 0.84 * ((c + 0.5) / 6));
        ctx.beginPath();
        ctx.moveTo(x, H * 0.16);
        ctx.lineTo(x, H * 0.80);
        ctx.stroke();
      }
    }

    if (sceneName === 'question') {
      // the unburnt part of the track, drawn as a bright line
      var left = clamp01(q.clock);
      if (left > 0 && !q.clockDone) {
        ctx.strokeStyle = left < 0.3 ? 'rgba(255,40,20,0.55)' : 'rgba(255,77,28,0.34)';
        ctx.lineWidth = left < 0.3 ? 3 : 2;
        ctx.beginPath();
        var steps = 120, started = false;
        for (var s = 0; s <= steps; s++) {
          var u = (s / steps) * left;
          var pt = trackPoint(u);
          if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }
    }

    if (sceneName === 'podium' && board.steps) {
      ctx.lineWidth = 1;
      board.steps.forEach(function (st) {
        ctx.strokeStyle = hexToRgba(st.hex, st.win ? 0.34 : 0.14);
        ctx.beginPath();
        var hw = (st.w ? st.w : W * 0.14) * 0.5;
        ctx.moveTo(st.x - hw, st.top);
        ctx.lineTo(st.x + hw, st.top);
        ctx.stroke();
      });
    }
  }

  // ---------- render ----------
  function render(t) {
    targets(t);
    ctx.fillStyle = 'rgba(5,5,5,0.45)';
    ctx.fillRect(0, 0, W, H);
    if (frameCount % 7 === 0) {
      ctx.fillStyle = 'rgba(5,5,5,0.2)';
      ctx.fillRect(0, 0, W, H);
    }
    frameCount++;
    ctx.globalCompositeOperation = 'lighter';
    drawStructure(t);
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      var k = p.fast ? 0.30 : p.k;
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
      var s = p.size * 6.2 * p.sizeMul;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * 2.1));
      ctx.drawImage(p.sprite || p.base, p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function staticFrame() {
    targets(sceneT0 + 3200);
    for (var i = 0; i < P.length; i++) { P[i].x = P[i].tx; P[i].y = P[i].ty; }
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    drawStructure(sceneT0 + 3200);
    for (var j = 0; j < P.length; j++) {
      var p = P[j], s = p.size * 6.2 * p.sizeMul;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * 2.1));
      ctx.drawImage(p.sprite || p.base, p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  var rafId = null, last = 0;
  function frame(t) {
    rafId = requestAnimationFrame(frame);
    var dt = Math.min(50, t - last);
    if (dt < 15) return;
    last = t;
    render(t);
  }
  function start() {
    if (reducedMotion) { staticFrame(); return; }
    if (rafId === null) { last = 0; rafId = requestAnimationFrame(frame); }
  }
  function stop() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  // ---------- scene switching, driven by the game ----------
  window.addEventListener('mk-scene', function (e) {
    var name = e.detail;
    if (!name || name === sceneName) return;
    sceneName = name;
    layoutScene(name);
    if (reducedMotion) staticFrame();
  });

  // ---------- resize ----------
  function resize() {
    isMobile = window.matchMedia('(max-width: 720px)').matches;
    W = window.innerWidth; H = window.innerHeight;
    MN = Math.min(W, H);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
    if (sceneName) layoutScene(sceneName);
    if (reducedMotion && sceneName) staticFrame();
  }
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  // ---------- boot ----------
  resize();
  layoutScene(sceneName);
  P.forEach(function (p) {
    p.x = W / 2 + rand(-90, 90);
    p.y = H / 2 + rand(-60, 60);
  });
  start();
})();
