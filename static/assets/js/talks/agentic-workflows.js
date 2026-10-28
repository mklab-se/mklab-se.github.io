/* ============================================================
   MKLab Living Canvas: GitHub Agentic Workflows edition
   One particle system behind the whole deck. Slides declare a
   scene via <section data-scene="...">; scrolling morphs the
   same lights from one scene into the next.
   Scenes: title, ask, places, triggers, boundary, think,
   markdown, guardrails, helps, team, preview, start, outro.
   Based on assets/js/talks/mcp.js with the 3D helpers from
   agentic-rag.js. No dependencies. Decorative only.
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

  // 3D: rotate around Y axis, project with perspective
  function proj(sp, v, az) {
    var ca = Math.cos(az), sa = Math.sin(az);
    var x = v[0] * ca + v[2] * sa;
    var z = -v[0] * sa + v[2] * ca;
    var f = sp.persp / (sp.persp + z);
    return [sp.cx + x * sp.scale * f, sp.cy - v[1] * sp.scale * f, f];
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

  // -- ask: the repository with its CI gears, and an empty socket
  // -- waiting for something new
  layouts.ask = function () {
    var repo = { x: W * (isMobile ? 0.5 : 0.68), y: H * (isMobile ? 0.30 : 0.46), w: MN * 0.14, h: MN * 0.16 };
    var sock = { x: W * (isMobile ? 0.78 : 0.885), y: H * (isMobile ? 0.10 : 0.18), r: MN * 0.045 };
    board = {
      repo: repo, sock: sock,
      orbR: MN * (isMobile ? 0.16 : 0.155),
      gearN: 3,
      cycle: 4200,
      sPth: makePath(repo.x + repo.w * 0.3, repo.y - repo.h * 0.5, sock.x - sock.r * 0.5, sock.y + sock.r * 0.9, -0.2),
      labels: [
        { x: repo.x, y: repo.y + repo.h * 0.62 + 18, text: 'YOUR REPOSITORY' },
        { x: sock.x, y: sock.y + sock.r * 1.6 + 14, text: 'A PLACE FOR AN AGENT' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.20) {
        p.mode = 'core';
        p.li = i % 7;
        cardHome(p, repo, p.li, 7);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.38) {
        p.mode = 'gearp';
        p.gi = i % 3;
        p.gr = rand(0.5, 1);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.48) {
        p.mode = 'spark';
        p.off = rand(0, 0.15);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.56) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- places: three habitats; in the third one the person leaves
  // -- and the agent keeps working
  layouts.places = function () {
    var Z = isMobile ? [
      { x0: W * 0.04, x1: W * 0.96, y0: H * 0.02, y1: H * 0.18, text: 'IN YOUR CHAT APPS' },
      { x0: W * 0.04, x1: W * 0.96, y0: H * 0.21, y1: H * 0.37, text: 'BESIDE YOU' },
      { x0: W * 0.04, x1: W * 0.96, y0: H * 0.40, y1: H * 0.56, text: 'IN THE REPOSITORY' }
    ] : [
      { x0: W * 0.05, x1: W * 0.33, y0: H * 0.07, y1: H * 0.45, text: 'IN YOUR CHAT APPS' },
      { x0: W * 0.37, x1: W * 0.63, y0: H * 0.07, y1: H * 0.45, text: 'BESIDE YOU' },
      { x0: W * 0.67, x1: W * 0.95, y0: H * 0.07, y1: H * 0.45, text: 'IN THE REPOSITORY' }
    ];
    var mid = function (z) { return [(z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2]; };
    var m0 = mid(Z[0]), m1 = mid(Z[1]), m2 = mid(Z[2]);
    board = {
      Z: Z,
      cycle: 4600,
      p0: { x: m0[0] - MN * 0.05, y: m0[1] + MN * 0.03 },
      a0: { x: m0[0] + MN * 0.055, y: m0[1] - MN * 0.045, r: MN * 0.032 },
      p1: { x: m1[0] - MN * 0.055, y: m1[1] + MN * 0.02 },
      a1: { x: m1[0] + MN * 0.05, y: m1[1] - MN * 0.03, w: MN * 0.075, h: MN * 0.09 },
      p2: { x: m2[0] - MN * 0.065, y: m2[1] + MN * 0.05 },
      a2: { x: m2[0] + MN * 0.015, y: m2[1] - MN * 0.055, r: MN * 0.03 },
      r2: { x: m2[0] + MN * 0.06, y: m2[1] + MN * 0.045, w: MN * 0.06, h: MN * 0.07 },
      labels: [
        { x: (Z[0].x0 + Z[0].x1) / 2, y: Z[0].y0 - 12, text: Z[0].text },
        { x: (Z[1].x0 + Z[1].x1) / 2, y: Z[1].y0 - 12, text: Z[1].text },
        { x: (Z[2].x0 + Z[2].x1) / 2, y: Z[2].y0 - 12, text: Z[2].text },
        { x: (Z[0].x0 + Z[0].x1) / 2, y: Z[0].y1 + 18, text: 'ANSWERS YOU' },
        { x: (Z[1].x0 + Z[1].x1) / 2, y: Z[1].y1 + 18, text: 'WORKS WHILE YOU WATCH' },
        { x: (Z[2].x0 + Z[2].x1) / 2, y: Z[2].y1 + 18, text: 'WORKS WHEN EVENTS HAPPEN' }
      ]
    };
    board.q0 = makePath(board.p0.x + 10, board.p0.y - 10, board.a0.x - board.a0.r, board.a0.y + board.a0.r * 0.6, 0.14);
    board.q1 = makePath(board.p1.x + 10, board.p1.y - 8, board.a1.x - board.a1.w * 0.55, board.a1.y + board.a1.h * 0.2, 0.12);
    board.q2 = makePath(board.a2.x + board.a2.r * 0.6, board.a2.y + board.a2.r * 0.6, board.r2.x - board.r2.w * 0.5, board.r2.y - board.r2.h * 0.3, 0.14);
    P.forEach(function (p, i) {
      if (p.seed < 0.10) {
        p.mode = 'ab';                       // assistant bubble cluster
        brainHome(p, board.a0);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.6); p.fast = false;
      } else if (p.seed < 0.20) {
        p.mode = 'ide';                      // ide card content
        p.li = i % 5;
        cardHome(p, board.a1, p.li, 5);
        p.baseAlpha = rand(0.28, 0.6); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.30) {
        p.mode = 'aw';                       // repo agent cluster
        brainHome(p, board.a2);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.38) {
        p.mode = 'rp';                       // repo box content
        p.li = i % 4;
        cardHome(p, board.r2, p.li, 4);
        p.baseAlpha = rand(0.25, 0.55); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.46) {
        p.mode = 'pu0'; p.off = rand(0, 0.15);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.54) {
        p.mode = 'pu1'; p.off = rand(0, 0.15);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.62) {
        p.mode = 'pu2'; p.off = rand(0, 0.15);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- triggers: a 3D ring of repository events orbits the workflow
  // -- file; each one in turn drops in and wakes it
  layouts.triggers = function () {
    var sp = {
      cx: W * (isMobile ? 0.5 : 0.72),
      cy: H * (isMobile ? 0.26 : 0.34),
      scale: MN * (isMobile ? 0.30 : 0.26),
      persp: 3.2
    };
    var file = { x: sp.cx, y: H * (isMobile ? 0.56 : 0.72), w: MN * 0.11, h: MN * 0.13 };
    var events = ['ISSUE OPENED', 'PULL REQUEST', 'COMMENT', 'LABEL', 'WEEKLY ON MONDAY', 'RELEASE'];
    board = {
      sp: sp, file: file, events: events, ne: events.length,
      cycle: 2600,
      labels: [
        { x: file.x, y: file.y + file.h * 0.62 + 18, text: 'WORKFLOW.MD · THE GOAL, WRITTEN DOWN' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.30) {
        p.mode = 'ev';
        p.ei = i % board.ne;
        p.j = [rand(-0.06, 0.06), rand(-0.05, 0.05), rand(-0.06, 0.06)];
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.44) {
        p.mode = 'file';
        p.li = i % 6;
        cardHome(p, file, p.li, 6);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.54) {
        p.mode = 'drop';
        p.off = rand(0, 0.1);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.60) {
        p.mode = 'run';
        p.off = rand(0, 0.3);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.66) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- boundary: GitHub hears its own events; the on-prem world is
  // -- silent unless a bridge carries it across
  layouts.boundary = function () {
    var gh = isMobile
      ? { x0: W * 0.04, x1: W * 0.60, y0: H * 0.06, y1: H * 0.54 }
      : { x0: W * 0.07, x1: W * 0.52, y0: H * 0.07, y1: H * 0.53 };
    var file = { x: (gh.x0 + gh.x1) / 2 + MN * 0.04, y: (gh.y0 + gh.y1) / 2, w: MN * 0.10, h: MN * 0.12 };
    var evs = [
      { x: gh.x0 + MN * 0.07, y: gh.y0 + MN * 0.05 },
      { x: gh.x0 + MN * 0.05, y: (gh.y0 + gh.y1) / 2 },
      { x: gh.x0 + MN * 0.08, y: gh.y1 - MN * 0.05 }
    ];
    var out = isMobile ? [
      { x: W * 0.82, y: H * 0.12, text: 'JIRA · ON-PREM' },
      { x: W * 0.85, y: H * 0.30, text: 'GITLAB · LOCAL' },
      { x: W * 0.80, y: H * 0.48, text: 'BITBUCKET' }
    ] : [
      { x: W * 0.80, y: H * 0.13, text: 'JIRA · ON-PREM' },
      { x: W * 0.86, y: H * 0.30, text: 'GITLAB · LOCAL' },
      { x: W * 0.80, y: H * 0.47, text: 'BITBUCKET · ON-PREM' }
    ];
    board = {
      gh: gh, file: file, evs: evs, out: out,
      ow: MN * 0.075, oh: MN * 0.06,
      cycle: 5200,
      inPths: evs.map(function (e) {
        return makePath(e.x, e.y, file.x - file.w * 0.55, file.y + rand(-file.h * 0.3, file.h * 0.3), 0.12);
      }),
      bridge: makePath(out[0].x - MN * 0.045, out[0].y + MN * 0.02, file.x + file.w * 0.4, file.y - file.h * 0.55, -0.22),
      labels: [
        { x: (gh.x0 + gh.x1) / 2, y: gh.y0 - 12, text: 'GITHUB' },
        { x: (out[0].x + out[2].x) / 2, y: H * 0.585, text: 'THE REST OF YOUR WORLD · SILENT TO IT' },
        { x: file.x, y: file.y + file.h * 0.62 + 16, text: 'AGENTIC WORKFLOW' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.14) {
        p.mode = 'file';
        p.li = i % 5;
        cardHome(p, file, p.li, 5);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.28) {
        p.mode = 'inp';
        p.ei = i % 3;
        p.off = rand(0, 1);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.44) {
        p.mode = 'outp';
        p.oi = i % 3;
        p.off = rand(0, 1);
        p.dur = rand(1600, 2600);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.56) {
        p.mode = 'sys';
        p.oi = i % 3;
        var o = out[p.oi];
        p.hx = o.x + rand(-board.ow * 0.42, board.ow * 0.42);
        p.hy = o.y + rand(-board.oh * 0.38, board.oh * 0.38);
        p.baseAlpha = rand(0.15, 0.4); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.64) {
        p.mode = 'br';
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- think: the same runners, two kinds of work; a conveyor of
  // -- identical steps against a loop with judgment in it
  layouts.think = function () {
    var st = isMobile ? [
      { x: W * 0.14, y: H * 0.16 }, { x: W * 0.38, y: H * 0.16 }, { x: W * 0.62, y: H * 0.16 }
    ] : [
      { x: W * 0.10, y: H * 0.26 }, { x: W * 0.24, y: H * 0.26 }, { x: W * 0.38, y: H * 0.26 }
    ];
    var stW = MN * 0.075, stH = MN * 0.085;
    var agent = { x: W * (isMobile ? 0.40 : 0.70), y: H * (isMobile ? 0.42 : 0.24), r: MN * 0.055 };
    var evc = { x: W * (isMobile ? 0.14 : 0.58), y: H * (isMobile ? 0.42 : 0.14), w: MN * 0.06, h: MN * 0.055 };
    var data = { x: W * (isMobile ? 0.66 : 0.88), y: H * (isMobile ? 0.42 : 0.20), w: MN * 0.06, h: MN * 0.07 };
    var outb = { x: W * (isMobile ? 0.55 : 0.79), y: H * (isMobile ? 0.55 : 0.44), w: MN * 0.09, h: MN * 0.06 };
    board = {
      st: st, stW: stW, stH: stH, agent: agent, evc: evc, data: data, outb: outb,
      names: ['BUILD', 'TEST', 'DEPLOY'],
      cycleL: 3600, cycleR: 7200,
      chainL: [
        makePath(st[0].x - stW * 1.4, st[0].y, st[0].x - stW * 0.55, st[0].y, 0.04),
        makePath(st[0].x + stW * 0.55, st[0].y, st[1].x - stW * 0.55, st[1].y, 0.04),
        makePath(st[1].x + stW * 0.55, st[1].y, st[2].x - stW * 0.55, st[2].y, 0.04),
        makePath(st[2].x + stW * 0.55, st[2].y, st[2].x + stW * 1.5, st[2].y, 0.04)
      ],
      evPth: makePath(evc.x + evc.w * 0.6, evc.y + evc.h * 0.3, agent.x - agent.r * 0.9, agent.y, 0.1),
      dataPth: makePath(agent.x + agent.r * 0.7, agent.y - agent.r * 0.4, data.x - data.w * 0.55, data.y, -0.16),
      backPth: makePath(data.x - data.w * 0.55, data.y + data.h * 0.4, agent.x + agent.r * 0.6, agent.y + agent.r * 0.5, 0.16),
      outPth: makePath(agent.x + agent.r * 0.3, agent.y + agent.r * 0.9, outb.x - outb.w * 0.2, outb.y - outb.h * 0.6, 0.1),
      labels: [
        { x: st[1].x, y: st[1].y - stH * 0.9 - 8, text: 'CLASSIC ACTIONS · SAME EVERY TIME' },
        { x: agent.x + MN * 0.02, y: agent.y - agent.r * 1.6 - 10, text: 'AGENTIC · JUDGMENT WITHIN GUARDRAILS' },
        { x: st[1].x, y: st[1].y + stH * 0.9 + 16, text: 'BUILD · TEST · DEPLOY' },
        { x: evc.x, y: evc.y + evc.h * 0.85 + 10, text: 'EVENT' },
        { x: data.x, y: data.y + data.h * 0.85 + 10, text: 'THE REPO' },
        { x: outb.x, y: outb.y + outb.h * 0.85 + 12, text: 'WRITES BACK' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.12) {
        p.mode = 'stn';
        p.si = i % 3;
        p.hx = st[p.si].x + rand(-stW * 0.4, stW * 0.4);
        p.hy = st[p.si].y + rand(-stH * 0.36, stH * 0.36);
        p.baseAlpha = rand(0.2, 0.5); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.24) {
        p.mode = 'belt';
        p.off = rand(0, 0.3);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.3, 0.5); p.fast = true;
      } else if (p.seed < 0.42) {
        p.mode = 'brain';
        brainHome(p, agent);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.18, 0.55);
        p.sizeMul = rand(0.32, 0.62); p.fast = false;
      } else if (p.seed < 0.50) {
        p.mode = 'evp'; p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.5); p.fast = true;
      } else if (p.seed < 0.58) {
        p.mode = 'invest'; p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.5); p.fast = true;
      } else if (p.seed < 0.66) {
        p.mode = 'wr'; p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 46);
  };

  // -- markdown: the workflow file, and a 3D carousel of engines
  // -- taking turns to think inside it
  layouts.markdown = function () {
    var file = { x: W * (isMobile ? 0.34 : 0.635), y: H * (isMobile ? 0.30 : 0.42), w: MN * 0.155, h: MN * 0.22 };
    var sp = {
      cx: W * (isMobile ? 0.74 : 0.865),
      cy: H * (isMobile ? 0.24 : 0.30),
      scale: MN * 0.15,
      persp: 3.4
    };
    var lock = { x: W * (isMobile ? 0.62 : 0.60), y: H * (isMobile ? 0.60 : 0.76), w: MN * 0.10, h: MN * 0.075 };
    board = {
      file: file, sp: sp, lock: lock,
      engines: ['COPILOT', 'CLAUDE', 'CODEX', 'GEMINI', 'PI'],
      cycle: 3000,
      dockPth: makePath(sp.cx - sp.scale * 0.4, sp.cy + sp.scale * 0.5, file.x + file.w * 0.42, file.y - file.h * 0.18, 0.16),
      compPth: makePath(file.x - file.w * 0.2, file.y + file.h * 0.55, lock.x + lock.w * 0.2, lock.y - lock.h * 0.55, 0.1),
      labels: [
        { x: file.x, y: file.y - file.h * 0.62 - 12, text: 'ONE MARKDOWN FILE' },
        { x: sp.cx, y: sp.cy - sp.scale * 1.7 - 8, text: 'THE ENGINE · YOUR CHOICE' },
        { x: lock.x, y: lock.y + lock.h * 0.85 + 12, text: 'COMPILED · A LOCKED ACTIONS WORKFLOW' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.10) {
        p.mode = 'fm';                                 // frontmatter rows, candle
        p.li = i % 3;
        p.hx = file.x - file.w * 0.4 + fract(p.seed * 113.7) * file.w * 0.8 * 0.7;
        p.hy = file.y - file.h * 0.40 + p.li * file.h * 0.16 + rand(-1, 1);
        p.baseAlpha = rand(0.4, 0.8); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.24) {
        p.mode = 'prose';                              // prose rows
        p.li = i % 5;
        p.hx = file.x - file.w * 0.4 + fract(p.seed * 91.3) * file.w * 0.8 * (0.5 + fract(p.seed * 57.1) * 0.45);
        p.hy = file.y + file.h * 0.02 + p.li * file.h * 0.09 + rand(-1, 1);
        p.baseAlpha = rand(0.3, 0.65); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.44) {
        p.mode = 'eng';
        p.ei = i % 5;
        p.j = [rand(-0.16, 0.16), rand(-0.14, 0.14), rand(-0.16, 0.16)];
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.52) {
        p.mode = 'dock'; p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.60) {
        p.mode = 'comp'; p.off = rand(0, 0.15);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.5); p.fast = true;
      } else if (p.seed < 0.66) {
        p.mode = 'lockp';
        p.li = i % 3;
        cardHome(p, lock, p.li, 3);
        p.baseAlpha = rand(0.25, 0.6); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- guardrails: read-only inside the fence; proposals leave only
  // -- through the safe-output gates, toward human eyes
  layouts.guardrails = function () {
    var core = { x: W * (isMobile ? 0.42 : 0.645), y: H * (isMobile ? 0.28 : 0.42), r: MN * 0.075 };
    var ringR = MN * (isMobile ? 0.16 : 0.145);
    var gates = isMobile ? [
      { x: W * 0.78, y: H * 0.12, text: 'ISSUE' },
      { x: W * 0.84, y: H * 0.28, text: 'COMMENT' },
      { x: W * 0.78, y: H * 0.44, text: 'PULL REQUEST' }
    ] : [
      { x: W * 0.845, y: H * 0.20, text: 'ISSUE' },
      { x: W * 0.875, y: H * 0.42, text: 'COMMENT' },
      { x: W * 0.845, y: H * 0.64, text: 'PULL REQUEST' }
    ];
    var human = { x: W * (isMobile ? 0.60 : 0.945), y: H * (isMobile ? 0.58 : 0.80) };
    board = {
      core: core, ringR: ringR, gates: gates, human: human,
      gw: MN * 0.055, gh2: MN * 0.045,
      cycle: 5400,
      gPths: gates.map(function (g) {
        return makePath(core.x + core.r * 0.8, core.y + (g.y - core.y) * 0.3, g.x - MN * 0.03, g.y, 0.1);
      }),
      hPths: gates.map(function (g) {
        return makePath(g.x + MN * 0.03, g.y, human.x - 8, human.y - 16, 0.12);
      }),
      labels: [
        { x: core.x, y: core.y + ringR + 22, text: 'READ-ONLY · SANDBOXED · FIREWALLED' },
        { x: gates[1].x, y: gates[0].y - board_gateLabelPad(), text: 'SAFE OUTPUTS' },
        { x: human.x, y: human.y + 40, text: 'HUMAN REVIEW' }
      ]
    };
    function board_gateLabelPad() { return MN * 0.045; }
    P.forEach(function (p, i) {
      if (p.seed < 0.26) {
        p.mode = 'brain';
        brainHome(p, core);
        p.baseAlpha = p.ember ? rand(0.35, 0.9) : rand(0.2, 0.6);
        p.sizeMul = rand(0.35, 0.7); p.fast = false;
      } else if (p.seed < 0.38) {
        p.mode = 'block';                        // egress attempts that die at the ring
        p.ang = rand(0, Math.PI * 2);
        p.off = rand(0, 1);
        p.dur = rand(1200, 2200);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.50) {
        p.mode = 'prop';                         // proposals through the gates
        p.gix = i % 3;
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.58) {
        p.mode = 'rev';                          // gate to human
        p.gix = i % 3;
        p.off = rand(0, 0.15);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.64) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 56);
  };

  // -- helps: a night sweep ticks through the recurring chores, one
  // -- by one, and checks them off
  layouts.helps = function () {
    var c = { x: W * (isMobile ? 0.5 : 0.72), y: H * (isMobile ? 0.30 : 0.45) };
    var chores = ['TRIAGE', 'FAILING BUILD', 'WEEKLY SUMMARY', 'BACKLOG', 'DOCS', 'DEPENDENCIES'];
    var nodes = chores.map(function (name, k) {
      var a = -Math.PI / 2 + k * Math.PI * 2 / chores.length;
      var r = MN * (isMobile ? 0.20 : 0.24) * (0.85 + (k % 2) * 0.22);
      return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * 0.8, a: a, text: name, r: MN * 0.022 };
    });
    board = {
      c: c, nodes: nodes, nn: chores.length,
      cycle: 2200,
      labels: [
        { x: c.x, y: c.y + MN * (isMobile ? 0.27 : 0.30) + 24, text: 'RECURRING WORK WITH JUDGMENT IN IT' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.34) {
        p.mode = 'ch';
        p.ni = i % board.nn;
        var nd = nodes[p.ni];
        var a2 = rand(0, Math.PI * 2);
        var d = Math.pow(Math.random(), 0.6) * nd.r * 1.5;
        p.hx = nd.x + Math.cos(a2) * d;
        p.hy = nd.y + Math.sin(a2) * d;
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.44) {
        p.mode = 'hand';
        p.rr = rand(0.15, 1);
        p.baseAlpha = rand(0.3, 0.75); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.52) {
        p.mode = 'hub';
        var a3 = rand(0, Math.PI * 2);
        var d2 = Math.pow(Math.random(), 0.6) * MN * 0.03;
        p.hx = c.x + Math.cos(a3) * d2;
        p.hy = c.y + Math.sin(a3) * d2;
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.35, 0.65); p.fast = false;
      } else if (p.seed < 0.58) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- team: the agent core delivers a different artifact to each
  // -- role, in turn, the whole team served
  layouts.team = function () {
    var agent = { x: W * 0.5, y: H * (isMobile ? 0.08 : 0.11), r: MN * 0.045 };
    var roles = isMobile ? [
      { x: W * 0.14, y: H * 0.38, text: 'DEVELOPER', art: 'ISSUE · ANNOTATED' },
      { x: W * 0.38, y: H * 0.44, text: 'TESTER', art: 'TESTS · PROPOSED' },
      { x: W * 0.62, y: H * 0.44, text: 'PROJECT MGR', art: 'STATUS · MONDAY' },
      { x: W * 0.86, y: H * 0.38, text: 'PRODUCT OWNER', art: 'BACKLOG · SORTED' }
    ] : [
      { x: W * 0.15, y: H * 0.38, text: 'DEVELOPER', art: 'ISSUE · ANNOTATED' },
      { x: W * 0.38, y: H * 0.42, text: 'TESTER', art: 'TESTS · PROPOSED' },
      { x: W * 0.62, y: H * 0.42, text: 'PROJECT MANAGER', art: 'STATUS · MONDAY' },
      { x: W * 0.85, y: H * 0.38, text: 'PRODUCT OWNER', art: 'BACKLOG · SORTED' }
    ];
    board = {
      agent: agent, roles: roles,
      hold: 2600,
      pths: roles.map(function (r) {
        return makePath(agent.x, agent.y + agent.r * 1.1, r.x, r.y - MN * 0.055, (r.x < agent.x ? -1 : 1) * 0.16);
      }),
      labels: [
        { x: agent.x, y: agent.y - agent.r * 1.5 - 10, text: 'ONE AGENTIC WORKFLOW EACH' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.16) {
        p.mode = 'brain';
        brainHome(p, agent);
        p.baseAlpha = p.ember ? rand(0.35, 0.9) : rand(0.2, 0.6);
        p.sizeMul = rand(0.32, 0.62); p.fast = false;
      } else if (p.seed < 0.36) {
        p.mode = 'del';
        p.ri = i % 4;
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.52) {
        p.mode = 'art';
        p.ri = i % 4;
        var rl = roles[p.ri];
        p.hx = rl.x + rand(-MN * 0.035, MN * 0.035);
        p.hy = rl.y - MN * 0.075 + rand(-MN * 0.018, MN * 0.018);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.58) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 36);
  };

  // -- preview: a sunrise, honestly early; the meters breathe and
  // -- the badge glows warm, not warning
  layouts.preview = function () {
    var hor = H * (isMobile ? 0.40 : 0.52);
    var sun = { x: W * (isMobile ? 0.5 : 0.72), y: hor, r: MN * 0.075 };
    var badge = { x: W * (isMobile ? 0.5 : 0.72), y: H * (isMobile ? 0.10 : 0.16), w: MN * 0.14, h: MN * 0.05 };
    var meters = isMobile ? [
      { x: W * 0.20, y: H * 0.56, text: 'ACTIONS MINUTES', fill: 0.35 },
      { x: W * 0.50, y: H * 0.56, text: 'AI CREDITS', fill: 0.5 },
      { x: W * 0.80, y: H * 0.56, text: 'HUMAN EYES', fill: 0.8 }
    ] : [
      { x: W * 0.56, y: H * 0.74, text: 'ACTIONS MINUTES', fill: 0.35 },
      { x: W * 0.72, y: H * 0.74, text: 'AI CREDITS', fill: 0.5 },
      { x: W * 0.88, y: H * 0.74, text: 'HUMAN EYES', fill: 0.8 }
    ];
    board = {
      hor: hor, sun: sun, badge: badge, meters: meters,
      mw: MN * 0.085, mh: 10,
      cycle: 9000,
      labels: [
        { x: badge.x, y: badge.y + badge.h * 0.5 + 20, text: 'MOVING FAST · WORTH LEARNING NOW' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.26) {
        p.mode = 'sunp';
        var a = rand(-Math.PI, 0);
        var d = Math.pow(Math.random(), 0.55) * sun.r;
        p.ox = Math.cos(a) * d;
        p.oy = Math.sin(a) * d * 0.9;
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.35, 0.7); p.fast = false;
      } else if (p.seed < 0.36) {
        p.mode = 'ray';
        p.ang = rand(-Math.PI * 0.85, -Math.PI * 0.15);
        p.off = rand(0, 1);
        p.baseAlpha = rand(0.25, 0.6); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.46) {
        p.mode = 'bd';
        p.li = i % 2;
        cardHome(p, badge, p.li, 2);
        p.baseAlpha = rand(0.35, 0.75); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.54) {
        p.mode = 'mp';
        p.mi = i % 3;
        p.baseAlpha = rand(0.4, 0.8); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.62) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- start: the socket from the opening slide receives its first
  // -- agent, and the first small outputs begin to flow
  layouts.start = function () {
    var repo = { x: W * (isMobile ? 0.36 : 0.64), y: H * (isMobile ? 0.30 : 0.46), w: MN * 0.13, h: MN * 0.15 };
    var sock = { x: W * (isMobile ? 0.74 : 0.875), y: H * (isMobile ? 0.16 : 0.24), r: MN * 0.045 };
    board = {
      repo: repo, sock: sock,
      cycle: 6200,
      inPth: makePath(W * 0.99, H * 0.06, sock.x + sock.r * 0.4, sock.y - sock.r * 0.6, 0.14),
      handPth: makePath(sock.x - sock.r * 0.8, sock.y + sock.r * 0.6, repo.x + repo.w * 0.4, repo.y - repo.h * 0.4, 0.12),
      outPth: makePath(repo.x - repo.w * 0.4, repo.y + repo.h * 0.45, W * (isMobile ? 0.10 : 0.52), H * (isMobile ? 0.56 : 0.78), 0.16),
      labels: [
        { x: repo.x, y: repo.y + repo.h * 0.62 + 18, text: 'YOUR REPOSITORY' },
        { x: sock.x, y: sock.y + sock.r * 1.6 + 14, text: 'YOUR FIRST WORKFLOW' },
        { x: W * (isMobile ? 0.10 : 0.52), y: H * (isMobile ? 0.56 : 0.78) + 22, text: 'SMALL WINS, COMPOUNDING' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.18) {
        p.mode = 'core';
        p.li = i % 6;
        cardHome(p, repo, p.li, 6);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.30) {
        p.mode = 'agent';
        p.off = rand(0, 0.1);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.34, 0.62); p.fast = true;
      } else if (p.seed < 0.40) {
        p.mode = 'hand';
        p.dir = p.seed < 0.35 ? 1 : -1;
        p.off = rand(0, 0.15);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.3, 0.5); p.fast = true;
      } else if (p.seed < 0.50) {
        p.mode = 'win';
        p.off = rand(0, 0.4);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.58) {
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

    } else if (sceneName === 'ask') {
      var ba = board;
      var prog = fract(te / ba.cycle);
      var sparkU = win(prog, 0.55, 0.95);
      board.sockFlare = sparkU >= 0 && sparkU > 0.7 ? (sparkU - 0.7) / 0.3 : 0;
      // gears orbit the repository, slowly precessing
      board.gpos = [];
      for (var g = 0; g < ba.gearN; g++) {
        var ga = t * 0.00012 + g * Math.PI * 2 / ba.gearN;
        board.gpos.push([
          ba.repo.x + Math.cos(ga) * ba.orbR * 1.25,
          ba.repo.y + Math.sin(ga) * ba.orbR * 0.85,
          t * 0.0009 * (g % 2 === 0 ? 1 : -1)
        ]);
      }
      P.forEach(function (p) {
        if (p.mode === 'core') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.8;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'gearp') {
          var gp = board.gpos[p.gi];
          var th = p.phase + t * 0.0012 * (p.gi % 2 === 0 ? 1 : -1);
          p.tx = gp[0] + Math.cos(th) * MN * 0.024 * p.gr;
          p.ty = gp[1] + Math.sin(th) * MN * 0.024 * p.gr;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0013 + p.phase));
        } else if (p.mode === 'spark') {
          if (sparkU < 0) {
            p.tx = ba.sPth.p0[0]; p.ty = ba.sPth.p0[1]; p.alpha = 0;
          } else {
            var s = clamp01(sparkU + p.off * (1 - sparkU));
            var pos = bezier(ba.sPth, easeInOut(s));
            p.tx = pos[0]; p.ty = pos[1];
            p.alpha = p.baseAlpha * bell(sparkU);
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'places') {
      var bp = board;
      var prog2 = fract(te / bp.cycle);
      var ping = win(prog2, 0.05, 0.35);         // question out
      var pong = win(prog2, 0.45, 0.75);         // answer back
      // in zone three, you come and go; the agent does not
      board.away = 0.5 + 0.5 * Math.sin(t * 0.00045);
      P.forEach(function (p) {
        if (p.mode === 'ab') {
          brainTarget(p, t, pong >= 0 ? 0.4 : 0.05);
        } else if (p.mode === 'ide') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.7;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'aw') {
          brainTarget(p, t, 0.25);
        } else if (p.mode === 'rp') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.7;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'pu0' || p.mode === 'pu1') {
          var pth = p.mode === 'pu0' ? bp.q0 : bp.q1;
          var u = ping >= 0 ? ping : pong;
          if (u < 0) {
            p.tx = pth.p0[0]; p.ty = pth.p0[1]; p.alpha = 0;
          } else {
            var s2 = clamp01(u + p.off * (1 - u));
            var pos2 = bezier(pth, ping >= 0 ? easeInOut(s2) : 1 - easeInOut(s2));
            p.tx = pos2[0]; p.ty = pos2[1];
            p.alpha = p.baseAlpha * bell(u);
          }
        } else if (p.mode === 'pu2') {
          // the repo agent works on a steady loop of its own
          var s3 = fract(p.off + te / 2600);
          var pos3 = bezier(bp.q2, s3);
          p.tx = pos3[0]; p.ty = pos3[1];
          var edge = Math.min(1, Math.min(s3, 1 - s3) * 8);
          p.alpha = p.baseAlpha * edge * 0.85;
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'triggers') {
      var bt = board;
      var az = t * 0.00022;
      board.az = az;
      var active = Math.floor(te / bt.cycle) % bt.ne;
      var prog3 = fract(te / bt.cycle);
      board.active = active;
      var dropU = win(prog3, 0.30, 0.62);
      var runU = win(prog3, 0.66, 0.96);
      board.fileFlare = dropU >= 0 && dropU > 0.7 ? (dropU - 0.7) / 0.3 : 0;
      // event ring positions in 3D
      board.epos = [];
      for (var e = 0; e < bt.ne; e++) {
        var ea = e * Math.PI * 2 / bt.ne;
        board.epos.push(proj(bt.sp, [Math.cos(ea), 0.12 * Math.sin(ea * 2), Math.sin(ea)], az));
      }
      var apos = board.epos[active];
      P.forEach(function (p) {
        if (p.mode === 'ev') {
          var ea2 = p.ei * Math.PI * 2 / bt.ne;
          var pr = proj(bt.sp, [
            Math.cos(ea2) + p.j[0], 0.12 * Math.sin(ea2 * 2) + p.j[1], Math.sin(ea2) + p.j[2]
          ], az);
          p.tx = pr[0]; p.ty = pr[1];
          var hot = p.ei === active && prog3 < 0.34 ? 0.4 : 0;
          p.alpha = p.baseAlpha * (0.3 + 0.55 * pr[2]) + hot;
          p.sizeMul = (0.3 + 0.4 * pr[2]) * (p.ei === active ? 1.25 : 1);
        } else if (p.mode === 'file') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.8;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + board.fileFlare * 0.35;
        } else if (p.mode === 'drop') {
          if (dropU < 0) {
            p.tx = apos[0]; p.ty = apos[1]; p.alpha = 0;
          } else {
            var s4 = clamp01(dropU + p.off * (1 - dropU));
            var ex = apos[0] + (bt.file.x - apos[0]) * easeInOut(s4);
            var ey = apos[1] + (bt.file.y - bt.file.h * 0.3 - apos[1]) * easeInOut(s4);
            p.tx = ex; p.ty = ey;
            p.alpha = p.baseAlpha * bell(dropU);
          }
        } else if (p.mode === 'run') {
          if (runU < 0) {
            p.tx = bt.file.x; p.ty = bt.file.y + bt.file.h * 0.5; p.alpha = 0;
          } else {
            var s5 = fract(p.off + runU * 1.4);
            p.tx = bt.file.x + Math.sin(p.phase) * bt.file.w * 0.3;
            p.ty = bt.file.y + bt.file.h * 0.55 + s5 * MN * 0.09;
            p.alpha = p.baseAlpha * bell(runU) * (1 - s5);
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'boundary') {
      var bb = board;
      var prog4 = fract(te / bb.cycle);
      var inU = win(prog4, 0.05, 0.35);
      var brU = win(prog4, 0.45, 0.85);
      board.fileFlare = (inU >= 0 && inU > 0.7 ? (inU - 0.7) / 0.3 : 0) +
        (brU >= 0 && brU > 0.8 ? (brU - 0.8) / 0.2 : 0);
      board.brU = brU;
      P.forEach(function (p) {
        if (p.mode === 'file') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.8;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + board.fileFlare * 0.35;
        } else if (p.mode === 'inp') {
          var uI = win(fract(prog4 + p.off * 0.2), 0.05, 0.35);
          if (uI < 0) {
            p.tx = bb.inPths[p.ei].p0[0]; p.ty = bb.inPths[p.ei].p0[1]; p.alpha = 0;
          } else {
            var s6 = clamp01(uI + 0.05 * (1 - uI));
            var pos6 = bezier(bb.inPths[p.ei], easeInOut(s6));
            p.tx = pos6[0]; p.ty = pos6[1];
            p.alpha = p.baseAlpha * bell(uI);
          }
        } else if (p.mode === 'outp') {
          // the outside world shouts, and the sound dies at the wall
          var cyc = fract(t / p.dur + p.off);
          var o = bb.out[p.oi];
          var sx = o.x - bb.ow * 0.6;
          var ex2 = bb.gh.x1 + MN * 0.02;
          p.tx = sx + (ex2 - sx) * cyc;
          p.ty = o.y + Math.sin(cyc * Math.PI * 2 + p.phase) * 4;
          var fadeIn = clamp01(cyc / 0.15);
          var wallKill = cyc > 0.8 ? 1 - (cyc - 0.8) / 0.2 : 1;
          p.alpha = p.baseAlpha * fadeIn * wallKill * 0.8;
        } else if (p.mode === 'sys') {
          p.tx = p.hx + Math.sin(t * 0.0008 + p.phase) * 1.4;
          p.ty = p.hy + Math.cos(t * 0.0007 + p.phase) * 1.1;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'br') {
          if (brU < 0) {
            p.tx = bb.bridge.p0[0]; p.ty = bb.bridge.p0[1]; p.alpha = 0;
          } else {
            var s7 = clamp01(brU + p.off * (1 - brU));
            var pos7 = bezier(bb.bridge, easeInOut(s7));
            p.tx = pos7[0]; p.ty = pos7[1];
            p.alpha = p.baseAlpha * bell(brU);
          }
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'think') {
      var bk = board;
      var progL = fract(te / bk.cycleL);
      var lU = win(progL, 0.04, 0.92);
      var progR = fract(te / bk.cycleR);
      var evU = win(progR, 0.03, 0.15);
      var th1 = win(progR, 0.15, 0.27);
      var invU = win(progR, 0.27, 0.40);
      var backU = win(progR, 0.40, 0.52);
      var th2 = win(progR, 0.52, 0.62);
      var wrU = win(progR, 0.64, 0.86);
      var agit = th1 >= 0 ? bell(th1) : (th2 >= 0 ? bell(th2) : 0);
      board.agit = agit; board.wrU = wrU;
      board.stnHot = lU >= 0 ? Math.min(2, Math.floor(lU * 3.2)) : -1;
      P.forEach(function (p) {
        if (p.mode === 'stn') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.7;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          var hot2 = board.stnHot === p.si ? 0.3 : 0;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + hot2;
        } else if (p.mode === 'belt') {
          if (lU < 0) {
            p.tx = bk.chainL[0].p0[0]; p.ty = bk.chainL[0].p0[1]; p.alpha = 0;
          } else {
            var s8 = clamp01(lU + p.off * 0.2 * (1 - lU));
            var pos8 = chainPos(bk.chainL, s8);
            p.tx = pos8[0]; p.ty = pos8[1];
            p.alpha = p.baseAlpha * bell(lU * 0.6 + 0.2);
          }
        } else if (p.mode === 'brain') {
          brainTarget(p, t, agit);
        } else if (p.mode === 'evp') {
          if (evU < 0) {
            p.tx = bk.evPth.p0[0]; p.ty = bk.evPth.p0[1]; p.alpha = 0;
          } else {
            var s9 = clamp01(evU + p.off * (1 - evU));
            var pos9 = bezier(bk.evPth, easeInOut(s9));
            p.tx = pos9[0]; p.ty = pos9[1];
            p.alpha = p.baseAlpha * bell(evU);
          }
        } else if (p.mode === 'invest') {
          var uV = invU >= 0 ? invU : backU;
          var pthV = invU >= 0 ? bk.dataPth : bk.backPth;
          if (uV < 0) {
            p.tx = bk.dataPth.p0[0]; p.ty = bk.dataPth.p0[1]; p.alpha = 0;
          } else {
            var s10 = clamp01(uV + p.off * (1 - uV));
            var pos10 = bezier(pthV, easeInOut(s10));
            p.tx = pos10[0]; p.ty = pos10[1];
            p.alpha = p.baseAlpha * bell(uV);
          }
        } else if (p.mode === 'wr') {
          if (wrU < 0) {
            p.tx = bk.outPth.p0[0]; p.ty = bk.outPth.p0[1]; p.alpha = 0;
          } else {
            var s11 = clamp01(wrU + p.off * (1 - wrU));
            var pos11 = bezier(bk.outPth, easeInOut(s11));
            p.tx = pos11[0]; p.ty = pos11[1];
            p.alpha = p.baseAlpha * bell(wrU);
          }
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'markdown') {
      var bm = board;
      var az2 = t * 0.0004;
      board.az = az2;
      var active2 = Math.floor(te / bm.cycle) % 5;
      var prog5 = fract(te / bm.cycle);
      board.active = active2;
      var dockU = win(prog5, 0.30, 0.58);
      var compU = win(prog5, 0.62, 0.92);
      board.fileGlow = dockU >= 0 ? bell(dockU) : 0;
      board.lockFlare = compU >= 0 && compU > 0.7 ? (compU - 0.7) / 0.3 : 0;
      board.enpos = [];
      for (var e2 = 0; e2 < 5; e2++) {
        var ea3 = e2 * Math.PI * 2 / 5;
        board.enpos.push(proj(bm.sp, [Math.cos(ea3), 0, Math.sin(ea3)], az2));
      }
      var adock = board.enpos[active2];
      P.forEach(function (p) {
        if (p.mode === 'fm') {
          p.tx = p.hx + Math.sin(t * 0.0013 + p.phase) * 0.7;
          p.ty = p.hy + Math.cos(t * 0.0011 + p.phase) * 0.5;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0012 + p.phase));
        } else if (p.mode === 'prose') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.7;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + board.fileGlow * 0.25;
        } else if (p.mode === 'eng') {
          var ea4 = p.ei * Math.PI * 2 / 5;
          var pr2 = proj(bm.sp, [
            Math.cos(ea4) + p.j[0], p.j[1], Math.sin(ea4) + p.j[2]
          ], az2);
          p.tx = pr2[0]; p.ty = pr2[1];
          var hot3 = p.ei === active2 ? 0.3 : 0;
          p.alpha = p.baseAlpha * (0.28 + 0.55 * pr2[2]) + hot3;
          p.sizeMul = (0.32 + 0.42 * pr2[2]) * (p.ei === active2 ? 1.3 : 1);
        } else if (p.mode === 'dock') {
          if (dockU < 0) {
            p.tx = adock[0]; p.ty = adock[1]; p.alpha = 0;
          } else {
            var s12 = clamp01(dockU + p.off * (1 - dockU));
            p.tx = adock[0] + (bm.file.x + bm.file.w * 0.3 - adock[0]) * easeInOut(s12);
            p.ty = adock[1] + (bm.file.y - bm.file.h * 0.3 - adock[1]) * easeInOut(s12);
            p.alpha = p.baseAlpha * bell(dockU);
          }
        } else if (p.mode === 'comp') {
          if (compU < 0) {
            p.tx = bm.compPth.p0[0]; p.ty = bm.compPth.p0[1]; p.alpha = 0;
          } else {
            var s13 = clamp01(compU + p.off * (1 - compU));
            var pos13 = bezier(bm.compPth, easeInOut(s13));
            p.tx = pos13[0]; p.ty = pos13[1];
            p.alpha = p.baseAlpha * bell(compU);
          }
        } else if (p.mode === 'lockp') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.7;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + board.lockFlare * 0.35;
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'guardrails') {
      var bg = board;
      var prog6 = fract(te / bg.cycle);
      var propU = win(prog6, 0.10, 0.42);
      var revU = win(prog6, 0.50, 0.82);
      var okU = win(prog6, 0.82, 0.96);
      board.humanGlow = okU >= 0 ? bell(okU) : 0;
      board.activeGate = Math.floor(te / bg.cycle) % 3;
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, propU >= 0 && propU < 0.3 ? 0.5 : 0.1);
        } else if (p.mode === 'block') {
          // reaches for the outside, meets the firewall
          var cyc2 = fract(t / p.dur + p.off);
          var rr = cyc2 * bg.ringR;
          p.tx = bg.core.x + Math.cos(p.ang) * rr;
          p.ty = bg.core.y + Math.sin(p.ang) * rr * 0.9;
          var kill = cyc2 > 0.82 ? 1 - (cyc2 - 0.82) / 0.18 : 1;
          p.alpha = p.baseAlpha * clamp01(cyc2 / 0.2) * kill * (cyc2 > 0.78 ? 1.3 : 0.7);
        } else if (p.mode === 'prop') {
          if (p.gix !== board.activeGate || propU < 0) {
            p.tx = bg.gPths[p.gix].p0[0]; p.ty = bg.gPths[p.gix].p0[1]; p.alpha = 0;
          } else {
            var s14 = clamp01(propU + p.off * (1 - propU));
            var pos14 = bezier(bg.gPths[p.gix], easeInOut(s14));
            p.tx = pos14[0]; p.ty = pos14[1];
            p.alpha = p.baseAlpha * bell(propU);
          }
        } else if (p.mode === 'rev') {
          if (p.gix !== board.activeGate || revU < 0) {
            p.tx = bg.hPths[p.gix].p0[0]; p.ty = bg.hPths[p.gix].p0[1]; p.alpha = 0;
          } else {
            var s15 = clamp01(revU + p.off * (1 - revU));
            var pos15 = bezier(bg.hPths[p.gix], easeInOut(s15));
            p.tx = pos15[0]; p.ty = pos15[1];
            p.alpha = p.baseAlpha * bell(revU);
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'helps') {
      var bh = board;
      var slot = Math.floor(te / bh.cycle);
      var served = slot % (bh.nn + 2);          // two beats of rest per round
      var slotU = fract(te / bh.cycle);
      board.served = served < bh.nn ? served : -1;
      board.checked = Math.min(bh.nn, served);
      board.sweepA = -Math.PI / 2 + (served + (served < bh.nn ? easeInOut(slotU) : 0)) * Math.PI * 2 / bh.nn;
      P.forEach(function (p) {
        if (p.mode === 'ch') {
          p.tx = p.hx + Math.sin(t * 0.0007 * p.speed + p.phase) * 1.8;
          p.ty = p.hy + Math.cos(t * 0.0006 * p.speed + p.phase) * 1.4;
          var done = p.ni < board.checked;
          var hot4 = board.served === p.ni ? bell(clamp01(slotU)) * 0.5 : 0;
          p.alpha = p.baseAlpha * (done ? 0.9 : 0.45) * (0.6 + 0.4 * Math.sin(t * 0.0011 + p.phase)) + hot4;
        } else if (p.mode === 'hand') {
          var hr = p.rr * MN * (isMobile ? 0.20 : 0.24);
          p.tx = bh.c.x + Math.cos(board.sweepA) * hr;
          p.ty = bh.c.y + Math.sin(board.sweepA) * hr * 0.8;
          p.alpha = p.baseAlpha * (board.served >= 0 ? 0.85 : 0.15);
        } else if (p.mode === 'hub') {
          p.tx = p.hx + Math.sin(t * 0.0011 + p.phase) * 1.2;
          p.ty = p.hy + Math.cos(t * 0.0009 + p.phase) * 1;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0013 + p.phase));
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'team') {
      var bT = board;
      var slot2 = Math.floor(te / bT.hold);
      var active3 = slot2 % 4;
      var slotU2 = fract(te / bT.hold);
      board.active = active3;
      var delU = win(slotU2, 0.05, 0.55);
      board.landFlare = win(slotU2, 0.55, 0.85);
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, delU >= 0 && delU < 0.2 ? 0.5 : 0.12);
        } else if (p.mode === 'del') {
          if (p.ri !== active3 || delU < 0) {
            p.tx = bT.pths[p.ri].p0[0]; p.ty = bT.pths[p.ri].p0[1]; p.alpha = 0;
          } else {
            var s16 = clamp01(delU + p.off * (1 - delU));
            var pos16 = bezier(bT.pths[p.ri], easeInOut(s16));
            p.tx = pos16[0]; p.ty = pos16[1];
            p.alpha = p.baseAlpha * bell(delU);
          }
        } else if (p.mode === 'art') {
          p.tx = p.hx + Math.sin(t * 0.0011 + p.phase) * 0.9;
          p.ty = p.hy + Math.cos(t * 0.0009 + p.phase) * 0.7;
          // the artifact appears once this role has been served this round
          var servedRole = (slot2 % 4) > p.ri || (active3 === p.ri && slotU2 > 0.55) ||
            slot2 >= 4;
          var flare = active3 === p.ri && board.landFlare >= 0 ? bell(board.landFlare) * 0.4 : 0;
          p.alpha = p.baseAlpha * (servedRole ? 0.85 : 0.12) *
            (0.6 + 0.4 * Math.sin(t * 0.0012 + p.phase)) + flare;
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'preview') {
      var bv = board;
      var rise = 0.5 + 0.5 * Math.sin(t * 0.00018);   // the sun breathes upward, slowly
      board.rise = rise;
      var sy = bv.sun.y - rise * MN * 0.05;
      P.forEach(function (p) {
        if (p.mode === 'sunp') {
          p.tx = bv.sun.x + p.ox + Math.sin(t * 0.0007 + p.phase) * 1.6;
          p.ty = sy + p.oy + Math.cos(t * 0.0006 + p.phase) * 1.2;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0011 + p.phase)) * (0.7 + rise * 0.3);
        } else if (p.mode === 'ray') {
          var rl = fract(p.off + t * 0.00012);
          var rr2 = bv.sun.r * (1.1 + rl * 2.6);
          p.tx = bv.sun.x + Math.cos(p.ang) * rr2;
          p.ty = sy + Math.sin(p.ang) * rr2 * 0.8;
          p.alpha = p.baseAlpha * (1 - rl) * (0.5 + rise * 0.5);
        } else if (p.mode === 'bd') {
          p.tx = p.hx + Math.sin(t * 0.0011 + p.phase) * 0.8;
          p.ty = p.hy + Math.cos(t * 0.0009 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0014 + p.phase));
        } else if (p.mode === 'mp') {
          var m = bv.meters[p.mi];
          var fillNow = m.fill * (0.75 + 0.25 * Math.sin(t * 0.0004 + p.mi * 2.1));
          p.tx = m.x - bv.mw / 2 + fract(p.seed * 77.7) * bv.mw * fillNow;
          p.ty = m.y + Math.sin(t * 0.0015 + p.phase) * 2.4;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0013 + p.phase));
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'start') {
      var bs = board;
      var prog7 = fract(te / bs.cycle);
      var inU2 = win(prog7, 0.02, 0.22);
      var dockU2 = win(prog7, 0.22, 0.32);
      var handU = win(prog7, 0.34, 0.60);
      var winU = win(prog7, 0.62, 0.95);
      board.sockGlow = dockU2 >= 0 ? bell(dockU2) : (prog7 > 0.32 ? 0.45 : 0);
      P.forEach(function (p) {
        if (p.mode === 'core') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.8;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'agent') {
          if (inU2 >= 0) {
            var s17 = clamp01(inU2 + p.off * (1 - inU2));
            var pos17 = bezier(bs.inPth, easeInOut(s17));
            p.tx = pos17[0]; p.ty = pos17[1];
            p.alpha = p.baseAlpha * (0.3 + 0.7 * inU2);
          } else if (prog7 > 0.22) {
            // docked: a small living cluster in the socket
            p.tx = bs.sock.x + Math.sin(p.phase + t * 0.0012) * bs.sock.r * 0.55;
            p.ty = bs.sock.y + Math.cos(p.phase * 1.7 + t * 0.001) * bs.sock.r * 0.5;
            p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.0014 + p.phase));
          } else {
            p.tx = bs.inPth.p0[0]; p.ty = bs.inPth.p0[1]; p.alpha = 0;
          }
        } else if (p.mode === 'hand') {
          if (handU < 0) {
            var st = p.dir === 1 ? bs.handPth.p0 : bs.handPth.p1;
            p.tx = st[0]; p.ty = st[1]; p.alpha = 0;
          } else {
            var s18 = clamp01(handU + p.off * (1 - handU));
            var pos18 = bezier(bs.handPth, p.dir === 1 ? easeInOut(s18) : 1 - easeInOut(s18));
            p.tx = pos18[0]; p.ty = pos18[1];
            p.alpha = p.baseAlpha * bell(handU);
          }
        } else if (p.mode === 'win') {
          if (winU < 0) {
            p.tx = bs.outPth.p0[0]; p.ty = bs.outPth.p0[1]; p.alpha = 0;
          } else {
            var s19 = fract(p.off + winU * 1.6);
            var pos19 = bezier(bs.outPth, s19);
            p.tx = pos19[0]; p.ty = pos19[1];
            p.alpha = p.baseAlpha * bell(winU) * bell(clamp01(s19));
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
  function drawGear(x, y, r, ang, a) {
    if (a <= 0.01) return;
    ctx.strokeStyle = 'rgba(200,200,215,' + (0.36 * a) + ')';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    for (var k = 0; k < 8; k++) {
      var ta = ang + k * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ta) * r, y + Math.sin(ta) * r);
      ctx.lineTo(x + Math.cos(ta) * r * 1.28, y + Math.sin(ta) * r * 1.28);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
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
  function drawFileCard(c, a, hot) {
    if (a <= 0.01) return;
    drawBoxNode(c, a, hot);
    ctx.strokeStyle = 'rgba(200,200,215,' + (0.32 * a) + ')';
    ctx.beginPath();
    ctx.moveTo(c.x + c.w / 2 - 9, c.y - c.h / 2);
    ctx.lineTo(c.x + c.w / 2 - 9, c.y - c.h / 2 + 9);
    ctx.lineTo(c.x + c.w / 2, c.y - c.h / 2 + 9);
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

    } else if (sceneName === 'ask') {
      drawFileCard(board.repo, sf, 0);
      if (board.gpos) {
        board.gpos.forEach(function (gp) {
          drawGear(gp[0], gp[1], MN * 0.026, gp[2], sf);
        });
        labelText('ACTIONS · CI, ALREADY TURNING', board.repo.x,
          board.repo.y + board.orbR * 0.85 + MN * 0.026 * 1.4 + 18, 0.42 * sf);
      }
      // the waiting socket
      var breathe = 0.6 + 0.4 * Math.sin(t * 0.0016);
      ctx.strokeStyle = 'rgba(245,166,35,' + ((0.35 + board.sockFlare * 0.4) * breathe * sf) + ')';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.arc(board.sock.x, board.sock.y, board.sock.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      labelText('?', board.sock.x, board.sock.y + 4, 0.6 * breathe * sf, '245,166,35');
      if (board.sockFlare > 0.02) {
        drawGlow(board.sock.x, board.sock.y, board.sock.r * 2.2, 0.1 * board.sockFlare * sf, true);
      }

    } else if (sceneName === 'places') {
      var bp2 = board;
      drawZone(bp2.Z[0], sf, 'rgba(200,200,215,' + (0.2 * sf) + ')', false);
      drawZone(bp2.Z[1], sf, 'rgba(200,200,215,' + (0.2 * sf) + ')', false);
      // the third habitat warms up when you are away and it works anyway
      drawZone(bp2.Z[2], sf, 'rgba(255,77,28,' + ((0.2 + bp2.away * 0.25) * sf) + ')', false);
      drawPerson(bp2.p0.x, bp2.p0.y, 1, sf);
      drawPerson(bp2.p1.x, bp2.p1.y, 1, sf);
      drawPerson(bp2.p2.x, bp2.p2.y, 1, sf * (1 - bp2.away * 0.85));
      if (bp2.away > 0.6) {
        labelText('YOU, ELSEWHERE', bp2.p2.x, bp2.p2.y + 34, (bp2.away - 0.6) / 0.4 * 0.5 * sf, '245,166,35');
      }
      drawBoxNode(bp2.a1, sf, 0);
      drawFileCard(bp2.r2, sf, 0);

    } else if (sceneName === 'triggers') {
      var bt2 = board;
      // the ring the events ride on
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.1 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(bt2.sp.cx, bt2.sp.cy, bt2.sp.scale, bt2.sp.scale * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      drawFileCard(bt2.file, sf, board.fileFlare);
      if (board.fileFlare > 0.02) {
        drawGlow(bt2.file.x, bt2.file.y, bt2.file.w * 1.3, 0.1 * board.fileFlare * sf, false);
      }
      if (board.epos) {
        board.epos.forEach(function (ep, i) {
          var depth = ep[2];
          var on = board.active === i;
          labelText(bt2.events[i], ep[0], ep[1] - 14,
            (0.15 + depth * 0.5) * (on ? 1.5 : 1) * sf,
            on ? '255,138,102' : '200,200,215');
        });
      }

    } else if (sceneName === 'boundary') {
      var bb2 = board;
      drawZone(bb2.gh, sf, 'rgba(200,200,215,' + (0.26 * sf) + ')', false);
      // the boundary itself, breathing ember on the outside edge
      var wob = 0.8 + 0.2 * Math.sin(t * 0.0011);
      ctx.strokeStyle = 'rgba(255,77,28,' + (0.4 * wob * sf) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bb2.gh.x1, bb2.gh.y0 + 10);
      ctx.lineTo(bb2.gh.x1, bb2.gh.y1 - 10);
      ctx.stroke();
      drawFileCard(bb2.file, sf, board.fileFlare);
      bb2.out.forEach(function (o) {
        drawBoxNode({ x: o.x, y: o.y, w: bb2.ow, h: bb2.oh }, sf * 0.75, 0);
        labelText(o.text, o.x, o.y + bb2.oh * 0.5 + 16, 0.42 * sf);
      });
      // the one bridge that makes it across
      ctx.setLineDash([3, 6]);
      strokePath(bb2.bridge, 'rgba(245,166,35,' + ((board.brU >= 0 ? 0.4 : 0.16) * sf) + ')', 1.1);
      ctx.setLineDash([]);
      var midB = bezier(bb2.bridge, 0.45);
      labelText('WEBHOOK BRIDGE', midB[0], midB[1] - 10,
        (board.brU >= 0 ? 0.7 : 0.4) * sf, '245,166,35');

    } else if (sceneName === 'think') {
      var bk2 = board;
      drawLinksSet(1);
      // the classic line
      bk2.st.forEach(function (s, i) {
        drawBoxNode({ x: s.x, y: s.y, w: bk2.stW, h: bk2.stH }, sf, board.stnHot === i ? 0.5 : 0);
      });
      bk2.chainL.forEach(function (pth) {
        strokePath(pth, 'rgba(200,200,215,' + (0.14 * sf) + ')', 1);
      });
      // the agentic side
      drawBoxNode(bk2.evc, sf, 0);
      drawBoxNode(bk2.data, sf, 0);
      drawBoxNode(bk2.outb, sf, board.wrU >= 0 ? 0.5 : 0);
      strokePath(bk2.evPth, 'rgba(200,200,215,' + (0.1 * sf) + ')', 1);
      strokePath(bk2.dataPth, 'rgba(200,200,215,' + (0.1 * sf) + ')', 1);
      strokePath(bk2.outPth, 'rgba(255,138,102,' + ((board.wrU >= 0 ? 0.3 : 0.1) * sf) + ')', 1);
      if (board.agit > 0.02) {
        var rrT = 10 + board.agit * bk2.agent.r * 1.2;
        ctx.strokeStyle = 'rgba(255,77,28,' + (0.45 * (1 - board.agit * 0.5) * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(bk2.agent.x, bk2.agent.y, rrT, rrT * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

    } else if (sceneName === 'markdown') {
      var bm2 = board;
      drawFileCard(bm2.file, sf, board.fileGlow * 0.6);
      // the frontmatter fence inside the file
      ctx.strokeStyle = 'rgba(245,166,35,' + (0.3 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bm2.file.x - bm2.file.w / 2 + 6, bm2.file.y - bm2.file.h * 0.24);
      ctx.lineTo(bm2.file.x + bm2.file.w / 2 - 6, bm2.file.y - bm2.file.h * 0.24);
      ctx.stroke();
      labelText('TRIGGER · PERMISSIONS · ENGINE', bm2.file.x, bm2.file.y - bm2.file.h * 0.24 + 14, 0.4 * sf, '245,166,35');
      if (board.fileGlow > 0.05) {
        drawGlow(bm2.file.x, bm2.file.y, bm2.file.w * 1.1, 0.08 * board.fileGlow * sf, false);
      }
      // carousel ring
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.1 * sf) + ')';
      ctx.beginPath();
      ctx.ellipse(bm2.sp.cx, bm2.sp.cy, bm2.sp.scale, bm2.sp.scale * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (board.enpos) {
        board.enpos.forEach(function (ep, i) {
          var on = board.active === i;
          var front = clamp01((ep[2] - 0.95) * 1.8);
          if (front <= 0.03 && !on) return;
          labelText(bm2.engines[i], ep[0], ep[1] + 22,
            Math.max(front * 0.7, on ? 0.75 : 0) * sf,
            on ? '255,138,102' : '200,200,215');
        });
      }
      drawFileCard(bm2.lock, sf, board.lockFlare);
      if (board.lockFlare > 0.02) {
        drawGlow(bm2.lock.x, bm2.lock.y, bm2.lock.w * 1.4, 0.08 * board.lockFlare * sf, true);
      }

    } else if (sceneName === 'guardrails') {
      var bg2 = board;
      drawLinksSet(1);
      // the firewall ring
      var wob2 = 0.75 + 0.25 * Math.sin(t * 0.0012);
      ctx.strokeStyle = 'rgba(255,77,28,' + (0.4 * wob2 * sf) + ')';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([10, 7]);
      ctx.beginPath();
      ctx.ellipse(bg2.core.x, bg2.core.y, bg2.ringR, bg2.ringR * 0.9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // gates and the paths through them
      bg2.gates.forEach(function (g, i) {
        var on = board.activeGate === i;
        drawBoxNode({ x: g.x, y: g.y, w: bg2.gw, h: bg2.gh2 }, sf, on ? 0.6 : 0.1);
        labelText(g.text, g.x, g.y + bg2.gh2 * 0.5 + 14, (on ? 0.7 : 0.42) * sf);
        strokePath(bg2.gPths[i], 'rgba(200,200,215,' + ((on ? 0.2 : 0.07) * sf) + ')', 1);
        strokePath(bg2.hPths[i], 'rgba(245,166,35,' + ((on ? 0.22 : 0.07) * sf) + ')', 1);
      });
      drawPerson(bg2.human.x, bg2.human.y, 1.05, sf);
      if (board.humanGlow > 0.02) {
        drawGlow(bg2.human.x, bg2.human.y - 8, 44, 0.13 * board.humanGlow * sf, true);
      }

    } else if (sceneName === 'helps') {
      var bh2 = board;
      // the sweep hand
      if (board.served >= 0) {
        var hx = bh2.c.x + Math.cos(board.sweepA) * MN * (isMobile ? 0.20 : 0.24);
        var hy = bh2.c.y + Math.sin(board.sweepA) * MN * (isMobile ? 0.20 : 0.24) * 0.8;
        ctx.strokeStyle = 'rgba(245,166,35,' + (0.28 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bh2.c.x, bh2.c.y);
        ctx.lineTo(hx, hy);
        ctx.stroke();
      }
      bh2.nodes.forEach(function (nd, i) {
        var done = i < board.checked;
        ctx.strokeStyle = done
          ? 'rgba(245,166,35,' + (0.5 * sf) + ')'
          : 'rgba(200,200,215,' + (0.22 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, nd.r * 1.6, 0, Math.PI * 2);
        ctx.stroke();
        labelText(nd.text, nd.x, nd.y + nd.r * 1.6 + 16, (done ? 0.65 : 0.4) * sf,
          done ? '245,166,35' : '200,200,215');
        if (done) {
          // a small check, earned
          ctx.strokeStyle = 'rgba(245,166,35,' + (0.75 * sf) + ')';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(nd.x - 4, nd.y);
          ctx.lineTo(nd.x - 1, nd.y + 3.4);
          ctx.lineTo(nd.x + 4.6, nd.y - 3.6);
          ctx.stroke();
        }
      });

    } else if (sceneName === 'team') {
      var bT2 = board;
      drawLinksSet(1);
      bT2.roles.forEach(function (r, i) {
        var on = board.active === i;
        drawPerson(r.x, r.y, 1.1, sf);
        if (on) {
          var ringA = board.landFlare >= 0 ? bell(board.landFlare) : 0.4;
          ctx.strokeStyle = 'rgba(255,138,102,' + (0.5 * ringA * sf) + ')';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(r.x, r.y - 4, 26, 0, Math.PI * 2);
          ctx.stroke();
        }
        labelText(r.text, r.x, r.y + 46, (on ? 0.8 : 0.5) * sf);
        labelText(r.art, r.x, r.y - MN * 0.075 - 22, (on ? 0.7 : 0.34) * sf,
          on ? '255,138,102' : '200,200,215');
        drawBoxNode({ x: r.x, y: r.y - MN * 0.075, w: MN * 0.075, h: MN * 0.045 }, sf * 0.8, on ? 0.4 : 0);
        strokePath(bT2.pths[i], 'rgba(200,200,215,' + ((on ? 0.2 : 0.06) * sf) + ')', 1);
      });

    } else if (sceneName === 'preview') {
      var bv2 = board;
      var sy2 = bv2.sun.y - board.rise * MN * 0.05;
      // horizon
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.16 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W * (isMobile ? 0.06 : 0.55), bv2.hor);
      ctx.lineTo(W * 0.95, bv2.hor);
      ctx.stroke();
      drawGlow(bv2.sun.x, sy2, bv2.sun.r * 3.2, 0.1 * (0.6 + board.rise * 0.4) * sf, true);
      // the badge, glowing warm
      drawBoxNode(bv2.badge, sf, 0.35);
      labelText('PUBLIC PREVIEW', bv2.badge.x, bv2.badge.y + 4, 0.85 * sf, '245,166,35');
      // meters, honest but calm
      bv2.meters.forEach(function (m) {
        ctx.strokeStyle = 'rgba(200,200,215,' + (0.28 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(m.x - bv2.mw / 2, m.y - bv2.mh / 2, bv2.mw, bv2.mh, 4);
        ctx.stroke();
        labelText(m.text, m.x, m.y + bv2.mh + 14, 0.42 * sf);
      });

    } else if (sceneName === 'start') {
      var bs2 = board;
      drawFileCard(bs2.repo, sf, 0);
      var glowS = board.sockGlow || 0;
      ctx.strokeStyle = 'rgba(245,166,35,' + ((0.4 + glowS * 0.4) * sf) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bs2.sock.x, bs2.sock.y, bs2.sock.r, 0, Math.PI * 2);
      ctx.stroke();
      if (glowS > 0.02) {
        drawGlow(bs2.sock.x, bs2.sock.y, bs2.sock.r * 2.4, 0.12 * glowS * sf, true);
      }
      strokePath(bs2.handPth, 'rgba(200,200,215,' + (0.12 * sf) + ')', 1);
      strokePath(bs2.outPth, 'rgba(245,166,35,' + (0.14 * sf) + ')', 1);

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
        active: board.active,
        served: board.served,
        checked: board.checked
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
