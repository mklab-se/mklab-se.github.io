/* ============================================================
   MKLab Living Canvas: AI for decision makers edition
   One particle system behind the whole deck. Slides declare a
   scene via <section data-scene="...">; scrolling morphs the
   same lights from one scene into the next.
   Scenes: title, tension, compete, roi, owner, risk, shadow,
   literacy, personal, monday, sources, outro.
   Bilingual: canvas labels follow the page language (sv/en).
   Based on assets/js/talks/agentic-workflows.js. No dependencies.
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

  // the deck exists in Swedish and English; the lights speak both
  var LNG = (document.documentElement.lang || 'en').slice(0, 2) === 'sv' ? 'sv' : 'en';
  var TT = {
    sv: {
      board: 'STYRELSEN', mgmt: 'LEDNINGEN',
      rush: '61% · STYRELSEN SKYNDAR PÅ',
      self75: '75% SKATTAR SIG HÖGT', dis40: '40% AV VD:AR HÅLLER INTE MED',
      lim66: '66% · BEGRÄNSAD AI-KUNSKAP',
      competitors: 'KONKURRENTERNA', you: 'ER VERKSAMHET',
      pilots: 'TJUGO PILOTER', bets: 'TVÅ SATSNINGAR',
      licenses: 'LICENSER', usage: 'ANVÄNDNING', cycle: 'CYKELTID', quality: 'KVALITET',
      s56: '56% · INGEN MÄTBAR EFFEKT', s15: '15% · SER AVKASTNING', s92: '92% · CFO:ER PRESSAS',
      owner: 'ÄGAREN · ETT MANDAT',
      depts: ['IT', 'HR', 'EKONOMI', 'PRODUKT', 'SÄLJ', 'JURIDIK'],
      nofound: 'UTAN GRUND', found: 'MED GRUND · 3X AVKASTNING',
      inj: '”PROMPT INJECTION”', review: 'MÄNNISKAN I LOOPEN',
      sanctioned: 'SANKTIONERAT', theShadow: 'SKUGGAN',
      s57: '57% · DOLD ANVÄNDNING', s15b: '1 AV 5 INTRÅNG',
      words: ['AGENT', 'SKILL', 'MCP', 'AGENTIC WORKFLOW'],
      defs: ['AGERAR', 'KUNSKAP VID BEHOV', 'PROTOKOLLET TILL ERA SYSTEM', 'ARBETAR NÄR NÅGOT HÄNDER'],
      s80: '80% VILL SE MÄTBAR AI-FÖRSTÅELSE',
      s94: '94% · ANVÄNDER REDAN', pack: 'STYRELSEMATERIALET', three: 'TRE FRÅGOR',
      chat: 'CHATT · 2023', agentEra: 'AGENT · NU',
      cards: ['ÄGAREN', 'DATAGRÄNSEN', 'EN SANKTIONERAD VÄG', 'TVÅ SATSNINGAR', 'FRÅGA TEAMEN']
    },
    en: {
      board: 'THE BOARD', mgmt: 'MANAGEMENT',
      rush: '61% · BOARDS ARE RUSHING',
      self75: '75% RATE THEMSELVES HIGH', dis40: '40% OF CEOS DISAGREE',
      lim66: '66% · LIMITED AI KNOWLEDGE',
      competitors: 'YOUR COMPETITORS', you: 'YOUR COMPANY',
      pilots: 'TWENTY PILOTS', bets: 'TWO BETS',
      licenses: 'LICENSES', usage: 'USAGE', cycle: 'CYCLE TIME', quality: 'QUALITY',
      s56: '56% · NO MEASURABLE IMPACT', s15: '15% · SEE REAL ROI', s92: '92% · CFOS UNDER PRESSURE',
      owner: 'THE OWNER · ONE MANDATE',
      depts: ['IT', 'HR', 'FINANCE', 'PRODUCT', 'SALES', 'LEGAL'],
      nofound: 'NO FOUNDATION', found: 'WITH FOUNDATION · 3X RETURNS',
      inj: 'PROMPT INJECTION', review: 'HUMAN IN THE LOOP',
      sanctioned: 'SANCTIONED', theShadow: 'THE SHADOW',
      s57: '57% · HIDDEN USAGE', s15b: '1 IN 5 BREACHES',
      words: ['AGENT', 'SKILL', 'MCP', 'AGENTIC WORKFLOW'],
      defs: ['ACTS', 'KNOWLEDGE ON DEMAND', 'THE PROTOCOL TO YOUR SYSTEMS', 'WORKS WHEN EVENTS HAPPEN'],
      s80: '80% WANT MEASURABLE AI LITERACY',
      s94: '94% · ALREADY USING IT', pack: 'THE BOARD PACK', three: 'THREE QUESTIONS',
      chat: 'CHAT · 2023', agentEra: 'AGENT · NOW',
      cards: ['THE OWNER', 'THE DATA BOUNDARY', 'ONE SANCTIONED PATH', 'TWO HONEST BETS', 'ASK YOUR TEAMS']
    }
  }[LNG];

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

  // -- tension: the board and the management, pulling on the same
  // -- band, disagreeing about who understands what
  layouts.tension = function () {
    var bg = { x: W * (isMobile ? 0.22 : 0.17), y: H * 0.30, r: MN * 0.05 };
    var mg = { x: W * (isMobile ? 0.78 : 0.83), y: H * 0.30, r: MN * 0.05 };
    board = {
      bg: bg, mg: mg,
      cycle: 4600,
      band: makePath(bg.x + bg.r * 1.6, bg.y, mg.x - mg.r * 1.6, mg.y, 0.05),
      labels: [
        { x: bg.x, y: bg.y + MN * 0.09 + 18, text: TT.board },
        { x: mg.x, y: mg.y + MN * 0.09 + 18, text: TT.mgmt },
        { x: W * 0.5, y: H * 0.10, text: TT.rush },
        { x: bg.x, y: bg.y - MN * 0.09 - 14, text: TT.self75 },
        { x: mg.x, y: mg.y - MN * 0.09 - 14, text: TT.dis40 },
        { x: W * 0.5, y: H * 0.485, text: TT.lim66 }
      ]
    };
    P.forEach(function (p) {
      if (p.seed < 0.16) {
        p.mode = 'ba';
        brainHome(p, bg);
        p.baseAlpha = rand(0.3, 0.75); p.sizeMul = rand(0.35, 0.65); p.fast = false;
      } else if (p.seed < 0.32) {
        p.mode = 'ma';
        brainHome(p, mg);
        p.baseAlpha = rand(0.3, 0.75); p.sizeMul = rand(0.35, 0.65); p.fast = false;
      } else if (p.seed < 0.42) {
        p.mode = 'p2m';
        p.off = rand(0, 0.14);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.52) {
        p.mode = 'm2b';
        p.off = rand(0, 0.14);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.58) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'ba' || p.mode === 'ma'; }, 60);
  };

  // -- compete: competitor islands under way, and the own island
  // -- consolidating twenty pilot sparks into two deliberate bets
  layouts.compete = function () {
    var own = { x: W * (isMobile ? 0.42 : 0.66), y: H * (isMobile ? 0.40 : 0.58), r: MN * 0.06 };
    var bets = [
      { x: W * (isMobile ? 0.72 : 0.845), y: H * (isMobile ? 0.22 : 0.36), r: MN * 0.028 },
      { x: W * (isMobile ? 0.80 : 0.895), y: H * (isMobile ? 0.50 : 0.63), r: MN * 0.028 }
    ];
    var comps = [
      { x0: W * (isMobile ? 0.14 : 0.56), y0: H * 0.16 },
      { x0: W * (isMobile ? 0.44 : 0.72), y0: H * 0.10 },
      { x0: W * (isMobile ? 0.72 : 0.87), y0: H * 0.15 }
    ];
    board = {
      own: own, bets: bets, comps: comps,
      cycle: 6800,
      labels: [
        { x: W * (isMobile ? 0.5 : 0.72), y: H * 0.055, text: TT.competitors },
        { x: own.x, y: own.y + own.r * 1.7 + 16, text: TT.you }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.18) {
        p.mode = 'own';
        brainHome(p, own);
        p.baseAlpha = rand(0.35, 0.85); p.sizeMul = rand(0.35, 0.68); p.fast = false;
      } else if (p.seed < 0.40) {
        p.mode = 'pil';
        p.pi = i % 12;
        var a = p.pi / 12 * Math.PI * 2 + 0.4;
        var d = MN * (0.12 + (p.pi % 3) * 0.035);
        p.sx = own.x + Math.cos(a) * d * 1.25;
        p.sy = own.y + Math.sin(a) * d * 0.8;
        p.bi = p.pi % 2;
        p.off = rand(0, 0.08);
        p.baseAlpha = rand(0.35, 0.85); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.52) {
        p.mode = 'comp';
        p.ci = i % 3;
        p.ox = rand(-MN * 0.03, MN * 0.03);
        p.oy = rand(-MN * 0.02, MN * 0.02);
        p.baseAlpha = rand(0.2, 0.5); p.sizeMul = rand(0.3, 0.6); p.fast = false;
      } else if (p.seed < 0.60) {
        p.mode = 'wake';
        p.ci = i % 3;
        p.off = rand(0.02, 0.35);
        p.baseAlpha = rand(0.1, 0.3); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else {
        assignDust(p);
      }
    });
    links = brainLinksFor(function (p) { return p.mode === 'own'; }, 40);
  };

  // -- roi: the license meter fills proudly while the real signals
  // -- stay dark; then usage lights the lamps and the meter dims
  layouts.roi = function () {
    var bar = { x: W * (isMobile ? 0.26 : 0.24), y: H * (isMobile ? 0.16 : 0.28), w: W * (isMobile ? 0.42 : 0.24), h: 14 };
    var lamps = isMobile ? [
      { x: W * 0.62, y: H * 0.14, text: TT.usage },
      { x: W * 0.62, y: H * 0.28, text: TT.cycle },
      { x: W * 0.62, y: H * 0.42, text: TT.quality }
    ] : [
      { x: W * 0.60, y: H * 0.28, text: TT.usage },
      { x: W * 0.74, y: H * 0.28, text: TT.cycle },
      { x: W * 0.88, y: H * 0.28, text: TT.quality }
    ];
    board = {
      bar: bar, lamps: lamps, lr: MN * 0.028,
      cycle: 9000,
      labels: [
        { x: W * (isMobile ? 0.28 : 0.24), y: H * 0.075, text: TT.s56 },
        { x: W * (isMobile ? 0.72 : 0.52), y: H * (isMobile ? 0.075 : 0.075), text: TT.s15 },
        { x: W * (isMobile ? 0.5 : 0.80), y: H * (isMobile ? 0.115 : 0.075), text: TT.s92 },
        { x: bar.x, y: bar.y + 34, text: TT.licenses }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.16) {
        p.mode = 'lic';
        p.fx = fract(p.seed * 91.7);
        p.baseAlpha = rand(0.35, 0.75); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.34) {
        p.mode = 'lampfill';
        p.li = i % 3;
        var a = rand(0, Math.PI * 2);
        var d = Math.pow(Math.random(), 0.6) * MN * 0.02;
        p.ox = Math.cos(a) * d; p.oy = Math.sin(a) * d;
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.46) {
        p.mode = 'flow';
        p.li = i % 3;
        p.off = rand(0, 1);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.28, 0.5); p.fast = true;
      } else if (p.seed < 0.52) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- owner: the question of ownership bounces homeless between
  // -- departments until one node takes the mandate
  layouts.owner = function () {
    var c = { x: W * (isMobile ? 0.5 : 0.735), y: H * (isMobile ? 0.30 : 0.44) };
    var depts = [];
    for (var k = 0; k < 6; k++) {
      var a = -Math.PI / 2 + k * Math.PI * 2 / 6;
      var r = MN * (isMobile ? 0.20 : 0.235);
      depts.push({
        x: c.x + Math.cos(a) * r * (isMobile ? 0.9 : 1.1),
        y: c.y + Math.sin(a) * r * 0.78,
        r: MN * 0.026, text: TT.depts[k]
      });
    }
    board = {
      c: c, depts: depts,
      seq: [0, 3, 1, 4, 2, 5],
      cycle: 9000,
      labels: []
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.30) {
        p.mode = 'dept';
        p.ni = i % 6;
        var nd = depts[p.ni];
        var a2 = rand(0, Math.PI * 2);
        var d = Math.pow(Math.random(), 0.6) * nd.r * 1.4;
        p.hx = nd.x + Math.cos(a2) * d;
        p.hy = nd.y + Math.sin(a2) * d;
        p.baseAlpha = rand(0.28, 0.62); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.38) {
        p.mode = 'spark';
        p.off = rand(0, 0.05);
        p.baseAlpha = rand(0.5, 1); p.sizeMul = rand(0.34, 0.62); p.fast = true;
      } else if (p.seed < 0.52) {
        p.mode = 'ownc';
        var a3 = rand(0, Math.PI * 2);
        var d2 = Math.pow(Math.random(), 0.6) * MN * 0.036;
        p.hx = c.x + Math.cos(a3) * d2;
        p.hy = c.y + Math.sin(a3) * d2 * 0.9;
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.36, 0.66); p.fast = false;
      } else if (p.seed < 0.58) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- risk: two gardens; the fenced one grows three times better,
  // -- and the stray spark from outside dies at the fence
  layouts.risk = function () {
    var base = H * (isMobile ? 0.50 : 0.68);
    var g1 = { x0: W * (isMobile ? 0.08 : 0.55), x1: W * (isMobile ? 0.44 : 0.71), h: MN * 0.09 };
    var g2 = { x0: W * (isMobile ? 0.56 : 0.76), x1: W * (isMobile ? 0.94 : 0.955), h: MN * 0.20 };
    board = {
      base: base, g1: g1, g2: g2,
      labels: [
        { x: (g1.x0 + g1.x1) / 2, y: base + 26, text: TT.nofound },
        { x: (g2.x0 + g2.x1) / 2, y: base + 26, text: TT.found },
        { x: (g2.x0 + g2.x1) / 2, y: base + 46, text: TT.review }
      ]
    };
    P.forEach(function (p) {
      if (p.seed < 0.14) {
        p.mode = 'g1';
        p.gx = rand(g1.x0 + 8, g1.x1 - 8);
        p.dur = rand(2600, 4200);
        p.off = rand(0, 1);
        p.baseAlpha = rand(0.25, 0.55); p.sizeMul = rand(0.3, 0.55); p.fast = false;
      } else if (p.seed < 0.46) {
        p.mode = 'g2';
        p.gx = rand(g2.x0 + 8, g2.x1 - 8);
        p.dur = rand(2600, 4200);
        p.off = rand(0, 1);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.54) {
        p.mode = 'inj';
        p.off = rand(0, 1);
        p.dur = rand(1800, 3000);
        p.baseAlpha = rand(0.45, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.60) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- shadow: the sanctioned corner is small; the shadow is where
  // -- the work happens, and light reveals it without punishing it
  layouts.shadow = function () {
    var off = { x0: W * 0.07, x1: W * 0.30, y0: H * 0.07, y1: H * 0.42 };
    var sh = { x0: W * 0.36, x1: W * 0.94, y0: H * 0.07, y1: H * 0.42 };
    board = {
      off: off, sh: sh,
      cycle: 9500,
      labels: [
        { x: (off.x0 + off.x1) / 2, y: off.y0 - 12, text: TT.sanctioned },
        { x: (sh.x0 + sh.x1) / 2, y: sh.y0 - 12, text: TT.theShadow },
        { x: (off.x0 + off.x1) / 2, y: off.y1 + 20, text: TT.s57 },
        { x: (sh.x0 + sh.x1) / 2, y: sh.y1 + 20, text: TT.s15b }
      ]
    };
    P.forEach(function (p) {
      if (p.seed < 0.08) {
        p.mode = 'offw';
        p.hx = rand(off.x0 + 14, off.x1 - 14);
        p.hy = rand(off.y0 + 16, off.y1 - 16);
        p.baseAlpha = rand(0.5, 0.95); p.sizeMul = rand(0.35, 0.65); p.fast = false;
      } else if (p.seed < 0.50) {
        p.mode = 'shw';
        p.hx = rand(sh.x0 + 14, sh.x1 - 14);
        p.hy = rand(sh.y0 + 16, sh.y1 - 16);
        p.baseAlpha = rand(0.5, 0.95); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.56) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- literacy: the vocabulary ring turns in 3D while the pyramid
  // -- of the organization lights up, bottom to top
  layouts.literacy = function () {
    var sp = {
      cx: W * (isMobile ? 0.5 : 0.76),
      cy: H * (isMobile ? 0.26 : 0.38),
      scale: MN * (isMobile ? 0.28 : 0.22),
      persp: 3.4
    };
    var pyr = { x: W * (isMobile ? 0.5 : 0.565), y: H * (isMobile ? 0.62 : 0.66) };
    board = {
      sp: sp, pyr: pyr,
      cycle: 3200,
      tiers: [
        [-2, -1, 0, 1, 2],
        [-1, 0, 1],
        [0]
      ],
      labels: [
        { x: sp.cx, y: H * (isMobile ? 0.80 : 0.85), text: TT.s80 }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.32) {
        p.mode = 'ev';
        p.ei = i % 4;
        p.j = [rand(-0.09, 0.09), rand(-0.07, 0.07), rand(-0.09, 0.09)];
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.40) {
        p.mode = 'drop';
        p.off = rand(0, 0.1);
        p.baseAlpha = rand(0.45, 0.95); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.48) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- personal: the chat bubble of 2023 becomes the working agent
  // -- of now, while the executive stays in the review seat
  layouts.personal = function () {
    var exec = { x: W * (isMobile ? 0.18 : 0.575), y: H * (isMobile ? 0.30 : 0.46) };
    var bub = { x: W * (isMobile ? 0.5 : 0.71), y: H * (isMobile ? 0.16 : 0.28), r: MN * 0.038 };
    var loop = { x: W * (isMobile ? 0.55 : 0.795), y: H * (isMobile ? 0.36 : 0.48), r: MN * 0.034 };
    var pack = { x: W * (isMobile ? 0.82 : 0.915), y: H * (isMobile ? 0.20 : 0.30), w: MN * 0.07, h: MN * 0.085 };
    var verdict = { x: W * (isMobile ? 0.82 : 0.795), y: H * (isMobile ? 0.56 : 0.70), w: MN * 0.065, h: MN * 0.05 };
    board = {
      exec: exec, bub: bub, loop: loop, pack: pack, verdict: verdict,
      cycle: 7600,
      toPack: makePath(loop.x + loop.r, loop.y - loop.r * 0.5, pack.x - pack.w * 0.55, pack.y + pack.h * 0.2, 0.14),
      toVer: makePath(loop.x, loop.y + loop.r, verdict.x + verdict.w * 0.1, verdict.y - verdict.h * 0.6, 0.1),
      labels: [
        { x: exec.x, y: exec.y + 48, text: TT.s94 },
        { x: bub.x, y: bub.y - bub.r * 1.5 - 10, text: TT.chat },
        { x: loop.x, y: loop.y + loop.r * 1.4 + 78, text: '' },
        { x: pack.x, y: pack.y + pack.h * 0.62 + 16, text: TT.pack },
        { x: verdict.x, y: verdict.y + verdict.h * 0.62 + 16, text: TT.three }
      ]
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.14) {
        p.mode = 'bub';
        brainHome(p, bub);
        p.baseAlpha = rand(0.35, 0.8); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.30) {
        p.mode = 'loopc';
        brainHome(p, loop);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.34, 0.62); p.fast = false;
      } else if (p.seed < 0.40) {
        p.mode = 'lp1';
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.50) {
        p.mode = 'lp2';
        p.off = rand(0, 0.12);
        p.baseAlpha = rand(0.4, 0.9); p.sizeMul = rand(0.3, 0.55); p.fast = true;
      } else if (p.seed < 0.58) {
        p.mode = 'packp';
        p.li = i % 5;
        p.hx = pack.x - pack.w * 0.38 + fract(p.seed * 77.7) * pack.w * 0.76 * 0.8;
        p.hy = pack.y - pack.h * 0.36 + p.li * pack.h * 0.72 / 4 + rand(-1, 1);
        p.baseAlpha = rand(0.25, 0.6); p.sizeMul = rand(0.28, 0.5); p.fast = false;
      } else if (p.seed < 0.64) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- monday: five decisions settle, one by one, each earning its
  // -- quiet check
  layouts.monday = function () {
    var cards = [];
    for (var k = 0; k < 5; k++) {
      cards.push(isMobile ? {
        x: W * 0.5, y: H * (0.08 + k * 0.10), w: W * 0.8, h: H * 0.075, text: TT.cards[k]
      } : {
        x: W * (0.155 + k * 0.1725), y: H * (k % 2 === 0 ? 0.22 : 0.34), w: W * 0.155, h: H * 0.105, text: TT.cards[k]
      });
    }
    board = {
      cards: cards,
      step: 1500,
      labels: []
    };
    P.forEach(function (p, i) {
      if (p.seed < 0.45) {
        p.mode = 'card';
        p.ci = i % 5;
        var cd = cards[p.ci];
        p.hx = cd.x + rand(-cd.w * 0.4, cd.w * 0.4);
        p.hy = cd.y + rand(-cd.h * 0.34, cd.h * 0.34);
        p.baseAlpha = rand(0.3, 0.7); p.sizeMul = rand(0.32, 0.6); p.fast = false;
      } else if (p.seed < 0.53) {
        assignBokeh(p);
      } else {
        assignDust(p);
      }
    });
    links = [];
  };

  // -- sources: the lights rest; the page carries the links
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

    } else if (sceneName === 'tension') {
      var bt = board;
      var prog = fract(te / bt.cycle);
      var u = win(prog, 0.06, 0.90);
      board.clash = u >= 0 ? Math.max(0, 1 - Math.abs(u - 0.5) * 5) : 0;
      P.forEach(function (p) {
        if (p.mode === 'ba' || p.mode === 'ma') {
          brainTarget(p, t, board.clash * 0.5);
        } else if (p.mode === 'p2m' || p.mode === 'm2b') {
          if (u < 0) {
            var st = p.mode === 'p2m' ? bt.band.p0 : bt.band.p1;
            p.tx = st[0]; p.ty = st[1]; p.alpha = 0;
          } else {
            var s = clamp01(u + p.off * (1 - u));
            var pos = bezier(bt.band, p.mode === 'p2m' ? easeInOut(s) * 0.5 : 1 - easeInOut(s) * 0.5);
            p.tx = pos[0]; p.ty = pos[1] + Math.sin(t * 0.004 + p.phase) * 3;
            p.alpha = p.baseAlpha * bell(u);
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'compete') {
      var bc = board;
      var prog2 = fract(te / bc.cycle);
      var scatterU = win(prog2, 0.0, 0.35);
      var convU = win(prog2, 0.40, 0.70);
      var holdU = win(prog2, 0.70, 0.96);
      board.betFlare = holdU >= 0 ? bell(holdU * 0.5 + 0.25) : 0;
      board.holdU = holdU;
      // competitor islands drift steadily onward
      board.cpos = bc.comps.map(function (csp, i) {
        var drift = (t * 0.00001 * (1 + i * 0.3)) % 0.1;
        return [csp.x0 + drift * W * 0.6, csp.y0 + Math.sin(t * 0.0002 + i) * 6];
      });
      P.forEach(function (p) {
        if (p.mode === 'own') {
          brainTarget(p, t, convU >= 0 ? 0.4 : 0.1);
        } else if (p.mode === 'pil') {
          var bet = bc.bets[p.bi];
          if (convU < 0 && holdU < 0) {
            p.tx = p.sx + Math.sin(t * 0.0009 + p.phase) * 4;
            p.ty = p.sy + Math.cos(t * 0.0008 + p.phase) * 3;
            p.alpha = p.baseAlpha * (scatterU >= 0 ? (0.4 + 0.5 * Math.sin(t * 0.002 + p.phase)) : 0.3);
          } else if (convU >= 0) {
            var s2 = easeInOut(clamp01(convU + p.off));
            p.tx = p.sx + (bet.x - p.sx) * s2;
            p.ty = p.sy + (bet.y - p.sy) * s2;
            p.alpha = p.baseAlpha * (0.5 + 0.5 * s2);
          } else {
            p.tx = bet.x + Math.sin(p.phase + t * 0.0012) * bet.r;
            p.ty = bet.y + Math.cos(p.phase * 1.7 + t * 0.001) * bet.r * 0.85;
            p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.0015 + p.phase));
          }
        } else if (p.mode === 'comp') {
          var cp = board.cpos[p.ci];
          p.tx = cp[0] + p.ox;
          p.ty = cp[1] + p.oy;
          p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'wake') {
          var cp2 = board.cpos[p.ci];
          p.tx = cp2[0] - p.off * W * 0.12;
          p.ty = cp2[1] + Math.sin(p.phase) * 5;
          p.alpha = p.baseAlpha * (1 - p.off * 2.4);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'roi') {
      var br = board;
      var prog3 = fract(te / br.cycle);
      var fillU = win(prog3, 0.04, 0.40);
      board.licProg = fillU >= 0 ? easeInOut(fillU) : (prog3 > 0.40 ? 1 : 0);
      board.licDim = prog3 > 0.5 ? clamp01((prog3 - 0.5) / 0.2) : 0;
      board.lampsOn = [
        prog3 > 0.50, prog3 > 0.64, prog3 > 0.78
      ];
      board.flowU = win(prog3, 0.48, 0.95);
      P.forEach(function (p) {
        if (p.mode === 'lic') {
          var visL = p.fx < board.licProg ? 1 : 0;
          p.tx = br.bar.x - br.bar.w / 2 + p.fx * br.bar.w;
          p.ty = br.bar.y + Math.sin(t * 0.002 + p.phase) * 3;
          p.alpha = p.baseAlpha * visL * (1 - board.licDim * 0.75);
        } else if (p.mode === 'lampfill') {
          var lm = br.lamps[p.li];
          p.tx = lm.x + p.ox + Math.sin(t * 0.0014 + p.phase) * 1.2;
          p.ty = lm.y + p.oy + Math.cos(t * 0.0012 + p.phase) * 1;
          p.alpha = p.baseAlpha * (board.lampsOn[p.li] ? (0.7 + 0.3 * Math.sin(t * 0.002 + p.phase)) : 0.06);
        } else if (p.mode === 'flow') {
          var lm2 = br.lamps[p.li];
          if (board.flowU < 0) {
            p.tx = lm2.x; p.ty = H * 0.52; p.alpha = 0;
          } else {
            var s3 = fract(p.off + board.flowU * 1.8);
            p.tx = lm2.x + Math.sin(s3 * Math.PI * 2 + p.phase) * 8;
            p.ty = H * (isMobile ? 0.52 : 0.46) - s3 * (H * (isMobile ? 0.52 : 0.46) - lm2.y - br.lr);
            p.alpha = p.baseAlpha * bell(clamp01(s3)) * (board.lampsOn[p.li] ? 1 : 0.4);
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'owner') {
      var bo = board;
      var prog4 = fract(te / bo.cycle);
      var hopPhase = win(prog4, 0.0, 0.58);
      var igniteU = win(prog4, 0.58, 0.70);
      var settledU = win(prog4, 0.70, 0.97);
      board.settled = settledU >= 0;
      board.igniteU = igniteU;
      // where the homeless question is right now
      var sparkPos;
      if (hopPhase >= 0) {
        var hopF = hopPhase * 6;
        var hi = Math.min(5, Math.floor(hopF));
        var hu = easeInOut(clamp01(hopF - hi));
        var from = bo.depts[bo.seq[hi]];
        var to = bo.depts[bo.seq[(hi + 1) % 6]];
        sparkPos = [from.x + (to.x - from.x) * hu, from.y + (to.y - from.y) * hu - bell(hu) * 30];
        board.hotDept = bo.seq[hi];
      } else if (igniteU >= 0) {
        var lastD = bo.depts[bo.seq[5]];
        var iu = easeInOut(igniteU);
        sparkPos = [lastD.x + (bo.c.x - lastD.x) * iu, lastD.y + (bo.c.y - lastD.y) * iu];
        board.hotDept = -1;
      } else {
        sparkPos = [bo.c.x, bo.c.y];
        board.hotDept = -1;
      }
      board.sparkPos = sparkPos;
      P.forEach(function (p) {
        if (p.mode === 'dept') {
          p.tx = p.hx + Math.sin(t * 0.0008 * p.speed + p.phase) * 1.8;
          p.ty = p.hy + Math.cos(t * 0.0007 * p.speed + p.phase) * 1.4;
          var hot = board.hotDept === p.ni ? 0.35 : 0;
          p.alpha = p.baseAlpha * (board.settled ? 0.5 : 0.75) *
            (0.6 + 0.4 * Math.sin(t * 0.0011 + p.phase)) + hot;
        } else if (p.mode === 'spark') {
          p.tx = sparkPos[0] + Math.sin(t * 0.006 + p.phase) * 5;
          p.ty = sparkPos[1] + Math.cos(t * 0.005 + p.phase) * 4;
          p.alpha = p.baseAlpha * (board.settled ? 0 : 0.9);
        } else if (p.mode === 'ownc') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 1.6;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 1.3;
          var on = igniteU >= 0 ? easeInOut(igniteU) : (board.settled ? 1 : 0);
          p.alpha = p.baseAlpha * on * (0.65 + 0.35 * Math.sin(t * 0.0014 + p.phase));
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'risk') {
      var bk = board;
      P.forEach(function (p) {
        if (p.mode === 'g1' || p.mode === 'g2') {
          var g = p.mode === 'g1' ? bk.g1 : bk.g2;
          var cyc = fract(t / p.dur + p.off);
          p.tx = p.gx + Math.sin(t * 0.001 + p.phase) * 2;
          p.ty = bk.base - cyc * g.h;
          var fadeTop = p.mode === 'g1'
            ? (cyc > 0.5 ? 1 - (cyc - 0.5) / 0.5 : 1)        // wilts halfway
            : (cyc > 0.85 ? 1 - (cyc - 0.85) / 0.15 : 1);    // carries through
          p.alpha = p.baseAlpha * clamp01(cyc / 0.12) * fadeTop;
        } else if (p.mode === 'inj') {
          // a stray spark from outside aims at the garden and dies
          // at the fence
          var cyc2 = fract(t / p.dur + p.off);
          var sx = W * 0.99, sy = H * (isMobile ? 0.30 : 0.34);
          var ex = bk.g2.x1 + 6, ey = bk.base - bk.g2.h * 0.55;
          p.tx = sx + (ex - sx) * cyc2;
          p.ty = sy + (ey - sy) * easeInOut(cyc2);
          var kill = cyc2 > 0.82 ? 1 - (cyc2 - 0.82) / 0.18 : 1;
          p.alpha = p.baseAlpha * clamp01(cyc2 / 0.2) * kill * (cyc2 > 0.78 ? 1.3 : 0.6);
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'shadow') {
      var bs = board;
      var prog5 = fract(te / bs.cycle);
      var sweepU = win(prog5, 0.20, 0.75);
      var frontX = sweepU >= 0
        ? bs.sh.x0 + easeInOut(sweepU) * (bs.sh.x1 - bs.sh.x0)
        : (prog5 > 0.75 ? bs.sh.x1 : bs.sh.x0);
      var resetDim = prog5 > 0.92 ? (prog5 - 0.92) / 0.08 : 0;
      board.frontX = frontX;
      board.sweepU = sweepU;
      P.forEach(function (p) {
        if (p.mode === 'offw') {
          p.tx = p.hx + Math.sin(t * 0.0009 + p.phase) * 3;
          p.ty = p.hy + Math.cos(t * 0.0008 + p.phase) * 2.4;
          p.alpha = p.baseAlpha * (0.65 + 0.35 * Math.sin(t * 0.0013 + p.phase));
        } else if (p.mode === 'shw') {
          p.tx = p.hx + Math.sin(t * 0.0009 + p.phase) * 3;
          p.ty = p.hy + Math.cos(t * 0.0008 + p.phase) * 2.4;
          var lit = p.hx < frontX ? 1 : 0;
          var aBase = lit ? 0.85 : 0.14;
          p.alpha = p.baseAlpha * (aBase - resetDim * (aBase - 0.14)) *
            (0.65 + 0.35 * Math.sin(t * 0.0013 + p.phase));
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'literacy') {
      var bl = board;
      var az = t * 0.00028;
      board.az = az;
      var active = Math.floor(te / bl.cycle) % 4;
      board.active = active;
      board.litTiers = Math.min(3, active + (fract(te / bl.cycle) > 0.5 ? 1 : 0));
      board.epos = [];
      for (var e = 0; e < 4; e++) {
        var ea = e * Math.PI * 2 / 4;
        board.epos.push(proj(bl.sp, [Math.cos(ea), 0.1 * Math.sin(ea * 2), Math.sin(ea)], az));
      }
      P.forEach(function (p) {
        if (p.mode === 'ev') {
          var ea2 = p.ei * Math.PI * 2 / 4;
          var pr = proj(bl.sp, [
            Math.cos(ea2) + p.j[0], 0.1 * Math.sin(ea2 * 2) + p.j[1], Math.sin(ea2) + p.j[2]
          ], az);
          p.tx = pr[0]; p.ty = pr[1];
          var hot = p.ei === active ? 0.3 : 0;
          p.alpha = p.baseAlpha * (0.28 + 0.55 * pr[2]) + hot;
          p.sizeMul = (0.3 + 0.42 * pr[2]) * (p.ei === active ? 1.3 : 1);
        } else if (p.mode === 'drop') {
          var u2 = win(fract(te / bl.cycle), 0.35, 0.75);
          var apos = board.epos[active];
          if (u2 < 0) {
            p.tx = apos[0]; p.ty = apos[1]; p.alpha = 0;
          } else {
            var s4 = clamp01(u2 + p.off * (1 - u2));
            p.tx = apos[0] + (bl.pyr.x - apos[0]) * easeInOut(s4);
            p.ty = apos[1] + (bl.pyr.y - 30 - apos[1]) * easeInOut(s4);
            p.alpha = p.baseAlpha * bell(u2);
          }
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'personal') {
      var bp = board;
      var prog6 = fract(te / bp.cycle);
      var chatU = win(prog6, 0.0, 0.30);
      var morphU = win(prog6, 0.30, 0.45);
      var readU = win(prog6, 0.48, 0.66);
      var verU = win(prog6, 0.70, 0.88);
      board.execGlow = verU >= 0 && verU > 0.6 ? (verU - 0.6) / 0.4 : 0;
      board.eraMix = morphU >= 0 ? easeInOut(morphU) : (prog6 > 0.45 ? 1 : 0);
      board.verHot = verU >= 0 ? bell(verU) : 0;
      P.forEach(function (p) {
        if (p.mode === 'bub') {
          brainTarget(p, t, chatU >= 0 ? 0.3 : 0);
          p.alpha *= (1 - board.eraMix * 0.85);
        } else if (p.mode === 'loopc') {
          brainTarget(p, t, readU >= 0 ? 0.5 : 0.15);
          p.alpha *= board.eraMix;
        } else if (p.mode === 'lp1') {
          if (readU < 0) {
            p.tx = bp.toPack.p0[0]; p.ty = bp.toPack.p0[1]; p.alpha = 0;
          } else {
            var s5 = clamp01(readU + p.off * (1 - readU));
            var pos5 = bezier(bp.toPack, easeInOut(s5));
            p.tx = pos5[0]; p.ty = pos5[1];
            p.alpha = p.baseAlpha * bell(readU) * board.eraMix;
          }
        } else if (p.mode === 'lp2') {
          if (verU < 0) {
            p.tx = bp.toVer.p0[0]; p.ty = bp.toVer.p0[1]; p.alpha = 0;
          } else {
            var s6 = clamp01(verU + p.off * (1 - verU));
            var pos6 = bezier(bp.toVer, easeInOut(s6));
            p.tx = pos6[0]; p.ty = pos6[1];
            p.alpha = p.baseAlpha * bell(verU) * board.eraMix;
          }
        } else if (p.mode === 'packp') {
          p.tx = p.hx + Math.sin(t * 0.0012 + p.phase) * 0.8;
          p.ty = p.hy + Math.cos(t * 0.001 + p.phase) * 0.6;
          p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.001 + p.phase));
        } else if (p.mode === 'bokeh') {
          bokehTarget(p, t);
        } else {
          dustTarget(p, t);
        }
      });

    } else if (sceneName === 'monday') {
      var bm = board;
      var slot = Math.floor(te / bm.step);
      var total = 5 + 2;                       // two beats of rest
      var served = slot % total;
      var slotU = fract(te / bm.step);
      board.checked = Math.min(5, served + (served < 5 && slotU > 0.5 ? 1 : 0));
      board.activeCard = served < 5 ? served : -1;
      board.slotU = slotU;
      P.forEach(function (p) {
        if (p.mode === 'card') {
          p.tx = p.hx + Math.sin(t * 0.0009 + p.phase) * 1.4;
          p.ty = p.hy + Math.cos(t * 0.0008 + p.phase) * 1.1;
          var visC = p.ci < board.checked ? 1 : (p.ci === board.activeCard ? easeInOut(clamp01(slotU * 2)) : 0);
          var flare = p.ci === board.activeCard ? bell(clamp01(slotU)) * 0.3 : 0;
          p.alpha = p.baseAlpha * visC * (0.6 + 0.4 * Math.sin(t * 0.0012 + p.phase)) + flare;
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
    if (!text) return;
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
      if (a <= 0.02) return;
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

    } else if (sceneName === 'tension') {
      var bt2 = board;
      drawLinksSet(1);
      // the two groups
      for (var gI = 0; gI < 4; gI++) {
        drawPerson(bt2.bg.x - MN * 0.05 + gI * MN * 0.033, bt2.bg.y + MN * 0.075, 0.75, sf);
        drawPerson(bt2.mg.x - MN * 0.05 + gI * MN * 0.033, bt2.mg.y + MN * 0.075, 0.75, sf);
      }
      // the self-image rings, sized by self-assessment
      ctx.strokeStyle = 'rgba(245,166,35,' + (0.4 * sf) + ')';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(bt2.bg.x, bt2.bg.y - MN * 0.005, MN * 0.062, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.3 * sf) + ')';
      ctx.beginPath();
      ctx.arc(bt2.mg.x, bt2.mg.y - MN * 0.005, MN * 0.048, 0, Math.PI * 2);
      ctx.stroke();
      // the band, and the clash where the views collide
      strokePath(bt2.band, 'rgba(200,200,215,' + (0.16 * sf) + ')', 1.1);
      if (bt2.clash > 0.02) {
        var mid = bezier(bt2.band, 0.5);
        drawGlow(mid[0], mid[1], 40, 0.14 * bt2.clash * sf, false);
      }

    } else if (sceneName === 'compete') {
      var bc2 = board;
      drawLinksSet(1);
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.3 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bc2.own.x, bc2.own.y, bc2.own.r * 1.6, 0, Math.PI * 2);
      ctx.stroke();
      bc2.bets.forEach(function (b) {
        var on = bc2.holdU >= 0;
        ctx.strokeStyle = on
          ? 'rgba(255,77,28,' + (0.55 * sf) + ')'
          : 'rgba(200,200,215,' + (0.18 * sf) + ')';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        if (on && bc2.betFlare > 0.02) {
          drawGlow(b.x, b.y, b.r * 2.6, 0.09 * bc2.betFlare * sf, false);
        }
      });
      labelText(bc2.holdU >= 0 ? TT.bets : TT.pilots,
        (bc2.bets[0].x + bc2.bets[1].x) / 2,
        H * (isMobile ? 0.62 : 0.80),
        0.6 * sf, bc2.holdU >= 0 ? '255,138,102' : '200,200,215');

    } else if (sceneName === 'roi') {
      var br2 = board;
      // the license meter
      ctx.strokeStyle = 'rgba(200,200,215,' + ((0.32 - board.licDim * 0.18) * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(br2.bar.x - br2.bar.w / 2, br2.bar.y - br2.bar.h / 2, br2.bar.w, br2.bar.h, 6);
      ctx.stroke();
      // the honest lamps
      br2.lamps.forEach(function (lm, i) {
        var on = board.lampsOn && board.lampsOn[i];
        ctx.strokeStyle = on
          ? 'rgba(245,166,35,' + (0.6 * sf) + ')'
          : 'rgba(200,200,215,' + (0.2 * sf) + ')';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(lm.x, lm.y, br2.lr * 1.4, 0, Math.PI * 2);
        ctx.stroke();
        labelText(lm.text, lm.x, lm.y + br2.lr * 1.4 + 18, (on ? 0.7 : 0.4) * sf,
          on ? '245,166,35' : '200,200,215');
        if (on) drawGlow(lm.x, lm.y, br2.lr * 2.4, 0.07 * sf, true);
      });

    } else if (sceneName === 'owner') {
      var bo2 = board;
      bo2.depts.forEach(function (nd, i) {
        var hot = board.hotDept === i;
        ctx.strokeStyle = hot
          ? 'rgba(255,138,102,' + (0.55 * sf) + ')'
          : 'rgba(200,200,215,' + ((board.settled ? 0.16 : 0.24) * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, nd.r * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        labelText(nd.text, nd.x, nd.y + nd.r * 1.5 + 16,
          (hot ? 0.75 : 0.42) * sf);
        // once the mandate exists, everyone knows where to point
        if (board.settled || (board.igniteU >= 0 && board.igniteU > 0.5)) {
          ctx.strokeStyle = 'rgba(255,138,102,' + (0.14 * sf) + ')';
          ctx.beginPath();
          ctx.moveTo(nd.x, nd.y);
          ctx.lineTo(bo2.c.x, bo2.c.y);
          ctx.stroke();
        }
      });
      if (board.settled || (board.igniteU >= 0 && board.igniteU > 0.3)) {
        ctx.strokeStyle = 'rgba(255,77,28,' + (0.6 * sf) + ')';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(bo2.c.x, bo2.c.y, MN * 0.05, 0, Math.PI * 2);
        ctx.stroke();
        drawGlow(bo2.c.x, bo2.c.y, MN * 0.09, 0.08 * sf, false);
        labelText(TT.owner, bo2.c.x, bo2.c.y + MN * 0.05 + 20, 0.75 * sf, '255,138,102');
      }

    } else if (sceneName === 'risk') {
      var bk2 = board;
      // the ground both gardens grow from
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.18 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bk2.g1.x0, bk2.base);
      ctx.lineTo(bk2.g1.x1, bk2.base);
      ctx.moveTo(bk2.g2.x0, bk2.base);
      ctx.lineTo(bk2.g2.x1, bk2.base);
      ctx.stroke();
      // the fence around the garden that grows
      var wob = 0.8 + 0.2 * Math.sin(t * 0.0011);
      ctx.strokeStyle = 'rgba(245,166,35,' + (0.35 * wob * sf) + ')';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.roundRect(bk2.g2.x0 - 8, bk2.base - bk2.g2.h - 20, bk2.g2.x1 - bk2.g2.x0 + 16, bk2.g2.h + 20, 8);
      ctx.stroke();
      ctx.setLineDash([]);
      drawPerson(bk2.g2.x0 - 8, bk2.base + 4, 0.8, sf);
      labelText(TT.inj, W * (isMobile ? 0.86 : 0.90), H * (isMobile ? 0.26 : 0.30), 0.5 * sf, '255,138,102');

    } else if (sceneName === 'shadow') {
      var bs2 = board;
      // the sanctioned corner, small and proud
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.28 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bs2.off.x0, bs2.off.y0, bs2.off.x1 - bs2.off.x0, bs2.off.y1 - bs2.off.y0, 10);
      ctx.stroke();
      // the shadow, larger than anyone reported
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.14 * sf) + ')';
      ctx.setLineDash([2, 7]);
      ctx.beginPath();
      ctx.roundRect(bs2.sh.x0, bs2.sh.y0, bs2.sh.x1 - bs2.sh.x0, bs2.sh.y1 - bs2.sh.y0, 10);
      ctx.stroke();
      ctx.setLineDash([]);
      // the light front moving through it
      if (bs2.sweepU >= 0) {
        var gS = ctx.createLinearGradient(bs2.frontX - 50, 0, bs2.frontX + 10, 0);
        gS.addColorStop(0, 'rgba(245,166,35,0)');
        gS.addColorStop(1, 'rgba(245,166,35,' + (0.04 * sf) + ')');
        ctx.fillStyle = gS;
        ctx.fillRect(bs2.frontX - 50, bs2.sh.y0, 60, bs2.sh.y1 - bs2.sh.y0);
        ctx.strokeStyle = 'rgba(245,166,35,' + (0.3 * sf) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bs2.frontX, bs2.sh.y0 + 4);
        ctx.lineTo(bs2.frontX, bs2.sh.y1 - 4);
        ctx.stroke();
      }

    } else if (sceneName === 'literacy') {
      var bl2 = board;
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.1 * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(bl2.sp.cx, bl2.sp.cy, bl2.sp.scale, bl2.sp.scale * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (board.epos) {
        board.epos.forEach(function (ep, i) {
          if (board.active === i) return;
          var front = clamp01((ep[2] - 0.95) * 1.8);
          if (front <= 0.03) return;
          labelText(TT.words[i], ep[0], ep[1] - 12, front * 0.55 * sf);
        });
        // the word being explained speaks from a fixed spot
        labelText(TT.words[board.active] + ' · ' + TT.defs[board.active],
          bl2.sp.cx, bl2.sp.cy + bl2.sp.scale * 0.5 + 30, 0.8 * sf, '255,138,102');
      }
      // the organization, lighting up from below
      var tierY = [0, -MN * 0.052, -MN * 0.104];
      bl2.tiers.forEach(function (tier, ti) {
        var lit = ti < board.litTiers;
        tier.forEach(function (off) {
          drawPerson(bl2.pyr.x + off * MN * 0.045, bl2.pyr.y + tierY[ti], 0.62,
            sf * (lit ? 1 : 0.3));
        });
        if (lit && ti === 2) {
          drawGlow(bl2.pyr.x, bl2.pyr.y + tierY[2] - 8, 30, 0.12 * sf, true);
        }
      });

    } else if (sceneName === 'personal') {
      var bp2 = board;
      drawPerson(bp2.exec.x, bp2.exec.y, 1.15, sf);
      if (board.execGlow > 0.02) {
        drawGlow(bp2.exec.x, bp2.exec.y - 8, 46, 0.13 * board.execGlow * sf, true);
      }
      // the 2023 bubble
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.3 * (1 - board.eraMix * 0.8) * sf) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bp2.bub.x, bp2.bub.y, bp2.bub.r * 1.3, 0, Math.PI * 2);
      ctx.stroke();
      // the agent loop of now
      ctx.strokeStyle = 'rgba(255,138,102,' + (0.4 * board.eraMix * sf) + ')';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(bp2.loop.x, bp2.loop.y, bp2.loop.r * 1.3, 0, Math.PI * 2);
      ctx.stroke();
      labelText(TT.agentEra, bp2.loop.x, bp2.loop.y - bp2.loop.r * 1.5 - 8,
        0.6 * board.eraMix * sf, '255,138,102');
      drawBoxNode(bp2.pack, sf * (0.4 + board.eraMix * 0.6), 0);
      drawBoxNode(bp2.verdict, sf * board.eraMix, board.verHot);
      if (board.verHot > 0.02) {
        drawGlow(bp2.verdict.x, bp2.verdict.y, bp2.verdict.w, 0.09 * board.verHot * sf, true);
      }

    } else if (sceneName === 'monday') {
      var bm2 = board;
      bm2.cards.forEach(function (cd, i) {
        var done = i < board.checked;
        var active = board.activeCard === i;
        var visC = done ? 1 : (active ? easeInOut(clamp01(board.slotU * 2)) : 0);
        if (visC <= 0.03) return;
        ctx.strokeStyle = done
          ? 'rgba(245,166,35,' + (0.45 * visC * sf) + ')'
          : 'rgba(200,200,215,' + (0.3 * visC * sf) + ')';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.roundRect(cd.x - cd.w / 2, cd.y - cd.h / 2, cd.w, cd.h, 8);
        ctx.stroke();
        labelText(cd.text, cd.x, cd.y + 4, 0.7 * visC * sf,
          done ? '245,166,35' : '200,200,215');
        if (done) {
          ctx.strokeStyle = 'rgba(245,166,35,' + (0.8 * sf) + ')';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cd.x - 5, cd.y + cd.h / 2 + 13);
          ctx.lineTo(cd.x - 1.5, cd.y + cd.h / 2 + 17);
          ctx.lineTo(cd.x + 5.5, cd.y + cd.h / 2 + 9);
          ctx.stroke();
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
        lang: LNG,
        active: board.active,
        checked: board.checked,
        settled: board.settled
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
