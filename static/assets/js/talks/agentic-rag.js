/* ============================================================
   MKLab Living Canvas: Agentic RAG edition
   One particle system behind the whole deck. Slides declare a
   scene via <section data-scene="...">; scrolling morphs the
   same lights from one scene into the next.
   Scenes: title, born, memory, limits, embed, search, augment,
   agentic, versus, full, where, laptop, outro.
   Based on mklab.se assets/js/canvas.js. No dependencies.
   Decorative only (canvas is aria-hidden).
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('mk-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (typeof ctx.roundRect !== 'function') {
    ctx.roundRect = function (x, y, w, h, r) {
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
    };
  }

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 720px)').matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var W = 0, H = 0, MN = 0;
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var fract = function (x) { return x - Math.floor(x); };
  var clamp01 = function (x) { return x < 0 ? 0 : (x > 1 ? 1 : x); };
  var easeInOut = function (t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  // window helper: -1 outside [a,b], else 0..1 progress inside
  var win = function (prog, a, b) {
    if (prog < a || prog > b) return -1;
    return (prog - a) / (b - a);
  };
  var bell = function (u) { return Math.sin(Math.PI * u); };

  // ---------- Glow sprites ----------
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
  var emberS = sprite('rgba(255,77,28,1)');
  var flameS = sprite('rgba(255,138,102,1)');
  var whiteS = sprite('rgba(215,215,225,1)');
  var candleS = sprite('rgba(245,166,35,1)');

  // ---------- Particles ----------
  var N = isMobile ? 340 : 820;
  var P = [];
  (function () {
    for (var i = 0; i < N; i++) {
      var r = Math.random();
      P.push({
        x: 0, y: 0, tx: 0, ty: 0,
        k: rand(0.03, 0.08),
        size: rand(0.9, 2.4),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.4, 1.0),
        sprite: r < 0.40 ? emberS : (r < 0.52 ? flameS : (r < 0.94 ? whiteS : candleS)),
        ember: r < 0.52,
        candle: r >= 0.94,
        seed: Math.random(),
        alpha: 0, baseAlpha: 1, sizeMul: 1, fast: false
      });
    }
  })();

  // ---------- Shared scene state ----------
  var sceneName = null;
  var sceneFade = 1;
  var sceneT0 = 0;
  var board = {};          // per-scene geometry + choreography state
  var links = [];          // [ [i, j], ... ] particle index pairs

  // ---------- Glyph sampling ----------
  function sampleText(txt, S) {
    var off = document.createElement('canvas');
    off.width = off.height = S;
    var oc = off.getContext('2d');
    oc.fillStyle = '#fff';
    oc.font = '700 ' + Math.floor(S * 0.78) + 'px "Hanken Grotesk", "Helvetica Neue", Arial, sans-serif';
    oc.textAlign = 'center'; oc.textBaseline = 'middle';
    oc.fillText(txt, S / 2, S / 2 + S * 0.03);
    var data = oc.getImageData(0, 0, S, S).data;
    var pts = [];
    for (var y = 0; y < S; y += 2) {
      for (var x = 0; x < S; x += 2) {
        if (data[(y * S + x) * 4 + 3] > 120) pts.push([x / S, y / S]);
      }
    }
    return pts;
  }

  // ---------- Logo intro ----------
  var logoPts = null, logoPhase = 'off', logoT0 = 0;
  var wantIntro = false;
  var logoImg = new Image();
  if (canvas.getAttribute('data-logo-src')) {
    logoImg.src = canvas.getAttribute('data-logo-src');
    logoImg.onload = function () {
      var S = 220, off = document.createElement('canvas');
      off.width = off.height = S;
      var oc = off.getContext('2d');
      oc.drawImage(logoImg, 0, 0, S, S);
      var data = oc.getImageData(0, 0, S, S).data;
      var pts = [];
      for (var y = 0; y < S; y += 2) {
        for (var x = 0; x < S; x += 2) {
          if (data[(y * S + x) * 4 + 3] > 120) pts.push([x / S, y / S]);
        }
      }
      logoPts = pts;
      if (wantIntro) startIntro();
      if (sceneName === 'outro') layoutScene('outro');
    };
  }

  function startIntro() {
    if (!logoPts || reducedMotion) return;
    document.body.classList.add('mk-intro-running');
    logoPhase = 'assemble'; logoT0 = performance.now();
    startIntroPositions();
    P.forEach(function (p) {
      p.baseAlpha = rand(0.6, 1);
      p.sizeMul = rand(0.38, 0.62);
    });
  }
  function endIntro() {
    document.body.classList.remove('mk-intro-running');
    if (logoPhase === 'assemble' || logoPhase === 'hold') {
      logoPhase = 'off';
      layoutScene(sceneName);
    }
  }
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
    window.addEventListener(ev, endIntro, { passive: true });
  });
  function startIntroPositions() {
    if (!logoPts) return;
    var box = Math.min(W, H) * (isMobile ? 0.62 : 0.5);
    var ox = W / 2 - box / 2, oy = H * 0.44 - box / 2;
    P.forEach(function (p) {
      var q = logoPts[Math.floor(p.seed * (logoPts.length - 1))];
      p.lx = ox + q[0] * box + rand(-1.5, 1.5);
      p.ly = oy + q[1] * box + rand(-1.5, 1.5);
    });
  }

  // ---------- Geometry helpers ----------
  function makePath(x0, y0, x1, y1, bendMul) {
    var dx = x1 - x0, dy = y1 - y0;
    var dist = Math.hypot(dx, dy) || 1;
    var px = -dy / dist, py = dx / dist;
    var bend = dist * (bendMul === undefined ? 0.1 : bendMul);
    return {
      p0: [x0, y0], p1: [x1, y1],
      c0: [x0 + dx * 0.3 + px * bend * 0.6, y0 + dy * 0.3 + py * bend * 0.6],
      c1: [x0 + dx * 0.72 + px * bend, y0 + dy * 0.72 + py * bend]
    };
  }
  function bezier(w, t) {
    var u = 1 - t;
    return [
      u * u * u * w.p0[0] + 3 * u * u * t * w.c0[0] + 3 * u * t * t * w.c1[0] + t * t * t * w.p1[0],
      u * u * u * w.p0[1] + 3 * u * u * t * w.c0[1] + 3 * u * t * t * w.c1[1] + t * t * t * w.p1[1]
    ];
  }
  function chainPos(paths, s) {
    var n = paths.length;
    var i = Math.min(n - 1, Math.floor(s * n));
    return bezier(paths[i], clamp01(s * n - i));
  }
  function strokePath(pth, style, width) {
    ctx.strokeStyle = style; ctx.lineWidth = width || 1;
    ctx.beginPath();
    ctx.moveTo(pth.p0[0], pth.p0[1]);
    ctx.bezierCurveTo(pth.c0[0], pth.c0[1], pth.c1[0], pth.c1[1], pth.p1[0], pth.p1[1]);
    ctx.stroke();
  }

  // 3D: rotate around Y axis, project with perspective
  function proj(sp, v, az) {
    var ca = Math.cos(az), sa = Math.sin(az);
    var x = v[0] * ca + v[2] * sa;
    var z = -v[0] * sa + v[2] * ca;
    var f = sp.persp / (sp.persp + z);
    return [sp.cx + x * sp.scale * f, sp.cy - v[1] * sp.scale * f, f];
  }
  function vecDirs(count, seedOff) {
    // deterministic spread of unit-ish directions (golden angle)
    var out = [];
    for (var i = 0; i < count; i++) {
      var a = (i + (seedOff || 0)) * 2.3999632;
      var e = Math.sin((i + 1) * 12.9898 + (seedOff || 0)) * 0.75;
      var ce = Math.cos(e);
      var len = 0.5 + fract(Math.sin((i + 3) * 78.233) * 43758.5) * 0.45;
      out.push([Math.cos(a) * ce * len, Math.sin(e) * 0.9 * len, Math.sin(a) * ce * len]);
    }
    return out;
  }
  function vdot(a, b) {
    var la = Math.hypot(a[0], a[1], a[2]) || 1;
    var lb = Math.hypot(b[0], b[1], b[2]) || 1;
    return (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb);
  }

  function buildLinks(idx, positions) {
    var out = [];
    idx.forEach(function (i, a) {
      var best1 = -1, best2 = -1, d1 = Infinity, d2 = Infinity;
      for (var b = 0; b < idx.length; b++) {
        if (b === a) continue;
        var j = idx[b];
        var d = Math.pow(positions[i][0] - positions[j][0], 2) +
                Math.pow(positions[i][1] - positions[j][1], 2);
        if (d < d1) { d2 = d1; best2 = best1; d1 = d; best1 = j; }
        else if (d < d2) { d2 = d; best2 = j; }
      }
      if (best1 >= 0 && i < best1) out.push([i, best1]);
      if (best2 >= 0 && i < best2) out.push([i, best2]);
    });
    return out;
  }

  // Assign brain-cluster home inside an ellipse around c = {x, y, r}
  function brainHome(p, c) {
    var a = rand(0, Math.PI * 2);
    var d = Math.pow(Math.random(), 0.55);
    p.hx = c.x + Math.cos(a) * d * c.r * 1.12;
    p.hy = c.y + Math.sin(a) * d * c.r * 0.82;
  }
  function brainLinksFor(pred, cap) {
    var idx = [];
    for (var i = 0; i < N; i++) if (pred(P[i])) idx.push(i);
    if (idx.length > cap) {
      var step = idx.length / cap;
      var s = [];
      for (var k = 0; k < cap; k++) s.push(idx[Math.floor(k * step)]);
      idx = s;
    }
    var pos = {};
    idx.forEach(function (i) { pos[i] = [P[i].hx, P[i].hy]; });
    return buildLinks(idx, pos);
  }
  function brainTarget(p, t, agit) {
    var amp = 2.6 + agit * 7;
    var sp = 1 + agit * 2.2;
    p.tx = p.hx + Math.sin(t * 0.0007 * p.speed * sp + p.phase) * amp;
    p.ty = p.hy + Math.cos(t * 0.0006 * p.speed * sp + p.phase * 1.7) * amp * 0.8;
    p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * (0.0012 + agit * 0.002) * p.speed + p.phase))
      * (0.75 + agit * 0.5);
  }

  // ---------- Scene layouts ----------
  var layouts = {};

  // -- title: quiet constellation on the flanks, copy owns the center
  layouts.title = function () {
    links = [];
    var CC = [];
    var nc = 7;
    for (var c = 0; c < nc; c++) {
      var fx = (c % 2 === 0) ? rand(0.04, 0.24) : rand(0.72, 0.95);
      CC.push({
        x: W * fx, y: H * rand(0.10, 0.90),
        r: MN * rand(0.06, 0.13),
        bright: c === 1
      });
    }
    var members = CC.map(function () { return []; });
    P.forEach(function (p, i) {
      if (p.seed < 0.55) {
        var ci = Math.floor(p.seed / 0.55 * nc) % nc;
        var a = rand(0, Math.PI * 2), d = Math.pow(Math.random(), 0.6) * CC[ci].r;
        p.mode = 'cl';
        p.hx = CC[ci].x + Math.cos(a) * d;
        p.hy = CC[ci].y + Math.sin(a) * d;
        p.baseAlpha = CC[ci].bright ? rand(0.7, 1) : rand(0.4, 0.9);
        p.sizeMul = rand(0.8, 1.3);
        members[ci].push(i);
      } else if (p.seed < 0.9) {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.08, 0.3); p.sizeMul = rand(0.4, 0.8);
      } else {
        p.mode = 'bokeh';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.05, 0.95);
        p.baseAlpha = rand(0.06, 0.16); p.sizeMul = rand(2.6, 4.2);
      }
    });
    var pos = P.map(function (p) { return [p.hx, p.hy]; });
    members.forEach(function (m) {
      links = links.concat(buildLinks(m, pos));
    });
    board.labels = [];
  };

  // -- born: Rag assembles on the left, the LLM brain wakes on the
  // -- right, first words travel between them
  layouts.born = function () {
    var rag = { x: W * (isMobile ? 0.30 : 0.47), y: H * 0.58, r: MN * 0.055 };
    var llm = { x: W * (isMobile ? 0.72 : 0.78), y: H * 0.40, r: MN * 0.15 };
    board = {
      rag: rag, llm: llm,
      pth: makePath(rag.x + rag.r * 1.4, rag.y - rag.r * 0.4, llm.x - llm.r * 0.9, llm.y + llm.r * 0.4, 0.16),
      labels: [
        { x: rag.x, y: rag.y + rag.r * 2.4, text: 'NORM', after: 600 },
        { x: llm.x, y: llm.y + llm.r * 1.35, text: 'LLM · THE BRAIN', after: 2400 }
      ]
    };
    P.forEach(function (p) {
      if (p.seed < 0.24) {
        p.mode = 'rag';
        p.r2 = Math.pow(Math.random(), 0.7) * rag.r * 0.62;
        p.baseAlpha = rand(0.35, 0.95);
        p.sizeMul = rand(0.35, 0.7);
        p.fast = false;
      } else if (p.seed < 0.60) {
        p.mode = 'brain';
        brainHome(p, llm);
        p.baseAlpha = p.ember ? rand(0.35, 0.9) : rand(0.2, 0.6);
        p.sizeMul = rand(0.35, 0.75);
        p.fast = false;
      } else if (p.seed < 0.70) {
        p.mode = 'pulse';
        p.dir = p.seed < 0.65 ? 1 : -1;
        p.off = rand(0, 0.14);
        p.baseAlpha = rand(0.4, 0.9);
        p.sizeMul = rand(0.3, 0.55);
        p.fast = true;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.16); p.sizeMul = rand(0.4, 1.2);
        p.fast = false;
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 70);
  };

  // -- memory: a layer appears between Rag and the LLM; the session
  // -- history accumulates inside it and rides along on every call
  layouts.memory = function () {
    var rag = { x: W * (isMobile ? 0.18 : 0.45), y: H * 0.58, r: MN * 0.05 };
    var api = { x: W * (isMobile ? 0.5 : 0.60), y: H * 0.46, w: MN * 0.085, h: MN * 0.12 };
    var llm = { x: W * (isMobile ? 0.82 : 0.80), y: H * 0.58, r: MN * 0.115 };
    board = {
      rag: rag, api: api, llm: llm,
      chainOut: [
        makePath(rag.x + rag.r * 1.4, rag.y - rag.r * 0.5, api.x - api.w * 0.8, api.y + api.h * 0.4, -0.12),
        makePath(api.x + api.w * 0.8, api.y + api.h * 0.2, llm.x - llm.r * 0.8, llm.y - llm.r * 0.3, 0.12)
      ],
      labels: [
        { x: rag.x, y: rag.y + rag.r * 2.5, text: 'NORM' },
        { x: api.x, y: api.y + api.h * 1.05, text: 'API · SESSION MEMORY' },
        { x: llm.x, y: llm.y + llm.r * 1.4, text: 'LLM' }
      ]
    };
    board.chainBack = [
      makePath(llm.x - llm.r * 0.8, llm.y - llm.r * 0.5, api.x + api.w * 0.8, api.y - api.h * 0.1, 0.14),
      makePath(api.x - api.w * 0.8, api.y - api.h * 0.2, rag.x + rag.r * 1.4, rag.y - rag.r * 0.9, 0.14)
    ];
    var memSlots = 24;
    P.forEach(function (p, i) {
      if (p.seed < 0.16) {
        p.mode = 'rag';
        p.r2 = Math.pow(Math.random(), 0.7) * rag.r * 0.62;
        p.baseAlpha = rand(0.35, 0.95); p.sizeMul = rand(0.35, 0.7); p.fast = false;
      } else if (p.seed < 0.44) {
        p.mode = 'brain';
        brainHome(p, llm);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.18, 0.55);
        p.sizeMul = rand(0.35, 0.7); p.fast = false;
      } else if (p.seed < 0.60) {
        p.mode = 'mem';
        p.mi = i % memSlots;
        var row = p.mi % 6, col = Math.floor(p.mi / 6);
        p.hx = api.x - api.w * 0.42 + (col + 0.5) * (api.w * 0.84 / 4) + rand(-2, 2);
        p.hy = api.y + api.h * 0.42 - (row + 0.5) * (api.h * 0.72 / 6) + rand(-1.5, 1.5);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.3, 0.5); p.fast = false;
      } else if (p.seed < 0.74) {
        p.mode = 'pulse';
        p.dir = p.seed < 0.67 ? 1 : -1;
        p.off = rand(0, 0.1);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.15); p.sizeMul = rand(0.4, 1.2); p.fast = false;
      }
    });
    board.memSlots = memSlots;
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 56);
  };

  // -- limits: the LLM reaches for the company's private data and is
  // -- stopped at the boundary; the wall of documents stays dark
  layouts.limits = function () {
    var llm = { x: W * (isMobile ? 0.5 : 0.485), y: H * 0.42, r: MN * 0.13 };
    var wall = { x0: W * (isMobile ? 0.62 : 0.70), x1: W * 0.96, y0: H * 0.14, y1: H * 0.86 };
    var bx = W * (isMobile ? 0.57 : 0.63);
    board = {
      llm: llm, wall: wall, bx: bx,
      qpts: sampleText('?', 160),
      qc: { x: bx, y: H * 0.26, r: MN * 0.07 },
      labels: [
        { x: llm.x, y: llm.y - llm.r * 1.45, text: 'LLM · PUBLIC TRAINING DATA ONLY' },
        { x: (wall.x0 + wall.x1) / 2, y: wall.y1 + 24, text: 'YOUR PRIVATE DATA · PETABYTES' }
      ]
    };
    var rows = 14, cols = 16;
    P.forEach(function (p, i) {
      if (p.seed < 0.30) {
        p.mode = 'brain';
        brainHome(p, llm);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.18, 0.55);
        p.sizeMul = rand(0.35, 0.7); p.fast = false;
      } else if (p.seed < 0.72) {
        p.mode = 'doc';
        var gi = i % (rows * cols);
        var r = gi % rows, c = Math.floor(gi / rows);
        p.hx = wall.x0 + (c + 0.5) * (wall.x1 - wall.x0) / cols + rand(-2, 2);
        p.hy = wall.y0 + (r + 0.5) * (wall.y1 - wall.y0) / rows + rand(-2, 2);
        p.baseAlpha = rand(0.12, 0.34); p.sizeMul = rand(0.4, 0.75); p.fast = false;
      } else if (p.seed < 0.80) {
        p.mode = 'glyph';
        var q = board.qpts[Math.floor((p.seed - 0.72) / 0.08 * (board.qpts.length - 1))];
        p.hx = board.qc.x - board.qc.r + q[0] * board.qc.r * 2;
        p.hy = board.qc.y - board.qc.r + q[1] * board.qc.r * 2;
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.32, 0.58); p.fast = false;
      } else if (p.seed < 0.90) {
        p.mode = 'pulse';
        p.off = rand(0, 1);
        p.dur = rand(1400, 2400);
        p.ty0 = rand(0.2, 0.8);
        p.baseAlpha = rand(0.5, 1); p.sizeMul = rand(0.32, 0.58); p.fast = true;
      } else if (p.seed < 0.96) {
        p.mode = 'bar';
        p.hx = bx + rand(-2.5, 2.5);
        p.hy = H * rand(0.10, 0.90);
        p.baseAlpha = rand(0.4, 0.95); p.sizeMul = rand(0.3, 0.6); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.14); p.sizeMul = rand(0.4, 1.2); p.fast = false;
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 60);
  };

  // -- embed: a document is chunked, each chunk passes through the
  // -- embedding model and lands as a vector in 3D meaning space
  layouts.embed = function () {
    var doc = { x: W * (isMobile ? 0.24 : 0.15), y: H * 0.36, w: MN * 0.18, h: MN * 0.26 };
    var mdl = { x: W * (isMobile ? 0.5 : 0.42), y: H * 0.36, w: MN * 0.14, h: MN * 0.13 };
    var sp = { cx: W * (isMobile ? 0.66 : 0.75), cy: H * 0.38, scale: MN * 0.26, persp: 3.2 };
    var K = 8, rowsN = 9;
    board = {
      doc: doc, mdl: mdl, sp: sp,
      K: K, rowsN: rowsN,
      cycle: 2600,
      dirs: vecDirs(K, 2),
      labels: [
        { x: doc.x, y: doc.y - doc.h * 0.5 - 24, text: 'DOCUMENT' },
        { x: mdl.x, y: mdl.y - mdl.h * 0.5 - 24, text: 'EMBEDDING MODEL' },
        { x: sp.cx, y: sp.cy + sp.scale * 1.22, text: 'VECTOR SPACE · MEANING' }
      ]
    };
    board.rowY = function (li) { return doc.y - doc.h / 2 + (li + 0.5) * doc.h / rowsN; };
    P.forEach(function (p, i) {
      if (p.seed < 0.24) {
        p.mode = 'doc';
        p.li = i % rowsN;
        var lw = 0.5 + fract(Math.sin(p.li * 91.7) * 437.5) * 0.42;
        p.hx = doc.x - doc.w * 0.42 + p.seed / 0.24 * doc.w * 0.84 * lw;
        p.hy = board.rowY(p.li) + rand(-1.2, 1.2);
        p.baseAlpha = rand(0.15, 0.5); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.30) {
        p.mode = 'model';
        p.baseAlpha = rand(0.15, 0.5); p.sizeMul = rand(0.3, 0.6); p.fast = false;
      } else if (p.seed < 0.42) {
        p.mode = 'chunk';
        p.off = rand(0, 0.06);
        p.s3 = rand(0.15, 1);
        p.baseAlpha = rand(0.5, 1); p.sizeMul = rand(0.32, 0.6); p.fast = true;
      } else if (p.seed < 0.68) {
        p.mode = 'store';
        p.v = i % K;
        p.s3 = rand(0.2, 1.05);
        p.j = [rand(-0.03, 0.03), rand(-0.03, 0.03), rand(-0.03, 0.03)];
        p.baseAlpha = rand(0.5, 0.95); p.sizeMul = rand(0.38, 0.68); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.14); p.sizeMul = rand(0.4, 1.2); p.fast = false;
      }
    });
    links = [];
  };

  // -- search: the question becomes a vector and finds its nearest
  // -- neighbours in a forest of meaning
  layouts.search = function () {
    var sp = { cx: W * (isMobile ? 0.5 : 0.60), cy: H * 0.46, scale: MN * 0.33, persp: 3.4 };
    var entry = { x: W * (isMobile ? 0.2 : 0.13), y: H * 0.84 };
    var mdl = { x: W * (isMobile ? 0.36 : 0.30), y: H * 0.76, w: MN * 0.09, h: MN * 0.08 };
    var M = 24;
    board = {
      sp: sp, entry: entry, mdl: mdl, M: M,
      cycle: 5600,
      dirs: vecDirs(M, 9),
      qdirs: vecDirs(5, 31),
      qpts: sampleText('?', 160),
      qr: MN * 0.045,
      pth: makePath(entry.x + 20, entry.y - 10, sp.cx, sp.cy, -0.22),
      cycIdx: -1, top: [],
      labels: [
        { x: entry.x, y: entry.y + 34, text: 'QUESTION' },
        { x: mdl.x, y: mdl.y + mdl.h * 0.62 + 18, text: 'EMBEDDING MODEL' },
        { x: sp.cx, y: sp.cy + sp.scale * 1.12, text: 'VECTOR SPACE' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.12) {
        p.mode = 'q';
        var g = board.qpts[Math.floor(p.seed / 0.12 * (board.qpts.length - 1))];
        p.gx = entry.x - board.qr + g[0] * board.qr * 2;
        p.gy = entry.y - board.qr * 2.4 + g[1] * board.qr * 2;
        p.off = rand(0, 0.05);
        p.s3 = rand(0.1, 1);
        p.baseAlpha = rand(0.5, 1); p.sizeMul = rand(0.3, 0.6); p.fast = true;
      } else if (p.seed < 0.68) {
        p.mode = 'forest';
        p.v = i % M;
        p.s3 = rand(0.25, 1.05);
        p.j = [rand(-0.025, 0.025), rand(-0.025, 0.025), rand(-0.025, 0.025)];
        p.baseAlpha = rand(0.25, 0.6); p.sizeMul = rand(0.28, 0.55); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.14); p.sizeMul = rand(0.4, 1.2); p.fast = false;
      }
    });
    links = [];
  };

  // -- augment: the found chunks are stitched into the prompt, the
  // -- richer prompt goes to the LLM, the answer comes back
  layouts.augment = function () {
    var cards = [];
    for (var c = 0; c < 3; c++) {
      cards.push({
        x: W * (isMobile ? 0.22 : 0.16),
        y: H * (0.24 + c * 0.15),
        w: MN * 0.15, h: MN * 0.06
      });
    }
    var pp = { x: W * (isMobile ? 0.52 : 0.47), y: H * 0.42, w: MN * 0.22, h: MN * 0.42 };
    var llm = { x: W * (isMobile ? 0.82 : 0.80), y: H * 0.36, r: MN * 0.105 };
    // prompt sections, top to bottom fractions of panel height
    var secs = [
      { name: 'SYSTEM', f0: 0, f1: 0.14 },
      { name: 'HISTORY', f0: 0.14, f1: 0.36 },
      { name: 'QUESTION', f0: 0.36, f1: 0.52 },
      { name: 'CONTEXT · RETRIEVED', f0: 0.52, f1: 1 }
    ];
    board = {
      cards: cards, pp: pp, llm: llm, secs: secs,
      cycle: 6400,
      toLLM: makePath(pp.x + pp.w * 0.55, pp.y - pp.h * 0.1, llm.x - llm.r * 0.9, llm.y, 0.1),
      back: makePath(llm.x - llm.r * 0.5, llm.y + llm.r * 0.9, W * 0.06, H * 0.86, 0.25),
      labels: [
        { x: cards[0].x, y: cards[0].y - cards[0].h * 0.62 - 12, text: 'RETRIEVED CHUNKS' },
        { x: pp.x, y: pp.y - pp.h * 0.55 - 12, text: 'THE PROMPT' },
        { x: llm.x, y: llm.y + llm.r * 1.45, text: 'LLM' }
      ]
    };
    function secY(si, f) {
      var s = secs[si];
      return pp.y - pp.h / 2 + (s.f0 + (s.f1 - s.f0) * f) * pp.h;
    }
    board.secY = secY;
    P.forEach(function (p, i) {
      if (p.seed < 0.12) {
        p.mode = 'card';
        p.ci = i % 3;
        var cd = cards[p.ci];
        p.hx = cd.x + rand(-cd.w * 0.42, cd.w * 0.42);
        p.hy = cd.y + rand(-cd.h * 0.36, cd.h * 0.36);
        p.baseAlpha = rand(0.3, 0.8); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.27) {
        p.mode = 'fly';
        p.ci = i % 3;
        var cd2 = cards[p.ci];
        p.fx = cd2.x + rand(-cd2.w * 0.4, cd2.w * 0.4);
        p.fy = cd2.y + rand(-cd2.h * 0.3, cd2.h * 0.3);
        p.dx = pp.x + rand(-pp.w * 0.4, pp.w * 0.4);
        p.dy = secY(3, 0.12 + p.ci * 0.28 + rand(0, 0.14));
        p.pth = makePath(p.fx, p.fy, p.dx, p.dy, rand(-0.2, 0.2));
        p.off = rand(0, 0.08);
        p.baseAlpha = rand(0.4, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.45) {
        p.mode = 'prow';
        p.si = [0, 1, 1, 2][i % 4];
        var rf = fract(p.seed * 57.3);
        p.hx = pp.x - pp.w * 0.4 + fract(p.seed * 113.7) * pp.w * 0.8 *
          (0.6 + 0.4 * fract(p.seed * 91.1));
        p.hy = secY(p.si, 0.2 + rf * 0.6);
        p.baseAlpha = rand(0.2, 0.55); p.sizeMul = rand(0.26, 0.45); p.fast = false;
      } else if (p.seed < 0.53) {
        p.mode = 'send';
        p.off = rand(0, 0.1);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.75) {
        p.mode = 'brain';
        brainHome(p, llm);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.18, 0.55);
        p.sizeMul = rand(0.35, 0.7); p.fast = false;
      } else if (p.seed < 0.87) {
        p.mode = 'ans';
        p.off = rand(0, 1);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.14); p.sizeMul = rand(0.4, 1.2); p.fast = false;
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 48);
  };

  // -- agentic: the vector database becomes a tool; the model decides
  // -- to search, reads the results, searches again, then answers
  layouts.agentic = function () {
    var entry = { x: W * (isMobile ? 0.12 : 0.42), y: H * 0.22 };
    var llm = { x: W * (isMobile ? 0.5 : 0.62), y: H * 0.44, r: MN * 0.14 };
    var vdb = { x: W * (isMobile ? 0.78 : 0.86), y: H * 0.74, w: MN * 0.085, h: MN * 0.12 };
    board = {
      entry: entry, llm: llm, vdb: vdb,
      cycle: 8600,
      inPth: makePath(entry.x, entry.y, llm.x - llm.r * 0.55, llm.y - llm.r * 0.55, 0.1),
      toolPth: makePath(llm.x + llm.r * 0.5, llm.y + llm.r * 0.6, vdb.x - vdb.w * 0.4, vdb.y - vdb.h * 0.55, 0.22),
      resPth: makePath(vdb.x - vdb.w * 0.7, vdb.y - vdb.h * 0.2, llm.x + llm.r * 0.2, llm.y + llm.r * 0.8, -0.22),
      ansPth: makePath(llm.x - llm.r * 0.8, llm.y - llm.r * 0.3, entry.x, entry.y + 10, -0.12),
      fan: vecDirs(3, 5),
      labels: [
        { x: entry.x, y: entry.y - 26, text: 'QUESTION IN · ANSWER OUT' },
        { x: llm.x, y: llm.y + llm.r * 1.4, text: 'AGENT · LLM' },
        { x: vdb.x, y: vdb.y + vdb.h * 1.0, text: 'VECTOR DB · A TOOL' }
      ]
    };
    P.forEach(function (p) {
      if (p.seed < 0.34) {
        p.mode = 'brain';
        brainHome(p, llm);
        p.baseAlpha = p.ember ? rand(0.3, 0.9) : rand(0.18, 0.58);
        p.sizeMul = rand(0.35, 0.72); p.fast = false;
      } else if (p.seed < 0.40) {
        p.mode = 'q';
        p.off = rand(0, 0.1);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.47) {
        p.mode = 'tool';
        p.off = rand(0, 0.08);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.54) {
        p.mode = 'res';
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.68) {
        p.mode = 'ans';
        p.off = rand(0, 1);
        p.baseAlpha = rand(0.3, 0.75); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.78) {
        p.mode = 'vdb';
        p.hx = vdb.x + rand(-vdb.w * 0.4, vdb.w * 0.4);
        p.hy = vdb.y + rand(-vdb.h * 0.36, vdb.h * 0.36);
        p.baseAlpha = rand(0.2, 0.6); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.15); p.sizeMul = rand(0.4, 1.2); p.fast = false;
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 66);
  };

  // -- versus: the same question served two ways; a fixed pipeline on
  // -- the left, a deciding loop on the right
  layouts.versus = function () {
    var q = { x: W * (isMobile ? 0.08 : 0.06), y: H * 0.30 };
    var sBox = { x: W * (isMobile ? 0.20 : 0.17), y: H * 0.30, w: MN * 0.085, h: MN * 0.075 };
    var pBox = { x: W * (isMobile ? 0.33 : 0.29), y: H * 0.30, w: MN * 0.085, h: MN * 0.075 };
    var llmL = { x: W * 0.41, y: H * 0.30, r: MN * 0.045 };
    var llmR = { x: W * 0.66, y: H * 0.26, r: MN * 0.055 };
    var vdb = { x: W * 0.88, y: H * 0.40, w: MN * 0.06, h: MN * 0.085 };
    board = {
      q: q, sBox: sBox, pBox: pBox, llmL: llmL, llmR: llmR, vdb: vdb,
      cycleL: 4200, cycleR: 8400,
      chainL: [
        makePath(q.x + 12, q.y, sBox.x - sBox.w * 0.6, sBox.y, 0.08),
        makePath(sBox.x + sBox.w * 0.6, sBox.y, pBox.x - pBox.w * 0.6, pBox.y, 0.08),
        makePath(pBox.x + pBox.w * 0.6, pBox.y, llmL.x - llmL.r * 1.1, llmL.y, 0.08)
      ],
      toolPth: makePath(llmR.x + llmR.r * 0.6, llmR.y + llmR.r * 0.6, vdb.x - vdb.w * 0.5, vdb.y - vdb.h * 0.5, 0.2),
      resPth: makePath(vdb.x - vdb.w * 0.8, vdb.y - vdb.h * 0.1, llmR.x + llmR.r * 0.3, llmR.y + llmR.r * 0.9, -0.2),
      labels: [
        { x: W * 0.24, y: H * 0.10, text: 'TRADITIONAL · ONE PASS, EVERY TIME' },
        { x: W * 0.77, y: H * 0.10, text: 'AGENTIC · DECIDES, REPEATS, SKIPS' },
        { x: q.x, y: q.y + 30, text: 'QUESTION' },
        { x: sBox.x, y: sBox.y + sBox.h * 0.62 + 16, text: 'SEARCH' },
        { x: pBox.x, y: pBox.y + pBox.h * 0.62 + 16, text: 'PROMPT' },
        { x: llmL.x, y: llmL.y + llmL.r * 1.6 + 12, text: 'LLM' },
        { x: llmR.x, y: llmR.y + llmR.r * 1.6 + 12, text: 'AGENT · LLM' },
        { x: vdb.x, y: vdb.y + vdb.h * 1.0, text: 'VECTOR DB · A TOOL' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.08) {
        p.mode = 'lnode';
        p.si = i % 2;
        var bxV = p.si === 0 ? sBox : pBox;
        p.hx = bxV.x + rand(-bxV.w * 0.38, bxV.w * 0.38);
        p.hy = bxV.y + rand(-bxV.h * 0.34, bxV.h * 0.34);
        p.baseAlpha = rand(0.2, 0.5); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.20) {
        p.mode = 'lbrain';
        brainHome(p, llmL);
        p.baseAlpha = p.ember ? rand(0.3, 0.8) : rand(0.18, 0.5);
        p.sizeMul = rand(0.3, 0.6); p.fast = false;
      } else if (p.seed < 0.30) {
        p.mode = 'lpulse';
        p.off = rand(0, 0.1);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.46) {
        p.mode = 'rbrain';
        brainHome(p, llmR);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.18, 0.55);
        p.sizeMul = rand(0.32, 0.65); p.fast = false;
      } else if (p.seed < 0.52) {
        p.mode = 'rtool';
        p.off = rand(0, 0.08);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.58) {
        p.mode = 'rres';
        p.off = rand(0, 0.1);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.66) {
        p.mode = 'vdbp';
        p.hx = vdb.x + rand(-vdb.w * 0.4, vdb.w * 0.4);
        p.hy = vdb.y + rand(-vdb.h * 0.36, vdb.h * 0.36);
        p.baseAlpha = rand(0.2, 0.55); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.14); p.sizeMul = rand(0.4, 1.1); p.fast = false;
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'lbrain' || p.mode === 'rbrain'; }, 70);
  };

  // -- full: the whole picture, user to answer, with the token stream
  // -- flowing all the way back
  layouts.full = function () {
    var y = H * 0.40;
    var user = { x: W * 0.07, y: y };
    var rag = { x: W * 0.21, y: y, r: MN * 0.042 };
    var api = { x: W * 0.36, y: y, w: MN * 0.085, h: MN * 0.095 };
    var sess = { x: W * 0.36, y: H * 0.15, w: MN * 0.07, h: MN * 0.095 };
    var llm = { x: W * 0.57, y: y, r: MN * 0.095 };
    var vdb = { x: W * 0.82, y: H * 0.62, w: MN * 0.075, h: MN * 0.105 };
    board = {
      user: user, rag: rag, api: api, sess: sess, llm: llm, vdb: vdb,
      cycle: 12000,
      u2r: makePath(user.x + 14, user.y, rag.x - rag.r * 1.5, rag.y, 0.08),
      r2a: makePath(rag.x + rag.r * 1.5, rag.y, api.x - api.w * 0.75, api.y, 0.08),
      fetch: makePath(sess.x, sess.y + sess.h * 0.6, api.x, api.y - api.h * 0.6, 0.06),
      a2l: makePath(api.x + api.w * 0.75, api.y, llm.x - llm.r * 0.85, llm.y, 0.08),
      call: makePath(llm.x + llm.r * 0.6, llm.y + llm.r * 0.5, vdb.x - vdb.w * 0.5, vdb.y - vdb.h * 0.6, 0.18),
      res: makePath(vdb.x - vdb.w * 0.8, vdb.y - vdb.h * 0.3, llm.x + llm.r * 0.4, llm.y + llm.r * 0.75, -0.18),
      labels: [
        { x: user.x, y: y + 42, text: 'USER' },
        { x: rag.x, y: y + rag.r * 2.6, text: 'NORM' },
        { x: api.x, y: api.y + api.h * 0.85 + 16, text: 'API' },
        { x: sess.x, y: sess.y - sess.h * 0.85, text: 'SESSION MEMORY' },
        { x: llm.x, y: y - llm.r * 1.35, text: 'LLM' },
        { x: vdb.x, y: vdb.y + vdb.h * 1.0, text: 'VECTOR DB' }
      ]
    };
    board.streamChain = [
      makePath(llm.x - llm.r * 0.9, llm.y - llm.r * 0.35, api.x + api.w * 0.7, api.y - api.h * 0.4, 0.1),
      makePath(api.x - api.w * 0.7, api.y - api.h * 0.4, rag.x + rag.r * 1.4, rag.y - rag.r, 0.1),
      makePath(rag.x - rag.r * 1.4, rag.y - rag.r * 0.5, user.x + 10, user.y - 6, 0.1)
    ];
    P.forEach(function (p) {
      if (p.seed < 0.20) {
        p.mode = 'brain';
        brainHome(p, llm);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.18, 0.55);
        p.sizeMul = rand(0.32, 0.62); p.fast = false;
      } else if (p.seed < 0.27) {
        p.mode = 'rag';
        p.r2 = Math.pow(Math.random(), 0.7) * rag.r * 0.62;
        p.baseAlpha = rand(0.35, 0.9); p.sizeMul = rand(0.3, 0.6); p.fast = false;
      } else if (p.seed < 0.33) {
        p.mode = 'sess';
        p.hx = sess.x + rand(-sess.w * 0.38, sess.w * 0.38);
        p.hy = sess.y + rand(-sess.h * 0.34, sess.h * 0.34);
        p.baseAlpha = rand(0.2, 0.55); p.sizeMul = rand(0.26, 0.46); p.fast = false;
      } else if (p.seed < 0.39) {
        p.mode = 'vdb';
        p.hx = vdb.x + rand(-vdb.w * 0.38, vdb.w * 0.38);
        p.hy = vdb.y + rand(-vdb.h * 0.34, vdb.h * 0.34);
        p.baseAlpha = rand(0.2, 0.55); p.sizeMul = rand(0.26, 0.46); p.fast = false;
      } else if (p.seed < 0.43) {
        p.mode = 'u2r'; p.off = rand(0, 0.1);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.5); p.fast = true;
      } else if (p.seed < 0.47) {
        p.mode = 'r2a'; p.off = rand(0, 0.1);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.5); p.fast = true;
      } else if (p.seed < 0.52) {
        p.mode = 'fetch'; p.off = rand(0, 0.25);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.59) {
        p.mode = 'a2l'; p.off = rand(0, 0.14);
        p.baseAlpha = rand(0.4, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.64) {
        p.mode = 'call'; p.off = rand(0, 0.08);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.69) {
        p.mode = 'res'; p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.90) {
        p.mode = 'stream'; p.off = rand(0, 1);
        p.baseAlpha = rand(0.3, 0.8); p.sizeMul = rand(0.26, 0.5); p.fast = true;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.13); p.sizeMul = rand(0.4, 1.1); p.fast = false;
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 44);
  };

  // -- where: the same cast, sorted by address; your machine on the
  // -- left, the models with a vendor in the cloud on the right
  layouts.where = function () {
    var mine = { x0: W * 0.06, x1: W * 0.44, y0: H * 0.09, y1: H * 0.50 };
    var cloud = { x0: W * 0.54, x1: W * 0.95, y0: H * 0.09, y1: H * 0.50 };
    var rag = { x: W * 0.115, y: H * 0.21, r: MN * 0.028 };
    var harn = { x: W * 0.28, y: H * 0.21, w: MN * 0.08, h: MN * 0.09 };
    var docs = { x: W * 0.135, y: H * 0.40, w: MN * 0.075, h: MN * 0.08 };
    var store = { x: W * 0.31, y: H * 0.40, w: MN * 0.06, h: MN * 0.08 };
    var llm = { x: W * 0.68, y: H * 0.235, r: MN * 0.07 };
    var emb = { x: W * 0.855, y: H * 0.40, w: MN * 0.09, h: MN * 0.08 };
    board = {
      mine: mine, cloud: cloud, rag: rag, harn: harn, docs: docs,
      store: store, llm: llm, emb: emb,
      cycle: 5600,
      api1: makePath(harn.x + harn.w * 0.6, harn.y - harn.h * 0.1, llm.x - llm.r * 1.0, llm.y, -0.12),
      api2: makePath(store.x + store.w * 0.7, store.y + store.h * 0.1, emb.x - emb.w * 0.6, emb.y, 0.1),
      labels: [
        { x: (mine.x0 + mine.x1) / 2, y: mine.y0 - 14, text: 'YOUR MACHINE' },
        { x: (cloud.x0 + cloud.x1) / 2, y: cloud.y0 - 14, text: 'A VENDOR IN THE CLOUD' },
        { x: rag.x, y: rag.y + rag.r * 2.6, text: 'NORM' },
        { x: harn.x, y: harn.y + harn.h * 0.85 + 8, text: 'HARNESS' },
        { x: docs.x, y: docs.y + docs.h * 0.85 + 8, text: 'DOCUMENTS' },
        { x: store.x, y: store.y + store.h * 1.0, text: 'VECTOR STORE' },
        { x: llm.x, y: llm.y + llm.r * 1.45, text: 'LLM' },
        { x: emb.x, y: emb.y + emb.h * 0.85 + 8, text: 'EMBEDDING MODEL' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.08) {
        p.mode = 'rag';
        p.r2 = Math.pow(Math.random(), 0.7) * rag.r * 0.62;
        p.baseAlpha = rand(0.35, 0.9); p.sizeMul = rand(0.3, 0.6); p.fast = false;
      } else if (p.seed < 0.16) {
        p.mode = 'harn';
        p.hx = harn.x + rand(-harn.w * 0.4, harn.w * 0.4);
        p.hy = harn.y + rand(-harn.h * 0.36, harn.h * 0.36);
        p.baseAlpha = rand(0.22, 0.55); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.26) {
        p.mode = 'docs';
        var giW = i % 24;
        p.hx = docs.x - docs.w * 0.4 + (giW % 4 + 0.5) * docs.w * 0.8 / 4 + rand(-2, 2);
        p.hy = docs.y - docs.h * 0.4 + (Math.floor(giW / 4) + 0.5) * docs.h * 0.8 / 6 + rand(-1.5, 1.5);
        p.baseAlpha = rand(0.2, 0.5); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.34) {
        p.mode = 'store';
        p.hx = store.x + rand(-store.w * 0.4, store.w * 0.4);
        p.hy = store.y + rand(-store.h * 0.36, store.h * 0.36);
        p.baseAlpha = rand(0.2, 0.55); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.52) {
        p.mode = 'brain';
        brainHome(p, llm);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.18, 0.55);
        p.sizeMul = rand(0.32, 0.65); p.fast = false;
      } else if (p.seed < 0.60) {
        p.mode = 'emb';
        p.hx = emb.x + rand(-emb.w * 0.4, emb.w * 0.4);
        p.hy = emb.y + rand(-emb.h * 0.36, emb.h * 0.36);
        p.baseAlpha = rand(0.2, 0.55); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.68) {
        p.mode = 'p1';
        p.dir = p.seed < 0.64 ? 1 : -1;
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.76) {
        p.mode = 'p2';
        p.dir = p.seed < 0.72 ? 1 : -1;
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.14); p.sizeMul = rand(0.4, 1.1); p.fast = false;
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 56);
  };

  // -- laptop: the entire cast inside one machine, nothing leaves
  layouts.laptop = function () {
    var box = { x0: W * (isMobile ? 0.06 : 0.50), x1: W * 0.96, y0: H * 0.10, y1: H * 0.78 };
    var harn = { x: W * (isMobile ? 0.30 : 0.615), y: H * 0.28, w: MN * 0.085, h: MN * 0.10 };
    var llm = { x: W * (isMobile ? 0.72 : 0.85), y: H * 0.30, r: MN * 0.055 };
    var emb = { x: W * (isMobile ? 0.24 : 0.60), y: H * 0.60, w: MN * 0.08, h: MN * 0.07 };
    var store = { x: W * (isMobile ? 0.52 : 0.755), y: H * 0.62, w: MN * 0.055, h: MN * 0.075 };
    var docs = { x: W * (isMobile ? 0.80 : 0.895), y: H * 0.60, w: MN * 0.07, h: MN * 0.075 };
    board = {
      box: box, harn: harn, llm: llm, emb: emb, store: store, docs: docs,
      cycle: 4600,
      api: makePath(harn.x + harn.w * 0.6, harn.y, llm.x - llm.r * 1.1, llm.y, -0.1),
      sPth: makePath(harn.x + harn.w * 0.3, harn.y + harn.h * 0.6, store.x - store.w * 0.4, store.y - store.h * 0.6, 0.14),
      labels: [
        { x: (box.x0 + box.x1) / 2, y: box.y1 + 22, text: 'ONE LAPTOP' },
        { x: (box.x0 + box.x1) / 2, y: box.y1 + 40, text: 'SMALLER · SLOWER · PRIVATE' },
        { x: harn.x, y: harn.y - harn.h * 0.62 - 10, text: 'HARNESS' },
        { x: llm.x, y: llm.y - llm.r * 1.5 - 10, text: 'SMALL LLM' },
        { x: emb.x, y: emb.y + emb.h * 0.85 + 8, text: 'EMBEDDING MODEL' },
        { x: store.x, y: store.y + store.h * 1.0, text: 'VECTOR STORE' },
        { x: docs.x, y: docs.y + docs.h * 0.85 + 8, text: 'DOCUMENTS' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.10) {
        p.mode = 'harn';
        p.hx = harn.x + rand(-harn.w * 0.4, harn.w * 0.4);
        p.hy = harn.y + rand(-harn.h * 0.36, harn.h * 0.36);
        p.baseAlpha = rand(0.22, 0.55); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.26) {
        p.mode = 'brain';
        brainHome(p, llm);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.18, 0.55);
        p.sizeMul = rand(0.3, 0.6); p.fast = false;
      } else if (p.seed < 0.34) {
        p.mode = 'emb';
        p.hx = emb.x + rand(-emb.w * 0.4, emb.w * 0.4);
        p.hy = emb.y + rand(-emb.h * 0.36, emb.h * 0.36);
        p.baseAlpha = rand(0.2, 0.55); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.42) {
        p.mode = 'store';
        p.hx = store.x + rand(-store.w * 0.4, store.w * 0.4);
        p.hy = store.y + rand(-store.h * 0.36, store.h * 0.36);
        p.baseAlpha = rand(0.2, 0.55); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.52) {
        p.mode = 'docs';
        var giL = i % 24;
        p.hx = docs.x - docs.w * 0.4 + (giL % 4 + 0.5) * docs.w * 0.8 / 4 + rand(-2, 2);
        p.hy = docs.y - docs.h * 0.4 + (Math.floor(giL / 4) + 0.5) * docs.h * 0.8 / 6 + rand(-1.5, 1.5);
        p.baseAlpha = rand(0.2, 0.5); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.60) {
        p.mode = 'ap';
        p.dir = p.seed < 0.56 ? 1 : -1;
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.68) {
        p.mode = 'sp';
        p.dir = p.seed < 0.64 ? 1 : -1;
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.14); p.sizeMul = rand(0.4, 1.1); p.fast = false;
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 44);
  };

  // -- outro: the lights settle back into the mark
  layouts.outro = function () {
    var box = MN * (isMobile ? 0.42 : 0.32);
    var cx = W * 0.5, cy = H * 0.26;
    board = { labels: [] };
    P.forEach(function (p) {
      if (p.seed < 0.55 && logoPts) {
        p.mode = 'glyph';
        var q = logoPts[Math.floor(p.seed / 0.55 * (logoPts.length - 1))];
        p.hx = cx - box / 2 + q[0] * box + rand(-1.5, 1.5);
        p.hy = cy - box / 2 + q[1] * box + rand(-1.5, 1.5);
        p.baseAlpha = rand(0.45, 0.95);
        p.sizeMul = rand(0.35, 0.6); p.fast = false;
      } else if (p.seed < 0.65) {
        p.mode = 'bokeh';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.05, 0.95);
        p.baseAlpha = rand(0.04, 0.12); p.sizeMul = rand(2.4, 4.6);
        p.speed = rand(0.2, 0.7); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.03, 0.97);
        p.baseAlpha = rand(0.04, 0.14); p.sizeMul = rand(0.4, 1.0); p.fast = false;
      }
    });
    links = [];
  };

  function layoutScene(name) {
    board = {};
    if (layouts[name]) layouts[name]();
    sceneT0 = performance.now();
  }

  // ---------- Per-frame targets ----------
  function targets(t, dt) {
    if (logoPhase === 'assemble' || logoPhase === 'hold') {
      var el = t - logoT0;
      if (logoPhase === 'assemble' && el > 1400) logoPhase = 'hold';
      if (logoPhase === 'hold' && el > 2400) {
        logoPhase = 'off';
        document.body.classList.remove('mk-intro-running');
        layoutScene(sceneName);
      } else {
        P.forEach(function (p) {
          p.tx = p.lx; p.ty = p.ly;
          p.alpha = p.baseAlpha * (0.85 + 0.15 * Math.sin(t * 0.002 + p.phase));
        });
        return;
      }
    }

    var te = t - sceneT0;

    if (sceneName === 'title' || sceneName === 'outro') {
      P.forEach(function (p) {
        if (p.mode === 'glyph') {
          p.tx = p.hx + Math.sin(t * 0.0005 * p.speed + p.phase) * 1.6;
          p.ty = p.hy + Math.cos(t * 0.0004 + p.phase) * 1.3;
          p.alpha = p.baseAlpha * (0.75 + 0.25 * Math.sin(t * 0.0014 + p.phase));
        } else if (p.mode === 'bokeh') {
          p.tx = p.hx + Math.sin(t * 0.00013 * p.speed + p.phase) * 18;
          p.ty = p.hy + Math.cos(t * 0.0001 * p.speed + p.phase * 1.6) * 13;
          p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.0006 + p.phase));
        } else {
          p.tx = p.hx + Math.sin(t * 0.0003 * p.speed + p.phase) * 9;
          p.ty = p.hy + Math.cos(t * 0.00024 * p.speed + p.phase * 1.7) * 7;
          p.alpha = p.baseAlpha * (0.8 + 0.2 * Math.sin(t * 0.0012 + p.phase));
        }
      });

    } else if (sceneName === 'born') {
      var b = board;
      var brainGate = clamp01((te - 1600) / 1000);
      var pulseGate = te > 3000;
      var prog = pulseGate ? fract((te - 3000) / 3200) : 0;
      board.llmFlare = 0;
      P.forEach(function (p) {
        if (p.mode === 'rag') {
          var th = p.phase + t * 0.0006 * p.speed;
          p.tx = b.rag.x + Math.cos(th) * p.r2;
          p.ty = b.rag.y + Math.sin(th) * p.r2 * 0.85;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0018 + p.phase));
        } else if (p.mode === 'brain') {
          brainTarget(p, t, 0);
          p.alpha *= brainGate;
        } else if (p.mode === 'pulse') {
          var u = -1;
          if (pulseGate) {
            u = p.dir === 1 ? win(prog, 0.02, 0.40) : win(prog, 0.52, 0.90);
          }
          if (u < 0) {
            var st = p.dir === 1 ? b.pth.p0 : b.pth.p1;
            p.tx = st[0]; p.ty = st[1]; p.alpha = 0;
          } else {
            var s = clamp01(u + p.off * (1 - u));
            var pos = bezier(b.pth, p.dir === 1 ? s : 1 - s);
            p.tx = pos[0]; p.ty = pos[1];
            p.alpha = p.baseAlpha * bell(u);
            if (p.dir === 1 && u > 0.85) board.llmFlare = Math.max(board.llmFlare, (u - 0.85) / 0.15);
          }
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });
      board.brainGate = brainGate;

    } else if (sceneName === 'memory') {
      var bm = board;
      var prog2 = fract(te / 4600);
      var memShown = Math.min(bm.memSlots, 4 + Math.floor(te / 2000));
      board.memShown = memShown;
      var sendU = win(prog2, 0.02, 0.46);
      var backU = win(prog2, 0.56, 0.96);
      board.apiFlare = 0;
      P.forEach(function (p) {
        if (p.mode === 'rag') {
          var th2 = p.phase + t * 0.0006 * p.speed;
          p.tx = bm.rag.x + Math.cos(th2) * p.r2;
          p.ty = bm.rag.y + Math.sin(th2) * p.r2 * 0.85;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0018 + p.phase));
        } else if (p.mode === 'brain') {
          brainTarget(p, t, 0);
        } else if (p.mode === 'mem') {
          p.tx = p.hx + Math.sin(t * 0.0015 + p.phase) * 0.8;
          p.ty = p.hy + Math.cos(t * 0.0012 + p.phase) * 0.6;
          var vis = p.mi < memShown ? 1 : 0;
          var flare = 0;
          if (sendU >= 0) {
            var mid = Math.abs(sendU - 0.5);
            flare = Math.max(0, 1 - mid * 6) * 0.8;
          }
          p.alpha = p.baseAlpha * vis * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + flare * vis * 0.5;
        } else if (p.mode === 'pulse') {
          var u2 = p.dir === 1 ? sendU : backU;
          if (u2 < 0) {
            var ch = p.dir === 1 ? bm.chainOut : bm.chainBack;
            var st2 = ch[0].p0;
            p.tx = st2[0]; p.ty = st2[1]; p.alpha = 0;
          } else {
            var s2 = clamp01(u2 + p.off * (1 - u2));
            var pos2 = chainPos(p.dir === 1 ? bm.chainOut : bm.chainBack, s2);
            p.tx = pos2[0]; p.ty = pos2[1];
            p.alpha = p.baseAlpha * bell(u2);
            if (p.dir === 1 && s2 > 0.35 && s2 < 0.62) board.apiFlare = 1;
          }
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'limits') {
      var bl = board;
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, 0.15);
        } else if (p.mode === 'doc') {
          p.tx = p.hx; p.ty = p.hy;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0006 * p.speed + p.phase));
        } else if (p.mode === 'glyph') {
          p.tx = p.hx + Math.sin(t * 0.0005 + p.phase) * 1.6;
          p.ty = p.hy + Math.cos(t * 0.0004 + p.phase) * 1.4;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0011 + p.phase * 0.5));
        } else if (p.mode === 'bar') {
          p.tx = p.hx + Math.sin(t * 0.0008 * p.speed + p.phase) * 1.5;
          p.ty = p.hy + Math.sin(t * 0.0004 * p.speed + p.phase) * H * 0.035;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0016 + p.phase));
        } else if (p.mode === 'pulse') {
          var cyc = fract(t / p.dur + p.off);
          var sx = bl.llm.x + bl.llm.r * 0.7;
          var ex = bl.bx;
          var yy = H * (0.2 + p.ty0 * 0.6);
          var sy = bl.llm.y + (yy - bl.llm.y) * 0.3;
          p.tx = sx + (ex - sx) * cyc;
          p.ty = sy + (yy - sy) * easeInOut(cyc);
          // fade hard at the boundary: reach, then die
          var fadeIn = clamp01(cyc / 0.15);
          var wallKill = cyc > 0.86 ? 1 - (cyc - 0.86) / 0.14 : 1;
          p.alpha = p.baseAlpha * fadeIn * wallKill * (cyc > 0.82 ? 1.4 : 0.8);
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'embed') {
      var be = board;
      var loopDur = be.K * be.cycle;
      var tt = te % loopDur;
      var cv = Math.min(be.K - 1, Math.floor(tt / be.cycle));
      var cprog = fract(tt / be.cycle);
      board.cv = cv; board.cprog = cprog;
      board.vecShown = cv;
      var az = t * 0.00012;
      board.az = az;
      var rowIdx = cv % be.rowsN;
      var rowY = be.rowY(rowIdx);
      P.forEach(function (p) {
        if (p.mode === 'doc') {
          p.tx = p.hx; p.ty = p.hy;
          var hot = p.li === rowIdx && cprog < 0.3 ? 0.5 : 0;
          p.alpha = p.baseAlpha * (0.65 + 0.35 * Math.sin(t * 0.0008 + p.phase)) + hot;
        } else if (p.mode === 'model') {
          p.tx = be.mdl.x + Math.sin(t * 0.002 * p.speed + p.phase) * be.mdl.w * 0.3;
          p.ty = be.mdl.y + Math.cos(t * 0.0017 * p.speed + p.phase) * be.mdl.h * 0.3;
          var busy = (cprog > 0.3 && cprog < 0.52) ? 0.5 : 0;
          p.alpha = p.baseAlpha * (0.6 + busy);
        } else if (p.mode === 'chunk') {
          var u3 = cprog;
          if (u3 < 0.30) {
            // depart from the highlighted row
            var s3 = clamp01(u3 / 0.30 + p.off);
            var fx = be.doc.x - be.doc.w * 0.35 + p.seed * be.doc.w * 0.7;
            var pos3 = [
              fx + (be.mdl.x - fx) * easeInOut(s3),
              rowY + (be.mdl.y - rowY) * easeInOut(s3) + Math.sin(s3 * Math.PI) * -24
            ];
            p.tx = pos3[0]; p.ty = pos3[1];
            p.alpha = p.baseAlpha * (0.4 + 0.6 * s3);
          } else if (u3 < 0.50) {
            var th3 = p.phase + t * 0.006;
            p.tx = be.mdl.x + Math.cos(th3) * be.mdl.w * 0.24;
            p.ty = be.mdl.y + Math.sin(th3) * be.mdl.h * 0.24;
            p.alpha = p.baseAlpha;
          } else if (u3 < 0.78) {
            var s4 = easeInOut(clamp01((u3 - 0.50) / 0.28));
            var d = be.dirs[cv];
            var tip = proj(be.sp, [d[0] * p.s3, d[1] * p.s3, d[2] * p.s3], az);
            p.tx = be.mdl.x + (tip[0] - be.mdl.x) * s4;
            p.ty = be.mdl.y + (tip[1] - be.mdl.y) * s4;
            p.alpha = p.baseAlpha;
          } else {
            var d2 = be.dirs[cv];
            var tip2 = proj(be.sp, [d2[0] * p.s3, d2[1] * p.s3, d2[2] * p.s3], az);
            p.tx = tip2[0]; p.ty = tip2[1];
            p.alpha = p.baseAlpha * (1 - (u3 - 0.78) / 0.22);
          }
        } else if (p.mode === 'store') {
          var show = p.v < cv || (p.v === cv && cprog > 0.75);
          var dd = be.dirs[p.v];
          var pr = proj(be.sp, [
            dd[0] * p.s3 + p.j[0], dd[1] * p.s3 + p.j[1], dd[2] * p.s3 + p.j[2]
          ], az);
          p.tx = pr[0]; p.ty = pr[1];
          p.alpha = show ? p.baseAlpha * (0.45 + 0.3 * pr[2]) *
            (0.7 + 0.3 * Math.sin(t * 0.001 + p.phase)) : 0;
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'search') {
      var bs = board;
      var prog3 = fract(te / bs.cycle);
      var cycIdx = Math.floor(te / bs.cycle);
      if (cycIdx !== bs.cycIdx) {
        bs.cycIdx = cycIdx;
        bs.qdir = bs.qdirs[cycIdx % bs.qdirs.length];
        var sims = bs.dirs.map(function (d, i) { return { i: i, s: vdot(d, bs.qdir) }; });
        sims.sort(function (a, b2) { return b2.s - a.s; });
        bs.top = [sims[0].i, sims[1].i, sims[2].i];
        bs.simOf = {};
        sims.forEach(function (o) { bs.simOf[o.i] = o.s; });
      }
      var az2 = t * 0.0001;
      board.az = az2;
      board.prog = prog3;
      var ringU = win(prog3, 0.36, 0.56);
      var holdU = win(prog3, 0.50, 0.90);
      var fadeOut = prog3 > 0.92 ? 1 - (prog3 - 0.92) / 0.08 : 1;
      P.forEach(function (p) {
        if (p.mode === 'q') {
          if (prog3 < 0.14) {
            p.tx = p.gx + Math.sin(t * 0.001 + p.phase) * 1.2;
            p.ty = p.gy + Math.cos(t * 0.0009 + p.phase) * 1.2;
            p.alpha = p.baseAlpha * clamp01(prog3 / 0.05) * (0.7 + 0.3 * Math.sin(t * 0.002 + p.phase));
          } else if (prog3 < 0.30) {
            var s5 = clamp01((prog3 - 0.14) / 0.16 + p.off);
            var pos5 = bezier(bs.pth, easeInOut(s5));
            p.tx = pos5[0]; p.ty = pos5[1];
            p.alpha = p.baseAlpha * 0.9;
          } else {
            var grow = easeInOut(clamp01((prog3 - 0.30) / 0.12));
            var qq = bs.qdir;
            var pr2 = proj(bs.sp, [
              qq[0] * p.s3 * grow, qq[1] * p.s3 * grow, qq[2] * p.s3 * grow
            ], az2);
            p.tx = pr2[0]; p.ty = pr2[1];
            p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0025 + p.phase)) * fadeOut;
          }
        } else if (p.mode === 'forest') {
          var dd2 = bs.dirs[p.v];
          var pr3 = proj(bs.sp, [
            dd2[0] * p.s3 + p.j[0], dd2[1] * p.s3 + p.j[1], dd2[2] * p.s3 + p.j[2]
          ], az2);
          p.tx = pr3[0]; p.ty = pr3[1];
          var isTop = bs.top.indexOf(p.v) >= 0;
          var a2 = p.baseAlpha * (0.35 + 0.3 * pr3[2]);
          if (holdU >= 0) {
            if (isTop) {
              a2 = p.baseAlpha * (0.9 + 0.35 * Math.sin(t * 0.003 + p.phase));
            } else {
              a2 *= 0.16;
            }
          } else if (ringU >= 0 && isTop) {
            var reach = (bs.simOf[p.v] + 1) / 2;
            if (ringU > 1 - reach) a2 = p.baseAlpha;
          }
          p.alpha = a2 * (holdU >= 0 && isTop ? 1 : fadeOut * 0.9 + 0.1);
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'augment') {
      var ba = board;
      var prog4 = fract(te / ba.cycle);
      board.prog = prog4;
      var fillU = win(prog4, 0.06, 0.32);
      var sendU2 = win(prog4, 0.42, 0.58);
      var flare2 = win(prog4, 0.54, 0.72);
      var ansU = win(prog4, 0.66, 0.94);
      board.panelGlow = clamp01((prog4 - 0.28) / 0.12) * (prog4 < 0.6 ? 1 : clamp01((0.75 - prog4) / 0.15));
      board.brainFlare = flare2 >= 0 ? bell(flare2) : 0;
      P.forEach(function (p) {
        if (p.mode === 'card') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.8;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.7;
          var hot2 = prog4 < 0.34 ? 0.35 : 0;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.0012 + p.phase)) + hot2;
        } else if (p.mode === 'fly') {
          var wA = 0.06 + p.ci * 0.05, wB = 0.24 + p.ci * 0.05;
          var u4 = win(prog4, wA, wB);
          if (prog4 < wA) {
            p.tx = p.fx; p.ty = p.fy; p.alpha = p.baseAlpha * 0.5;
          } else if (u4 >= 0) {
            var s6 = clamp01(u4 + p.off);
            var pos6 = bezier(p.pth, easeInOut(s6));
            p.tx = pos6[0]; p.ty = pos6[1];
            p.alpha = p.baseAlpha;
          } else {
            p.tx = p.dx + Math.sin(t * 0.0012 + p.phase) * 0.8;
            p.ty = p.dy + Math.cos(t * 0.001 + p.phase) * 0.6;
            p.alpha = p.baseAlpha * (prog4 > 0.9 ? (1 - prog4) / 0.1 : 0.75);
          }
        } else if (p.mode === 'prow') {
          p.tx = p.hx + Math.sin(t * 0.0013 + p.phase) * 0.7;
          p.ty = p.hy + Math.cos(t * 0.0011 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0009 + p.phase));
        } else if (p.mode === 'send') {
          if (sendU2 < 0) {
            p.tx = ba.toLLM.p0[0]; p.ty = ba.toLLM.p0[1]; p.alpha = 0;
          } else {
            var s7 = clamp01(sendU2 + p.off * (1 - sendU2));
            var pos7 = bezier(ba.toLLM, easeInOut(s7));
            p.tx = pos7[0]; p.ty = pos7[1];
            p.alpha = p.baseAlpha * bell(sendU2);
          }
        } else if (p.mode === 'brain') {
          brainTarget(p, t, board.brainFlare * 0.9);
        } else if (p.mode === 'ans') {
          if (ansU < 0) {
            p.tx = ba.back.p0[0]; p.ty = ba.back.p0[1]; p.alpha = 0;
          } else {
            var s8 = fract(p.off + ansU * 1.6);
            var pos8 = bezier(ba.back, s8);
            p.tx = pos8[0]; p.ty = pos8[1];
            p.alpha = p.baseAlpha * bell(ansU) * bell(clamp01(s8));
          }
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'agentic') {
      var bg = board;
      var prog5 = fract(te / bg.cycle);
      board.prog = prog5;
      var qU = win(prog5, 0.0, 0.09);
      var think1 = win(prog5, 0.09, 0.19);
      var call1 = win(prog5, 0.19, 0.28);
      var res1 = win(prog5, 0.28, 0.36);
      var think2 = win(prog5, 0.36, 0.44);
      var call2 = win(prog5, 0.44, 0.52);
      var res2 = win(prog5, 0.52, 0.59);
      var think3 = win(prog5, 0.59, 0.65);
      var ansU2 = win(prog5, 0.65, 0.93);
      var agit = 0;
      if (think1 >= 0) agit = bell(think1);
      else if (think2 >= 0) agit = bell(think2);
      else if (think3 >= 0) agit = bell(think3);
      board.agit = agit;
      board.vdbFlare = 0;
      if (call1 >= 0 && call1 > 0.7) board.vdbFlare = (call1 - 0.7) / 0.3;
      if (call2 >= 0 && call2 > 0.7) board.vdbFlare = (call2 - 0.7) / 0.3;
      if (res1 >= 0 && res1 < 0.4) board.vdbFlare = 1 - res1 / 0.4;
      if (res2 >= 0 && res2 < 0.4) board.vdbFlare = 1 - res2 / 0.4;
      board.decide = (think1 >= 0 && think1 > 0.6) ? (think1 - 0.6) / 0.4
        : (think2 >= 0 && think2 > 0.6) ? (think2 - 0.6) / 0.4 : 0;
      board.toolHot = (call1 >= 0 || call2 >= 0 || res1 >= 0 || res2 >= 0) ? 1 : 0;
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, agit);
        } else if (p.mode === 'q') {
          if (qU < 0) {
            p.tx = bg.inPth.p0[0]; p.ty = bg.inPth.p0[1]; p.alpha = 0;
          } else {
            var s9 = clamp01(qU + p.off * (1 - qU));
            var pos9 = bezier(bg.inPth, easeInOut(s9));
            p.tx = pos9[0]; p.ty = pos9[1];
            p.alpha = p.baseAlpha * bell(qU);
          }
        } else if (p.mode === 'tool') {
          var cu = call1 >= 0 ? call1 : call2;
          if (cu < 0) {
            p.tx = bg.toolPth.p0[0]; p.ty = bg.toolPth.p0[1]; p.alpha = 0;
          } else {
            var s10 = clamp01(cu + p.off * (1 - cu));
            var pos10 = bezier(bg.toolPth, easeInOut(s10));
            p.tx = pos10[0]; p.ty = pos10[1];
            p.alpha = p.baseAlpha * bell(cu) * (call2 >= 0 ? 0.75 : 1);
          }
        } else if (p.mode === 'res') {
          var ru = res1 >= 0 ? res1 : res2;
          if (ru < 0) {
            p.tx = bg.resPth.p0[0]; p.ty = bg.resPth.p0[1]; p.alpha = 0;
          } else {
            var s11 = clamp01(ru + p.off * (1 - ru));
            var pos11 = bezier(bg.resPth, easeInOut(s11));
            p.tx = pos11[0]; p.ty = pos11[1];
            p.alpha = p.baseAlpha * bell(ru);
          }
        } else if (p.mode === 'ans') {
          if (ansU2 < 0) {
            p.tx = bg.ansPth.p0[0]; p.ty = bg.ansPth.p0[1]; p.alpha = 0;
          } else {
            var s12 = fract(p.off + ansU2 * 2.2);
            var pos12 = bezier(bg.ansPth, s12);
            p.tx = pos12[0]; p.ty = pos12[1];
            p.alpha = p.baseAlpha * bell(ansU2) * bell(clamp01(s12));
          }
        } else if (p.mode === 'vdb') {
          p.tx = p.hx + Math.sin(t * 0.0014 + p.phase) * 1;
          p.ty = p.hy + Math.cos(t * 0.0011 + p.phase) * 0.8;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + board.vdbFlare * 0.4;
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'full') {
      var bf = board;
      var prog6 = fract(te / bf.cycle);
      board.prog = prog6;
      var legs = {
        u2r: win(prog6, 0.00, 0.055),
        r2a: win(prog6, 0.06, 0.115),
        fetch: win(prog6, 0.12, 0.20),
        a2l: win(prog6, 0.21, 0.29),
        call: win(prog6, 0.345, 0.42),
        res: win(prog6, 0.42, 0.49)
      };
      var th1 = win(prog6, 0.29, 0.345);
      var th2b = win(prog6, 0.49, 0.56);
      var strU = win(prog6, 0.56, 0.93);
      var agit2 = th1 >= 0 ? bell(th1) : (th2b >= 0 ? bell(th2b) : (strU >= 0 ? 0.25 : 0));
      board.agit = agit2;
      board.legs = legs;
      board.strU = strU;
      board.userGlow = strU >= 0 ? clamp01(strU * 2) * (strU > 0.9 ? (1 - strU) * 10 : 1) : 0;
      board.vdbFlare = (legs.call >= 0 && legs.call > 0.7) ? (legs.call - 0.7) / 0.3
        : (legs.res >= 0 && legs.res < 0.4) ? 1 - legs.res / 0.4 : 0;
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, agit2);
        } else if (p.mode === 'rag') {
          var th4 = p.phase + t * 0.0006 * p.speed;
          p.tx = bf.rag.x + Math.cos(th4) * p.r2;
          p.ty = bf.rag.y + Math.sin(th4) * p.r2 * 0.85;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0018 + p.phase));
        } else if (p.mode === 'sess' || p.mode === 'vdb') {
          p.tx = p.hx + Math.sin(t * 0.0013 + p.phase) * 0.9;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.7;
          var fl = p.mode === 'vdb' ? board.vdbFlare : (legs.fetch >= 0 ? bell(legs.fetch) : 0);
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + fl * 0.4;
        } else if (p.mode === 'u2r' || p.mode === 'r2a' || p.mode === 'fetch' ||
                   p.mode === 'a2l' || p.mode === 'call' || p.mode === 'res') {
          var uL = legs[p.mode];
          var pthL = bf[p.mode];
          if (uL < 0) {
            p.tx = pthL.p0[0]; p.ty = pthL.p0[1]; p.alpha = 0;
          } else {
            var s13 = clamp01(uL + p.off * (1 - uL));
            var pos13 = bezier(pthL, easeInOut(s13));
            p.tx = pos13[0]; p.ty = pos13[1];
            p.alpha = p.baseAlpha * bell(uL);
          }
        } else if (p.mode === 'stream') {
          if (strU < 0) {
            p.tx = bf.streamChain[0].p0[0]; p.ty = bf.streamChain[0].p0[1]; p.alpha = 0;
          } else {
            var s14 = fract(p.off + strU * 3.2);
            var pos14 = chainPos(bf.streamChain, s14);
            p.tx = pos14[0]; p.ty = pos14[1];
            var edge = Math.min(1, Math.min(s14, 1 - s14) * 10);
            var wStr = strU < 0.08 ? strU / 0.08 : (strU > 0.9 ? (1 - strU) / 0.1 : 1);
            p.alpha = p.baseAlpha * edge * wStr;
          }
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'versus') {
      var bv = board;
      var progL = fract(te / bv.cycleL);
      var progR = fract(te / bv.cycleR);
      var lU = win(progL, 0.06, 0.80);
      board.flareL = progL > 0.80 && progL < 0.96 ? bell((progL - 0.80) / 0.16) : 0;
      var vThink1 = win(progR, 0.02, 0.09);
      var vCall1 = win(progR, 0.09, 0.17);
      var vRes1 = win(progR, 0.17, 0.25);
      var vThink2 = win(progR, 0.25, 0.31);
      var vCall2 = win(progR, 0.31, 0.39);
      var vRes2 = win(progR, 0.39, 0.47);
      var vFlare1 = win(progR, 0.47, 0.55);
      var vThink3 = win(progR, 0.60, 0.68);
      var vFlare2 = win(progR, 0.68, 0.76);
      var agitR = 0;
      if (vThink1 >= 0) agitR = bell(vThink1);
      else if (vThink2 >= 0) agitR = bell(vThink2);
      else if (vThink3 >= 0) agitR = bell(vThink3);
      board.agitR = agitR;
      board.skipU = win(progR, 0.58, 0.78);
      board.flareR = vFlare1 >= 0 ? bell(vFlare1) : (vFlare2 >= 0 ? bell(vFlare2) : 0);
      var vCallU = vCall1 >= 0 ? vCall1 : vCall2;
      var vResU = vRes1 >= 0 ? vRes1 : vRes2;
      board.toolHot = vCallU >= 0 || vResU >= 0 ? 1 : 0;
      P.forEach(function (p) {
        if (p.mode === 'lnode') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.7;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'lbrain') {
          brainTarget(p, t, board.flareL * 0.6);
        } else if (p.mode === 'lpulse') {
          if (lU < 0) {
            p.tx = bv.chainL[0].p0[0]; p.ty = bv.chainL[0].p0[1]; p.alpha = 0;
          } else {
            var sL = clamp01(lU + p.off * (1 - lU));
            var posL = chainPos(bv.chainL, sL);
            p.tx = posL[0]; p.ty = posL[1];
            p.alpha = p.baseAlpha * bell(lU);
          }
        } else if (p.mode === 'rbrain') {
          brainTarget(p, t, agitR);
        } else if (p.mode === 'rtool') {
          if (vCallU < 0) {
            p.tx = bv.toolPth.p0[0]; p.ty = bv.toolPth.p0[1]; p.alpha = 0;
          } else {
            var sT = clamp01(vCallU + p.off * (1 - vCallU));
            var posT = bezier(bv.toolPth, easeInOut(sT));
            p.tx = posT[0]; p.ty = posT[1];
            p.alpha = p.baseAlpha * bell(vCallU) * (vCall2 >= 0 ? 0.8 : 1);
          }
        } else if (p.mode === 'rres') {
          if (vResU < 0) {
            p.tx = bv.resPth.p0[0]; p.ty = bv.resPth.p0[1]; p.alpha = 0;
          } else {
            var sR = clamp01(vResU + p.off * (1 - vResU));
            var posR = bezier(bv.resPth, easeInOut(sR));
            p.tx = posR[0]; p.ty = posR[1];
            p.alpha = p.baseAlpha * bell(vResU);
          }
        } else if (p.mode === 'vdbp') {
          p.tx = p.hx + Math.sin(t * 0.0014 + p.phase) * 1;
          p.ty = p.hy + Math.cos(t * 0.0011 + p.phase) * 0.8;
          var dimV = board.skipU >= 0 ? 0.3 : 1;
          p.alpha = p.baseAlpha * dimV * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + board.toolHot * 0.3;
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'where') {
      var bw = board;
      var progW = fract(te / bw.cycle);
      var out1 = win(progW, 0.04, 0.30);
      var back1 = win(progW, 0.36, 0.62);
      var progW2 = fract(progW + 0.5);
      var out2 = win(progW2, 0.04, 0.30);
      var back2 = win(progW2, 0.36, 0.62);
      P.forEach(function (p) {
        if (p.mode === 'rag') {
          var thW = p.phase + t * 0.0006 * p.speed;
          p.tx = bw.rag.x + Math.cos(thW) * p.r2;
          p.ty = bw.rag.y + Math.sin(thW) * p.r2 * 0.85;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0018 + p.phase));
        } else if (p.mode === 'brain') {
          brainTarget(p, t, back1 >= 0 ? 0.35 : 0.05);
        } else if (p.mode === 'harn' || p.mode === 'docs' || p.mode === 'store' || p.mode === 'emb') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.8;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'p1' || p.mode === 'p2') {
          var pthW = p.mode === 'p1' ? bw.api1 : bw.api2;
          var uW = p.mode === 'p1'
            ? (p.dir === 1 ? out1 : back1)
            : (p.dir === 1 ? out2 : back2);
          if (uW < 0) {
            var stW = p.dir === 1 ? pthW.p0 : pthW.p1;
            p.tx = stW[0]; p.ty = stW[1]; p.alpha = 0;
          } else {
            var sW = clamp01(uW + p.off * (1 - uW));
            var posW = bezier(pthW, p.dir === 1 ? easeInOut(sW) : 1 - easeInOut(sW));
            p.tx = posW[0]; p.ty = posW[1];
            p.alpha = p.baseAlpha * bell(uW);
          }
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'laptop') {
      var bp = board;
      var progP = fract(te / bp.cycle);
      var aOut = win(progP, 0.05, 0.35);
      var aBack = win(progP, 0.45, 0.75);
      var progP2 = fract(progP + 0.4);
      var sOut = win(progP2, 0.05, 0.35);
      var sBack = win(progP2, 0.45, 0.75);
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, aBack >= 0 ? 0.4 : 0.08);
        } else if (p.mode === 'harn' || p.mode === 'emb' || p.mode === 'store' || p.mode === 'docs') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.8;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'ap' || p.mode === 'sp') {
          var pthP = p.mode === 'ap' ? bp.api : bp.sPth;
          var uP = p.mode === 'ap'
            ? (p.dir === 1 ? aOut : aBack)
            : (p.dir === 1 ? sOut : sBack);
          if (uP < 0) {
            var stP = p.dir === 1 ? pthP.p0 : pthP.p1;
            p.tx = stP[0]; p.ty = stP[1]; p.alpha = 0;
          } else {
            var sP = clamp01(uP + p.off * (1 - uP));
            var posP = bezier(pthP, p.dir === 1 ? easeInOut(sP) : 1 - easeInOut(sP));
            p.tx = posP[0]; p.ty = posP[1];
            p.alpha = p.baseAlpha * bell(uP);
          }
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else {
      P.forEach(function (p) { p.tx = p.x; p.ty = p.y; p.alpha = 0; });
    }
  }

  // ---------- Structural line work ----------
  function drawBot(b2, t, a) {
    if (a <= 0.01) return;
    var r = b2.r;
    ctx.strokeStyle = 'rgba(200,200,215,' + (0.45 * a) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(b2.x - r, b2.y - r * 0.8, r * 2, r * 1.6, r * 0.35);
    ctx.stroke();
    // antenna
    ctx.beginPath();
    ctx.moveTo(b2.x, b2.y - r * 0.8);
    ctx.lineTo(b2.x, b2.y - r * 1.25);
    ctx.stroke();
    var blink = (Math.sin(t * 0.0011) > 0.985) ? 0.15 : 1;
    ctx.fillStyle = 'rgba(255,77,28,' + (0.95 * a * blink) + ')';
    ctx.beginPath();
    ctx.arc(b2.x - r * 0.38, b2.y - r * 0.1, r * 0.12, 0, Math.PI * 2);
    ctx.arc(b2.x + r * 0.38, b2.y - r * 0.1, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // antenna tip
    var tipPulse = 0.5 + 0.5 * Math.sin(t * 0.003);
    ctx.fillStyle = 'rgba(245,166,35,' + (0.9 * a * tipPulse) + ')';
    ctx.beginPath();
    ctx.arc(b2.x, b2.y - r * 1.3, r * 0.08 + tipPulse * 1.2, 0, Math.PI * 2);
    ctx.fill();
    // quiet smile
    ctx.strokeStyle = 'rgba(200,200,215,' + (0.38 * a) + ')';
    ctx.beginPath();
    ctx.arc(b2.x, b2.y + r * 0.16, r * 0.3, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }
  function drawCyl(c, a, flare) {
    if (a <= 0.01) return;
    var x = c.x - c.w / 2, y = c.y - c.h / 2;
    var ry = c.w * 0.16;
    ctx.strokeStyle = 'rgba(200,200,215,' + (0.38 * a) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(c.x, y, c.w / 2, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x, y + c.h);
    ctx.moveTo(x + c.w, y); ctx.lineTo(x + c.w, y + c.h);
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(c.x, y + c.h, c.w / 2, ry, 0, 0, Math.PI); ctx.stroke();
    if (flare > 0.02) {
      var g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.w * 1.6);
      g.addColorStop(0, 'rgba(255,77,28,' + (0.24 * flare * a) + ')');
      g.addColorStop(1, 'rgba(255,77,28,0)');
      ctx.fillStyle = g;
      ctx.fillRect(c.x - c.w * 1.6, c.y - c.w * 1.6, c.w * 3.2, c.w * 3.2);
    }
  }
  function drawBoxNode(bx, a, hot) {
    if (a <= 0.01) return;
    ctx.strokeStyle = hot > 0.02
      ? 'rgba(255,138,102,' + ((0.3 + 0.3 * hot) * a) + ')'
      : 'rgba(200,200,215,' + (0.32 * a) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx.x - bx.w / 2, bx.y - bx.h / 2, bx.w, bx.h, 5);
    ctx.stroke();
  }
  function drawArrowhead(x0, y0, x1, y1, style, len) {
    var ang = Math.atan2(y1 - y0, x1 - x0);
    var L = len || 7;
    ctx.strokeStyle = style;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - L * Math.cos(ang - 0.42), y1 - L * Math.sin(ang - 0.42));
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - L * Math.cos(ang + 0.42), y1 - L * Math.sin(ang + 0.42));
    ctx.stroke();
  }
  function drawAxes(sp2, az, a) {
    var axes = [[1.05, 0, 0], [0, 1.05, 0], [0, 0, 1.05]];
    var o = proj(sp2, [0, 0, 0], az);
    ctx.lineWidth = 0.7;
    axes.forEach(function (ax) {
      var e = proj(sp2, ax, az);
      var e2 = proj(sp2, [-ax[0] * 0.55, -ax[1] * 0.55, -ax[2] * 0.55], az);
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.22 * a) + ')';
      ctx.beginPath(); ctx.moveTo(e2[0], e2[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
      drawArrowhead(o[0], o[1], e[0], e[1], 'rgba(200,200,215,' + (0.2 * a) + ')', 5);
    });
  }
  function drawVec(sp2, dir, az, style, width, withHead) {
    var o = proj(sp2, [0, 0, 0], az);
    var e = proj(sp2, dir, az);
    ctx.strokeStyle = style; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
    if (withHead) drawArrowhead(o[0], o[1], e[0], e[1], style, 6);
  }
  function drawLabels(t) {
    if (!board.labels || !board.labels.length) return;
    ctx.font = '11px "JetBrains Mono", Menlo, monospace';
    try { ctx.letterSpacing = '2px'; } catch (e) { /* older engines */ }
    var te = t - sceneT0;
    board.labels.forEach(function (L) {
      var a = sceneFade;
      if (L.after) a *= clamp01((te - L.after) / 600);
      if (a <= 0.02) return;
      ctx.fillStyle = 'rgba(200,200,215,' + (0.62 * a) + ')';
      ctx.textAlign = 'center';
      ctx.fillText(L.text, L.x, L.y);
    });
    try { ctx.letterSpacing = '0px'; } catch (e) { /* older engines */ }
    ctx.textAlign = 'left';
  }

  function drawLinksSet(alphaMul) {
    ctx.lineWidth = 0.6;
    links.forEach(function (pair) {
      var a = P[pair[0]], b = P[pair[1]];
      var al = 0.16 * sceneFade * Math.min(a.alpha, b.alpha) * (alphaMul || 1);
      if (al <= 0.004) return;
      ctx.strokeStyle = (a.ember && b.ember)
        ? 'rgba(255,100,50,' + (al * 1.6) + ')'
        : 'rgba(200,200,215,' + al + ')';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });
  }

  function drawStructure(t) {
    var sf = sceneFade;
    if (sf <= 0.05) return;
    var te = t - sceneT0;

    if (sceneName === 'title') {
      if (logoPhase === 'off') drawLinksSet(1);

    } else if (sceneName === 'born') {
      drawLinksSet(board.brainGate || 0);
      if (board.rag) drawBot(board.rag, t, sf);
      if (board.pth && te > 2800) {
        var la = clamp01((te - 2800) / 800);
        strokePath(board.pth, 'rgba(200,200,215,' + (0.12 * sf * la) + ')', 1);
      }
      if (board.llmFlare > 0.02 && board.llm) {
        var g4 = ctx.createRadialGradient(board.llm.x, board.llm.y, 0, board.llm.x, board.llm.y, board.llm.r * 1.6);
        g4.addColorStop(0, 'rgba(255,77,28,' + (0.15 * board.llmFlare * sf) + ')');
        g4.addColorStop(1, 'rgba(255,77,28,0)');
        ctx.fillStyle = g4;
        var R4 = board.llm.r * 1.6;
        ctx.fillRect(board.llm.x - R4, board.llm.y - R4, R4 * 2, R4 * 2);
      }

    } else if (sceneName === 'memory') {
      drawLinksSet(1);
      drawBot(board.rag, t, sf);
      drawCyl(board.api, sf, board.apiFlare || 0);
      strokePath(board.chainOut[0], 'rgba(200,200,215,' + (0.12 * sf) + ')', 1);
      strokePath(board.chainOut[1], 'rgba(200,200,215,' + (0.12 * sf) + ')', 1);

    } else if (sceneName === 'limits') {
      drawLinksSet(1);
      // the boundary the model cannot cross: a breathing wall of ember light
      var wob = 0.8 + 0.2 * Math.sin(t * 0.0011);
      var gWall = ctx.createLinearGradient(board.bx - 48, 0, board.bx + 48, 0);
      gWall.addColorStop(0, 'rgba(255,77,28,0)');
      gWall.addColorStop(0.5, 'rgba(255,77,28,' + (0.16 * wob * sf) + ')');
      gWall.addColorStop(1, 'rgba(255,77,28,0)');
      ctx.fillStyle = gWall;
      ctx.fillRect(board.bx - 48, H * 0.08, 96, H * 0.84);
      ctx.strokeStyle = 'rgba(255,77,28,' + (0.7 * wob * sf) + ')';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([14, 8]);
      ctx.beginPath();
      ctx.moveTo(board.bx, H * 0.08);
      ctx.lineTo(board.bx, H * 0.92);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,138,102,' + (0.35 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 8]);
      ctx.beginPath();
      ctx.moveTo(board.bx - 8, H * 0.08); ctx.lineTo(board.bx - 8, H * 0.92);
      ctx.moveTo(board.bx + 8, H * 0.08); ctx.lineTo(board.bx + 8, H * 0.92);
      ctx.stroke();
      ctx.setLineDash([]);

    } else if (sceneName === 'embed') {
      var be2 = board;
      // document frame + text lines
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.30 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(be2.doc.x - be2.doc.w / 2, be2.doc.y - be2.doc.h / 2 - 8, be2.doc.w, be2.doc.h + 16, 4);
      ctx.stroke();
      // embedding model box
      var busy2 = (be2.cprog > 0.3 && be2.cprog < 0.52);
      ctx.strokeStyle = busy2
        ? 'rgba(255,138,102,' + (0.55 * sf) + ')'
        : 'rgba(200,200,215,' + (0.30 * sf) + ')';
      ctx.beginPath();
      ctx.roundRect(be2.mdl.x - be2.mdl.w / 2, be2.mdl.y - be2.mdl.h / 2, be2.mdl.w, be2.mdl.h, 6);
      ctx.stroke();
      drawAxes(be2.sp, be2.az, sf);
      for (var v = 0; v < be2.K; v++) {
        var isCur = v === be2.cv && be2.cprog > 0.72;
        if (v < be2.vecShown) {
          drawVec(be2.sp, be2.dirs[v], be2.az, 'rgba(200,200,215,' + (0.45 * sf) + ')', 1.2, true);
        } else if (isCur) {
          var aNew = clamp01((be2.cprog - 0.72) / 0.2);
          drawVec(be2.sp, be2.dirs[v], be2.az, 'rgba(255,77,28,' + (0.85 * aNew * sf) + ')', 1.5, true);
        }
      }

    } else if (sceneName === 'search') {
      var bs2 = board;
      drawAxes(bs2.sp, bs2.az, sf);
      // model box on the way in
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.28 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bs2.mdl.x - bs2.mdl.w / 2, bs2.mdl.y - bs2.mdl.h / 2, bs2.mdl.w, bs2.mdl.h, 5);
      ctx.stroke();
      var holdU2 = win(bs2.prog, 0.50, 0.90);
      for (var v2 = 0; v2 < bs2.M; v2++) {
        var isT = bs2.top.indexOf(v2) >= 0;
        var al2 = 0.26;
        var st3 = 'rgba(200,200,215,';
        if (holdU2 >= 0) {
          if (isT) { al2 = 0.68; st3 = 'rgba(245,166,35,'; }
          else al2 = 0.07;
        }
        drawVec(bs2.sp, bs2.dirs[v2], bs2.az, st3 + (al2 * sf) + ')', isT && holdU2 >= 0 ? 1.5 : 1, isT);
      }
      if (bs2.prog > 0.30 && bs2.prog < 0.94 && bs2.qdir) {
        var grow2 = easeInOut(clamp01((bs2.prog - 0.30) / 0.12));
        drawVec(bs2.sp, [bs2.qdir[0] * grow2, bs2.qdir[1] * grow2, bs2.qdir[2] * grow2],
          bs2.az, 'rgba(255,77,28,' + (0.8 * sf) + ')', 1.6, grow2 > 0.9);
      }
      var ringU2 = win(bs2.prog, 0.36, 0.56);
      if (ringU2 >= 0) {
        var o2 = proj(bs2.sp, [0, 0, 0], bs2.az);
        var rr2 = ringU2 * bs2.sp.scale * 1.05;
        ctx.strokeStyle = 'rgba(255,77,28,' + (0.4 * (1 - ringU2) * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(o2[0], o2[1], rr2, rr2 * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

    } else if (sceneName === 'augment') {
      var ba2 = board;
      ba2.cards.forEach(function (cd, i2) {
        var hot3 = ba2.prog < 0.34 ? 0.5 : 0.15;
        ctx.strokeStyle = 'rgba(255,138,102,' + ((0.22 + hot3 * 0.35) * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cd.x - cd.w / 2, cd.y - cd.h / 2, cd.w, cd.h, 4);
        ctx.stroke();
      });
      // prompt panel with sections
      var pp2 = ba2.pp;
      var glow = ba2.panelGlow || 0;
      ctx.strokeStyle = glow > 0.05
        ? 'rgba(255,77,28,' + ((0.24 + glow * 0.35) * sf) + ')'
        : 'rgba(200,200,215,' + (0.32 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pp2.x - pp2.w / 2, pp2.y - pp2.h / 2, pp2.w, pp2.h, 6);
      ctx.stroke();
      if (glow > 0.05) {
        var g5 = ctx.createRadialGradient(pp2.x, pp2.y, 0, pp2.x, pp2.y, pp2.w * 1.2);
        g5.addColorStop(0, 'rgba(255,77,28,' + (0.09 * glow * sf) + ')');
        g5.addColorStop(1, 'rgba(255,77,28,0)');
        ctx.fillStyle = g5;
        ctx.fillRect(pp2.x - pp2.w * 1.2, pp2.y - pp2.w * 1.2, pp2.w * 2.4, pp2.w * 2.4);
      }
      ctx.font = '9px "JetBrains Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ba2.secs.forEach(function (s15, si) {
        var yTop = pp2.y - pp2.h / 2 + s15.f0 * pp2.h;
        if (si > 0) {
          ctx.strokeStyle = 'rgba(200,200,215,' + (0.18 * sf) + ')';
          ctx.beginPath();
          ctx.moveTo(pp2.x - pp2.w / 2 + 6, yTop);
          ctx.lineTo(pp2.x + pp2.w / 2 - 6, yTop);
          ctx.stroke();
        }
        var lblA = si === 3 && glow > 0.05 ? 0.68 : 0.44;
        ctx.fillStyle = si === 3 && glow > 0.05
          ? 'rgba(255,138,102,' + (lblA * sf) + ')'
          : 'rgba(200,200,215,' + (lblA * sf) + ')';
        ctx.fillText(s15.name, pp2.x - pp2.w / 2 + 8, yTop + 12);
      });
      ctx.textAlign = 'left';
      drawLinksSet(1);
      if (ba2.brainFlare > 0.02) {
        var g6 = ctx.createRadialGradient(ba2.llm.x, ba2.llm.y, 0, ba2.llm.x, ba2.llm.y, ba2.llm.r * 1.7);
        g6.addColorStop(0, 'rgba(255,77,28,' + (0.17 * ba2.brainFlare * sf) + ')');
        g6.addColorStop(1, 'rgba(255,77,28,0)');
        ctx.fillStyle = g6;
        var R6 = ba2.llm.r * 1.7;
        ctx.fillRect(ba2.llm.x - R6, ba2.llm.y - R6, R6 * 2, R6 * 2);
      }

    } else if (sceneName === 'agentic') {
      var bg2 = board;
      drawLinksSet(1);
      drawCyl(bg2.vdb, sf, bg2.vdbFlare || 0);
      // mini meaning-space inside the tool
      bg2.fan.forEach(function (d3) {
        var x1 = bg2.vdb.x + d3[0] * bg2.vdb.w * 0.5;
        var y1 = bg2.vdb.y - Math.abs(d3[1]) * bg2.vdb.h * 0.32 - 2;
        ctx.strokeStyle = 'rgba(255,138,102,' + ((0.3 + (bg2.vdbFlare || 0) * 0.35) * sf) + ')';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(bg2.vdb.x, bg2.vdb.y + bg2.vdb.h * 0.2);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      });
      strokePath(bg2.toolPth, 'rgba(255,77,28,' + ((bg2.toolHot ? 0.34 : 0.14) * sf) + ')', 1.2);
      strokePath(bg2.resPth, 'rgba(200,200,215,' + ((bg2.toolHot ? 0.22 : 0.10) * sf) + ')', 1);
      // the doorway where questions arrive and answers leave
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.42 * sf) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bg2.entry.x, bg2.entry.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '11px "JetBrains Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      var mid = bezier(bg2.toolPth, 0.5);
      ctx.fillStyle = 'rgba(255,138,102,' + ((bg2.toolHot ? 0.7 : 0.35) * sf) + ')';
      ctx.fillText('TOOL CALL', mid[0] + 26, mid[1]);
      ctx.textAlign = 'left';
      if (bg2.decide > 0.02) {
        var rr3 = 14 + bg2.decide * bg2.llm.r * 1.15;
        ctx.strokeStyle = 'rgba(255,77,28,' + (0.5 * (1 - bg2.decide) * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(bg2.llm.x, bg2.llm.y, rr3, rr3 * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

    } else if (sceneName === 'full') {
      var bf2 = board;
      drawLinksSet(1);
      drawBot(bf2.rag, t, sf);
      drawBoxNode(bf2.api, sf, (bf2.legs && (bf2.legs.fetch >= 0 || bf2.legs.r2a >= 0)) ? 0.6 : 0);
      drawCyl(bf2.sess, sf, bf2.legs && bf2.legs.fetch >= 0 ? bell(bf2.legs.fetch) : 0);
      drawCyl(bf2.vdb, sf, bf2.vdbFlare || 0);
      // user
      var ug = bf2.userGlow || 0;
      ctx.strokeStyle = 'rgba(200,200,215,' + ((0.42 + ug * 0.3) * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bf2.user.x, bf2.user.y - 10, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bf2.user.x, bf2.user.y + 12, 12, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      if (ug > 0.02) {
        var g7 = ctx.createRadialGradient(bf2.user.x, bf2.user.y, 0, bf2.user.x, bf2.user.y, 60);
        g7.addColorStop(0, 'rgba(245,166,35,' + (0.14 * ug * sf) + ')');
        g7.addColorStop(1, 'rgba(245,166,35,0)');
        ctx.fillStyle = g7;
        ctx.fillRect(bf2.user.x - 60, bf2.user.y - 60, 120, 120);
      }
      // rails
      ['u2r', 'r2a', 'a2l', 'call', 'res', 'fetch'].forEach(function (leg) {
        var active = bf2.legs && bf2.legs[leg] >= 0;
        strokePath(bf2[leg],
          active ? 'rgba(255,138,102,' + (0.32 * sf) + ')'
                 : 'rgba(200,200,215,' + (0.11 * sf) + ')', 1);
      });
      if (bf2.strU >= 0) {
        bf2.streamChain.forEach(function (pth3) {
          strokePath(pth3, 'rgba(245,166,35,' + (0.18 * sf) + ')', 1);
        });
      }

    } else if (sceneName === 'versus') {
      var bvs = board;
      drawLinksSet(1);
      // the hairline between the two philosophies
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.15 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W * 0.5, H * 0.06);
      ctx.lineTo(W * 0.5, H * 0.50);
      ctx.stroke();
      // left: the fixed pipeline
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.42 * sf) + ')';
      ctx.beginPath();
      ctx.arc(bvs.q.x, bvs.q.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      drawBoxNode(bvs.sBox, sf, 0);
      drawBoxNode(bvs.pBox, sf, 0);
      bvs.chainL.forEach(function (pthV) {
        strokePath(pthV, 'rgba(200,200,215,' + (0.14 * sf) + ')', 1);
      });
      if (bvs.flareL > 0.02) {
        var gVL = ctx.createRadialGradient(bvs.llmL.x, bvs.llmL.y, 0, bvs.llmL.x, bvs.llmL.y, bvs.llmL.r * 1.8);
        gVL.addColorStop(0, 'rgba(245,166,35,' + (0.16 * bvs.flareL * sf) + ')');
        gVL.addColorStop(1, 'rgba(245,166,35,0)');
        ctx.fillStyle = gVL;
        var RVL = bvs.llmL.r * 1.8;
        ctx.fillRect(bvs.llmL.x - RVL, bvs.llmL.y - RVL, RVL * 2, RVL * 2);
      }
      // right: the deciding loop
      drawCyl(bvs.vdb, sf * (bvs.skipU >= 0 ? 0.45 : 1), bvs.toolHot ? 0.5 : 0);
      strokePath(bvs.toolPth, 'rgba(255,77,28,' + ((bvs.toolHot ? 0.32 : 0.12) * sf) + ')', 1.1);
      strokePath(bvs.resPth, 'rgba(200,200,215,' + ((bvs.toolHot ? 0.2 : 0.09) * sf) + ')', 1);
      if (bvs.agitR > 0.02) {
        var rrV = 12 + bvs.agitR * bvs.llmR.r * 1.1;
        ctx.strokeStyle = 'rgba(255,77,28,' + (0.45 * (1 - bvs.agitR * 0.5) * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(bvs.llmR.x, bvs.llmR.y, rrV, rrV * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (bvs.flareR > 0.02) {
        var gVR = ctx.createRadialGradient(bvs.llmR.x, bvs.llmR.y, 0, bvs.llmR.x, bvs.llmR.y, bvs.llmR.r * 2);
        gVR.addColorStop(0, 'rgba(245,166,35,' + (0.18 * bvs.flareR * sf) + ')');
        gVR.addColorStop(1, 'rgba(245,166,35,0)');
        ctx.fillStyle = gVR;
        var RVR = bvs.llmR.r * 2;
        ctx.fillRect(bvs.llmR.x - RVR, bvs.llmR.y - RVR, RVR * 2, RVR * 2);
      }
      if (bvs.skipU >= 0) {
        ctx.font = '11px "JetBrains Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(245,166,35,' + (0.75 * bell(clamp01(bvs.skipU)) * sf) + ')';
        ctx.fillText('NO SEARCH NEEDED', bvs.vdb.x, bvs.vdb.y - bvs.vdb.h * 0.9);
        ctx.textAlign = 'left';
      }

    } else if (sceneName === 'where') {
      var bw2 = board;
      drawLinksSet(1);
      // your machine, dashed and warm
      ctx.strokeStyle = 'rgba(245,166,35,' + (0.18 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 7]);
      ctx.beginPath();
      ctx.roundRect(bw2.mine.x0, bw2.mine.y0, bw2.mine.x1 - bw2.mine.x0, bw2.mine.y1 - bw2.mine.y0, 10);
      ctx.stroke();
      ctx.setLineDash([]);
      // the vendor's zone, solid
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.22 * sf) + ')';
      ctx.beginPath();
      ctx.roundRect(bw2.cloud.x0, bw2.cloud.y0, bw2.cloud.x1 - bw2.cloud.x0, bw2.cloud.y1 - bw2.cloud.y0, 10);
      ctx.stroke();
      drawBot(bw2.rag, t, sf);
      drawBoxNode(bw2.harn, sf, 0);
      drawBoxNode(bw2.docs, sf, 0);
      drawCyl(bw2.store, sf, 0);
      drawBoxNode(bw2.emb, sf, 0);
      strokePath(bw2.api1, 'rgba(200,200,215,' + (0.16 * sf) + ')', 1);
      strokePath(bw2.api2, 'rgba(200,200,215,' + (0.12 * sf) + ')', 1);
      var midW = bezier(bw2.api1, 0.5);
      ctx.font = '11px "JetBrains Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,138,102,' + (0.6 * sf) + ')';
      ctx.fillText('API', midW[0], midW[1] - 10);
      ctx.textAlign = 'left';

    } else if (sceneName === 'laptop') {
      var bp2 = board;
      drawLinksSet(1);
      // one machine, one boundary, nothing crosses it
      ctx.strokeStyle = 'rgba(245,166,35,' + (0.2 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 7]);
      ctx.beginPath();
      ctx.roundRect(bp2.box.x0, bp2.box.y0, bp2.box.x1 - bp2.box.x0, bp2.box.y1 - bp2.box.y0, 12);
      ctx.stroke();
      ctx.setLineDash([]);
      drawBoxNode(bp2.harn, sf, 0);
      drawBoxNode(bp2.emb, sf, 0);
      drawCyl(bp2.store, sf, 0);
      drawBoxNode(bp2.docs, sf, 0);
      strokePath(bp2.api, 'rgba(200,200,215,' + (0.16 * sf) + ')', 1);
      strokePath(bp2.sPth, 'rgba(200,200,215,' + (0.12 * sf) + ')', 1);
    }

    drawLabels(t);
  }

  // ---------- Render ----------
  var frameCount = 0;
  function render(t, dt) {
    sceneFade += (1 - sceneFade) * 0.035;
    targets(t, dt);
    ctx.fillStyle = 'rgba(5,5,5,0.45)';
    ctx.fillRect(0, 0, W, H);
    // periodic deeper fade kills 8-bit rounding residue (ghost streaks)
    if (frameCount % 7 === 0) {
      ctx.fillStyle = 'rgba(5,5,5,0.2)';
      ctx.fillRect(0, 0, W, H);
    }
    frameCount++;
    ctx.globalCompositeOperation = 'lighter';
    drawStructure(t);
    var assembling = logoPhase === 'assemble';
    P.forEach(function (p) {
      var k = assembling ? p.k * 1.7 : (p.fast ? 0.42 : p.k);
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
      var s = p.size * 6.2 * p.sizeMul;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * 2.1));
      ctx.drawImage(p.sprite, p.x - s / 2, p.y - s / 2, s, s);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function staticFrame() {
    // reduced motion: one composed still, mid-choreography
    var tS = sceneT0 + 4200;
    targets(tS, 16);
    P.forEach(function (p) { p.x = p.tx; p.y = p.ty; });
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    sceneFade = 1;
    drawStructure(tS);
    P.forEach(function (p) {
      var s = p.size * 6.2 * p.sizeMul;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * 2.1));
      ctx.drawImage(p.sprite, p.x - s / 2, p.y - s / 2, s, s);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- Main loop, pause when hidden ----------
  var rafId = null, last = 0;
  function frame(t) {
    rafId = requestAnimationFrame(frame);
    var dt = Math.min(50, t - last);
    if (dt < 15) return;
    last = t;
    render(t, dt);
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

  // ---------- Scene switching (scroll driven) ----------
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));

  function setScene(name) {
    if (name === sceneName) return;
    sceneName = name;
    sceneFade = 0;
    layoutScene(name);
    if (reducedMotion) staticFrame();
  }

  function nearestSceneToCenter() {
    var best = null, bestD = Infinity;
    sections.forEach(function (sec) {
      var r = sec.getBoundingClientRect();
      var mid = r.top + r.height / 2;
      var d = Math.abs(mid - window.innerHeight / 2);
      if (r.top < window.innerHeight && r.bottom > 0 && d < bestD) {
        bestD = d; best = sec;
      }
    });
    return best;
  }

  if (sections.length && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setScene(e.target.getAttribute('data-scene'));
      });
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
    sections.forEach(function (s) { obs.observe(s); });
  }

  window.mkCanvas = {
    setScene: setScene,
    _dbg: function () {
      var store = P.filter(function (p) { return p.mode === 'store'; });
      var vis = store.filter(function (p) { return p.alpha > 0.05; });
      var s0 = store[0] || {};
      return {
        scene: sceneName,
        te: Math.round(performance.now() - sceneT0),
        fade: sceneFade,
        cv: board.cv,
        vecShown: board.vecShown,
        logoPhase: logoPhase,
        storeCount: store.length,
        storeVisible: vis.length,
        sample: { v: s0.v, s3: s0.s3, tx: Math.round(s0.tx), ty: Math.round(s0.ty), alpha: s0.alpha }
      };
    }
  };

  // ---------- Resize ----------
  function resize() {
    isMobile = window.matchMedia('(max-width: 720px)').matches;
    W = window.innerWidth; H = window.innerHeight;
    MN = Math.min(W, H);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
    if (sceneName) layoutScene(sceneName);
    if (logoPhase !== 'off') startIntroPositions();
    if (reducedMotion && sceneName) staticFrame();
  }
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  // ---------- Boot ----------
  resize();
  var first = nearestSceneToCenter() || sections[0];
  if (first) {
    sceneName = first.getAttribute('data-scene');
    layoutScene(sceneName);
  }
  P.forEach(function (p) {
    p.x = W / 2 + rand(-80, 80);
    p.y = H / 2 + rand(-50, 50);
  });

  // the intro always plays at the top: it is the deck's opener
  if (first && first.hasAttribute('data-intro') && !reducedMotion &&
      window.scrollY < window.innerHeight * 0.3) {
    wantIntro = true;
    if (logoPts) startIntro();
  }
  start();
})();
