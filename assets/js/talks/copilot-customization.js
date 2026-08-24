/* ============================================================
   MKLab Living Canvas: Copilot customization edition
   One particle system behind the whole deck. Slides declare a
   scene via <section data-scene="...">; scrolling morphs the
   same lights from one scene into the next.
   Scenes: title, lost, harness, prompts, instructions, agents,
   vendors, skills, disclosure, portable, map, outro.
   Based on assets/js/talks/agentic-rag.js. No dependencies.
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
  function strokePath(pth, style, width) {
    ctx.strokeStyle = style; ctx.lineWidth = width || 1;
    ctx.beginPath();
    ctx.moveTo(pth.p0[0], pth.p0[1]);
    ctx.bezierCurveTo(pth.c0[0], pth.c0[1], pth.c1[0], pth.c1[1], pth.p1[0], pth.p1[1]);
    ctx.stroke();
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

  // -- lost: Maja stands among four drifting word clouds that refuse
  // -- to hold still, a question mark hangs above
  layouts.lost = function () {
    var kim = { x: W * (isMobile ? 0.5 : 0.60), y: H * (isMobile ? 0.72 : 0.62) };
    var CC = [
      { x: W * (isMobile ? 0.28 : 0.55), y: H * 0.20, r: MN * 0.055, text: 'PROMPTS' },
      { x: W * (isMobile ? 0.75 : 0.78), y: H * 0.16, r: MN * 0.06, text: 'INSTRUCTIONS' },
      { x: W * (isMobile ? 0.22 : 0.90), y: H * 0.46, r: MN * 0.05, text: 'AGENTS' },
      { x: W * (isMobile ? 0.78 : 0.76), y: H * 0.74, r: MN * 0.055, text: 'SKILLS' }
    ];
    board = {
      kim: kim, CC: CC,
      qpts: sampleText('?', 160),
      qc: { x: kim.x + MN * (isMobile ? 0.12 : 0.10), y: kim.y - MN * 0.16, r: MN * 0.045 },
      labels: [{ x: kim.x, y: kim.y + 52, text: 'MAJA' }]
    };
    P.forEach(function (p) {
      if (p.seed < 0.48) {
        p.mode = 'cl';
        p.ci = Math.floor(p.seed / 0.48 * 4) % 4;
        var a = rand(0, Math.PI * 2);
        var d = Math.pow(Math.random(), 0.6) * CC[p.ci].r;
        p.ox = Math.cos(a) * d;
        p.oy = Math.sin(a) * d * 0.8;
        p.baseAlpha = rand(0.35, 0.85);
        p.sizeMul = rand(0.5, 0.95); p.fast = false;
      } else if (p.seed < 0.56) {
        p.mode = 'glyph';
        var q = board.qpts[Math.floor((p.seed - 0.48) / 0.08 * (board.qpts.length - 1))];
        p.hx = board.qc.x - board.qc.r + q[0] * board.qc.r * 2;
        p.hy = board.qc.y - board.qc.r + q[1] * board.qc.r * 2;
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.64) {
        p.mode = 'bokeh';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.05, 0.95);
        p.baseAlpha = rand(0.05, 0.13); p.sizeMul = rand(2.4, 4.2); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.05, 0.16); p.sizeMul = rand(0.4, 1.1); p.fast = false;
      }
    });
    links = [];
  };

  // -- harness: one Copilot core, four harnesses around it, calls
  // -- travel out to one harness at a time and come back
  layouts.harness = function () {
    var core = { x: W * (isMobile ? 0.5 : 0.70), y: H * (isMobile ? 0.30 : 0.46), r: MN * (isMobile ? 0.13 : 0.11) };
    var HB = isMobile ? [
      { x: W * 0.22, y: H * 0.10, w: MN * 0.16, h: MN * 0.07, text: 'VS CODE' },
      { x: W * 0.78, y: H * 0.10, w: MN * 0.16, h: MN * 0.07, text: 'COPILOT CLI' },
      { x: W * 0.22, y: H * 0.52, w: MN * 0.16, h: MN * 0.07, text: 'GITHUB.COM' },
      { x: W * 0.78, y: H * 0.52, w: MN * 0.16, h: MN * 0.07, text: 'CLOUD AGENT' }
    ] : [
      { x: W * 0.52, y: H * 0.17, w: MN * 0.14, h: MN * 0.07, text: 'VS CODE' },
      { x: W * 0.90, y: H * 0.20, w: MN * 0.14, h: MN * 0.07, text: 'COPILOT CLI' },
      { x: W * 0.52, y: H * 0.76, w: MN * 0.14, h: MN * 0.07, text: 'GITHUB.COM' },
      { x: W * 0.90, y: H * 0.73, w: MN * 0.14, h: MN * 0.07, text: 'CLOUD AGENT' }
    ];
    board = {
      core: core, HB: HB,
      cycle: 5200,
      paths: HB.map(function (b) {
        return makePath(core.x, core.y, b.x, b.y, 0.14);
      }),
      labels: [{ x: core.x, y: core.y + core.r * 1.42, text: 'GITHUB COPILOT' }]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.38) {
        p.mode = 'brain';
        brainHome(p, core);
        p.baseAlpha = p.ember ? rand(0.35, 0.9) : rand(0.2, 0.6);
        p.sizeMul = rand(0.35, 0.75); p.fast = false;
      } else if (p.seed < 0.56) {
        p.mode = 'pulse';
        p.hi = i % 4;
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.62) {
        p.mode = 'bokeh';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.05, 0.95);
        p.baseAlpha = rand(0.05, 0.12); p.sizeMul = rand(2.4, 4.0); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.15); p.sizeMul = rand(0.4, 1.2); p.fast = false;
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 66);
  };

  // -- prompts: a saved prompt file stamps itself into the chat each
  // -- time /tests is typed
  layouts.prompts = function () {
    var card = { x: W * (isMobile ? 0.30 : 0.62), y: H * (isMobile ? 0.16 : 0.30), w: MN * 0.14, h: MN * 0.17 };
    var panel = { x: W * (isMobile ? 0.72 : 0.87), y: H * (isMobile ? 0.42 : 0.52), w: MN * 0.16, h: MN * 0.33 };
    board = {
      card: card, panel: panel,
      cycle: 5200,
      labels: [
        { x: card.x, y: card.y - card.h * 0.62 - 14, text: 'TESTS.PROMPT.MD' },
        { x: card.x, y: card.y + card.h * 0.62 + 20, text: '.GITHUB/PROMPTS/' },
        { x: panel.x, y: panel.y - panel.h * 0.55 - 14, text: 'CHAT' }
      ]
    };
    var rowsN = 7;
    P.forEach(function (p, i) {
      if (p.seed < 0.18) {
        p.mode = 'fcard';
        p.li = i % rowsN;
        var lw = 0.45 + fract(Math.sin(p.li * 91.7) * 437.5) * 0.45;
        p.hx = card.x - card.w * 0.4 + (p.seed / 0.18) * card.w * 0.8 * lw;
        p.hy = card.y - card.h * 0.36 + p.li * card.h * 0.72 / (rowsN - 1) + rand(-1, 1);
        p.baseAlpha = rand(0.25, 0.6); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.36) {
        p.mode = 'fly';
        p.fx = card.x + rand(-card.w * 0.4, card.w * 0.4);
        p.fy = card.y + rand(-card.h * 0.4, card.h * 0.4);
        p.dx = panel.x + rand(-panel.w * 0.36, panel.w * 0.36);
        p.dy = panel.y - panel.h * 0.34 + rand(0, panel.h * 0.4);
        p.pth = makePath(p.fx, p.fy, p.dx, p.dy, rand(-0.18, 0.18));
        p.off = rand(0, 0.1);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.50) {
        p.mode = 'ans';
        p.hx = panel.x + rand(-panel.w * 0.36, panel.w * 0.36);
        p.hy = panel.y + panel.h * 0.14 + rand(0, panel.h * 0.28);
        p.off = rand(0, 1);
        p.baseAlpha = rand(0.3, 0.75); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.56) {
        p.mode = 'bokeh';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.05, 0.95);
        p.baseAlpha = rand(0.05, 0.12); p.sizeMul = rand(2.4, 4.0); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.15); p.sizeMul = rand(0.4, 1.2); p.fast = false;
      }
    });
    links = [];
  };

  // -- instructions: a rules card watches a lane of passing files and
  // -- reaches down to the ones its applyTo glob matches
  layouts.instructions = function () {
    var card = { x: W * (isMobile ? 0.5 : 0.74), y: H * (isMobile ? 0.14 : 0.20), w: MN * 0.15, h: MN * 0.11 };
    var lane = { x0: W * (isMobile ? 0.04 : 0.50), x1: W * 0.97, y: H * (isMobile ? 0.48 : 0.58) };
    var K = 6;
    board = {
      card: card, lane: lane, K: K,
      period: 9000,
      fw: MN * 0.052, fh: MN * 0.066,
      kinds: [1, 0, 1, 0, 0, 1],   // 1 = matches the glob
      names: ['APP.TS', 'README.MD', 'API.TS', 'LOGO.SVG', 'NOTES.MD', 'UI.TSX'],
      labels: [
        { x: card.x, y: card.y - card.h * 0.62 - 14, text: 'STYLE.INSTRUCTIONS.MD' },
        { x: card.x, y: card.y + card.h * 0.62 + 20, text: 'APPLYTO: **/*.TS' },
        { x: (lane.x0 + lane.x1) / 2, y: lane.y + MN * 0.125, text: 'FILES BEING WORKED ON' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.14) {
        p.mode = 'rcard';
        p.li = i % 5;
        var lw = 0.45 + fract(Math.sin(p.li * 77.3) * 311.7) * 0.45;
        p.hx = card.x - card.w * 0.4 + (p.seed / 0.14) * card.w * 0.8 * lw;
        p.hy = card.y - card.h * 0.32 + p.li * card.h * 0.64 / 4 + rand(-1, 1);
        p.baseAlpha = rand(0.25, 0.6); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.54) {
        p.mode = 'file';
        p.fk = i % K;
        p.ox = rand(-0.36, 0.36);
        p.oy = rand(-0.32, 0.32);
        p.baseAlpha = rand(0.3, 0.75); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.60) {
        p.mode = 'bokeh';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.05, 0.95);
        p.baseAlpha = rand(0.05, 0.12); p.sizeMul = rand(2.4, 4.0); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.15); p.sizeMul = rand(0.4, 1.2); p.fast = false;
      }
    });
    links = [];
  };

  // -- agents: an ambient AGENTS.md field glows faintly behind three
  // -- named specialists; Maja hands the keyboard to one at a time
  layouts.agents = function () {
    var kim = { x: W * (isMobile ? 0.20 : 0.56), y: H * (isMobile ? 0.30 : 0.56) };
    var field = { x0: W * (isMobile ? 0.06 : 0.50), x1: W * 0.96, y0: H * 0.08, y1: H * (isMobile ? 0.52 : 0.86) };
    var masks = isMobile ? [
      { x: W * 0.66, y: H * 0.14, r: MN * 0.05, text: 'REVIEWER.AGENT.MD' },
      { x: W * 0.72, y: H * 0.30, r: MN * 0.05, text: 'PLANNER.AGENT.MD' },
      { x: W * 0.62, y: H * 0.46, r: MN * 0.05, text: 'DOCS.AGENT.MD' }
    ] : [
      { x: W * 0.86, y: H * 0.22, r: MN * 0.05, text: 'REVIEWER.AGENT.MD' },
      { x: W * 0.89, y: H * 0.48, r: MN * 0.05, text: 'PLANNER.AGENT.MD' },
      { x: W * 0.85, y: H * 0.74, r: MN * 0.05, text: 'DOCS.AGENT.MD' }
    ];
    board = {
      kim: kim, field: field, masks: masks,
      hold: 3400,
      paths: masks.map(function (m) {
        return makePath(kim.x + 16, kim.y - 6, m.x - m.r * 1.3, m.y, 0.12);
      }),
      labels: [
        { x: kim.x, y: kim.y + 52, text: 'MAJA' },
        { x: (field.x0 + field.x1) / 2, y: field.y1 + 22, text: 'AGENTS.MD · AMBIENT, ALWAYS READ' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.10) {
        p.mode = 'amb';
        p.hx = rand(field.x0, field.x1);
        p.hy = rand(field.y0, field.y1);
        p.baseAlpha = rand(0.05, 0.14); p.sizeMul = rand(0.5, 1.0); p.fast = false;
      } else if (p.seed < 0.40) {
        p.mode = 'mask';
        p.mi = i % 3;
        var m = masks[p.mi];
        var a = rand(0, Math.PI * 2);
        var d = Math.pow(Math.random(), 0.6) * m.r;
        p.hx = m.x + Math.cos(a) * d;
        p.hy = m.y + Math.sin(a) * d * 0.85;
        p.baseAlpha = rand(0.35, 0.85); p.sizeMul = rand(0.4, 0.75); p.fast = false;
      } else if (p.seed < 0.52) {
        p.mode = 'pulse';
        p.mi = i % 3;
        p.off = rand(0, 0.14);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.58) {
        p.mode = 'bokeh';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.05, 0.95);
        p.baseAlpha = rand(0.05, 0.12); p.sizeMul = rand(2.4, 4.0); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.15); p.sizeMul = rand(0.4, 1.2); p.fast = false;
      }
    });
    links = [];
  };

  // -- vendors: a grid of vendor columns and concept rows, the skills
  // -- row is the one shared line running through every column
  layouts.vendors = function () {
    var cols = isMobile ? [W * 0.2, W * 0.5, W * 0.8] : [W * 0.30, W * 0.55, W * 0.80];
    var rows = [H * 0.11, H * 0.22, H * 0.32, H * 0.42];
    var heads = ['GITHUB COPILOT', 'CLAUDE CODE', 'CODEX'];
    var rowNames = ['PROMPTS', 'INSTRUCTIONS', 'AGENTS', 'SKILLS'];
    var cells = [
      ['*.PROMPT.MD', '/COMMANDS', '~/.CODEX/PROMPTS'],
      ['COPILOT-INSTRUCTIONS.MD', 'CLAUDE.MD', 'AGENTS.MD'],
      ['*.AGENT.MD', 'NO EQUIVALENT', 'NO EQUIVALENT'],
      ['SKILL.MD', 'SKILL.MD', 'SKILL.MD']
    ];
    board = {
      cols: cols, rows: rows, heads: heads, rowNames: rowNames, cells: cells,
      cycle: 4200,
      labels: []
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.58) {
        p.mode = 'node';
        var gi = i % 12;
        p.ri = gi % 4;
        p.ci = Math.floor(gi / 4);
        var r = p.ri === 3 ? MN * 0.026 : MN * 0.02;
        var a = rand(0, Math.PI * 2);
        var d = Math.pow(Math.random(), 0.6) * r;
        p.hx = cols[p.ci] + Math.cos(a) * d * 2.6;
        p.hy = rows[p.ri] + Math.sin(a) * d;
        // the agents row is a Copilot concept: the other columns stay dark
        p.baseAlpha = (p.ri === 2 && p.ci > 0) ? rand(0.04, 0.1)
          : (p.ri === 3 ? rand(0.5, 0.95) : rand(0.28, 0.6));
        p.sizeMul = rand(0.35, 0.65); p.fast = false;
      } else if (p.seed < 0.68) {
        p.mode = 'rowpulse';
        p.off = rand(0, 1);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.14); p.sizeMul = rand(0.4, 1.1); p.fast = false;
      }
    });
    links = [];
  };

  // -- skills: one folder, the SKILL.md heart and the tools it
  // -- brings along, breathing quietly
  layouts.skills = function () {
    var fold = { x: W * (isMobile ? 0.5 : 0.74), y: H * (isMobile ? 0.28 : 0.44), w: MN * (isMobile ? 0.42 : 0.34), h: MN * (isMobile ? 0.34 : 0.30) };
    var core = { x: fold.x, y: fold.y - fold.h * 0.16, w: fold.w * 0.5, h: fold.h * 0.36 };
    var sats = [
      { x: fold.x - fold.w * 0.24, y: fold.y + fold.h * 0.28, w: fold.w * 0.3, h: fold.h * 0.22, text: 'SCRIPTS/' },
      { x: fold.x + fold.w * 0.24, y: fold.y + fold.h * 0.28, w: fold.w * 0.3, h: fold.h * 0.22, text: 'REFERENCES/' }
    ];
    board = {
      fold: fold, core: core, sats: sats,
      labels: [
        { x: fold.x, y: fold.y + fold.h * 0.72 + 8, text: '.GITHUB/SKILLS/DEPLOY/' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.24) {
        p.mode = 'core';
        p.li = i % 5;
        var lw = 0.4 + fract(Math.sin(p.li * 53.1) * 269.3) * 0.5;
        p.hx = core.x - core.w * 0.4 + (p.seed / 0.24) * core.w * 0.8 * lw;
        p.hy = core.y - core.h * 0.3 + p.li * core.h * 0.6 / 4 + rand(-1, 1);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.44) {
        p.mode = 'sat';
        p.si = i % 2;
        var sb = sats[p.si];
        p.hx = sb.x + rand(-sb.w * 0.38, sb.w * 0.38);
        p.hy = sb.y + rand(-sb.h * 0.32, sb.h * 0.32);
        p.baseAlpha = rand(0.25, 0.6); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.52) {
        p.mode = 'bokeh';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.05, 0.95);
        p.baseAlpha = rand(0.05, 0.13); p.sizeMul = rand(2.4, 4.2); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.05, 0.16); p.sizeMul = rand(0.4, 1.2); p.fast = false;
      }
    });
    links = [];
  };

  // -- disclosure: the context window on the left fills in stages as
  // -- the skill on the right reveals itself piece by piece
  layouts.disclosure = function () {
    var panel = { x: W * (isMobile ? 0.28 : 0.32), y: H * (isMobile ? 0.30 : 0.32), w: MN * 0.2, h: MN * 0.38 };
    var fold = { x: W * (isMobile ? 0.75 : 0.70), y: H * (isMobile ? 0.30 : 0.32), w: MN * 0.24, h: MN * 0.22 };
    board = {
      panel: panel, fold: fold,
      cycle: 10000,
      toPanel: makePath(fold.x - fold.w * 0.4, fold.y - fold.h * 0.1, panel.x + panel.w * 0.2, panel.y - panel.h * 0.1, 0.16),
      filePth: makePath(fold.x + fold.w * 0.16, fold.y + fold.h * 0.3, panel.x + panel.w * 0.1, panel.y + panel.h * 0.32, 0.22),
      labels: [
        { x: panel.x, y: panel.y - panel.h * 0.55 - 14, text: 'CONTEXT WINDOW' },
        { x: fold.x, y: fold.y + fold.h * 0.75 + 8, text: 'THE SKILL' }
      ]
    };
    var slots = 24;
    P.forEach(function (p, i) {
      if (p.seed < 0.30) {
        p.mode = 'ctx';
        p.mi = i % slots;
        var row = Math.floor(p.mi / 4), col = p.mi % 4;
        p.hx = panel.x - panel.w * 0.36 + (col + 0.5) * panel.w * 0.72 / 4 + rand(-2, 2);
        p.hy = panel.y - panel.h * 0.4 + (row + 0.5) * panel.h * 0.8 / 6 + rand(-1.5, 1.5);
        p.tier = row === 0 ? 0 : (row < 5 ? 1 : 2);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.42) {
        p.mode = 'body';
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.50) {
        p.mode = 'filefly';
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.66) {
        p.mode = 'skel';
        p.hx = fold.x + rand(-fold.w * 0.38, fold.w * 0.38);
        p.hy = fold.y + rand(-fold.h * 0.34, fold.h * 0.34);
        p.baseAlpha = rand(0.2, 0.55); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.14); p.sizeMul = rand(0.4, 1.1); p.fast = false;
      }
    });
    board.slots = slots;
    links = [];
  };

  // -- portable: the same skill folder lights up one assistant after
  // -- another and leaves a resident copy at each
  layouts.portable = function () {
    var fold = { x: W * (isMobile ? 0.5 : 0.66), y: H * (isMobile ? 0.16 : 0.28), w: MN * 0.2, h: MN * 0.15 };
    var nodes = isMobile ? [
      { x: W * 0.16, y: H * 0.50, text: 'COPILOT' },
      { x: W * 0.40, y: H * 0.54, text: 'CLAUDE' },
      { x: W * 0.63, y: H * 0.54, text: 'CODEX' },
      { x: W * 0.86, y: H * 0.50, text: 'CURSOR' }
    ] : [
      { x: W * 0.52, y: H * 0.72, text: 'COPILOT' },
      { x: W * 0.66, y: H * 0.76, text: 'CLAUDE' },
      { x: W * 0.80, y: H * 0.76, text: 'CODEX' },
      { x: W * 0.93, y: H * 0.72, text: 'CURSOR' }
    ];
    board = {
      fold: fold, nodes: nodes,
      cycle: 8800,
      nr: MN * 0.032,
      paths: nodes.map(function (nd) {
        return makePath(fold.x, fold.y + fold.h * 0.55, nd.x, nd.y - MN * 0.05, 0.14);
      }),
      labels: [
        { x: fold.x, y: fold.y - fold.h * 0.62 - 12, text: 'ONE SKILL FOLDER' },
        { x: isMobile ? W * 0.5 : W * 0.73, y: (isMobile ? H * 0.54 : H * 0.76) + MN * 0.12, text: 'AND DOZENS MORE' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.24) {
        p.mode = 'core';
        p.hx = fold.x + rand(-fold.w * 0.4, fold.w * 0.4);
        p.hy = fold.y + rand(-fold.h * 0.36, fold.h * 0.36);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.42) {
        p.mode = 'send';
        p.vi = i % 4;
        p.off = rand(0, 0.14);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.62) {
        p.mode = 'res';
        p.vi = i % 4;
        var nd = nodes[p.vi];
        var a = rand(0, Math.PI * 2);
        var d = Math.pow(Math.random(), 0.6) * board.nr;
        p.hx = nd.x + Math.cos(a) * d;
        p.hy = nd.y + Math.sin(a) * d * 0.85;
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.15); p.sizeMul = rand(0.4, 1.2); p.fast = false;
      }
    });
    links = [];
  };

  // -- map: the four concepts settle into a calm two by two grid,
  // -- the skill quadrant holds the ember
  layouts.map = function () {
    var Q = isMobile ? [
      { x: W * 0.28, y: H * 0.14, w: W * 0.4, h: H * 0.14, text: 'PROMPT FILE', sub: 'A REQUEST YOU REPEAT' },
      { x: W * 0.74, y: H * 0.14, w: W * 0.4, h: H * 0.14, text: 'INSTRUCTIONS', sub: 'A RULE YOU REPEAT' },
      { x: W * 0.28, y: H * 0.36, w: W * 0.4, h: H * 0.14, text: 'CUSTOM AGENT', sub: 'A PERSONA YOU SWITCH ON' },
      { x: W * 0.74, y: H * 0.36, w: W * 0.4, h: H * 0.14, text: 'SKILL', sub: 'INSTRUCTIONS + TOOLS' }
    ] : [
      { x: W * 0.30, y: H * 0.17, w: W * 0.28, h: H * 0.17, text: 'PROMPT FILE', sub: 'A REQUEST YOU REPEAT' },
      { x: W * 0.66, y: H * 0.17, w: W * 0.28, h: H * 0.17, text: 'INSTRUCTIONS', sub: 'A RULE YOU REPEAT' },
      { x: W * 0.30, y: H * 0.44, w: W * 0.28, h: H * 0.17, text: 'CUSTOM AGENT', sub: 'A PERSONA YOU SWITCH ON' },
      { x: W * 0.66, y: H * 0.44, w: W * 0.28, h: H * 0.17, text: 'SKILL', sub: 'INSTRUCTIONS + TOOLS · PORTABLE' }
    ];
    board = { Q: Q, labels: [] };
    P.forEach(function (p, i) {
      if (p.seed < 0.55) {
        p.mode = 'q';
        var gi = i % 5;
        p.qi = gi === 4 ? 3 : gi;
        var qd = Q[p.qi];
        p.hx = qd.x + rand(-qd.w * 0.4, qd.w * 0.4);
        p.hy = qd.y + rand(-qd.h * 0.34, qd.h * 0.34);
        p.baseAlpha = p.qi === 3 ? rand(0.4, 0.85) : rand(0.22, 0.55);
        p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.63) {
        p.mode = 'bokeh';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.05, 0.95);
        p.baseAlpha = rand(0.05, 0.12); p.sizeMul = rand(2.4, 4.0); p.fast = false;
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.15); p.sizeMul = rand(0.4, 1.2); p.fast = false;
      }
    });
    links = [];
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

    } else if (sceneName === 'lost') {
      var bl = board;
      // each word cloud wanders on its own slow orbit
      bl.cw = bl.CC.map(function (c, ci) {
        return [
          c.x + Math.sin(t * 0.00016 + ci * 2.1) * MN * 0.035,
          c.y + Math.cos(t * 0.00013 + ci * 1.4) * MN * 0.028
        ];
      });
      P.forEach(function (p) {
        if (p.mode === 'cl') {
          var cc = bl.cw[p.ci];
          p.tx = cc[0] + p.ox + Math.sin(t * 0.0006 * p.speed + p.phase) * 2.4;
          p.ty = cc[1] + p.oy + Math.cos(t * 0.0005 * p.speed + p.phase) * 2;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0011 + p.phase));
        } else if (p.mode === 'glyph') {
          p.tx = p.hx + Math.sin(t * 0.0005 + p.phase) * 1.5;
          p.ty = p.hy + Math.cos(t * 0.0004 + p.phase) * 1.3;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.0009 + p.phase * 0.4));
        } else if (p.mode === 'bokeh') {
          p.tx = p.hx + Math.sin(t * 0.00013 * p.speed + p.phase) * 16;
          p.ty = p.hy + Math.cos(t * 0.0001 * p.speed + p.phase * 1.6) * 12;
          p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.0006 + p.phase));
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'harness') {
      var bh = board;
      var prog = fract(te / bh.cycle);
      var active = Math.floor(te / bh.cycle) % 4;
      board.active = active;
      var outU = win(prog, 0.06, 0.42);
      var backU = win(prog, 0.56, 0.92);
      board.flare = outU >= 0 && outU > 0.75 ? (outU - 0.75) / 0.25
        : (backU >= 0 && backU < 0.3 ? 1 - backU / 0.3 : 0);
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, backU >= 0 && backU > 0.7 ? 0.5 : 0.08);
        } else if (p.mode === 'pulse') {
          if (p.hi !== active) {
            var st = bh.paths[p.hi].p0;
            p.tx = st[0]; p.ty = st[1]; p.alpha = 0;
          } else {
            var u = outU >= 0 ? outU : backU;
            if (u < 0) {
              var st2 = bh.paths[p.hi].p0;
              p.tx = st2[0]; p.ty = st2[1]; p.alpha = 0;
            } else {
              var s = clamp01(u + p.off * (1 - u));
              var pos = bezier(bh.paths[p.hi], outU >= 0 ? easeInOut(s) : 1 - easeInOut(s));
              p.tx = pos[0]; p.ty = pos[1];
              p.alpha = p.baseAlpha * bell(u);
            }
          }
        } else if (p.mode === 'bokeh') {
          p.tx = p.hx + Math.sin(t * 0.00013 * p.speed + p.phase) * 16;
          p.ty = p.hy + Math.cos(t * 0.0001 * p.speed + p.phase * 1.6) * 12;
          p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.0006 + p.phase));
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'prompts') {
      var bp = board;
      var prog2 = fract(te / bp.cycle);
      board.prog = prog2;
      var typeU = win(prog2, 0.04, 0.20);
      var flyU = win(prog2, 0.22, 0.46);
      var ansU = win(prog2, 0.52, 0.88);
      board.typeU = typeU;
      board.cardHot = flyU >= 0 && flyU < 0.4 ? 1 - flyU / 0.4 : (typeU >= 0 ? bell(typeU) * 0.6 : 0);
      board.panelGlow = flyU >= 0 && flyU > 0.6 ? (flyU - 0.6) / 0.4 : (ansU >= 0 ? bell(ansU) * 0.7 : 0);
      P.forEach(function (p) {
        if (p.mode === 'fcard') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.7;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + board.cardHot * 0.3;
        } else if (p.mode === 'fly') {
          if (flyU < 0) {
            p.tx = p.fx; p.ty = p.fy; p.alpha = 0;
          } else {
            var s3 = clamp01(flyU + p.off * (1 - flyU));
            var pos3 = bezier(p.pth, easeInOut(s3));
            p.tx = pos3[0]; p.ty = pos3[1];
            p.alpha = p.baseAlpha * bell(flyU);
          }
        } else if (p.mode === 'ans') {
          p.tx = p.hx + Math.sin(t * 0.0013 + p.phase) * 1;
          p.ty = p.hy + Math.cos(t * 0.0011 + p.phase) * 0.8;
          var vis = ansU >= 0 ? clamp01(ansU * 2.4 - p.off) * (ansU > 0.85 ? (1 - ansU) / 0.15 : 1) : 0;
          p.alpha = p.baseAlpha * vis;
        } else if (p.mode === 'bokeh') {
          p.tx = p.hx + Math.sin(t * 0.00013 * p.speed + p.phase) * 16;
          p.ty = p.hy + Math.cos(t * 0.0001 * p.speed + p.phase * 1.6) * 12;
          p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.0006 + p.phase));
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'instructions') {
      var bi = board;
      // each file drifts along the lane on its own offset
      bi.fpos = [];
      for (var k = 0; k < bi.K; k++) {
        var s4 = fract(te / bi.period + k / bi.K);
        bi.fpos.push([
          bi.lane.x0 + s4 * (bi.lane.x1 - bi.lane.x0),
          bi.lane.y + Math.sin(s4 * Math.PI * 2 + k) * MN * 0.008,
          s4
        ]);
      }
      board.beams = [];
      for (var k2 = 0; k2 < bi.K; k2++) {
        if (!bi.kinds[k2]) continue;
        var dxb = Math.abs(bi.fpos[k2][0] - bi.card.x);
        var reach = MN * 0.16;
        if (dxb < reach) board.beams.push([k2, 1 - dxb / reach]);
      }
      P.forEach(function (p) {
        if (p.mode === 'rcard') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.7;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          var hot = board.beams.length ? 0.3 : 0;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + hot;
        } else if (p.mode === 'file') {
          var fp = bi.fpos[p.fk];
          p.tx = fp[0] + p.ox * bi.fw;
          p.ty = fp[1] + p.oy * bi.fh;
          var edge = Math.min(1, Math.min(fp[2], 1 - fp[2]) * 12);
          var lit = 0;
          board.beams.forEach(function (bm) { if (bm[0] === p.fk) lit = bm[1]; });
          var base = bi.kinds[p.fk] ? 0.9 : 0.55;
          p.alpha = p.baseAlpha * base * edge * (0.6 + 0.4 * Math.sin(t * 0.0012 + p.phase)) + lit * 0.45 * edge;
        } else if (p.mode === 'bokeh') {
          p.tx = p.hx + Math.sin(t * 0.00013 * p.speed + p.phase) * 16;
          p.ty = p.hy + Math.cos(t * 0.0001 * p.speed + p.phase * 1.6) * 12;
          p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.0006 + p.phase));
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'agents') {
      var ba = board;
      var slot = Math.floor(te / ba.hold);
      var active2 = slot % 3;
      var slotU = fract(te / ba.hold);
      board.active = active2;
      var linkU = win(slotU, 0.04, 0.30);
      P.forEach(function (p) {
        if (p.mode === 'amb') {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 8;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 6;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0005 + p.phase));
        } else if (p.mode === 'mask') {
          p.tx = p.hx + Math.sin(t * 0.0007 * p.speed + p.phase) * 2;
          p.ty = p.hy + Math.cos(t * 0.0006 * p.speed + p.phase) * 1.6;
          var on = p.mi === active2;
          p.alpha = p.baseAlpha * (on ? (0.8 + 0.2 * Math.sin(t * 0.002 + p.phase)) : 0.22);
        } else if (p.mode === 'pulse') {
          if (p.mi !== active2 || linkU < 0) {
            var st3 = ba.paths[p.mi].p0;
            p.tx = st3[0]; p.ty = st3[1]; p.alpha = 0;
          } else {
            var s5 = clamp01(linkU + p.off * (1 - linkU));
            var pos5 = bezier(ba.paths[p.mi], easeInOut(s5));
            p.tx = pos5[0]; p.ty = pos5[1];
            p.alpha = p.baseAlpha * bell(linkU);
          }
        } else if (p.mode === 'bokeh') {
          p.tx = p.hx + Math.sin(t * 0.00013 * p.speed + p.phase) * 16;
          p.ty = p.hy + Math.cos(t * 0.0001 * p.speed + p.phase * 1.6) * 12;
          p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.0006 + p.phase));
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'vendors') {
      var bv = board;
      var rowProg = fract(te / bv.cycle);
      board.rowProg = rowProg;
      P.forEach(function (p) {
        if (p.mode === 'node') {
          p.tx = p.hx + Math.sin(t * 0.0006 * p.speed + p.phase) * 2;
          p.ty = p.hy + Math.cos(t * 0.0005 * p.speed + p.phase) * 1.6;
          var pulse = p.ri === 3 ? 0.25 * bell(clamp01(rowProg)) : 0;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0011 + p.phase)) + pulse;
        } else if (p.mode === 'rowpulse') {
          var s6 = fract(p.off + rowProg);
          p.tx = bv.cols[0] - MN * 0.06 + s6 * (bv.cols[2] - bv.cols[0] + MN * 0.12);
          p.ty = bv.rows[3] + Math.sin(s6 * Math.PI * 3 + p.phase) * 3;
          var edge2 = Math.min(1, Math.min(s6, 1 - s6) * 10);
          p.alpha = p.baseAlpha * edge2 * 0.85;
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'skills') {
      P.forEach(function (p) {
        if (p.mode === 'core') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.8;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.7;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0011 + p.phase));
        } else if (p.mode === 'sat') {
          p.tx = p.hx + Math.sin(t * 0.001 + p.phase) * 1;
          p.ty = p.hy + Math.cos(t * 0.0009 + p.phase) * 0.8;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.0009 + p.phase));
        } else if (p.mode === 'bokeh') {
          p.tx = p.hx + Math.sin(t * 0.00013 * p.speed + p.phase) * 16;
          p.ty = p.hy + Math.cos(t * 0.0001 * p.speed + p.phase * 1.6) * 12;
          p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.0006 + p.phase));
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'disclosure') {
      var bd = board;
      var prog3 = fract(te / bd.cycle);
      board.prog = prog3;
      // stage 0: sliver only, stage 1: body flies in, stage 2: one file
      var bodyU = win(prog3, 0.30, 0.52);
      var fileU = win(prog3, 0.62, 0.80);
      board.stage = prog3 < 0.30 ? 0 : (prog3 < 0.58 ? 1 : (prog3 < 0.92 ? 2 : 2));
      board.fadeU = prog3 > 0.92 ? (1 - prog3) / 0.08 : 1;
      board.bodyU = bodyU; board.fileU = fileU;
      P.forEach(function (p) {
        if (p.mode === 'ctx') {
          p.tx = p.hx + Math.sin(t * 0.0013 + p.phase) * 0.8;
          p.ty = p.hy + Math.cos(t * 0.0011 + p.phase) * 0.6;
          var vis2 = 0;
          if (p.tier === 0) vis2 = 1;
          else if (p.tier === 1) vis2 = (bodyU >= 0 && bodyU > 0.6) || prog3 > 0.52 ? 1 : 0;
          else vis2 = (fileU >= 0 && fileU > 0.6) || prog3 > 0.80 ? 1 : 0;
          vis2 *= board.fadeU;
          p.alpha = p.baseAlpha * vis2 * (0.55 + 0.45 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'body') {
          if (bodyU < 0) {
            p.tx = bd.toPanel.p0[0]; p.ty = bd.toPanel.p0[1]; p.alpha = 0;
          } else {
            var s7 = clamp01(bodyU + p.off * (1 - bodyU));
            var pos7 = bezier(bd.toPanel, easeInOut(s7));
            p.tx = pos7[0]; p.ty = pos7[1];
            p.alpha = p.baseAlpha * bell(bodyU);
          }
        } else if (p.mode === 'filefly') {
          if (fileU < 0) {
            p.tx = bd.filePth.p0[0]; p.ty = bd.filePth.p0[1]; p.alpha = 0;
          } else {
            var s8 = clamp01(fileU + p.off * (1 - fileU));
            var pos8 = bezier(bd.filePth, easeInOut(s8));
            p.tx = pos8[0]; p.ty = pos8[1];
            p.alpha = p.baseAlpha * bell(fileU);
          }
        } else if (p.mode === 'skel') {
          p.tx = p.hx + Math.sin(t * 0.001 + p.phase) * 1;
          p.ty = p.hy + Math.cos(t * 0.0009 + p.phase) * 0.8;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.0009 + p.phase));
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'portable') {
      var bo = board;
      var prog4 = fract(te / bo.cycle);
      board.prog = prog4;
      // four sending windows, one per assistant, then a quiet beat
      var reached = [];
      var sendU = [-1, -1, -1, -1];
      for (var v = 0; v < 4; v++) {
        var a0 = 0.04 + v * 0.20;
        sendU[v] = win(prog4, a0, a0 + 0.14);
        reached.push(prog4 > a0 + 0.10);
      }
      board.sendU = sendU; board.reached = reached;
      P.forEach(function (p) {
        if (p.mode === 'core') {
          p.tx = p.hx + Math.sin(t * 0.0011 + p.phase) * 0.9;
          p.ty = p.hy + Math.cos(t * 0.0009 + p.phase) * 0.7;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'send') {
          var u2 = sendU[p.vi];
          if (u2 < 0) {
            p.tx = bo.paths[p.vi].p0[0]; p.ty = bo.paths[p.vi].p0[1]; p.alpha = 0;
          } else {
            var s9 = clamp01(u2 + p.off * (1 - u2));
            var pos9 = bezier(bo.paths[p.vi], easeInOut(s9));
            p.tx = pos9[0]; p.ty = pos9[1];
            p.alpha = p.baseAlpha * bell(u2);
          }
        } else if (p.mode === 'res') {
          p.tx = p.hx + Math.sin(t * 0.0008 * p.speed + p.phase) * 1.8;
          p.ty = p.hy + Math.cos(t * 0.0007 * p.speed + p.phase) * 1.4;
          var on2 = reached[p.vi] ? 1 : 0;
          var late = prog4 > 0.95 ? (1 - prog4) / 0.05 : 1;
          p.alpha = p.baseAlpha * on2 * late * (0.55 + 0.45 * Math.sin(t * 0.0012 + p.phase));
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });

    } else if (sceneName === 'map') {
      P.forEach(function (p) {
        if (p.mode === 'q') {
          p.tx = p.hx + Math.sin(t * 0.0006 * p.speed + p.phase) * 2;
          p.ty = p.hy + Math.cos(t * 0.0005 * p.speed + p.phase) * 1.6;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'bokeh') {
          p.tx = p.hx + Math.sin(t * 0.00013 * p.speed + p.phase) * 16;
          p.ty = p.hy + Math.cos(t * 0.0001 * p.speed + p.phase * 1.6) * 12;
          p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.0006 + p.phase));
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
  function drawMaja(x, y, s, a, t) {
    if (a <= 0.01) return;
    ctx.strokeStyle = 'rgba(200,200,215,' + (0.5 * a) + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y - 10 * s, 7 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + 12 * s, 12 * s, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    // a small candle spark: the idea forming
    var pulse = 0.5 + 0.5 * Math.sin(t * 0.002);
    ctx.fillStyle = 'rgba(245,166,35,' + (0.7 * a * pulse) + ')';
    ctx.beginPath();
    ctx.arc(x + 11 * s, y - 17 * s, 1.4 + pulse * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawCardBox(c, a, hot) {
    if (a <= 0.01) return;
    ctx.strokeStyle = hot > 0.02
      ? 'rgba(255,138,102,' + ((0.3 + 0.35 * hot) * a) + ')'
      : 'rgba(200,200,215,' + (0.32 * a) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 5);
    ctx.stroke();
    // folded corner, the mark of a markdown file
    ctx.beginPath();
    ctx.moveTo(c.x + c.w / 2 - 9, c.y - c.h / 2);
    ctx.lineTo(c.x + c.w / 2 - 9, c.y - c.h / 2 + 9);
    ctx.lineTo(c.x + c.w / 2, c.y - c.h / 2 + 9);
    ctx.stroke();
  }
  function drawFolder(f, a, hot) {
    if (a <= 0.01) return;
    var x = f.x - f.w / 2, y = f.y - f.h / 2;
    ctx.strokeStyle = hot > 0.02
      ? 'rgba(255,77,28,' + ((0.35 + 0.3 * hot) * a) + ')'
      : 'rgba(200,200,215,' + (0.36 * a) + ')';
    ctx.lineWidth = 1.1;
    // tab
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + f.w * 0.26, y);
    ctx.lineTo(x + f.w * 0.32, y - f.h * 0.09);
    ctx.lineTo(x + f.w * 0.06, y - f.h * 0.09);
    ctx.closePath();
    ctx.stroke();
    // body
    ctx.beginPath();
    ctx.roundRect(x, y, f.w, f.h, 6);
    ctx.stroke();
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
  function drawGlow(x, y, r, alpha, warm) {
    if (alpha <= 0.02) return;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    var col = warm ? '245,166,35' : '255,77,28';
    g.addColorStop(0, 'rgba(' + col + ',' + alpha + ')');
    g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function labelText(text, x, y, alpha, color) {
    ctx.font = '11px "JetBrains Mono", Menlo, monospace';
    try { ctx.letterSpacing = '2px'; } catch (e) { /* older engines */ }
    ctx.fillStyle = 'rgba(' + (color || '200,200,215') + ',' + alpha + ')';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* older engines */ }
    ctx.textAlign = 'left';
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

    } else if (sceneName === 'lost') {
      drawMaja(board.kim.x, board.kim.y, 1.15, sf, t);
      // the wandering names, drawn where their clouds are right now
      if (board.cw) {
        board.CC.forEach(function (c, ci) {
          var w2 = board.cw[ci];
          var breathe = 0.4 + 0.25 * Math.sin(t * 0.0009 + ci * 1.9);
          labelText(c.text, w2[0], w2[1] + c.r * 1.5 + 14, breathe * sf);
        });
      }

    } else if (sceneName === 'harness') {
      drawLinksSet(1);
      board.HB.forEach(function (b, i) {
        var on = board.active === i;
        drawBoxNode(b, sf, on ? 0.8 : 0);
        labelText(b.text, b.x, b.y + b.h * 0.5 + 20, (on ? 0.75 : 0.45) * sf);
        if (on && board.flare > 0.02) {
          drawGlow(b.x, b.y, b.w * 1.2, 0.12 * board.flare * sf, false);
        }
      });
      board.paths.forEach(function (pth, i) {
        strokePath(pth, 'rgba(200,200,215,' + ((board.active === i ? 0.20 : 0.08) * sf) + ')', 1);
      });

    } else if (sceneName === 'prompts') {
      drawCardBox(board.card, sf, board.cardHot || 0);
      // chat panel
      var pn = board.panel;
      var glow = board.panelGlow || 0;
      ctx.strokeStyle = glow > 0.05
        ? 'rgba(255,77,28,' + ((0.24 + glow * 0.3) * sf) + ')'
        : 'rgba(200,200,215,' + (0.32 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pn.x - pn.w / 2, pn.y - pn.h / 2, pn.w, pn.h, 6);
      ctx.stroke();
      // input row at the panel foot where /tests is typed
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.2 * sf) + ')';
      ctx.beginPath();
      ctx.moveTo(pn.x - pn.w / 2 + 6, pn.y + pn.h / 2 - 26);
      ctx.lineTo(pn.x + pn.w / 2 - 6, pn.y + pn.h / 2 - 26);
      ctx.stroke();
      if (board.typeU >= 0) {
        var chars = Math.max(1, Math.ceil(board.typeU * 6));
        labelText('/TESTS'.slice(0, chars), pn.x - pn.w * 0.16, pn.y + pn.h / 2 - 10, 0.85 * sf, '245,166,35');
      }
      if (glow > 0.05) drawGlow(pn.x, pn.y, pn.w * 1.3, 0.08 * glow * sf, false);

    } else if (sceneName === 'instructions') {
      drawCardBox(board.card, sf, board.beams && board.beams.length ? 0.6 : 0);
      // lane hairline
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.1 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(board.lane.x0, board.lane.y + board.fh * 0.75);
      ctx.lineTo(board.lane.x1, board.lane.y + board.fh * 0.75);
      ctx.stroke();
      // the passing files
      if (board.fpos) {
        board.fpos.forEach(function (fp, k) {
          var edge = Math.min(1, Math.min(fp[2], 1 - fp[2]) * 12);
          if (edge <= 0.03) return;
          var lit = 0;
          board.beams.forEach(function (bm) { if (bm[0] === k) lit = bm[1]; });
          var fbox = { x: fp[0], y: fp[1], w: board.fw, h: board.fh };
          drawCardBox(fbox, sf * edge, lit);
          labelText(board.names[k], fp[0], fp[1] + board.fh * 0.85 + 6,
            (0.3 + lit * 0.45) * edge * sf, lit > 0.3 ? '255,138,102' : '200,200,215');
          if (lit > 0.05) {
            // the rule reaches down to its file
            ctx.strokeStyle = 'rgba(255,138,102,' + (0.4 * lit * sf) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(board.card.x, board.card.y + board.card.h / 2);
            ctx.lineTo(fp[0], fp[1] - board.fh * 0.6);
            ctx.stroke();
            drawGlow(fp[0], fp[1], board.fw * 1.6, 0.1 * lit * sf, false);
          }
        });
      }

    } else if (sceneName === 'agents') {
      // the ambient AGENTS.md field, present before anyone chooses
      var fd = board.field;
      var breathe2 = 0.7 + 0.3 * Math.sin(t * 0.0006);
      ctx.strokeStyle = 'rgba(245,166,35,' + (0.16 * breathe2 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 7]);
      ctx.beginPath();
      ctx.roundRect(fd.x0, fd.y0, fd.x1 - fd.x0, fd.y1 - fd.y0, 10);
      ctx.stroke();
      ctx.setLineDash([]);
      drawMaja(board.kim.x, board.kim.y, 1.15, sf, t);
      board.masks.forEach(function (m, i) {
        var on = board.active === i;
        ctx.strokeStyle = on
          ? 'rgba(255,77,28,' + (0.6 * sf) + ')'
          : 'rgba(200,200,215,' + (0.2 * sf) + ')';
        ctx.lineWidth = on ? 1.3 : 1;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 1.25, 0, Math.PI * 2);
        ctx.stroke();
        labelText(m.text, m.x, m.y + m.r * 1.25 + 18, (on ? 0.75 : 0.4) * sf,
          on ? '255,138,102' : '200,200,215');
        if (on) drawGlow(m.x, m.y, m.r * 2.4, 0.1 * sf, false);
      });
      strokePath(board.paths[board.active || 0],
        'rgba(255,138,102,' + (0.22 * sf) + ')', 1);

    } else if (sceneName === 'vendors') {
      var bv2 = board;
      // column headers
      bv2.heads.forEach(function (h2, ci) {
        labelText(h2, bv2.cols[ci], bv2.rows[0] - MN * 0.055, 0.7 * sf);
      });
      // row hairlines and cell names
      for (var ri = 0; ri < 4; ri++) {
        var skillRow = ri === 3;
        ctx.strokeStyle = skillRow
          ? 'rgba(245,166,35,' + (0.22 * sf) + ')'
          : 'rgba(200,200,215,' + (0.1 * sf) + ')';
        ctx.lineWidth = skillRow ? 1.1 : 1;
        ctx.beginPath();
        ctx.moveTo(bv2.cols[0] - MN * 0.09, bv2.rows[ri]);
        ctx.lineTo(bv2.cols[2] + MN * 0.09, bv2.rows[ri]);
        ctx.stroke();
        labelText(bv2.rowNames[ri], bv2.cols[0] - MN * (isMobile ? 0.13 : 0.16), bv2.rows[ri] + 4,
          (skillRow ? 0.7 : 0.5) * sf, skillRow ? '245,166,35' : '200,200,215');
        for (var ci2 = 0; ci2 < 3; ci2++) {
          var cellTxt = bv2.cells[ri][ci2];
          var none = cellTxt === 'NO EQUIVALENT';
          labelText(cellTxt, bv2.cols[ci2], bv2.rows[ri] + 22,
            (none ? 0.22 : (skillRow ? 0.6 : 0.38)) * sf,
            skillRow ? '255,138,102' : '200,200,215');
        }
      }

    } else if (sceneName === 'skills') {
      var breathe3 = 0.5 + 0.5 * Math.sin(t * 0.0008);
      drawFolder(board.fold, sf, 0.15 + breathe3 * 0.2);
      drawCardBox(board.core, sf, 0.3 + breathe3 * 0.3);
      labelText('SKILL.MD', board.core.x, board.core.y - board.core.h * 0.5 - 10, 0.7 * sf, '255,138,102');
      board.sats.forEach(function (sb) {
        drawBoxNode(sb, sf, 0);
        labelText(sb.text, sb.x, sb.y + sb.h * 0.5 + 16, 0.45 * sf);
        // the heart references its tools
        ctx.strokeStyle = 'rgba(200,200,215,' + (0.14 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(board.core.x, board.core.y + board.core.h / 2);
        ctx.lineTo(sb.x, sb.y - sb.h / 2);
        ctx.stroke();
      });
      drawGlow(board.core.x, board.core.y, board.core.w, 0.05 + 0.04 * breathe3, false);

    } else if (sceneName === 'disclosure') {
      var bd2 = board;
      var pn2 = bd2.panel;
      // context window
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.34 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pn2.x - pn2.w / 2, pn2.y - pn2.h / 2, pn2.w, pn2.h, 6);
      ctx.stroke();
      // the always-present sliver
      ctx.strokeStyle = 'rgba(245,166,35,' + (0.4 * sf) + ')';
      ctx.beginPath();
      ctx.moveTo(pn2.x - pn2.w / 2 + 5, pn2.y - pn2.h * 0.5 + pn2.h * 0.16);
      ctx.lineTo(pn2.x + pn2.w / 2 - 5, pn2.y - pn2.h * 0.5 + pn2.h * 0.16);
      ctx.stroke();
      drawFolder(bd2.fold, sf, bd2.stage >= 1 ? 0.5 : 0);
      // stage captions, in the open column between window and skill
      var stages = ['1 · NAME + DESCRIPTION', '2 · SKILL.MD ON ACTIVATION', '3 · FILES ONLY WHEN USED'];
      var capX = (pn2.x + bd2.fold.x) / 2;
      stages.forEach(function (s0, si) {
        var on = bd2.stage === si;
        labelText(s0, capX, pn2.y - 22 + si * 22,
          (on ? 0.8 : 0.3) * sf, on ? '255,138,102' : '200,200,215');
      });
      if (bd2.bodyU >= 0) strokePath(bd2.toPanel, 'rgba(255,138,102,' + (0.2 * sf) + ')', 1);
      if (bd2.fileU >= 0) strokePath(bd2.filePth, 'rgba(245,166,35,' + (0.2 * sf) + ')', 1);

    } else if (sceneName === 'portable') {
      drawFolder(board.fold, sf, 0.3);
      labelText('SKILL.MD', board.fold.x, board.fold.y + 4, 0.55 * sf, '255,138,102');
      board.nodes.forEach(function (nd, i) {
        var on = board.reached && board.reached[i];
        ctx.strokeStyle = on
          ? 'rgba(255,77,28,' + (0.5 * sf) + ')'
          : 'rgba(200,200,215,' + (0.2 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, board.nr * 1.3, 0, Math.PI * 2);
        ctx.stroke();
        labelText(nd.text, nd.x, nd.y + board.nr * 1.3 + 18, (on ? 0.7 : 0.4) * sf);
        if (on) drawGlow(nd.x, nd.y, board.nr * 2.2, 0.08 * sf, false);
      });
      board.paths.forEach(function (pth, i) {
        var uu = board.sendU ? board.sendU[i] : -1;
        strokePath(pth, 'rgba(200,200,215,' + ((uu >= 0 ? 0.2 : 0.06) * sf) + ')', 1);
      });

    } else if (sceneName === 'map') {
      board.Q.forEach(function (qd, qi) {
        var skill = qi === 3;
        ctx.strokeStyle = skill
          ? 'rgba(255,77,28,' + (0.5 * sf) + ')'
          : 'rgba(200,200,215,' + (0.22 * sf) + ')';
        ctx.lineWidth = skill ? 1.2 : 1;
        ctx.beginPath();
        ctx.roundRect(qd.x - qd.w / 2, qd.y - qd.h / 2, qd.w, qd.h, 8);
        ctx.stroke();
        labelText(qd.text, qd.x, qd.y - 6, (skill ? 0.85 : 0.6) * sf,
          skill ? '255,138,102' : '200,200,215');
        labelText(qd.sub, qd.x, qd.y + 16, (skill ? 0.55 : 0.38) * sf);
        if (skill) drawGlow(qd.x, qd.y, qd.w * 0.7, 0.06 * sf, false);
      });

    } else if (sceneName === 'outro') {
      // nothing structural: only the mark
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
      return {
        scene: sceneName,
        te: Math.round(performance.now() - sceneT0),
        fade: sceneFade,
        logoPhase: logoPhase,
        stage: board.stage,
        active: board.active
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
