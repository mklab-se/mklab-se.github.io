/* ============================================================
   MKLab Living Canvas: MCP edition
   One particle system behind the whole deck. Slides declare a
   scene via <section data-scene="...">; scrolling morphs the
   same lights from one scene into the next.
   Scenes: title, gap, harness, protocol, loop, local, remote,
   versus, choosing, ahead, outro.
   Based on assets/js/talks/copilot-customization.js.
   No dependencies. Decorative only (canvas is aria-hidden).
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
  // shared idle motions
  function dustTarget(p, t) {
    p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
    p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
    p.alpha = p.baseAlpha;
  }
  function bokehTarget(p, t) {
    p.tx = p.hx + Math.sin(t * 0.00013 * p.speed + p.phase) * 16;
    p.ty = p.hy + Math.cos(t * 0.0001 * p.speed + p.phase * 1.6) * 12;
    p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.0006 + p.phase));
  }
  function assignDust(p) {
    p.mode = 'dust';
    p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
    p.baseAlpha = rand(0.04, 0.15); p.sizeMul = rand(0.4, 1.2); p.fast = false;
  }
  function assignBokeh(p) {
    p.mode = 'bokeh';
    p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.05, 0.95);
    p.baseAlpha = rand(0.05, 0.12); p.sizeMul = rand(2.4, 4.0); p.fast = false;
  }
  function cardHome(p, c, li, rowsN) {
    // text-line home inside a card c = {x, y, w, h}
    var lw = 0.45 + fract(Math.sin(li * 91.7) * 437.5) * 0.45;
    p.hx = c.x - c.w * 0.4 + fract(p.seed * 113.7) * c.w * 0.8 * lw;
    p.hy = c.y - c.h * 0.36 + li * c.h * 0.72 / Math.max(1, rowsN - 1) + rand(-1, 1);
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
        assignBokeh(p);
        p.baseAlpha = rand(0.06, 0.16); p.sizeMul = rand(2.6, 4.2);
      }
    });
    var pos = P.map(function (p) { return [p.hx, p.hy]; });
    members.forEach(function (m) {
      links = links.concat(buildLinks(m, pos));
    });
    board.labels = [];
  };

  // -- gap: the assistant reaches for the company systems and is
  // -- stopped at the boundary; the systems stay dark
  layouts.gap = function () {
    var core = { x: W * (isMobile ? 0.5 : 0.60), y: H * (isMobile ? 0.28 : 0.42), r: MN * 0.10 };
    var bx = W * (isMobile ? 0.5 : 0.755);
    var nodes = isMobile ? [
      { x: W * 0.70, y: H * 0.62, w: MN * 0.09, h: MN * 0.07, text: 'TICKETS' },
      { x: W * 0.30, y: H * 0.66, w: MN * 0.09, h: MN * 0.07, text: 'DATABASE' },
      { x: W * 0.55, y: H * 0.80, w: MN * 0.09, h: MN * 0.07, text: 'WIKI' }
    ] : [
      { x: W * 0.885, y: H * 0.20, w: MN * 0.085, h: MN * 0.065, text: 'TICKETS' },
      { x: W * 0.895, y: H * 0.47, w: MN * 0.085, h: MN * 0.065, text: 'DATABASE' },
      { x: W * 0.875, y: H * 0.74, w: MN * 0.085, h: MN * 0.065, text: 'WIKI' }
    ];
    board = {
      core: core, bx: bx, nodes: nodes,
      labels: [
        { x: core.x, y: core.y + core.r * 1.5, text: 'YOUR ASSISTANT' },
        { x: isMobile ? W * 0.5 : W * 0.885, y: (isMobile ? H * 0.9 : H * 0.9), text: 'YOUR SYSTEMS' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.32) {
        p.mode = 'brain';
        brainHome(p, core);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.18, 0.55);
        p.sizeMul = rand(0.35, 0.7); p.fast = false;
      } else if (p.seed < 0.44) {
        p.mode = 'pulse';
        p.ni = i % 3;
        p.off = rand(0, 1);
        p.dur = rand(1500, 2600);
        p.baseAlpha = rand(0.5, 1); p.sizeMul = rand(0.32, 0.58); p.fast = true;
      } else if (p.seed < 0.62) {
        p.mode = 'node';
        p.ni = i % 3;
        var nd = nodes[p.ni];
        p.hx = nd.x + rand(-nd.w * 0.42, nd.w * 0.42);
        p.hy = nd.y + rand(-nd.h * 0.38, nd.h * 0.38);
        p.baseAlpha = rand(0.1, 0.3); p.sizeMul = rand(0.35, 0.65); p.fast = false;
      } else if (p.seed < 0.68) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 60);
  };

  // -- harness: the application around the model; prompts go in, the
  // -- tool catalog joins, answers come back out
  layouts.harness = function () {
    var user = { x: W * (isMobile ? 0.16 : 0.46), y: H * (isMobile ? 0.24 : 0.48) };
    var box = isMobile
      ? { x0: W * 0.30, x1: W * 0.96, y0: H * 0.08, y1: H * 0.60 }
      : { x0: W * 0.54, x1: W * 0.96, y0: H * 0.12, y1: H * 0.84 };
    var llm = { x: W * (isMobile ? 0.74 : 0.80), y: H * (isMobile ? 0.34 : 0.44), r: MN * 0.095 };
    var socks = isMobile ? [
      { x: W * 0.40, y: H * 0.18, w: MN * 0.05 },
      { x: W * 0.38, y: H * 0.34, w: MN * 0.05 },
      { x: W * 0.42, y: H * 0.50, w: MN * 0.05 }
    ] : [
      { x: W * 0.60, y: H * 0.22, w: MN * 0.045 },
      { x: W * 0.585, y: H * 0.46, w: MN * 0.045 },
      { x: W * 0.60, y: H * 0.70, w: MN * 0.045 }
    ];
    var edge = [box.x0, user.y];
    board = {
      user: user, box: box, llm: llm, socks: socks,
      cycle: 6400,
      uChain: [
        makePath(user.x + 14, user.y - 4, edge[0], edge[1] - 8, 0.06),
        makePath(edge[0], edge[1] - 8, llm.x - llm.r * 0.9, llm.y + llm.r * 0.2, 0.12)
      ],
      aChain: [
        makePath(llm.x - llm.r * 0.8, llm.y - llm.r * 0.5, edge[0], edge[1] - 26, 0.12),
        makePath(edge[0], edge[1] - 26, user.x + 12, user.y - 14, 0.06)
      ],
      catPaths: socks.map(function (s) {
        return makePath(s.x + s.w * 0.7, s.y, llm.x - llm.r * 0.6, llm.y, 0.16);
      }),
      labels: [
        { x: user.x, y: user.y + 50, text: 'YOU' },
        { x: (box.x0 + box.x1) / 2, y: box.y0 - 12, text: 'HARNESS · THE HOST' },
        { x: llm.x, y: llm.y + llm.r * 1.45, text: 'LLM' },
        { x: socks[2].x, y: socks[2].y + socks[2].w * 1.4 + 14, text: 'MCP SERVERS' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.30) {
        p.mode = 'brain';
        brainHome(p, llm);
        p.baseAlpha = p.ember ? rand(0.35, 0.9) : rand(0.2, 0.6);
        p.sizeMul = rand(0.35, 0.72); p.fast = false;
      } else if (p.seed < 0.40) {
        p.mode = 'prompt';
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.50) {
        p.mode = 'cat';
        p.si = i % 3;
        p.off = rand(0, 0.14);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.58) {
        p.mode = 'ans';
        p.off = rand(0, 1);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.70) {
        p.mode = 'sock';
        p.si = i % 3;
        var sb = socks[p.si];
        p.hx = sb.x + rand(-sb.w * 0.5, sb.w * 0.5);
        p.hy = sb.y + rand(-sb.w * 0.5, sb.w * 0.5);
        p.baseAlpha = rand(0.25, 0.6); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.75) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 56);
  };

  // -- protocol: the specification as a timeline of dated revisions,
  // -- the current one burning brightest
  layouts.protocol = function () {
    var y = H * (isMobile ? 0.30 : 0.42);
    var x0 = W * (isMobile ? 0.08 : 0.52), x1 = W * (isMobile ? 0.92 : 0.95);
    var dates = ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25', '2026-07-28'];
    var nodes = dates.map(function (d, i) {
      return {
        x: x0 + (x1 - x0) * i / (dates.length - 1),
        y: y,
        r: i === dates.length - 1 ? MN * 0.028 : MN * 0.017,
        text: d,
        current: i === dates.length - 1
      };
    });
    board = {
      y: y, x0: x0, x1: x1, nodes: nodes,
      cycle: 5200,
      labels: [
        { x: (x0 + x1) / 2, y: y - MN * (isMobile ? 0.16 : 0.20), text: 'MODELCONTEXTPROTOCOL.IO' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.42) {
        p.mode = 'node';
        p.ni = i % 5;
        var nd = nodes[p.ni];
        var a = rand(0, Math.PI * 2);
        var d = Math.pow(Math.random(), 0.6) * nd.r * 1.6;
        p.hx = nd.x + Math.cos(a) * d;
        p.hy = nd.y + Math.sin(a) * d;
        p.baseAlpha = nd.current ? rand(0.55, 1) : rand(0.3, 0.65);
        p.sizeMul = rand(0.4, 0.75); p.fast = false;
      } else if (p.seed < 0.52) {
        p.mode = 'sweep';
        p.off = rand(0, 1);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.58) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- loop: the whole orchestration, discovery to streamed answer,
  // -- with the harness in the middle of every arrow
  layouts.loop = function () {
    var user = { x: W * 0.06, y: H * 0.34 };
    var harn = { x: W * 0.25, y: H * 0.34, w: MN * 0.11, h: MN * 0.15 };
    var llm = { x: W * (isMobile ? 0.55 : 0.53), y: H * 0.30, r: MN * 0.085 };
    var srvA = { x: W * 0.81, y: H * 0.13, w: MN * 0.075, h: MN * 0.10 };
    var srvB = { x: W * 0.84, y: H * 0.48, w: MN * 0.075, h: MN * 0.10 };
    board = {
      user: user, harn: harn, llm: llm, srvA: srvA, srvB: srvB,
      cycle: 13000,
      u2h: makePath(user.x + 14, user.y, harn.x - harn.w * 0.72, harn.y, 0.08),
      h2l: makePath(harn.x + harn.w * 0.72, harn.y - harn.h * 0.1, llm.x - llm.r * 0.85, llm.y, 0.08),
      discA: makePath(harn.x + harn.w * 0.5, harn.y - harn.h * 0.5, srvA.x - srvA.w * 0.7, srvA.y + srvA.h * 0.3, -0.3),
      discB: makePath(harn.x + harn.w * 0.5, harn.y + harn.h * 0.5, srvB.x - srvB.w * 0.7, srvB.y - srvB.h * 0.1, 0.26),
      callA: [
        makePath(llm.x - llm.r * 0.4, llm.y - llm.r * 0.7, harn.x + harn.w * 0.4, harn.y - harn.h * 0.55, 0.16),
        makePath(harn.x + harn.w * 0.5, harn.y - harn.h * 0.5, srvA.x - srvA.w * 0.7, srvA.y + srvA.h * 0.3, -0.3)
      ],
      resA: [
        makePath(srvA.x - srvA.w * 0.9, srvA.y + srvA.h * 0.5, harn.x + harn.w * 0.55, harn.y - harn.h * 0.35, 0.22),
        makePath(harn.x + harn.w * 0.65, harn.y - harn.h * 0.15, llm.x - llm.r * 0.95, llm.y - llm.r * 0.35, 0.08)
      ],
      callB: [
        makePath(llm.x - llm.r * 0.3, llm.y + llm.r * 0.8, harn.x + harn.w * 0.4, harn.y + harn.h * 0.55, -0.16),
        makePath(harn.x + harn.w * 0.5, harn.y + harn.h * 0.5, srvB.x - srvB.w * 0.7, srvB.y - srvB.h * 0.1, 0.26)
      ],
      resB: [
        makePath(srvB.x - srvB.w * 0.9, srvB.y - srvB.h * 0.4, harn.x + harn.w * 0.55, harn.y + harn.h * 0.35, -0.22),
        makePath(harn.x + harn.w * 0.65, harn.y + harn.h * 0.15, llm.x - llm.r * 0.95, llm.y + llm.r * 0.45, -0.08)
      ],
      aChain: [
        makePath(llm.x - llm.r * 0.9, llm.y - llm.r * 0.2, harn.x + harn.w * 0.6, harn.y - harn.h * 0.2, 0.08),
        makePath(harn.x - harn.w * 0.6, harn.y - harn.h * 0.2, user.x + 10, user.y - 8, 0.08)
      ],
      labels: [
        { x: user.x, y: user.y + 42, text: 'YOU' },
        { x: harn.x, y: harn.y + harn.h * 0.85 + 14, text: 'HARNESS' },
        { x: harn.x, y: harn.y + harn.h * 0.85 + 32, text: 'CATALOGS LOAD AT STARTUP' },
        { x: llm.x, y: llm.y + llm.r * 1.5, text: 'LLM' },
        { x: srvA.x, y: srvA.y + srvA.h * 0.95 + 6, text: 'TICKETS · SERVER' },
        { x: srvB.x, y: srvB.y + srvB.h * 0.95 + 6, text: 'DATABASE · SERVER' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.20) {
        p.mode = 'brain';
        brainHome(p, llm);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.18, 0.55);
        p.sizeMul = rand(0.32, 0.62); p.fast = false;
      } else if (p.seed < 0.26) {
        p.mode = 'harn';
        p.hx = harn.x + rand(-harn.w * 0.4, harn.w * 0.4);
        p.hy = harn.y + rand(-harn.h * 0.36, harn.h * 0.36);
        p.baseAlpha = rand(0.2, 0.55); p.sizeMul = rand(0.26, 0.46); p.fast = false;
      } else if (p.seed < 0.32) {
        p.mode = 'srv';
        p.si = i % 2;
        var sv = p.si === 0 ? srvA : srvB;
        p.hx = sv.x + rand(-sv.w * 0.4, sv.w * 0.4);
        p.hy = sv.y + rand(-sv.h * 0.34, sv.h * 0.34);
        p.baseAlpha = rand(0.2, 0.55); p.sizeMul = rand(0.26, 0.46); p.fast = false;
      } else if (p.seed < 0.37) {
        p.mode = 'disc';
        p.si = i % 2;
        p.off = rand(0, 0.2);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.42) {
        p.mode = 'u2h'; p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.5); p.fast = true;
      } else if (p.seed < 0.48) {
        p.mode = 'h2l'; p.off = rand(0, 0.14);
        p.baseAlpha = rand(0.4, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.54) {
        p.mode = 'call'; p.off = rand(0, 0.1);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.60) {
        p.mode = 'res'; p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.76) {
        p.mode = 'stream'; p.off = rand(0, 1);
        p.baseAlpha = rand(0.3, 0.8); p.sizeMul = rand(0.26, 0.5); p.fast = true;
      } else {
        assignDust(p);
        p.baseAlpha = rand(0.04, 0.13);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 44);
  };

  // -- local: the whole thing happens inside one laptop; the server
  // -- is a process the harness started
  layouts.local = function () {
    var box = isMobile
      ? { x0: W * 0.06, x1: W * 0.94, y0: H * 0.08, y1: H * 0.58 }
      : { x0: W * 0.50, x1: W * 0.96, y0: H * 0.10, y1: H * 0.80 };
    var harn = { x: W * (isMobile ? 0.30 : 0.62), y: H * (isMobile ? 0.26 : 0.32), w: MN * 0.11, h: MN * 0.13 };
    var proc = { x: W * (isMobile ? 0.70 : 0.845), y: H * (isMobile ? 0.42 : 0.58), w: MN * 0.10, h: MN * 0.12 };
    board = {
      box: box, harn: harn, proc: proc,
      cycle: 4200,
      link: makePath(harn.x + harn.w * 0.55, harn.y + harn.h * 0.35, proc.x - proc.w * 0.55, proc.y - proc.h * 0.35, 0.12),
      labels: [
        { x: (box.x0 + box.x1) / 2, y: box.y1 + 22, text: 'YOUR MACHINE · NOTHING IS HOSTED' },
        { x: harn.x, y: harn.y - harn.h * 0.62 - 10, text: 'HARNESS' },
        { x: proc.x, y: proc.y + proc.h * 0.62 + 18, text: 'SERVER · A PROCESS' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.16) {
        p.mode = 'harn';
        p.hx = harn.x + rand(-harn.w * 0.4, harn.w * 0.4);
        p.hy = harn.y + rand(-harn.h * 0.36, harn.h * 0.36);
        p.baseAlpha = rand(0.25, 0.6); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.36) {
        p.mode = 'script';
        p.li = i % 5;
        cardHome(p, proc, p.li, 5);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.50) {
        p.mode = 'pulse';
        p.dir = p.seed < 0.43 ? 1 : -1;
        p.off = rand(0, 0.14);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.56) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- remote: the server lifts out of the laptop into a hosted zone
  // -- that someone has to operate; everyone connects to it
  layouts.remote = function () {
    var mine = isMobile
      ? { x0: W * 0.05, x1: W * 0.45, y0: H * 0.14, y1: H * 0.46 }
      : { x0: W * 0.50, x1: W * 0.66, y0: H * 0.16, y1: H * 0.60 };
    var harn = { x: (mine.x0 + mine.x1) / 2, y: (mine.y0 + mine.y1) / 2, w: MN * 0.08, h: MN * 0.10 };
    var host = isMobile
      ? { x0: W * 0.55, x1: W * 0.95, y0: H * 0.10, y1: H * 0.50 }
      : { x0: W * 0.76, x1: W * 0.97, y0: H * 0.10, y1: H * 0.72 };
    var srv = { x: (host.x0 + host.x1) / 2, y: H * (isMobile ? 0.30 : 0.34), w: MN * 0.10, h: MN * 0.13 };
    var others = isMobile ? [
      { x: W * 0.18, y: H * 0.70 }, { x: W * 0.44, y: H * 0.78 }
    ] : [
      { x: W * 0.545, y: H * 0.76 }, { x: W * 0.635, y: H * 0.84 }
    ];
    board = {
      mine: mine, harn: harn, host: host, srv: srv, others: others,
      cycle: 4600,
      link: makePath(harn.x + harn.w * 0.6, harn.y - harn.h * 0.2, srv.x - srv.w * 0.6, srv.y, -0.14),
      oPaths: others.map(function (o) {
        return makePath(o.x + 10, o.y - 10, srv.x - srv.w * 0.3, srv.y + srv.h * 0.6, 0.2);
      }),
      labels: [
        { x: (mine.x0 + mine.x1) / 2, y: mine.y1 + 20, text: 'YOUR MACHINE' },
        { x: (host.x0 + host.x1) / 2, y: host.y1 + 20, text: 'HOSTED · SOMEONE OPERATES IT' },
        { x: harn.x, y: harn.y + harn.h * 0.85 + 8, text: 'HARNESS' },
        { x: srv.x, y: srv.y + srv.h * 0.62 + 18, text: 'SERVER' },
        { x: others[0].x - 30, y: others[0].y + 34, text: 'EVERYONE ELSE' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.14) {
        p.mode = 'harn';
        p.hx = harn.x + rand(-harn.w * 0.42, harn.w * 0.42);
        p.hy = harn.y + rand(-harn.h * 0.38, harn.h * 0.38);
        p.baseAlpha = rand(0.25, 0.6); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.32) {
        p.mode = 'srv';
        p.li = i % 5;
        cardHome(p, srv, p.li, 5);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.44) {
        p.mode = 'pulse';
        p.dir = p.seed < 0.38 ? 1 : -1;
        p.off = rand(0, 0.14);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.52) {
        p.mode = 'opulse';
        p.oi = i % 2;
        p.off = rand(0, 0.4);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.26, 0.48); p.fast = true;
      } else if (p.seed < 0.58) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- versus: the same loop on both sides of a hairline; the skill
  // -- pays a sliver of context, the local server pays up front
  layouts.versus = function () {
    var L = {
      fold: { x: W * 0.18, y: H * 0.19, w: MN * 0.15, h: MN * 0.11 },
      script: { x: W * 0.32, y: H * 0.35, w: MN * 0.085, h: MN * 0.10 },
      bar: { x: W * 0.435, y0: H * 0.12, y1: H * 0.40, w: 16, fill: 0.12 }
    };
    var R = {
      proc: { x: W * 0.63, y: H * 0.19, w: MN * 0.10, h: MN * 0.11 },
      schema: { x: W * 0.78, y: H * 0.35, w: MN * 0.085, h: MN * 0.10 },
      bar: { x: W * 0.935, y0: H * 0.12, y1: H * 0.40, w: 16, fill: 0.55 }
    };
    board = {
      L: L, R: R,
      divX: W * 0.5,
      cycle: 5200,
      lLink: makePath(L.fold.x + L.fold.w * 0.5, L.fold.y + L.fold.h * 0.4, L.script.x - L.script.w * 0.4, L.script.y - L.script.h * 0.4, 0.12),
      rLink: makePath(R.proc.x + R.proc.w * 0.5, R.proc.y + R.proc.h * 0.4, R.schema.x - R.schema.w * 0.4, R.schema.y - R.schema.h * 0.4, 0.12),
      labels: [
        { x: W * 0.27, y: H * 0.09, text: 'SKILL + SCRIPTS' },
        { x: W * 0.77, y: H * 0.09, text: 'LOCAL MCP SERVER' },
        { x: L.fold.x, y: L.fold.y + L.fold.h * 0.62 + 16, text: 'SKILL.MD' },
        { x: L.script.x, y: L.script.y + L.script.h * 0.62 + 16, text: 'SCRIPTS' },
        { x: R.proc.x, y: R.proc.y + R.proc.h * 0.62 + 16, text: 'SERVER PROCESS' },
        { x: R.schema.x, y: R.schema.y + R.schema.h * 0.62 + 16, text: 'TOOL SCHEMAS' },
        { x: L.bar.x, y: L.bar.y1 + 20, text: 'LOADS WHEN USED' },
        { x: R.bar.x, y: R.bar.y1 + 20, text: 'PRELOADED' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.14) {
        p.mode = 'lfold';
        p.li = i % 4;
        cardHome(p, L.fold, p.li, 4);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.26) {
        p.mode = 'lscript';
        p.li = i % 4;
        cardHome(p, L.script, p.li, 4);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.40) {
        p.mode = 'rproc';
        p.li = i % 4;
        cardHome(p, R.proc, p.li, 4);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.52) {
        p.mode = 'rschema';
        p.li = i % 4;
        cardHome(p, R.schema, p.li, 4);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.58) {
        p.mode = 'lbar';
        p.hx = L.bar.x + rand(-5, 5);
        p.hy = L.bar.y0 + rand(0, (L.bar.y1 - L.bar.y0) * L.bar.fill);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.70) {
        p.mode = 'rbar';
        p.hx = R.bar.x + rand(-5, 5);
        p.hy = R.bar.y0 + rand(0, (R.bar.y1 - R.bar.y0) * R.bar.fill);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.78) {
        p.mode = 'vpulse';
        p.side = p.seed < 0.74 ? 0 : 1;
        p.off = rand(0, 0.2);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else {
        assignDust(p);
        p.baseAlpha = rand(0.04, 0.12);
      }
    });
    links = [];
  };

  // -- choosing: two rules, three honest exceptions
  layouts.choosing = function () {
    var big = [
      { x: W * 0.30, y: H * 0.17, w: W * 0.33, h: H * 0.16, text: 'USE MCP', sub: 'WHEN THE SERVER IS PROVIDED FOR YOU', hot: true },
      { x: W * 0.69, y: H * 0.17, w: W * 0.33, h: H * 0.16, text: 'WRITE A SKILL', sub: 'WHEN YOU WOULD IMPLEMENT IT YOURSELF', hot: false }
    ];
    var small = [
      { x: W * 0.22, y: H * 0.42, w: W * 0.24, h: H * 0.09, text: 'HARNESS CANNOT RUN SCRIPTS' },
      { x: W * 0.50, y: H * 0.42, w: W * 0.24, h: H * 0.09, text: 'TYPED CONTRACTS REQUIRED' },
      { x: W * 0.78, y: H * 0.42, w: W * 0.24, h: H * 0.09, text: 'SHARED ACROSS THE ORG' }
    ];
    board = {
      big: big, small: small,
      labels: [
        { x: W * 0.5, y: H * 0.53, text: 'THEN A SERVER EARNS ITS PLACE' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.50) {
        p.mode = 'q';
        var gi = i % 5;
        p.qi = gi < 2 ? 0 : (gi < 4 ? 1 : 2 + (i % 3));
        var cd = p.qi < 2 ? big[p.qi] : small[p.qi - 2];
        p.hx = cd.x + rand(-cd.w * 0.42, cd.w * 0.42);
        p.hy = cd.y + rand(-cd.h * 0.34, cd.h * 0.34);
        p.baseAlpha = p.qi === 0 ? rand(0.35, 0.8) : rand(0.2, 0.5);
        p.sizeMul = rand(0.3, 0.58); p.fast = false;
      } else if (p.seed < 0.58) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- ahead: hosted servers gather around the registry, one node a
  // -- familiar face
  layouts.ahead = function () {
    var hub = { x: W * (isMobile ? 0.5 : 0.72), y: H * (isMobile ? 0.34 : 0.44), r: MN * 0.045 };
    var nn = 7;
    var nodes = [];
    for (var k = 0; k < nn; k++) {
      var a = -Math.PI * 0.5 + k * Math.PI * 2 / nn + 0.35;
      var rr = MN * (0.15 + (k % 3) * 0.035);
      nodes.push({
        x: hub.x + Math.cos(a) * rr * (isMobile ? 0.9 : 1.15),
        y: hub.y + Math.sin(a) * rr * 0.85,
        r: MN * 0.022,
        text: k === 2 ? 'SKILLS OVER MCP' : null
      });
    }
    board = {
      hub: hub, nodes: nodes, nn: nn,
      appear: 1100,
      cycle: 5200,
      labels: [
        { x: hub.x, y: H * (isMobile ? 0.10 : 0.13), text: 'MODELCONTEXTPROTOCOL.IO' },
        { x: hub.x, y: hub.y + hub.r * 1.6 + 14, text: 'REGISTRY · PREVIEW' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.16) {
        p.mode = 'hub';
        var a2 = rand(0, Math.PI * 2);
        var d = Math.pow(Math.random(), 0.6) * hub.r;
        p.hx = hub.x + Math.cos(a2) * d;
        p.hy = hub.y + Math.sin(a2) * d * 0.9;
        p.baseAlpha = rand(0.45, 0.9); p.sizeMul = rand(0.38, 0.68); p.fast = false;
      } else if (p.seed < 0.48) {
        p.mode = 'node';
        p.ni = i % nn;
        var nd = nodes[p.ni];
        var a3 = rand(0, Math.PI * 2);
        var d2 = Math.pow(Math.random(), 0.6) * nd.r * 1.4;
        p.hx = nd.x + Math.cos(a3) * d2;
        p.hy = nd.y + Math.sin(a3) * d2;
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.56) {
        p.mode = 'pulse';
        p.ni = i % nn;
        p.off = rand(0, 0.3);
        p.baseAlpha = rand(0.35, 0.75); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.62) {
        assignBokeh(p);
      } else {
        assignDust(p);
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
        assignBokeh(p);
        p.baseAlpha = rand(0.04, 0.12); p.sizeMul = rand(2.4, 4.6);
        p.speed = rand(0.2, 0.7);
      } else {
        assignDust(p);
        p.baseAlpha = rand(0.04, 0.14); p.sizeMul = rand(0.4, 1.0);
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
          bokehTarget(p, t);
        } else {
          p.tx = p.hx + Math.sin(t * 0.0003 * p.speed + p.phase) * 9;
          p.ty = p.hy + Math.cos(t * 0.00024 * p.speed + p.phase * 1.7) * 7;
          p.alpha = p.baseAlpha * (0.8 + 0.2 * Math.sin(t * 0.0012 + p.phase));
        }
      });

    } else if (sceneName === 'gap') {
      var bg = board;
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, 0.15);
        } else if (p.mode === 'pulse') {
          var cyc = fract(t / p.dur + p.off);
          var nd = bg.nodes[p.ni];
          var sx = bg.core.x + bg.core.r * 0.6;
          var sy = bg.core.y + (nd.y - bg.core.y) * 0.25;
          var ex = isMobile ? nd.x : bg.bx;
          var ey = isMobile ? bg.bx : 0;
          var txp, typ;
          if (isMobile) {
            txp = sx + (nd.x - sx) * cyc;
            typ = sy + (H * 0.52 - sy) * easeInOut(cyc);
          } else {
            txp = sx + (ex - sx) * cyc;
            typ = sy + (nd.y - sy) * easeInOut(cyc);
          }
          p.tx = txp; p.ty = typ;
          var fadeIn = clamp01(cyc / 0.15);
          var wallKill = cyc > 0.86 ? 1 - (cyc - 0.86) / 0.14 : 1;
          p.alpha = p.baseAlpha * fadeIn * wallKill * (cyc > 0.82 ? 1.4 : 0.8);
        } else if (p.mode === 'node') {
          p.tx = p.hx; p.ty = p.hy;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0006 * p.speed + p.phase));
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'harness') {
      var bh = board;
      var prog = fract(te / bh.cycle);
      var promptU = win(prog, 0.04, 0.24);
      var catU = win(prog, 0.20, 0.38);
      var agit = win(prog, 0.38, 0.54);
      var ansU = win(prog, 0.56, 0.88);
      board.promptU = promptU; board.catU = catU; board.ansU = ansU;
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, agit >= 0 ? bell(agit) * 0.8 : 0.05);
        } else if (p.mode === 'prompt') {
          if (promptU < 0) {
            p.tx = bh.uChain[0].p0[0]; p.ty = bh.uChain[0].p0[1]; p.alpha = 0;
          } else {
            var s = clamp01(promptU + p.off * (1 - promptU));
            var pos = chainPos(bh.uChain, s);
            p.tx = pos[0]; p.ty = pos[1];
            p.alpha = p.baseAlpha * bell(promptU);
          }
        } else if (p.mode === 'cat') {
          if (catU < 0) {
            p.tx = bh.catPaths[p.si].p0[0]; p.ty = bh.catPaths[p.si].p0[1]; p.alpha = 0;
          } else {
            var s2 = clamp01(catU + p.off * (1 - catU));
            var pos2 = bezier(bh.catPaths[p.si], easeInOut(s2));
            p.tx = pos2[0]; p.ty = pos2[1];
            p.alpha = p.baseAlpha * bell(catU);
          }
        } else if (p.mode === 'ans') {
          if (ansU < 0) {
            p.tx = bh.aChain[0].p0[0]; p.ty = bh.aChain[0].p0[1]; p.alpha = 0;
          } else {
            var s3 = fract(p.off + ansU * 2.0);
            var pos3 = chainPos(bh.aChain, s3);
            p.tx = pos3[0]; p.ty = pos3[1];
            p.alpha = p.baseAlpha * bell(ansU) * bell(clamp01(s3));
          }
        } else if (p.mode === 'sock') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 1;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.8;
          var hot = catU >= 0 && catU < 0.4 ? 0.35 : 0;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + hot;
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'protocol') {
      var bp = board;
      var sweepP = fract(te / bp.cycle);
      board.sweepP = sweepP;
      P.forEach(function (p) {
        if (p.mode === 'node') {
          var nd = bp.nodes[p.ni];
          p.tx = p.hx + Math.sin(t * 0.0008 * p.speed + p.phase) * 1.8;
          p.ty = p.hy + Math.cos(t * 0.0007 * p.speed + p.phase) * 1.5;
          var lit = Math.abs(sweepP * (bp.nn || 1));
          var sweepX = bp.x0 + (bp.x1 - bp.x0) * sweepP;
          var near = Math.max(0, 1 - Math.abs(sweepX - nd.x) / (MN * 0.06));
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0011 + p.phase)) + near * 0.35;
        } else if (p.mode === 'sweep') {
          var s4 = fract(p.off + sweepP);
          p.tx = bp.x0 + (bp.x1 - bp.x0) * s4;
          p.ty = bp.y + Math.sin(s4 * Math.PI * 4 + p.phase) * 2.5;
          var edge = Math.min(1, Math.min(s4, 1 - s4) * 10);
          p.alpha = p.baseAlpha * edge * 0.8;
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'loop') {
      var bl = board;
      var prog2 = fract(te / bl.cycle);
      board.prog = prog2;
      var discOut = win(prog2, 0.01, 0.05);
      var discBack = win(prog2, 0.05, 0.09);
      var legs = {
        u2h: win(prog2, 0.10, 0.16),
        h2l: win(prog2, 0.165, 0.22)
      };
      var think1 = win(prog2, 0.22, 0.26);
      var callA = win(prog2, 0.26, 0.34);
      var resA = win(prog2, 0.34, 0.42);
      var think2 = win(prog2, 0.42, 0.48);
      var callB = win(prog2, 0.48, 0.56);
      var resB = win(prog2, 0.56, 0.63);
      var think3 = win(prog2, 0.63, 0.68);
      var ansU2 = win(prog2, 0.68, 0.92);
      var agit2 = 0;
      if (think1 >= 0) agit2 = bell(think1);
      else if (think2 >= 0) agit2 = bell(think2);
      else if (think3 >= 0) agit2 = bell(think3);
      board.legs = legs;
      board.uCallA = callA; board.uResA = resA;
      board.uCallB = callB; board.uResB = resB;
      board.ansU = ansU2; board.agit = agit2;
      board.srvFlare = [0, 0];
      if (discOut >= 0) { board.srvFlare = [bell(discOut), bell(discOut)]; }
      if (discBack >= 0) { board.srvFlare = [bell(discBack) * 0.5, bell(discBack) * 0.5]; }
      if (callA >= 0 && callA > 0.7) board.srvFlare[0] = (callA - 0.7) / 0.3;
      if (resA >= 0 && resA < 0.4) board.srvFlare[0] = 1 - resA / 0.4;
      if (callB >= 0 && callB > 0.7) board.srvFlare[1] = (callB - 0.7) / 0.3;
      if (resB >= 0 && resB < 0.4) board.srvFlare[1] = 1 - resB / 0.4;
      board.phaseText =
        discOut >= 0 ? 'STARTUP · DISCOVER SERVERS' :
        (discBack >= 0 ? 'CATALOGS INTO CONTEXT' :
        (legs.u2h >= 0 ? 'PROMPT' :
        (legs.h2l >= 0 ? 'PROMPT + TOOL CATALOG' :
        (think1 >= 0 || think2 >= 0 || think3 >= 0 ? 'THE MODEL DECIDES' :
        (callA >= 0 || callB >= 0 ? 'TOOL CALL' :
        (resA >= 0 || resB >= 0 ? 'RESULT' :
        (ansU2 >= 0 ? 'ANSWER' : '')))))));
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, agit2);
        } else if (p.mode === 'harn' || p.mode === 'srv') {
          p.tx = p.hx + Math.sin(t * 0.0013 + p.phase) * 0.9;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.7;
          var fl = p.mode === 'srv' ? board.srvFlare[p.si]
            : (legs.u2h >= 0 || callA >= 0 || callB >= 0 || resA >= 0 || resB >= 0 ? 0.4 : 0);
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + fl * 0.4;
        } else if (p.mode === 'disc') {
          var dp = p.si === 0 ? bl.discA : bl.discB;
          if (discOut >= 0) {
            var s5 = clamp01(discOut + p.off * (1 - discOut));
            var pos5 = bezier(dp, easeInOut(s5));
            p.tx = pos5[0]; p.ty = pos5[1];
            p.alpha = p.baseAlpha * bell(discOut);
          } else if (discBack >= 0) {
            var s5b = clamp01(discBack + p.off * (1 - discBack));
            var pos5b = bezier(dp, 1 - easeInOut(s5b));
            p.tx = pos5b[0]; p.ty = pos5b[1];
            p.alpha = p.baseAlpha * bell(discBack);
          } else {
            p.tx = dp.p0[0]; p.ty = dp.p0[1]; p.alpha = 0;
          }
        } else if (p.mode === 'u2h' || p.mode === 'h2l') {
          var uL = legs[p.mode];
          var pthL = bl[p.mode];
          if (uL < 0) {
            p.tx = pthL.p0[0]; p.ty = pthL.p0[1]; p.alpha = 0;
          } else {
            var s6 = clamp01(uL + p.off * (1 - uL));
            var pos6 = bezier(pthL, easeInOut(s6));
            p.tx = pos6[0]; p.ty = pos6[1];
            p.alpha = p.baseAlpha * bell(uL);
          }
        } else if (p.mode === 'call') {
          var cu = callA >= 0 ? callA : callB;
          var ch = callA >= 0 ? bl.callA : bl.callB;
          if (cu < 0) {
            p.tx = bl.callA[0].p0[0]; p.ty = bl.callA[0].p0[1]; p.alpha = 0;
          } else {
            var s7 = clamp01(cu + p.off * (1 - cu));
            var pos7 = chainPos(ch, s7);
            p.tx = pos7[0]; p.ty = pos7[1];
            p.alpha = p.baseAlpha * bell(cu);
          }
        } else if (p.mode === 'res') {
          var ru = resA >= 0 ? resA : resB;
          var rch = resA >= 0 ? bl.resA : bl.resB;
          if (ru < 0) {
            p.tx = bl.resA[0].p0[0]; p.ty = bl.resA[0].p0[1]; p.alpha = 0;
          } else {
            var s8 = clamp01(ru + p.off * (1 - ru));
            var pos8 = chainPos(rch, s8);
            p.tx = pos8[0]; p.ty = pos8[1];
            p.alpha = p.baseAlpha * bell(ru);
          }
        } else if (p.mode === 'stream') {
          if (ansU2 < 0) {
            p.tx = bl.aChain[0].p0[0]; p.ty = bl.aChain[0].p0[1]; p.alpha = 0;
          } else {
            var s9 = fract(p.off + ansU2 * 2.6);
            var pos9 = chainPos(bl.aChain, s9);
            p.tx = pos9[0]; p.ty = pos9[1];
            var edge2 = Math.min(1, Math.min(s9, 1 - s9) * 10);
            var wStr = ansU2 < 0.08 ? ansU2 / 0.08 : (ansU2 > 0.9 ? (1 - ansU2) / 0.1 : 1);
            p.alpha = p.baseAlpha * edge2 * wStr;
          }
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'local') {
      var bo = board;
      var prog3 = fract(te / bo.cycle);
      var outU = win(prog3, 0.05, 0.40);
      var backU = win(prog3, 0.55, 0.90);
      board.hot = (outU >= 0 && outU > 0.7) || (backU >= 0 && backU < 0.3) ? 1 : 0;
      P.forEach(function (p) {
        if (p.mode === 'harn') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.9;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.7;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'script') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.7;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + board.hot * 0.25;
        } else if (p.mode === 'pulse') {
          var u = p.dir === 1 ? outU : backU;
          if (u < 0) {
            var st = p.dir === 1 ? bo.link.p0 : bo.link.p1;
            p.tx = st[0]; p.ty = st[1]; p.alpha = 0;
          } else {
            var s10 = clamp01(u + p.off * (1 - u));
            var pos10 = bezier(bo.link, p.dir === 1 ? easeInOut(s10) : 1 - easeInOut(s10));
            p.tx = pos10[0]; p.ty = pos10[1];
            p.alpha = p.baseAlpha * bell(u);
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'remote') {
      var br = board;
      var prog4 = fract(te / br.cycle);
      var outU2 = win(prog4, 0.05, 0.38);
      var backU2 = win(prog4, 0.52, 0.85);
      P.forEach(function (p) {
        if (p.mode === 'harn') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.9;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.7;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'srv') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.7;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          var hot2 = (outU2 >= 0 && outU2 > 0.7) ? 0.3 : 0;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + hot2;
        } else if (p.mode === 'pulse') {
          var u2 = p.dir === 1 ? outU2 : backU2;
          if (u2 < 0) {
            var st2 = p.dir === 1 ? br.link.p0 : br.link.p1;
            p.tx = st2[0]; p.ty = st2[1]; p.alpha = 0;
          } else {
            var s11 = clamp01(u2 + p.off * (1 - u2));
            var pos11 = bezier(br.link, p.dir === 1 ? easeInOut(s11) : 1 - easeInOut(s11));
            p.tx = pos11[0]; p.ty = pos11[1];
            p.alpha = p.baseAlpha * bell(u2);
          }
        } else if (p.mode === 'opulse') {
          var s12 = fract(p.off + te / 5200);
          var pos12 = bezier(br.oPaths[p.oi], s12);
          p.tx = pos12[0]; p.ty = pos12[1];
          var edge3 = Math.min(1, Math.min(s12, 1 - s12) * 8);
          p.alpha = p.baseAlpha * edge3 * 0.7;
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'versus') {
      var bv = board;
      var prog5 = fract(te / bv.cycle);
      var lU = win(prog5, 0.05, 0.45);
      var rU = win(prog5, 0.55, 0.95);
      P.forEach(function (p) {
        if (p.mode === 'lfold' || p.mode === 'lscript' || p.mode === 'rproc' || p.mode === 'rschema') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.7;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'lbar' || p.mode === 'rbar') {
          p.tx = p.hx + Math.sin(t * 0.0014 + p.phase) * 0.6;
          p.ty = p.hy + Math.cos(t * 0.0012 + p.phase) * 0.5;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0012 + p.phase));
        } else if (p.mode === 'vpulse') {
          var u3 = p.side === 0 ? lU : rU;
          var lk = p.side === 0 ? bv.lLink : bv.rLink;
          if (u3 < 0) {
            p.tx = lk.p0[0]; p.ty = lk.p0[1]; p.alpha = 0;
          } else {
            var s13 = clamp01(u3 + p.off * (1 - u3));
            var pos13 = bezier(lk, easeInOut(s13));
            p.tx = pos13[0]; p.ty = pos13[1];
            p.alpha = p.baseAlpha * bell(u3);
          }
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'choosing') {
      P.forEach(function (p) {
        if (p.mode === 'q') {
          p.tx = p.hx + Math.sin(t * 0.0006 * p.speed + p.phase) * 2;
          p.ty = p.hy + Math.cos(t * 0.0005 * p.speed + p.phase) * 1.6;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'ahead') {
      var ba = board;
      var shown = Math.min(ba.nn, 1 + Math.floor(te / ba.appear));
      board.shown = shown;
      var pulseP = fract(te / ba.cycle);
      P.forEach(function (p) {
        if (p.mode === 'hub') {
          p.tx = p.hx + Math.sin(t * 0.0009 + p.phase) * 1.4;
          p.ty = p.hy + Math.cos(t * 0.0008 + p.phase) * 1.1;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0012 + p.phase));
        } else if (p.mode === 'node') {
          p.tx = p.hx + Math.sin(t * 0.0007 * p.speed + p.phase) * 1.8;
          p.ty = p.hy + Math.cos(t * 0.0006 * p.speed + p.phase) * 1.4;
          var vis = p.ni < shown ? 1 : 0;
          p.alpha = p.baseAlpha * vis * (0.55 + 0.45 * Math.sin(t * 0.0011 + p.phase));
        } else if (p.mode === 'pulse') {
          var nd2 = ba.nodes[p.ni];
          if (p.ni >= shown) { p.tx = ba.hub.x; p.ty = ba.hub.y; p.alpha = 0; }
          else {
            var s14 = fract(p.off + pulseP);
            p.tx = ba.hub.x + (nd2.x - ba.hub.x) * s14;
            p.ty = ba.hub.y + (nd2.y - ba.hub.y) * s14;
            var edge4 = Math.min(1, Math.min(s14, 1 - s14) * 8);
            p.alpha = p.baseAlpha * edge4 * 0.7;
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else {
      P.forEach(function (p) { p.tx = p.x; p.ty = p.y; p.alpha = 0; });
    }
  }

  // ---------- Structural line work ----------
  function drawPerson(x, y, s, a) {
    if (a <= 0.01) return;
    ctx.strokeStyle = 'rgba(200,200,215,' + (0.5 * a) + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y - 10 * s, 7 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + 12 * s, 12 * s, Math.PI * 1.15, Math.PI * 1.85);
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
  function drawZone(z, a, style, dashed) {
    if (a <= 0.01) return;
    ctx.strokeStyle = style;
    ctx.lineWidth = 1;
    if (dashed) ctx.setLineDash([2, 7]);
    ctx.beginPath();
    ctx.roundRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0, 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function drawKey(x, y, a) {
    if (a <= 0.01) return;
    ctx.strokeStyle = 'rgba(245,166,35,' + (0.75 * a) + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, 3.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 3.4, y);
    ctx.lineTo(x + 11, y);
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x + 8, y + 3.4);
    ctx.moveTo(x + 11, y);
    ctx.lineTo(x + 11, y + 3.4);
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

    if (sceneName === 'title') {
      if (logoPhase === 'off') drawLinksSet(1);

    } else if (sceneName === 'gap') {
      drawLinksSet(1);
      // the boundary the assistant cannot cross
      var wob = 0.8 + 0.2 * Math.sin(t * 0.0011);
      if (!isMobile) {
        var gWall = ctx.createLinearGradient(board.bx - 44, 0, board.bx + 44, 0);
        gWall.addColorStop(0, 'rgba(255,77,28,0)');
        gWall.addColorStop(0.5, 'rgba(255,77,28,' + (0.15 * wob * sf) + ')');
        gWall.addColorStop(1, 'rgba(255,77,28,0)');
        ctx.fillStyle = gWall;
        ctx.fillRect(board.bx - 44, H * 0.08, 88, H * 0.84);
        ctx.strokeStyle = 'rgba(255,77,28,' + (0.65 * wob * sf) + ')';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([14, 8]);
        ctx.beginPath();
        ctx.moveTo(board.bx, H * 0.08);
        ctx.lineTo(board.bx, H * 0.92);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = 'rgba(255,77,28,' + (0.65 * wob * sf) + ')';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([14, 8]);
        ctx.beginPath();
        ctx.moveTo(W * 0.06, board.bx);
        ctx.lineTo(W * 0.94, board.bx);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      board.nodes.forEach(function (nd) {
        drawBoxNode(nd, sf * 0.7, 0);
        labelText(nd.text, nd.x, nd.y + nd.h * 0.5 + 18, 0.4 * sf);
      });

    } else if (sceneName === 'harness') {
      drawLinksSet(1);
      // the harness itself: the container of everything model-side
      drawZone(board.box, sf, 'rgba(200,200,215,' + (0.3 * sf) + ')', false);
      drawPerson(board.user.x, board.user.y, 1.15, sf);
      board.socks.forEach(function (s) {
        var hot = board.catU >= 0 && board.catU < 0.4 ? 0.6 : 0;
        drawBoxNode({ x: s.x, y: s.y, w: s.w, h: s.w }, sf, hot);
      });
      if (board.ansU >= 0) {
        board.aChain.forEach(function (pth) {
          strokePath(pth, 'rgba(245,166,35,' + (0.16 * sf) + ')', 1);
        });
      }

    } else if (sceneName === 'protocol') {
      var bp2 = board;
      // the timeline rail
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.18 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bp2.x0 - MN * 0.02, bp2.y);
      ctx.lineTo(bp2.x1 + MN * 0.02, bp2.y);
      ctx.stroke();
      bp2.nodes.forEach(function (nd) {
        ctx.strokeStyle = nd.current
          ? 'rgba(255,77,28,' + (0.7 * sf) + ')'
          : 'rgba(200,200,215,' + (0.3 * sf) + ')';
        ctx.lineWidth = nd.current ? 1.4 : 1;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, nd.r * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        labelText(nd.text, nd.x, nd.y + nd.r * 1.5 + 20,
          (nd.current ? 0.8 : 0.45) * sf, nd.current ? '255,138,102' : '200,200,215');
        if (nd.current) {
          labelText('CURRENT', nd.x, nd.y - nd.r * 1.5 - 12, 0.7 * sf, '255,138,102');
          drawGlow(nd.x, nd.y, nd.r * 4, 0.10 * sf, false);
        }
      });

    } else if (sceneName === 'loop') {
      var bl2 = board;
      drawLinksSet(1);
      drawPerson(bl2.user.x, bl2.user.y, 1.1, sf);
      drawBoxNode(bl2.harn, sf, (bl2.legs && (bl2.legs.u2h >= 0 || bl2.uCallA >= 0 || bl2.uCallB >= 0)) ? 0.5 : 0);
      drawBoxNode(bl2.srvA, sf, bl2.srvFlare ? bl2.srvFlare[0] : 0);
      drawBoxNode(bl2.srvB, sf, bl2.srvFlare ? bl2.srvFlare[1] : 0);
      if (bl2.srvFlare && bl2.srvFlare[0] > 0.05) drawGlow(bl2.srvA.x, bl2.srvA.y, bl2.srvA.w * 1.5, 0.1 * bl2.srvFlare[0] * sf, false);
      if (bl2.srvFlare && bl2.srvFlare[1] > 0.05) drawGlow(bl2.srvB.x, bl2.srvB.y, bl2.srvB.w * 1.5, 0.1 * bl2.srvFlare[1] * sf, false);
      // rails
      strokePath(bl2.u2h, 'rgba(200,200,215,' + ((bl2.legs && bl2.legs.u2h >= 0 ? 0.28 : 0.1) * sf) + ')', 1);
      strokePath(bl2.h2l, 'rgba(200,200,215,' + ((bl2.legs && bl2.legs.h2l >= 0 ? 0.28 : 0.1) * sf) + ')', 1);
      bl2.callA.forEach(function (pth) {
        strokePath(pth, 'rgba(255,138,102,' + ((bl2.uCallA >= 0 ? 0.26 : 0.09) * sf) + ')', 1);
      });
      bl2.callB.forEach(function (pth) {
        strokePath(pth, 'rgba(255,138,102,' + ((bl2.uCallB >= 0 ? 0.26 : 0.09) * sf) + ')', 1);
      });
      bl2.resA.forEach(function (pth) {
        strokePath(pth, 'rgba(200,200,215,' + ((bl2.uResA >= 0 ? 0.2 : 0.07) * sf) + ')', 1);
      });
      bl2.resB.forEach(function (pth) {
        strokePath(pth, 'rgba(200,200,215,' + ((bl2.uResB >= 0 ? 0.2 : 0.07) * sf) + ')', 1);
      });
      if (bl2.ansU >= 0) {
        bl2.aChain.forEach(function (pth) {
          strokePath(pth, 'rgba(245,166,35,' + (0.18 * sf) + ')', 1);
        });
      }
      if (bl2.phaseText) {
        labelText(bl2.phaseText, bl2.llm.x, H * 0.055, 0.75 * sf, '255,138,102');
      }

    } else if (sceneName === 'local') {
      drawZone(board.box, sf, 'rgba(245,166,35,' + (0.18 * sf) + ')', true);
      drawBoxNode(board.harn, sf, 0);
      drawBoxNode(board.proc, sf, board.hot ? 0.6 : 0.2);
      strokePath(board.link, 'rgba(200,200,215,' + (0.2 * sf) + ')', 1);
      var mid = bezier(board.link, 0.5);
      labelText('STDIO', mid[0] + 4, mid[1] - 10, 0.55 * sf, '255,138,102');
      if (board.hot) drawGlow(board.proc.x, board.proc.y, board.proc.w * 1.4, 0.08 * sf, false);

    } else if (sceneName === 'remote') {
      drawZone(board.mine, sf, 'rgba(245,166,35,' + (0.18 * sf) + ')', true);
      drawZone(board.host, sf, 'rgba(200,200,215,' + (0.24 * sf) + ')', false);
      drawBoxNode(board.harn, sf, 0);
      drawBoxNode(board.srv, sf, 0.3);
      drawKey(board.srv.x + board.srv.w * 0.5 - 4, board.srv.y - board.srv.h * 0.5 - 12, sf);
      strokePath(board.link, 'rgba(200,200,215,' + (0.22 * sf) + ')', 1);
      var mid2 = bezier(board.link, 0.5);
      labelText('HTTPS + OAUTH', mid2[0], mid2[1] - 12, 0.55 * sf, '255,138,102');
      board.others.forEach(function (o, i) {
        drawPerson(o.x, o.y, 0.7, sf * 0.7);
        strokePath(board.oPaths[i], 'rgba(200,200,215,' + (0.1 * sf) + ')', 1);
      });

    } else if (sceneName === 'versus') {
      var bv2 = board;
      // the hairline between the two philosophies
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.16 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bv2.divX, H * 0.06);
      ctx.lineTo(bv2.divX, H * 0.46);
      ctx.stroke();
      drawBoxNode(bv2.L.fold, sf, 0);
      drawBoxNode(bv2.L.script, sf, 0);
      drawBoxNode(bv2.R.proc, sf, 0.25);
      drawBoxNode(bv2.R.schema, sf, 0.25);
      strokePath(bv2.lLink, 'rgba(200,200,215,' + (0.14 * sf) + ')', 1);
      strokePath(bv2.rLink, 'rgba(200,200,215,' + (0.14 * sf) + ')', 1);
      // context bars
      [bv2.L.bar, bv2.R.bar].forEach(function (bar, bi) {
        ctx.strokeStyle = 'rgba(200,200,215,' + (0.3 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bar.x - bar.w / 2, bar.y0, bar.w, bar.y1 - bar.y0, 4);
        ctx.stroke();
        var fh = (bar.y1 - bar.y0) * bar.fill;
        ctx.fillStyle = bi === 0
          ? 'rgba(245,166,35,' + (0.28 * sf) + ')'
          : 'rgba(255,77,28,' + (0.3 * sf) + ')';
        ctx.fillRect(bar.x - bar.w / 2 + 1.5, bar.y0 + 1.5, bar.w - 3, fh);
      });

    } else if (sceneName === 'choosing') {
      board.big.forEach(function (cd) {
        ctx.strokeStyle = cd.hot
          ? 'rgba(255,77,28,' + (0.5 * sf) + ')'
          : 'rgba(245,166,35,' + (0.4 * sf) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(cd.x - cd.w / 2, cd.y - cd.h / 2, cd.w, cd.h, 8);
        ctx.stroke();
        labelText(cd.text, cd.x, cd.y - 6, 0.85 * sf, cd.hot ? '255,138,102' : '245,166,35');
        labelText(cd.sub, cd.x, cd.y + 16, 0.5 * sf);
        if (cd.hot) drawGlow(cd.x, cd.y, cd.w * 0.6, 0.05 * sf, false);
      });
      board.small.forEach(function (cd) {
        ctx.strokeStyle = 'rgba(200,200,215,' + (0.22 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cd.x - cd.w / 2, cd.y - cd.h / 2, cd.w, cd.h, 6);
        ctx.stroke();
        labelText(cd.text, cd.x, cd.y + 4, 0.45 * sf);
      });

    } else if (sceneName === 'ahead') {
      var ba2 = board;
      ctx.strokeStyle = 'rgba(255,77,28,' + (0.55 * sf) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(ba2.hub.x, ba2.hub.y, ba2.hub.r * 1.35, 0, Math.PI * 2);
      ctx.stroke();
      drawGlow(ba2.hub.x, ba2.hub.y, ba2.hub.r * 3, 0.07 * sf, false);
      ba2.nodes.forEach(function (nd, i) {
        if (i >= (ba2.shown || 0)) return;
        ctx.strokeStyle = nd.text
          ? 'rgba(245,166,35,' + (0.55 * sf) + ')'
          : 'rgba(200,200,215,' + (0.25 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, nd.r * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(200,200,215,' + (0.08 * sf) + ')';
        ctx.beginPath();
        ctx.moveTo(ba2.hub.x, ba2.hub.y);
        ctx.lineTo(nd.x, nd.y);
        ctx.stroke();
        if (nd.text) {
          labelText(nd.text, nd.x, nd.y + nd.r * 1.5 + 16, 0.6 * sf, '245,166,35');
        }
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
        phase: board.phaseText,
        shown: board.shown
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
