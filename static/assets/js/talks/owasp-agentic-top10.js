/* ============================================================
   MKLab Living Canvas: OWASP Agentic Top 10 edition
   One particle system behind the whole deck. Slides declare a
   scene via <section data-scene="...">; scrolling morphs the
   same lights from one scene into the next.
   Scenes: title, stage, amplify, hijack, toolmis, ident,
   supply2, rce, mempoison, comms, cascade, trust, rogue,
   pairing, posture2, sources, outro.
   Color language: attacks are a cold pale light, damage flares
   ember, defenses are candle. Content adapted from the OWASP
   Top 10 for Agentic Applications 2026 (CC BY-SA 4.0,
   genai.owasp.org). No dependencies. Decorative only.
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
  var paleS = sprite('rgba(175,195,240,1)');   // the intruder's light

  // ---------- Particles ----------
  var N = isMobile ? 340 : 860;
  var P = [];
  (function () {
    for (var i = 0; i < N; i++) {
      var r = Math.random();
      var spr = r < 0.40 ? emberS : (r < 0.52 ? flameS : (r < 0.94 ? whiteS : candleS));
      P.push({
        x: 0, y: 0, tx: 0, ty: 0,
        k: rand(0.03, 0.08),
        size: rand(0.9, 2.4),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.4, 1.0),
        sprite: spr, baseSprite: spr,
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
    p.baseAlpha = rand(0.04, 0.13); p.sizeMul = rand(0.4, 1.1); p.fast = false;
  }
  function assignBokeh(p) {
    p.mode = 'bokeh';
    p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.05, 0.95);
    p.baseAlpha = rand(0.05, 0.12); p.sizeMul = rand(2.4, 4.0); p.fast = false;
  }
  function boxHome(p, c) {
    p.hx = c.x + rand(-c.w * 0.4, c.w * 0.4);
    p.hy = c.y + rand(-c.h * 0.35, c.h * 0.35);
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

  // -- stage: the whole agentic machine on stage once
  layouts.stage = function () {
    var agent = { x: W * 0.47, y: H * 0.28, r: MN * 0.055 };
    var goal = { x: W * 0.47, y: H * 0.085 };
    var tools = [
      { x: W * 0.635, y: H * 0.16, w: MN * 0.042, h: MN * 0.042 },
      { x: W * 0.655, y: H * 0.33, w: MN * 0.042, h: MN * 0.042 }
    ];
    var mem = { x: W * 0.33, y: H * 0.44, w: MN * 0.045, h: MN * 0.06 };
    var badge = { x: W * 0.30, y: H * 0.16 };
    var peers = [
      { x: W * 0.135, y: H * 0.22, r: MN * 0.028 },
      { x: W * 0.115, y: H * 0.40, r: MN * 0.028 }
    ];
    var reg = { x: W * 0.82, y: H * 0.15, w: MN * 0.06, h: MN * 0.055 };
    var human = { x: W * 0.845, y: H * 0.42 };
    board = {
      agent: agent, goal: goal, tools: tools, mem: mem, badge: badge,
      peers: peers, reg: reg, human: human,
      cycle: 6400,
      a2t: makePath(agent.x + agent.r, agent.y - agent.r * 0.4, tools[1].x - tools[1].w, tools[1].y, -0.1),
      a2m: makePath(agent.x - agent.r * 0.5, agent.y + agent.r, mem.x + mem.w * 0.6, mem.y - mem.h * 0.4, 0.12),
      a2p: makePath(agent.x - agent.r * 1.1, agent.y, peers[0].x + peers[0].r, peers[0].y + 6, 0.08),
      r2a: makePath(reg.x - reg.w * 0.6, reg.y + reg.h * 0.3, agent.x + agent.r * 0.9, agent.y - agent.r * 0.5, 0.16),
      a2h: makePath(agent.x + agent.r * 0.8, agent.y + agent.r * 0.7, human.x - 14, human.y - 8, 0.14),
      labels: [
        { x: goal.x, y: goal.y - 16, text: 'THE GOAL' },
        { x: agent.x, y: agent.y + agent.r * 1.6 + 14, text: 'THE AGENT · PLANS, DECIDES, ACTS' },
        { x: tools[0].x + MN * 0.01, y: tools[0].y - tools[0].h * 0.85 - 6, text: 'TOOLS' },
        { x: mem.x, y: mem.y + mem.h * 0.85 + 12, text: 'MEMORY' },
        { x: badge.x, y: badge.y - 18, text: 'CREDENTIALS' },
        { x: peers[1].x, y: peers[1].y + peers[1].r * 1.6 + 12, text: 'PEER AGENTS' },
        { x: reg.x, y: reg.y - reg.h * 0.85 - 6, text: 'LOADED AT RUNTIME' },
        { x: human.x, y: human.y + 38, text: 'THE HUMAN' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.18) {
        p.mode = 'brain'; brainHome(p, agent);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.2, 0.55);
        p.sizeMul = rand(0.32, 0.62); p.fast = false;
      } else if (p.seed < 0.30) {
        p.mode = 'orb';
        var tgt = [tools[0], tools[1], mem, reg][i % 4];
        boxHome(p, tgt);
        p.baseAlpha = rand(0.2, 0.5); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.38) {
        p.mode = 'peer'; p.pi = i % 2;
        brainHome(p, peers[p.pi]);
        p.baseAlpha = rand(0.25, 0.6); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.50) {
        p.mode = 'flow'; p.fi = i % 5; p.off = rand(0, 0.2);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 40);
  };

  // -- amplify: the same small fault, five steps of leverage later
  layouts.amplify = function () {
    var steps = [];
    for (var k = 0; k < 5; k++) {
      steps.push({ x: W * (isMobile ? 0.12 + k * 0.19 : 0.545 + k * 0.0925), y: H * 0.40, r: MN * 0.02 });
    }
    board = {
      steps: steps,
      cycle: 8400,
      labels: [
        { x: steps[0].x, y: steps[0].y - MN * 0.05, text: 'ONE FAULT' },
        { x: steps[4].x, y: steps[4].y - MN * 0.10, text: 'FIVE STEPS LATER' },
        { x: (steps[0].x + steps[4].x) / 2, y: H * 0.72, text: 'PLAN · DECIDE · ACT · REPEAT' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.30) {
        p.mode = 'st'; p.si = i % 5;
        var s = steps[p.si];
        var a = rand(0, Math.PI * 2);
        var d = Math.pow(Math.random(), 0.6) * s.r * 1.5;
        p.hx = s.x + Math.cos(a) * d;
        p.hy = s.y + Math.sin(a) * d;
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.40) {
        p.mode = 'fault'; p.off = rand(0, 0.1); p.sprite = paleS;
        p.baseAlpha = rand(0.45, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.46) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- hijack: the goal star is swapped and the whole plan re-bends
  layouts.hijack = function () {
    var agent = { x: W * (isMobile ? 0.28 : 0.615), y: H * 0.48, r: MN * 0.055 };
    var goal = { x: W * (isMobile ? 0.72 : 0.865), y: H * 0.18 };
    var fake = { x: W * (isMobile ? 0.80 : 0.90), y: H * 0.70 };
    var doc = { x: W * (isMobile ? 0.14 : 0.55), y: H * 0.76, w: MN * 0.05, h: MN * 0.05 };
    board = {
      agent: agent, goal: goal, fake: fake, doc: doc,
      cycle: 9600,
      pGoal: makePath(agent.x + agent.r, agent.y - agent.r * 0.5, goal.x - 8, goal.y + 12, -0.14),
      pFake: makePath(agent.x + agent.r, agent.y + agent.r * 0.5, fake.x - 8, fake.y - 8, 0.14),
      pDoc: makePath(doc.x + doc.w * 0.6, doc.y, agent.x - agent.r * 0.9, agent.y + agent.r * 0.5, -0.12),
      labels: [
        { x: goal.x, y: goal.y - 20, text: 'THE GOAL' },
        { x: fake.x, y: fake.y + 26, text: 'THE HIJACKED GOAL' },
        { x: doc.x, y: doc.y + doc.h * 0.85 + 12, text: 'CONTENT, NOT COMMAND' },
        { x: agent.x, y: agent.y + agent.r * 1.7 + 12, text: 'THE AGENT' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.20) {
        p.mode = 'brain'; brainHome(p, agent);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.2, 0.55);
        p.sizeMul = rand(0.32, 0.62); p.fast = false;
      } else if (p.seed < 0.34) {
        p.mode = 'plan'; p.off = rand(0, 1);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.44) {
        p.mode = 'inj'; p.off = rand(0, 0.12); p.sprite = paleS;
        p.baseAlpha = rand(0.45, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.50) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 40);
  };

  // -- toolmis: read, transform, send; the same chain, retargeted
  layouts.toolmis = function () {
    var agent = { x: W * (isMobile ? 0.30 : 0.62), y: H * 0.66, r: MN * 0.05 };
    var tRead = { x: W * (isMobile ? 0.16 : 0.565), y: H * 0.22, w: MN * 0.05, h: MN * 0.05 };
    var tTrans = { x: W * (isMobile ? 0.5 : 0.725), y: H * 0.32, w: MN * 0.05, h: MN * 0.05 };
    var tSend = { x: W * (isMobile ? 0.84 : 0.88), y: H * 0.22, w: MN * 0.05, h: MN * 0.05 };
    var user = { x: W * (isMobile ? 0.84 : 0.92), y: H * 0.45 };
    var atk = { x: W * (isMobile ? 0.6 : 0.93), y: H * 0.74 };
    board = {
      agent: agent, tRead: tRead, tTrans: tTrans, tSend: tSend, user: user, atk: atk,
      cycle: 9200,
      chain: [
        makePath(tRead.x + tRead.w * 0.6, tRead.y, tTrans.x - tTrans.w * 0.6, tTrans.y, 0.1),
        makePath(tTrans.x + tTrans.w * 0.6, tTrans.y, tSend.x - tSend.w * 0.6, tSend.y, -0.1)
      ],
      pUser: makePath(tSend.x + 6, tSend.y + tSend.h * 0.5, user.x - 6, user.y - 12, 0.08),
      pAtk: makePath(tSend.x + 6, tSend.y + tSend.h * 0.5, atk.x - 6, atk.y - 12, 0.12),
      labels: [
        { x: tRead.x, y: tRead.y - tRead.h * 0.85 - 6, text: 'READ' },
        { x: tTrans.x, y: tTrans.y + tTrans.h * 0.85 + 10, text: 'TRANSFORM' },
        { x: tSend.x, y: tSend.y - tSend.h * 0.85 - 6, text: 'SEND' },
        { x: user.x, y: user.y + 34, text: 'THE USER' },
        { x: atk.x, y: atk.y + 34, text: 'ELSEWHERE' },
        { x: agent.x, y: agent.y + agent.r * 1.6 + 12, text: 'THE AGENT · CHOOSES THE CHAIN' }
      ]
    };
    P.forEach(function (p) {
      if (p.seed < 0.18) {
        p.mode = 'brain'; brainHome(p, agent);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.2, 0.55);
        p.sizeMul = rand(0.3, 0.58); p.fast = false;
      } else if (p.seed < 0.34) {
        p.mode = 'data'; p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.42) {
        p.mode = 'whis'; p.off = rand(0, 0.15); p.sprite = paleS;
        p.baseAlpha = rand(0.45, 0.9); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.48) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 36);
  };

  // -- ident: the badge grows with every hop, and someone joins the
  // -- chain wearing a copy
  layouts.ident = function () {
    var chain = [
      { x: W * (isMobile ? 0.14 : 0.555), y: H * 0.18, person: true, text: 'THE USER' },
      { x: W * (isMobile ? 0.36 : 0.665), y: H * 0.33, r: MN * 0.035, text: 'AGENT A' },
      { x: W * (isMobile ? 0.58 : 0.775), y: H * 0.48, r: MN * 0.035, text: 'AGENT B' },
      { x: W * (isMobile ? 0.80 : 0.885), y: H * 0.63, w: MN * 0.05, h: MN * 0.05, text: 'THE TOOL' }
    ];
    var imp = { x: W * (isMobile ? 0.36 : 0.62), y: H * 0.72, r: MN * 0.03 };
    board = {
      chain: chain, imp: imp,
      cycle: 9800,
      pths: [
        makePath(chain[0].x + 12, chain[0].y + 10, chain[1].x - chain[1].r, chain[1].y - 6, 0.08),
        makePath(chain[1].x + chain[1].r, chain[1].y + 6, chain[2].x - chain[2].r, chain[2].y - 6, 0.08),
        makePath(chain[2].x + chain[2].r, chain[2].y + 6, chain[3].x - chain[3].w * 0.6, chain[3].y - 6, 0.08)
      ],
      pImp: makePath(imp.x + imp.r, imp.y - 6, chain[3].x - chain[3].w * 0.5, chain[3].y + chain[3].h * 0.4, 0.1),
      labels: [
        { x: chain[0].x, y: chain[0].y + 40, text: 'THE USER' },
        { x: chain[1].x, y: chain[1].y + chain[1].r * 1.6 + 12, text: 'AGENT A' },
        { x: chain[2].x, y: chain[2].y + chain[2].r * 1.6 + 12, text: 'AGENT B' },
        { x: chain[3].x, y: chain[3].y + chain[3].h * 0.85 + 12, text: 'THE TOOL' },
        { x: imp.x, y: imp.y + imp.r * 1.6 + 12, text: 'WEARING A COPIED BADGE' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.24) {
        p.mode = 'node'; p.ni = 1 + (i % 2);
        brainHome(p, chain[p.ni]);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.58); p.fast = false;
      } else if (p.seed < 0.36) {
        p.mode = 'badge'; p.off = rand(0, 0.08); p.sprite = candleS;
        p.baseAlpha = rand(0.5, 0.95); p.sizeMul = rand(0.34, 0.62); p.fast = true;
      } else if (p.seed < 0.46) {
        p.mode = 'impp'; p.off = rand(0, 0.1); p.sprite = paleS;
        p.baseAlpha = rand(0.45, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.52) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- supply2: components dock into a running agent; one of them
  // -- was never what it claimed
  layouts.supply2 = function () {
    var reg = { x: W * (isMobile ? 0.5 : 0.60), y: H * 0.14, w: MN * 0.14, h: MN * 0.055 };
    var agent = { x: W * (isMobile ? 0.5 : 0.745), y: H * 0.50, r: MN * 0.055 };
    var task = [
      { x: W * (isMobile ? 0.2 : 0.585), y: H * 0.74, r: MN * 0.015 },
      { x: W * (isMobile ? 0.5 : 0.745), y: H * 0.80, r: MN * 0.015 },
      { x: W * (isMobile ? 0.8 : 0.90), y: H * 0.74, r: MN * 0.015 }
    ];
    board = {
      reg: reg, agent: agent, task: task,
      cycle: 8600,
      pDock: makePath(reg.x, reg.y + reg.h * 0.6, agent.x, agent.y - agent.r * 1.1, 0.06),
      labels: [
        { x: reg.x, y: reg.y - reg.h * 0.85 - 6, text: 'REGISTRIES · TOOLS · PERSONAS · SERVERS' },
        { x: agent.x, y: agent.y + agent.r * 1.6 + 14, text: 'DOCKED MID-TASK' },
        { x: task[1].x, y: task[1].y + 24, text: 'THE TASK KEEPS RUNNING' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.20) {
        p.mode = 'brain'; brainHome(p, agent);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.2, 0.55);
        p.sizeMul = rand(0.32, 0.62); p.fast = false;
      } else if (p.seed < 0.30) {
        p.mode = 'shelf';
        boxHome(p, reg);
        p.baseAlpha = rand(0.25, 0.55); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.44) {
        p.mode = 'comp'; p.ci = i % 3; p.off = rand(0, 0.06);
        p.sprite = p.ci === 2 ? paleS : whiteS;
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.54) {
        p.mode = 'work'; p.off = rand(0, 1);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.26, 0.48); p.fast = true;
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 40);
  };

  // -- rce: harmless pieces converge into running code, and the host
  // -- learns the difference between a call and an execution
  layouts.rce = function () {
    var frags = [
      { x: W * (isMobile ? 0.14 : 0.555), y: H * 0.18, w: MN * 0.045, h: MN * 0.04 },
      { x: W * (isMobile ? 0.14 : 0.545), y: H * 0.44, w: MN * 0.045, h: MN * 0.04 },
      { x: W * (isMobile ? 0.14 : 0.565), y: H * 0.70, w: MN * 0.045, h: MN * 0.04 }
    ];
    var asm = { x: W * (isMobile ? 0.52 : 0.745), y: H * 0.44, w: MN * 0.055, h: MN * 0.06 };
    var host = { x: W * (isMobile ? 0.84 : 0.91), y: H * 0.44, w: MN * 0.06, h: MN * 0.075 };
    board = {
      frags: frags, asm: asm, host: host,
      cycle: 9000,
      pF: frags.map(function (f) {
        return makePath(f.x + f.w * 0.6, f.y, asm.x - asm.w * 0.6, asm.y, (asm.y - f.y) * 0.0008);
      }),
      pH: makePath(asm.x + asm.w * 0.6, asm.y, host.x - host.w * 0.6, host.y, 0.04),
      labels: [
        { x: frags[0].x, y: frags[0].y - frags[0].h * 0.85 - 6, text: 'TOOL OUTPUTS · EACH ONE HARMLESS' },
        { x: asm.x, y: asm.y + asm.h * 0.85 + 12, text: 'ASSEMBLED' },
        { x: host.x, y: host.y + host.h * 0.85 + 12, text: 'THE HOST' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.22) {
        p.mode = 'frag'; p.fi = i % 3; p.off = rand(0, 0.1); p.sprite = paleS;
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.34) {
        p.mode = 'ffill'; p.fi = i % 3;
        boxHome(p, frags[p.fi]);
        p.baseAlpha = rand(0.25, 0.55); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.44) {
        p.mode = 'exec'; p.off = rand(0, 0.1); p.sprite = paleS;
        p.baseAlpha = rand(0.45, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.52) {
        p.mode = 'hfill';
        boxHome(p, host);
        p.baseAlpha = rand(0.25, 0.55); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- mempoison: one poisoned write, and every later plan leans a
  // -- little further off course
  layouts.mempoison = function () {
    var mem = { x: W * (isMobile ? 0.22 : 0.585), y: H * 0.30, w: MN * 0.05, h: MN * 0.065 };
    var agent = { x: W * (isMobile ? 0.6 : 0.77), y: H * 0.48, r: MN * 0.05 };
    board = {
      mem: mem, agent: agent,
      cycle: 10400,
      pRead: makePath(mem.x + mem.w * 0.6, mem.y + mem.h * 0.3, agent.x - agent.r, agent.y - agent.r * 0.4, 0.1),
      pWrite: makePath(agent.x - agent.r * 0.6, agent.y + agent.r * 0.5, mem.x + mem.w * 0.5, mem.y + mem.h * 0.6, -0.14),
      labels: [
        { x: mem.x, y: mem.y - mem.h * 0.85 - 6, text: 'MEMORY · SURVIVES THE SESSION' },
        { x: agent.x, y: agent.y + agent.r * 1.6 + 12, text: 'READS · PLANS · WRITES BACK' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.18) {
        p.mode = 'brain'; brainHome(p, agent);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.2, 0.55);
        p.sizeMul = rand(0.3, 0.58); p.fast = false;
      } else if (p.seed < 0.30) {
        p.mode = 'mfill';
        boxHome(p, mem);
        p.baseAlpha = rand(0.3, 0.65); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.36) {
        p.mode = 'seed'; p.sprite = paleS;
        boxHome(p, mem);
        p.baseAlpha = rand(0.45, 0.85); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.48) {
        p.mode = 'cyc'; p.off = rand(0, 0.15);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.58) {
        p.mode = 'planp'; p.pi = i % 3; p.off = rand(0, 0.2);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 36);
  };

  // -- comms: a message crosses the floor, and someone in the middle
  // -- rewrites it mid-flight
  layouts.comms = function () {
    var A = { x: W * 0.16, y: H * 0.32, r: MN * 0.045 };
    var B = { x: W * 0.84, y: H * 0.32, r: MN * 0.045 };
    var mitm = { x: W * 0.5, y: H * 0.10 };
    board = {
      A: A, B: B, mitm: mitm,
      cycle: 8800,
      pMsg: makePath(A.x + A.r * 1.2, A.y, B.x - B.r * 1.2, B.y, 0.08),
      labels: [
        { x: A.x, y: A.y + A.r * 1.6 + 14, text: 'AGENT A' },
        { x: B.x, y: B.y + B.r * 1.6 + 14, text: 'AGENT B' },
        { x: mitm.x, y: mitm.y - 16, text: 'IN THE MIDDLE' }
      ]
    };
    P.forEach(function (p) {
      if (p.seed < 0.16) {
        p.mode = 'ba'; brainHome(p, A);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.58); p.fast = false;
      } else if (p.seed < 0.32) {
        p.mode = 'bb'; brainHome(p, B);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.58); p.fast = false;
      } else if (p.seed < 0.44) {
        p.mode = 'msg'; p.off = rand(0, 0.08);
        p.baseAlpha = rand(0.45, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.52) {
        p.mode = 'grab'; p.off = rand(0, 0.15); p.sprite = paleS;
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.58) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'ba' || p.mode === 'bb'; }, 50);
  };

  // -- cascade: nine agents, one fault, and the difference a bulkhead
  // -- makes
  layouts.cascade = function () {
    var grid = [];
    for (var gy = 0; gy < 3; gy++) {
      for (var gx = 0; gx < 3; gx++) {
        grid.push({
          x: W * (0.24 + gx * 0.26), y: H * (0.115 + gy * 0.155),
          r: MN * 0.026, gx: gx, gy: gy
        });
      }
    }
    board = {
      grid: grid,
      cycle: 11000,
      labels: [
        { x: W * 0.5, y: H * 0.555, text: 'NINE AGENTS · ONE FAULT' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.40) {
        p.mode = 'cell'; p.ci = i % 9;
        var g = grid[p.ci];
        var a = rand(0, Math.PI * 2);
        var d = Math.pow(Math.random(), 0.6) * g.r * 1.4;
        p.hx = g.x + Math.cos(a) * d;
        p.hy = g.y + Math.sin(a) * d;
        p.baseAlpha = rand(0.35, 0.75); p.sizeMul = rand(0.3, 0.58); p.fast = false;
      } else if (p.seed < 0.50) {
        p.mode = 'spread'; p.off = rand(0, 0.3);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.56) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- trust: the agent persuades, the human acts, and the audit sees
  // -- only the human
  layouts.trust = function () {
    var agent = { x: W * (isMobile ? 0.22 : 0.60), y: H * 0.30, r: MN * 0.05 };
    var human = { x: W * (isMobile ? 0.58 : 0.775), y: H * 0.48 };
    var sys = { x: W * (isMobile ? 0.84 : 0.905), y: H * 0.66, w: MN * 0.05, h: MN * 0.06 };
    board = {
      agent: agent, human: human, sys: sys,
      cycle: 9400,
      pWhis: makePath(agent.x + agent.r, agent.y + agent.r * 0.5, human.x - 14, human.y - 12, 0.1),
      pAct: makePath(human.x + 12, human.y + 8, sys.x - sys.w * 0.6, sys.y - sys.h * 0.4, 0.1),
      labels: [
        { x: agent.x, y: agent.y - agent.r * 1.6 - 10, text: 'FLUENT · CONFIDENT · TRUSTED' },
        { x: human.x, y: human.y + 40, text: 'THE HUMAN ACTS' },
        { x: sys.x, y: sys.y + sys.h * 0.85 + 12, text: 'THE AUDITED ACTION' }
      ]
    };
    P.forEach(function (p) {
      if (p.seed < 0.20) {
        p.mode = 'brain'; brainHome(p, agent);
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.2, 0.55);
        p.sizeMul = rand(0.3, 0.58); p.fast = false;
      } else if (p.seed < 0.32) {
        p.mode = 'whis'; p.off = rand(0, 0.12); p.sprite = candleS;
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.42) {
        p.mode = 'act'; p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.50) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'brain'; }, 36);
  };

  // -- rogue: five orbits, one of them slowly leaving the pattern
  // -- without ever looking wrong
  layouts.rogue = function () {
    var hub = { x: W * (isMobile ? 0.5 : 0.72), y: H * 0.44 };
    var orbits = [];
    for (var k = 0; k < 5; k++) {
      orbits.push({
        r: MN * (0.075 + k * 0.037),
        speed: 0.00035 - k * 0.00004,
        phase: k * 1.3
      });
    }
    board = {
      hub: hub, orbits: orbits, rogueI: 2,
      cycle: 12000,
      labels: [
        { x: hub.x, y: H * 0.10, text: 'THE FLEET · EVERY ACTION LEGITIMATE' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.40) {
        p.mode = 'orb'; p.oi = i % 5;
        p.off = rand(-0.15, 0.15);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.3, 0.58); p.fast = false;
      } else if (p.seed < 0.48) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- pairing: the agentic entries and the LLM entries they stand on
  layouts.pairing = function () {
    var pairs = [
      ['LLM01 · INJECTION', 'ASI01 · GOAL HIJACK'],
      ['EXCESSIVE AGENCY', 'ASI02 · TOOL MISUSE'],
      ['SUPPLY CHAIN', 'ASI04 · AGENTIC SUPPLY CHAIN'],
      ['OUTPUT HANDLING', 'ASI05 · CODE EXECUTION'],
      ['POISONING', 'ASI06 · MEMORY POISONING']
    ];
    var lx = W * 0.25, rx = W * 0.75;
    var y0 = H * 0.10, dy = H * 0.095;
    board = {
      pairs: pairs, lx: lx, rx: rx, y0: y0, dy: dy,
      cw: W * 0.26, ch: H * 0.062,
      cycle: 9000,
      pths: pairs.map(function (pr, i) {
        return makePath(lx + W * 0.13, y0 + i * dy, rx - W * 0.13, y0 + i * dy, 0.04);
      }),
      labels: [
        { x: lx, y: y0 - 28, text: 'THE LLM TOP 10' },
        { x: rx, y: y0 - 28, text: 'THIS LIST' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.30) {
        p.mode = 'pp'; p.pi = i % 5; p.off = rand(0, 0.2);
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.28, 0.52); p.fast = true;
      } else if (p.seed < 0.38) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- posture2: three bulkheaded compartments; faults flare and die
  // -- where they started
  layouts.posture2 = function () {
    var cells = [
      { x0: W * (isMobile ? 0.06 : 0.53), x1: W * (isMobile ? 0.35 : 0.665), y0: H * 0.16, y1: H * 0.62 },
      { x0: W * (isMobile ? 0.38 : 0.685), x1: W * (isMobile ? 0.65 : 0.815), y0: H * 0.16, y1: H * 0.62 },
      { x0: W * (isMobile ? 0.68 : 0.835), x1: W * (isMobile ? 0.95 : 0.965), y0: H * 0.16, y1: H * 0.62 }
    ];
    board = {
      cells: cells,
      cycle: 6200,
      labels: [
        { x: (cells[0].x0 + cells[2].x1) / 2, y: H * 0.10, text: 'SCOPED · WATCHED · CONTAINED' }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.36) {
        p.mode = 'wkr'; p.ci = i % 3;
        var c = cells[p.ci];
        p.hx = rand(c.x0 + 12, c.x1 - 12);
        p.hy = rand(c.y0 + 14, c.y1 - 14);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.46) {
        p.mode = 'flare'; p.off = rand(0, 0.15); p.sprite = paleS;
        p.baseAlpha = rand(0.4, 0.85); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.52) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- sources: the lights rest; the page carries the credit
  layouts.sources = function () {
    board = { labels: [] };
    P.forEach(function (p) {
      if (p.seed < 0.30) {
        assignBokeh(p);
        p.baseAlpha = rand(0.05, 0.14);
      } else {
        assignDust(p);
        p.baseAlpha = rand(0.05, 0.18);
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
    P.forEach(function (p) { p.sprite = p.baseSprite; });
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

    } else if (sceneName === 'stage') {
      var bs = board;
      var prog = fract(te / bs.cycle);
      var legs = [win(prog, 0.02, 0.16), win(prog, 0.20, 0.34), win(prog, 0.38, 0.52),
                  win(prog, 0.56, 0.70), win(prog, 0.74, 0.88)];
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, 0.15);
        } else if (p.mode === 'orb' || p.mode === 'peer') {
          p.tx = p.hx + Math.sin(t * 0.0011 + p.phase) * 1;
          p.ty = p.hy + Math.cos(t * 0.0009 + p.phase) * 0.8;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'flow') {
          var pth = [bs.a2t, bs.a2m, bs.a2p, bs.r2a, bs.a2h][p.fi];
          var u = legs[p.fi];
          if (u < 0) {
            p.tx = pth.p0[0]; p.ty = pth.p0[1]; p.alpha = 0;
          } else {
            var s = clamp01(u + p.off * (1 - u));
            var pos = bezier(pth, easeInOut(s));
            p.tx = pos[0]; p.ty = pos[1];
            p.alpha = p.baseAlpha * bell(u);
          }
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'amplify') {
      var ba = board;
      var prog2 = fract(te / ba.cycle);
      // pass one: the fault rides free and grows; pass two: gated early
      var lap = prog2 < 0.5 ? 0 : 1;
      var u2 = fract(prog2 * 2);
      var rideU = win(u2, 0.06, 0.8);
      board.lap = lap;
      board.rideU = rideU;
      var stop = lap === 1 ? 0.24 : 1;              // the gate after step one
      board.growth = rideU >= 0 ? Math.min(rideU, stop) : 0;
      P.forEach(function (p) {
        if (p.mode === 'st') {
          p.tx = p.hx + Math.sin(t * 0.0009 + p.phase) * 1.6;
          p.ty = p.hy + Math.cos(t * 0.0008 + p.phase) * 1.3;
          var reach = board.growth * 5;
          var hot = rideU >= 0 && p.si < reach && (lap === 0 || p.si < 1.3) ? (0.3 + p.si * 0.14) : 0;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0012 + p.phase)) + hot;
        } else if (p.mode === 'fault') {
          if (rideU < 0) {
            p.tx = ba.steps[0].x - MN * 0.08; p.ty = ba.steps[0].y; p.alpha = 0;
          } else {
            var s2 = clamp01(rideU + p.off * (1 - rideU)) * stop;
            var xi = s2 * 4;
            var i0 = Math.min(3, Math.floor(xi));
            var f = xi - i0;
            p.tx = ba.steps[i0].x + (ba.steps[Math.min(4, i0 + 1)].x - ba.steps[i0].x) * f;
            p.ty = ba.steps[i0].y + Math.sin(s2 * 9 + p.phase) * (3 + s2 * 14);
            var kill = lap === 1 && s2 > 0.2 ? Math.max(0, 1 - (s2 - 0.2) * 8) : 1;
            p.alpha = p.baseAlpha * bell(rideU) * kill;
            p.sizeMul = 0.3 + s2 * (lap === 0 ? 0.5 : 0.05);
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'hijack') {
      var bh = board;
      var prog3 = fract(te / bh.cycle);
      var injU = win(prog3, 0.05, 0.22);       // the content arrives
      var swapU = win(prog3, 0.22, 0.34);      // the goal flickers over
      var wrongU = win(prog3, 0.34, 0.52);     // the plan serves the wrong star
      var pinU = win(prog3, 0.60, 0.72);       // second lap: the goal is pinned
      var holdU = win(prog3, 0.72, 0.94);      // the plan holds course
      board.swap = swapU >= 0 ? bell(swapU) : (wrongU >= 0 ? 1 : 0);
      board.pinned = pinU >= 0 || holdU >= 0;
      board.wrongU = wrongU;
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, board.swap * 0.7);
        } else if (p.mode === 'plan') {
          var toFake = wrongU >= 0;
          var pth2 = toFake ? bh.pFake : bh.pGoal;
          var s3 = fract(p.off + te / 3600);
          var pos3 = bezier(pth2, s3);
          p.tx = pos3[0]; p.ty = pos3[1];
          var edge = Math.min(1, Math.min(s3, 1 - s3) * 9);
          p.alpha = p.baseAlpha * edge * 0.8;
        } else if (p.mode === 'inj') {
          if (injU < 0) {
            p.tx = bh.pDoc.p0[0]; p.ty = bh.pDoc.p0[1]; p.alpha = 0;
          } else {
            var s4 = clamp01(injU + p.off * (1 - injU));
            var stop2 = board.pinned ? 0.7 : 1;
            var pos4 = bezier(bh.pDoc, easeInOut(s4) * stop2);
            p.tx = pos4[0]; p.ty = pos4[1];
            var kill2 = board.pinned && s4 > 0.75 ? 1 - (s4 - 0.75) / 0.25 : 1;
            p.alpha = p.baseAlpha * bell(injU) * kill2;
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'toolmis') {
      var bt = board;
      var prog4 = fract(te / bt.cycle);
      var lap2 = prog4 < 0.5 ? 0 : 1;             // 0 honest, 1 hijacked / gated
      var u3 = fract(prog4 * 2);
      var whisU = lap2 === 1 ? win(u3, 0.02, 0.18) : -1;
      var chainU = win(u3, 0.2, 0.6);
      var outU = win(u3, 0.62, 0.86);
      board.lap = lap2;
      board.gateOn = fract(te / (bt.cycle * 2)) > 0.5;   // second full cycle: gated
      var exfil = lap2 === 1 && !board.gateOn;
      board.exfil = exfil;
      board.outU = outU;
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, whisU >= 0 ? bell(whisU) * 0.6 : 0.1);
        } else if (p.mode === 'data') {
          if (chainU >= 0) {
            var s5 = clamp01(chainU + p.off * (1 - chainU));
            var pos5 = chainPos(bt.chain, easeInOut(s5));
            p.tx = pos5[0]; p.ty = pos5[1];
            p.alpha = p.baseAlpha * bell(chainU);
          } else if (outU >= 0) {
            var pth3 = exfil ? bt.pAtk : bt.pUser;
            var s6 = clamp01(outU + p.off * (1 - outU));
            var stop3 = lap2 === 1 && board.gateOn ? 0.4 : 1;
            var pos6 = bezier(pth3, easeInOut(s6) * stop3);
            p.tx = pos6[0]; p.ty = pos6[1];
            var kill3 = lap2 === 1 && board.gateOn && s6 > 0.5 ? Math.max(0, 1 - (s6 - 0.5) * 4) : 1;
            p.alpha = p.baseAlpha * bell(outU) * kill3;
          } else {
            p.tx = bt.chain[0].p0[0]; p.ty = bt.chain[0].p0[1]; p.alpha = 0;
          }
        } else if (p.mode === 'whis') {
          if (whisU < 0) {
            p.tx = bt.atk.x; p.ty = bt.atk.y; p.alpha = 0;
          } else {
            var s7 = clamp01(whisU + p.off * (1 - whisU));
            p.tx = bt.atk.x + (bt.agent.x + bt.agent.r - bt.atk.x) * easeInOut(s7);
            p.ty = bt.atk.y + (bt.agent.y - bt.atk.y) * easeInOut(s7);
            p.alpha = p.baseAlpha * bell(whisU);
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'ident') {
      var bi = board;
      var prog5 = fract(te / bi.cycle);
      var hopU = win(prog5, 0.04, 0.46);            // the badge travels and grows
      var impU = win(prog5, 0.48, 0.64);            // the imposter approaches
      var lap3 = fract(te / (bi.cycle * 2)) > 0.5;  // second cycle: expiry on
      board.lap3 = lap3;
      board.impU = impU;
      P.forEach(function (p) {
        if (p.mode === 'node') {
          brainTarget(p, t, 0.1);
        } else if (p.mode === 'badge') {
          if (hopU < 0) {
            p.tx = bi.pths[0].p0[0]; p.ty = bi.pths[0].p0[1]; p.alpha = 0;
          } else {
            var s8 = clamp01(hopU + p.off * (1 - hopU));
            var pos8 = chainPos(bi.pths, easeInOut(s8));
            p.tx = pos8[0]; p.ty = pos8[1];
            // privileges accrete along the chain, unless leases expire
            p.sizeMul = lap3 ? 0.4 : 0.34 + s8 * 0.55;
            p.alpha = p.baseAlpha * bell(hopU);
          }
        } else if (p.mode === 'impp') {
          if (impU < 0) {
            p.tx = bi.pImp.p0[0]; p.ty = bi.pImp.p0[1]; p.alpha = 0;
          } else {
            var s9 = clamp01(impU + p.off * (1 - impU));
            var stop4 = lap3 ? 0.55 : 1;
            var pos9 = bezier(bi.pImp, easeInOut(s9) * stop4);
            p.tx = pos9[0]; p.ty = pos9[1];
            var kill4 = lap3 && s9 > 0.6 ? Math.max(0, 1 - (s9 - 0.6) * 3) : 1;
            p.alpha = p.baseAlpha * bell(impU) * kill4;
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'supply2') {
      var bs2 = board;
      var prog6 = fract(te / bs2.cycle);
      board.gateOn = fract(te / (bs2.cycle * 2)) > 0.5;
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, 0.15);
        } else if (p.mode === 'shelf') {
          p.tx = p.hx + Math.sin(t * 0.0011 + p.phase) * 0.9;
          p.ty = p.hy + Math.cos(t * 0.0009 + p.phase) * 0.7;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'comp') {
          var u4 = win(fract(prog6 + p.ci * 0.33), 0.05, 0.55);
          if (u4 < 0) {
            p.tx = bs2.reg.x + (p.ci - 1) * bs2.reg.w * 0.3; p.ty = bs2.reg.y; p.alpha = 0;
          } else {
            var imposter = p.ci === 2;
            var blocked = imposter && board.gateOn;
            var s10 = clamp01(u4 + p.off);
            var cap = blocked ? 0.55 : 1;
            var pos10 = bezier(bs2.pDock, easeInOut(s10) * cap);
            p.tx = pos10[0] + (p.ci - 1) * 14 * (1 - s10);
            p.ty = pos10[1];
            var kill5 = blocked && s10 > 0.6 ? Math.max(0, 1 - (s10 - 0.6) * 3.4) : 1;
            p.alpha = p.baseAlpha * bell(u4) * kill5;
          }
        } else if (p.mode === 'work') {
          var s11 = fract(p.off + te / 4200);
          var i0b = Math.floor(s11 * 3);
          var f2 = s11 * 3 - i0b;
          var a2 = bs2.task[i0b % 3], b2 = bs2.task[(i0b + 1) % 3];
          p.tx = a2.x + (b2.x - a2.x) * f2;
          p.ty = a2.y + (b2.y - a2.y) * f2;
          p.alpha = p.baseAlpha * 0.7;
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'rce') {
      var br = board;
      var prog7 = fract(te / br.cycle);
      var convU = win(prog7, 0.05, 0.38);
      var execU = win(prog7, 0.42, 0.62);
      board.sandOn = fract(te / (br.cycle * 2)) > 0.5;
      board.crack = execU >= 0 && !board.sandOn ? bell(execU) : 0;
      board.held = execU >= 0 && board.sandOn ? bell(execU) : 0;
      P.forEach(function (p) {
        if (p.mode === 'frag') {
          if (convU < 0) {
            var pf = br.pF[p.fi];
            p.tx = pf.p0[0]; p.ty = pf.p0[1]; p.alpha = 0;
          } else {
            var s12 = clamp01(convU + p.off * (1 - convU));
            var pos12 = bezier(br.pF[p.fi], easeInOut(s12));
            p.tx = pos12[0]; p.ty = pos12[1];
            p.alpha = p.baseAlpha * bell(convU);
          }
        } else if (p.mode === 'ffill' || p.mode === 'hfill') {
          p.tx = p.hx + Math.sin(t * 0.0011 + p.phase) * 0.8;
          p.ty = p.hy + Math.cos(t * 0.0009 + p.phase) * 0.6;
          var hot = p.mode === 'hfill' ? board.crack * 0.4 : 0;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)) + hot;
        } else if (p.mode === 'exec') {
          if (execU < 0) {
            p.tx = br.pH.p0[0]; p.ty = br.pH.p0[1]; p.alpha = 0;
          } else {
            var s13 = clamp01(execU + p.off * (1 - execU));
            var stop5 = board.sandOn ? 0.45 : 1;
            var pos13 = bezier(br.pH, easeInOut(s13) * stop5);
            p.tx = pos13[0]; p.ty = pos13[1];
            var kill6 = board.sandOn && s13 > 0.5 ? Math.max(0, 1 - (s13 - 0.5) * 4) : 1;
            p.alpha = p.baseAlpha * bell(execU) * kill6;
          }
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'mempoison') {
      var bm = board;
      var cycles3 = te / (bm.cycle / 3);
      var cyc3 = Math.floor(cycles3) % 3;
      var u5 = fract(cycles3);
      var readU = win(u5, 0.05, 0.35);
      var planU = win(u5, 0.4, 0.7);
      var writeU = win(u5, 0.72, 0.95);
      board.drift = Math.min(1, (cyc3 + (planU >= 0 ? planU : 0)) / 2.4);
      board.quarantine = fract(te / (bm.cycle * 2)) > 0.5;
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, planU >= 0 ? 0.4 : 0.1);
        } else if (p.mode === 'mfill') {
          p.tx = p.hx + Math.sin(t * 0.0011 + p.phase) * 0.9;
          p.ty = p.hy + Math.cos(t * 0.0009 + p.phase) * 0.7;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'seed') {
          // quarantined: pulled out beside the store, tagged
          var qx = board.quarantine ? bm.mem.x - bm.mem.w * 1.6 : p.hx;
          var qy = board.quarantine ? bm.mem.y + bm.mem.h * 0.9 : p.hy;
          p.tx = qx + Math.sin(t * 0.0013 + p.phase) * 1;
          p.ty = qy + Math.cos(t * 0.0011 + p.phase) * 0.8;
          p.alpha = p.baseAlpha * (board.quarantine ? 0.55 : (0.6 + 0.4 * Math.sin(t * 0.0015 + p.phase)));
        } else if (p.mode === 'cyc') {
          var u6 = readU >= 0 ? readU : (writeU >= 0 ? writeU : -1);
          var pth4 = readU >= 0 ? bm.pRead : bm.pWrite;
          if (u6 < 0) {
            p.tx = bm.pRead.p0[0]; p.ty = bm.pRead.p0[1]; p.alpha = 0;
          } else {
            var s14 = clamp01(u6 + p.off * (1 - u6));
            var pos14 = bezier(pth4, easeInOut(s14));
            p.tx = pos14[0]; p.ty = pos14[1];
            p.alpha = p.baseAlpha * bell(u6);
          }
        } else if (p.mode === 'planp') {
          if (planU < 0) {
            p.tx = bm.agent.x; p.ty = bm.agent.y; p.alpha = 0;
          } else {
            // the plan ray leans further off course with every cycle
            var driftA = board.quarantine ? 0.05 : board.drift * 0.9;
            var ang = -0.3 + driftA;
            var s15 = fract(p.off + planU * 1.4);
            p.tx = bm.agent.x + Math.cos(ang) * s15 * MN * 0.17;
            p.ty = bm.agent.y + Math.sin(ang) * s15 * MN * 0.17;
            p.alpha = p.baseAlpha * bell(planU) * bell(clamp01(s15));
          }
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'comms') {
      var bc = board;
      var prog8 = fract(te / bc.cycle);
      var sendU = win(prog8, 0.05, 0.45);
      var grabU = win(prog8, 0.12, 0.30);
      board.sealed = fract(te / (bc.cycle * 2)) > 0.5;
      board.tampered = !board.sealed && prog8 > 0.28;
      board.arriveU = win(prog8, 0.45, 0.6);
      P.forEach(function (p) {
        if (p.mode === 'ba') {
          brainTarget(p, t, 0.1);
        } else if (p.mode === 'bb') {
          brainTarget(p, t, board.arriveU >= 0 && board.tampered ? 0.7 : 0.1);
        } else if (p.mode === 'msg') {
          if (sendU < 0) {
            p.tx = bc.pMsg.p0[0]; p.ty = bc.pMsg.p0[1]; p.alpha = 0;
          } else {
            var s16 = clamp01(sendU + p.off * (1 - sendU));
            var pos16 = bezier(bc.pMsg, easeInOut(s16));
            p.tx = pos16[0]; p.ty = pos16[1];
            // past the middle without a seal, the message is not yours
            if (board.tampered && s16 > 0.5) p.sprite = paleS;
            else p.sprite = board.sealed ? candleS : whiteS;
            p.alpha = p.baseAlpha * bell(sendU);
          }
        } else if (p.mode === 'grab') {
          if (grabU < 0 || board.sealed) {
            p.tx = bc.mitm.x; p.ty = bc.mitm.y; p.alpha = 0;
          } else {
            var s17 = clamp01(grabU + p.off * (1 - grabU));
            var mid = bezier(bc.pMsg, 0.5);
            p.tx = bc.mitm.x + (mid[0] - bc.mitm.x) * bell(s17);
            p.ty = bc.mitm.y + (mid[1] - bc.mitm.y) * bell(s17);
            p.alpha = p.baseAlpha * bell(grabU);
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'cascade') {
      var bg = board;
      var prog9 = fract(te / bg.cycle);
      board.bulk = fract(te / (bg.cycle * 2)) > 0.5;
      // infection distance from the corner, in grid hops
      var wave = prog9 < 0.7 ? easeInOut(prog9 / 0.7) * 5 : 5;
      var reset = prog9 > 0.9 ? (prog9 - 0.9) / 0.1 : 0;
      board.wave = wave; board.reset = reset;
      P.forEach(function (p) {
        if (p.mode === 'cell') {
          var g = bg.grid[p.ci];
          p.tx = p.hx + Math.sin(t * 0.0009 + p.phase) * 1.6;
          p.ty = p.hy + Math.cos(t * 0.0008 + p.phase) * 1.3;
          var hops = g.gx + g.gy;
          var infected = hops < wave && (!board.bulk || g.gx < 1);
          var hot = infected ? Math.max(0, 0.5 - reset * 0.5) : 0;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0012 + p.phase)) + hot;
        } else if (p.mode === 'spread') {
          var s18 = fract(p.off + prog9 * 1.6);
          var maxX = board.bulk ? bg.grid[0].x + W * 0.13 : bg.grid[2].x;
          p.tx = bg.grid[0].x + s18 * (maxX - bg.grid[0].x);
          p.ty = bg.grid[0].y + s18 * (bg.grid[8].y - bg.grid[0].y) + Math.sin(s18 * 7 + p.phase) * 8;
          p.alpha = p.baseAlpha * bell(clamp01(s18)) * (prog9 < 0.7 ? 0.8 : 0.2);
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'trust') {
      var btr = board;
      var prog10 = fract(te / btr.cycle);
      var whisU2 = win(prog10, 0.05, 0.30);
      var actU2 = win(prog10, 0.34, 0.56);
      var lightU = win(prog10, 0.58, 0.85);
      board.verify = fract(te / (btr.cycle * 2)) > 0.5;
      board.lightU = lightU;
      board.actHot = actU2 >= 0 && actU2 > 0.8 ? (actU2 - 0.8) / 0.2 : 0;
      P.forEach(function (p) {
        if (p.mode === 'brain') {
          brainTarget(p, t, whisU2 >= 0 ? 0.3 : 0.1);
          // under the forensic light, the agent all but disappears
          if (lightU >= 0 && !board.verify) p.alpha *= 0.3;
        } else if (p.mode === 'whis') {
          if (whisU2 < 0) {
            p.tx = btr.pWhis.p0[0]; p.ty = btr.pWhis.p0[1]; p.alpha = 0;
          } else {
            var s19 = clamp01(whisU2 + p.off * (1 - whisU2));
            var pos19 = bezier(btr.pWhis, easeInOut(s19));
            p.tx = pos19[0]; p.ty = pos19[1];
            p.alpha = p.baseAlpha * bell(whisU2) * 0.8;
          }
        } else if (p.mode === 'act') {
          var goU = actU2;
          if (board.verify && actU2 >= 0 && actU2 < 0.4) goU = -1;   // held for evidence
          if (goU < 0) {
            p.tx = btr.pAct.p0[0]; p.ty = btr.pAct.p0[1]; p.alpha = 0;
          } else {
            var s20 = clamp01(goU + p.off * (1 - goU));
            var pos20 = bezier(btr.pAct, easeInOut(s20));
            p.tx = pos20[0]; p.ty = pos20[1];
            p.alpha = p.baseAlpha * bell(goU);
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'rogue') {
      var bro = board;
      var prog11 = fract(te / bro.cycle);
      // the rogue's deviation grows through the cycle; containment at the end
      board.dev = prog11 < 0.7 ? prog11 / 0.7 : 1;
      board.flag = prog11 > 0.55;
      board.contained = prog11 > 0.78;
      P.forEach(function (p) {
        if (p.mode === 'orb') {
          var o = bro.orbits[p.oi];
          var ang2 = o.phase + t * o.speed + p.off;
          var rr = o.r;
          var isRogue = p.oi === bro.rogueI;
          if (isRogue && !board.contained) {
            rr = o.r * (1 + board.dev * 0.55);
            ang2 += board.dev * 0.5;
          } else if (isRogue && board.contained) {
            // led into quarantine: a small holding circle
            var qx2 = bro.hub.x + MN * 0.30;
            var qy2 = bro.hub.y - MN * 0.16;
            p.tx = qx2 + Math.cos(ang2 * 3) * MN * 0.02;
            p.ty = qy2 + Math.sin(ang2 * 3) * MN * 0.016;
            p.alpha = p.baseAlpha * 0.75;
            return;
          }
          p.tx = bro.hub.x + Math.cos(ang2) * rr * 1.25;
          p.ty = bro.hub.y + Math.sin(ang2) * rr * 0.8;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0012 + p.phase));
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'pairing') {
      var bp = board;
      var prog12 = fract(te / bp.cycle);
      var active = Math.floor(prog12 * 5);
      var pu = fract(prog12 * 5);
      board.active = active;
      P.forEach(function (p) {
        if (p.mode === 'pp') {
          if (p.pi !== active) {
            p.tx = bp.pths[p.pi].p0[0]; p.ty = bp.pths[p.pi].p0[1]; p.alpha = 0;
          } else {
            var u7 = win(pu, 0.1, 0.8);
            if (u7 < 0) {
              p.tx = bp.pths[p.pi].p0[0]; p.ty = bp.pths[p.pi].p0[1]; p.alpha = 0;
            } else {
              var s21 = clamp01(u7 + p.off * (1 - u7));
              var pos21 = bezier(bp.pths[p.pi], easeInOut(s21));
              p.tx = pos21[0]; p.ty = pos21[1];
              p.alpha = p.baseAlpha * bell(u7);
            }
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'posture2') {
      var bpo = board;
      var prog13 = fract(te / bpo.cycle);
      var hitCell = Math.floor(te / bpo.cycle) % 3;
      var flareU = win(prog13, 0.3, 0.6);
      board.hitCell = hitCell;
      board.flareU = flareU;
      P.forEach(function (p) {
        if (p.mode === 'wkr') {
          p.tx = p.hx + Math.sin(t * 0.0009 + p.phase) * 2;
          p.ty = p.hy + Math.cos(t * 0.0008 + p.phase) * 1.6;
          var hot = p.ci === hitCell && flareU >= 0 ? bell(flareU) * 0.3 : 0;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0012 + p.phase)) + hot;
        } else if (p.mode === 'flare') {
          var c = bpo.cells[hitCell];
          if (flareU < 0) {
            p.tx = (c.x0 + c.x1) / 2; p.ty = c.y0 - 20; p.alpha = 0;
          } else {
            var s22 = clamp01(flareU + p.off * (1 - flareU));
            p.tx = (c.x0 + c.x1) / 2 + Math.sin(p.phase) * (c.x1 - c.x0) * 0.3 * s22;
            p.ty = c.y0 - 20 + s22 * (c.y1 - c.y0) * 0.6;
            var kill7 = s22 > 0.7 ? 1 - (s22 - 0.7) / 0.3 : 1;
            p.alpha = p.baseAlpha * bell(flareU) * kill7;
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'sources') {
      P.forEach(function (p) {
        if (p.mode === 'bokeh') {
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
  function drawStar(x, y, r, a, color) {
    if (a <= 0.01) return;
    ctx.strokeStyle = 'rgba(' + color + ',' + (0.75 * a) + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var k = 0; k < 8; k++) {
      var ang = k * Math.PI / 4;
      var rr = k % 2 === 0 ? r : r * 0.42;
      var px = x + Math.cos(ang) * rr;
      var py = y + Math.sin(ang) * rr;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
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
    if (!text || alpha <= 0.02) return;
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
    var te = t - sceneT0;
    board.labels.forEach(function (L) {
      var a = sceneFade;
      if (L.after) a *= clamp01((te - L.after) / 600);
      labelText(L.text, L.x, L.y, 0.62 * a);
    });
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

    } else if (sceneName === 'stage') {
      var bs3 = board;
      drawLinksSet(1);
      drawStar(bs3.goal.x, bs3.goal.y, 11, sf, '245,166,35');
      bs3.tools.forEach(function (tl) { drawBoxNode(tl, sf, 0); });
      drawBoxNode(bs3.mem, sf, 0);
      drawBoxNode(bs3.reg, sf, 0);
      // the credential badge
      ctx.strokeStyle = 'rgba(245,166,35,' + (0.55 * sf) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bs3.badge.x, bs3.badge.y, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bs3.badge.x + 6, bs3.badge.y);
      ctx.lineTo(bs3.badge.x + 15, bs3.badge.y);
      ctx.stroke();
      bs3.peers.forEach(function (pr) {
        ctx.strokeStyle = 'rgba(200,200,215,' + (0.25 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.r * 1.4, 0, Math.PI * 2);
        ctx.stroke();
      });
      drawPerson(bs3.human.x, bs3.human.y, 1, sf);
      [bs3.a2t, bs3.a2m, bs3.a2p, bs3.r2a, bs3.a2h].forEach(function (pth) {
        strokePath(pth, 'rgba(200,200,215,' + (0.1 * sf) + ')', 1);
      });
      // the plan: a short chain under the goal
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.2 * sf) + ')';
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.moveTo(board.agent.x, board.agent.y - board.agent.r * 1.3);
      ctx.lineTo(board.goal.x, board.goal.y + 14);
      ctx.stroke();
      ctx.setLineDash([]);

    } else if (sceneName === 'amplify') {
      var ba2 = board;
      ba2.steps.forEach(function (s, i) {
        var reach = board.growth * 5;
        var lit = board.rideU >= 0 && i < reach && (board.lap === 0 || i < 1.3);
        var size = s.r * (1 + (lit ? i * 0.35 : 0));
        ctx.strokeStyle = lit
          ? 'rgba(255,77,28,' + ((0.4 + i * 0.1) * sf) + ')'
          : 'rgba(200,200,215,' + (0.25 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, size * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        if (lit && i === 4) drawGlow(s.x, s.y, s.r * 5, 0.12 * sf, false);
        if (i < 4) {
          ctx.strokeStyle = 'rgba(200,200,215,' + (0.14 * sf) + ')';
          ctx.beginPath();
          ctx.moveTo(s.x + s.r * 1.8, s.y);
          ctx.lineTo(ba2.steps[i + 1].x - s.r * 1.8, s.y);
          ctx.stroke();
        }
      });
      // the gate that changes the story on lap two
      if (board.lap === 1) {
        var gx = (ba2.steps[0].x + ba2.steps[1].x) / 2;
        ctx.strokeStyle = 'rgba(245,166,35,' + (0.6 * sf) + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(gx, ba2.steps[0].y - 20);
        ctx.lineTo(gx, ba2.steps[0].y + 20);
        ctx.stroke();
        labelText('CAUGHT EARLY', gx, ba2.steps[0].y + 40, 0.6 * sf, '245,166,35');
      }

    } else if (sceneName === 'hijack') {
      var bh2 = board;
      drawLinksSet(1);
      drawBoxNode(bh2.doc, sf, 0);
      strokePath(bh2.pDoc, 'rgba(175,195,240,' + (0.12 * sf) + ')', 1);
      strokePath(bh2.pGoal, 'rgba(200,200,215,' + ((bh2.wrongU >= 0 ? 0.07 : 0.16) * sf) + ')', 1);
      strokePath(bh2.pFake, 'rgba(175,195,240,' + ((bh2.wrongU >= 0 ? 0.2 : 0.05) * sf) + ')', 1);
      var trueA = board.swap > 0.3 && !board.pinned ? 1 - board.swap * 0.7 : 1;
      drawStar(bh2.goal.x, bh2.goal.y, 11, sf * trueA, '245,166,35');
      if (board.pinned) {
        ctx.strokeStyle = 'rgba(245,166,35,' + (0.5 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bh2.goal.x, bh2.goal.y, 20, 0, Math.PI * 2);
        ctx.stroke();
        labelText('PINNED', bh2.goal.x + 52, bh2.goal.y + 4, 0.6 * sf, '245,166,35');
      }
      var fakeA = board.pinned ? 0.1 : (board.swap > 0.3 ? board.swap : 0);
      drawStar(bh2.fake.x, bh2.fake.y, 11, sf * fakeA, '175,195,240');

    } else if (sceneName === 'toolmis') {
      var bt2 = board;
      drawLinksSet(1);
      drawBoxNode(bt2.tRead, sf, 0);
      drawBoxNode(bt2.tTrans, sf, 0);
      drawBoxNode(bt2.tSend, sf, board.exfil && board.outU >= 0 ? 0.6 : 0);
      bt2.chain.forEach(function (pth) {
        strokePath(pth, 'rgba(200,200,215,' + (0.12 * sf) + ')', 1);
      });
      strokePath(bt2.pUser, 'rgba(200,200,215,' + (0.1 * sf) + ')', 1);
      strokePath(bt2.pAtk, 'rgba(175,195,240,' + ((board.exfil ? 0.2 : 0.05) * sf) + ')', 1);
      drawPerson(bt2.user.x, bt2.user.y, 0.9, sf);
      drawPerson(bt2.atk.x, bt2.atk.y, 0.9, sf * 0.6);
      if (board.exfil && board.outU >= 0 && board.outU > 0.7) {
        drawGlow(bt2.atk.x, bt2.atk.y - 8, 36, 0.14 * sf, false);
      }
      if (board.gateOn) {
        var gp = bezier(bt2.pAtk, 0.62);
        ctx.strokeStyle = 'rgba(245,166,35,' + (0.6 * sf) + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(gp[0] - 14, gp[1] - 8);
        ctx.lineTo(gp[0] + 14, gp[1] + 8);
        ctx.stroke();
        labelText('ARGUMENTS CHECKED', gp[0] - MN * 0.075, gp[1] + 4, 0.55 * sf, '245,166,35');
      }

    } else if (sceneName === 'ident') {
      var bi2 = board;
      drawPerson(bi2.chain[0].x, bi2.chain[0].y, 1, sf);
      [1, 2].forEach(function (i) {
        var n = bi2.chain[i];
        ctx.strokeStyle = 'rgba(200,200,215,' + (0.3 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 1.4, 0, Math.PI * 2);
        ctx.stroke();
      });
      drawBoxNode(bi2.chain[3], sf, board.impU >= 0 && !board.lap3 && board.impU > 0.8 ? 0.6 : 0);
      bi2.pths.forEach(function (pth) {
        strokePath(pth, 'rgba(200,200,215,' + (0.12 * sf) + ')', 1);
      });
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.25 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bi2.imp.x, bi2.imp.y, bi2.imp.r * 1.4, 0, Math.PI * 2);
      ctx.stroke();
      strokePath(bi2.pImp, 'rgba(175,195,240,' + (0.14 * sf) + ')', 1);
      labelText(board.lap3 ? 'SHORT-LIVED · SCOPED · TRACEABLE' : 'THE BADGE GROWS WITH EVERY HOP',
        W * (isMobile ? 0.5 : 0.72), H * 0.085, 0.7 * sf,
        board.lap3 ? '245,166,35' : '175,195,240');

    } else if (sceneName === 'supply2') {
      var bs4 = board;
      drawLinksSet(1);
      drawBoxNode(bs4.reg, sf, 0);
      strokePath(bs4.pDock, 'rgba(200,200,215,' + (0.12 * sf) + ')', 1);
      // the runtime verification gate
      if (board.gateOn) {
        var gp2 = bezier(bs4.pDock, 0.55);
        ctx.strokeStyle = 'rgba(245,166,35,' + (0.6 * sf) + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(gp2[0] - 18, gp2[1]);
        ctx.lineTo(gp2[0] + 18, gp2[1]);
        ctx.stroke();
        labelText('VERIFIED BEFORE DOCKING', gp2[0] + MN * 0.155, gp2[1] + 4, 0.55 * sf, '245,166,35');
      }
      // the running task ring
      bs4.task.forEach(function (tn) {
        ctx.strokeStyle = 'rgba(200,200,215,' + (0.2 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(tn.x, tn.y, tn.r * 1.8, 0, Math.PI * 2);
        ctx.stroke();
      });

    } else if (sceneName === 'rce') {
      var br2 = board;
      br2.frags.forEach(function (f2) { drawBoxNode(f2, sf, 0); });
      drawBoxNode(br2.asm, sf, 0.2);
      br2.pF.forEach(function (pth) {
        strokePath(pth, 'rgba(175,195,240,' + (0.1 * sf) + ')', 1);
      });
      strokePath(br2.pH, 'rgba(175,195,240,' + (0.12 * sf) + ')', 1);
      // the host: whole, or cracked
      var hb = br2.host;
      if (board.crack > 0.05) {
        ctx.strokeStyle = 'rgba(255,77,28,' + ((0.35 + board.crack * 0.4) * sf) + ')';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.roundRect(hb.x - hb.w / 2, hb.y - hb.h / 2, hb.w, hb.h, 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hb.x - hb.w * 0.2, hb.y - hb.h / 2);
        ctx.lineTo(hb.x + hb.w * 0.1, hb.y);
        ctx.lineTo(hb.x - hb.w * 0.1, hb.y + hb.h / 2);
        ctx.stroke();
        drawGlow(hb.x, hb.y, hb.w * 1.3, 0.12 * board.crack * sf, false);
      } else {
        drawBoxNode(hb, sf, 0);
      }
      // the sandbox, on its lap
      if (board.sandOn) {
        ctx.strokeStyle = 'rgba(245,166,35,' + (0.55 * sf) + ')';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.arc(br2.asm.x, br2.asm.y, MN * 0.06, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        labelText('SANDBOXED', br2.asm.x, br2.asm.y - MN * 0.06 - 10, 0.6 * sf, '245,166,35');
        if (board.held > 0.05) drawGlow(br2.asm.x, br2.asm.y, MN * 0.05, 0.08 * board.held * sf, true);
      }

    } else if (sceneName === 'mempoison') {
      var bm2 = board;
      drawLinksSet(1);
      drawBoxNode(bm2.mem, sf, 0);
      strokePath(bm2.pRead, 'rgba(200,200,215,' + (0.12 * sf) + ')', 1);
      strokePath(bm2.pWrite, 'rgba(200,200,215,' + (0.1 * sf) + ')', 1);
      // where the plan actually points, drifting cycle by cycle
      var driftA2 = board.quarantine ? 0.05 : board.drift * 0.9;
      var ang3 = -0.3 + driftA2;
      var ex = bm2.agent.x + Math.cos(ang3) * MN * 0.17;
      var ey = bm2.agent.y + Math.sin(ang3) * MN * 0.17;
      ctx.strokeStyle = board.quarantine
        ? 'rgba(245,166,35,' + (0.35 * sf) + ')'
        : 'rgba(255,77,28,' + ((0.2 + board.drift * 0.35) * sf) + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(bm2.agent.x, bm2.agent.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      if (board.quarantine) {
        ctx.strokeStyle = 'rgba(245,166,35,' + (0.5 * sf) + ')';
        ctx.setLineDash([2, 5]);
        ctx.beginPath();
        ctx.roundRect(bm2.mem.x - bm2.mem.w * 2.1, bm2.mem.y + bm2.mem.h * 0.5,
          bm2.mem.w * 0.9, bm2.mem.h * 0.8, 4);
        ctx.stroke();
        ctx.setLineDash([]);
        labelText('QUARANTINED', bm2.mem.x - bm2.mem.w * 1.6, bm2.mem.y + bm2.mem.h * 1.6 + 8, 0.55 * sf, '245,166,35');
      }
      labelText(board.quarantine ? 'TAGGED AND HELD' : 'EACH CYCLE, A LITTLE FURTHER OFF',
        bm2.agent.x, H * 0.085, 0.7 * sf, board.quarantine ? '245,166,35' : '255,138,102');

    } else if (sceneName === 'comms') {
      var bc2 = board;
      drawLinksSet(1);
      drawPerson(bc2.mitm.x, bc2.mitm.y, 0.9, sf * (board.sealed ? 0.45 : 0.85));
      strokePath(bc2.pMsg, 'rgba(200,200,215,' + (0.14 * sf) + ')', 1);
      // the seal, when the channel is authenticated
      if (board.sealed) {
        var mid2 = bezier(bc2.pMsg, 0.5);
        ctx.strokeStyle = 'rgba(245,166,35,' + (0.6 * sf) + ')';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(mid2[0] - 5, mid2[1] + 14);
        ctx.lineTo(mid2[0] - 1, mid2[1] + 18);
        ctx.lineTo(mid2[0] + 6, mid2[1] + 10);
        ctx.stroke();
        labelText('SIGNED · VERIFIED', mid2[0], mid2[1] + 38, 0.6 * sf, '245,166,35');
      } else {
        labelText('REWRITTEN MID-FLIGHT', bc2.mitm.x, bc2.mitm.y + 40, 0.55 * sf, '175,195,240');
      }
      if (board.arriveU >= 0 && board.tampered) {
        drawGlow(bc2.B.x, bc2.B.y, bc2.B.r * 2.2, 0.1 * sf, false);
      }

    } else if (sceneName === 'cascade') {
      var bg2 = board;
      bg2.grid.forEach(function (g) {
        var hops = g.gx + g.gy;
        var infected = hops < board.wave && (!board.bulk || g.gx < 1);
        ctx.strokeStyle = infected
          ? 'rgba(255,77,28,' + ((0.5 - board.reset * 0.4) * sf) + ')'
          : 'rgba(200,200,215,' + (0.25 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r * 1.6, 0, Math.PI * 2);
        ctx.stroke();
      });
      // the bulkheads, when they exist
      if (board.bulk) {
        ctx.strokeStyle = 'rgba(245,166,35,' + (0.5 * sf) + ')';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([6, 6]);
        [0.37, 0.63].forEach(function (fx) {
          ctx.beginPath();
          ctx.moveTo(W * fx, H * 0.06);
          ctx.lineTo(W * fx, H * 0.50);
          ctx.stroke();
        });
        ctx.setLineDash([]);
        labelText('BULKHEADS', W * 0.5, H * 0.045, 0.6 * sf, '245,166,35');
      }

    } else if (sceneName === 'trust') {
      var btr2 = board;
      drawLinksSet(1);
      drawPerson(btr2.human.x, btr2.human.y, 1.1, sf);
      drawBoxNode(btr2.sys, sf, board.actHot);
      strokePath(btr2.pWhis, 'rgba(245,166,35,' + (0.14 * sf) + ')', 1);
      strokePath(btr2.pAct, 'rgba(200,200,215,' + (0.12 * sf) + ')', 1);
      if (board.actHot > 0.05) drawGlow(btr2.sys.x, btr2.sys.y, 36, 0.12 * board.actHot * sf, false);
      // the forensic light: it only ever finds the human
      if (board.lightU >= 0 && !board.verify) {
        var la = bell(board.lightU);
        ctx.strokeStyle = 'rgba(200,200,215,' + (0.4 * la * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(btr2.human.x, btr2.human.y - 4, 34, 0, Math.PI * 2);
        ctx.stroke();
        labelText('WHAT THE AUDIT SEES', btr2.human.x, btr2.human.y - 52, 0.65 * la * sf);
      }
      if (board.verify) {
        var gp3 = bezier(btr2.pAct, 0.35);
        ctx.strokeStyle = 'rgba(245,166,35,' + (0.6 * sf) + ')';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(gp3[0], gp3[1] - 14);
        ctx.lineTo(gp3[0], gp3[1] + 14);
        ctx.stroke();
        labelText('EVIDENCE FIRST', gp3[0], gp3[1] + 32, 0.55 * sf, '245,166,35');
      }

    } else if (sceneName === 'rogue') {
      var bro2 = board;
      bro2.orbits.forEach(function (o, i) {
        var isRogue = i === bro2.rogueI;
        ctx.strokeStyle = 'rgba(200,200,215,' + ((isRogue ? 0.1 : 0.14) * sf) + ')';
        ctx.lineWidth = 0.8;
        if (isRogue) ctx.setLineDash([2, 6]);
        ctx.beginPath();
        ctx.ellipse(bro2.hub.x, bro2.hub.y, o.r * 1.25, o.r * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });
      // the deviation, flagged once it grows past doubt
      if (board.flag && !board.contained) {
        var o2 = bro2.orbits[bro2.rogueI];
        ctx.strokeStyle = 'rgba(255,77,28,' + (0.4 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(bro2.hub.x, bro2.hub.y, o2.r * 1.25 * (1 + board.dev * 0.55), o2.r * 0.8 * (1 + board.dev * 0.55), 0, 0, Math.PI * 2);
        ctx.stroke();
        labelText('OFF BASELINE', bro2.hub.x, bro2.hub.y + MN * 0.30, 0.6 * sf, '255,138,102');
      }
      if (board.contained) {
        var qx3 = bro2.hub.x + MN * 0.30;
        var qy3 = bro2.hub.y - MN * 0.16;
        ctx.strokeStyle = 'rgba(245,166,35,' + (0.55 * sf) + ')';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.arc(qx3, qy3, MN * 0.038, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        labelText('CONTAINED', qx3, qy3 + MN * 0.038 + 16, 0.6 * sf, '245,166,35');
      }

    } else if (sceneName === 'pairing') {
      var bp2 = board;
      bp2.pairs.forEach(function (pr, i) {
        var on = board.active === i;
        var yy = bp2.y0 + i * bp2.dy;
        drawBoxNode({ x: bp2.lx, y: yy, w: bp2.cw, h: bp2.ch }, sf * 0.85, 0);
        drawBoxNode({ x: bp2.rx, y: yy, w: bp2.cw, h: bp2.ch }, sf * 0.85, on ? 0.5 : 0);
        labelText(pr[0], bp2.lx, yy + 4, (on ? 0.7 : 0.45) * sf);
        labelText(pr[1], bp2.rx, yy + 4, (on ? 0.75 : 0.45) * sf,
          on ? '255,138,102' : '200,200,215');
        strokePath(bp2.pths[i], 'rgba(255,138,102,' + ((on ? 0.22 : 0.06) * sf) + ')', 1);
      });

    } else if (sceneName === 'posture2') {
      var bpo2 = board;
      bpo2.cells.forEach(function (c, i) {
        var hit = board.hitCell === i && board.flareU >= 0;
        ctx.strokeStyle = 'rgba(245,166,35,' + ((hit ? 0.55 : 0.3) * sf) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0, 8);
        ctx.stroke();
        if (hit && board.flareU > 0.6) {
          // the fault dies against the wall, visibly
          drawGlow((c.x0 + c.x1) / 2, c.y1 - 14, 26, 0.1 * bell(board.flareU) * sf, false);
        }
      });

    } else if (sceneName === 'sources' || sceneName === 'outro') {
      // nothing structural: the page, or the mark, carries it
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
        lap: board.lap, gateOn: board.gateOn, bulk: board.bulk,
        contained: board.contained, active: board.active
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
