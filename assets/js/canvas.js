/* ============================================================
   MKLab Living Canvas
   One particle system behind the whole site. Chapters declare
   a scene via <section data-scene="...">; scrolling morphs the
   same lights from one scene into the next.
   Scenes: constellation, ai, cloud, gantt, route, speak,
   contact, photo, tbanan.
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

  var W = 0, H = 0;
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var easeInOut = function (t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  var easeInOutInv = function (s) {
    return s < 0.5 ? Math.cbrt(s / 4) : 1 - Math.cbrt((1 - s) / 4);
  };

  // ---------- Glow sprites ----------
  function sprite(color) {
    var s = document.createElement('canvas'); s.width = s.height = 64;
    var c = s.getContext('2d');
    var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color);
    g.addColorStop(0.3, color.replace('1)', '0.5)'));
    g.addColorStop(1, color.replace('1)', '0)'));
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    return s;
  }
  var emberS = sprite('rgba(255,77,28,1)');
  var flameS = sprite('rgba(255,138,102,1)');
  var whiteS = sprite('rgba(215,215,225,1)');
  var candleS = sprite('rgba(245,166,35,1)');

  // ---------- Particles ----------
  var N = isMobile ? 260 : 520;
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
        seed: Math.random(),
        alpha: 0, baseAlpha: 1, sizeMul: 1
      });
    }
  })();

  // ---------- Shared scene state ----------
  var sceneName = null;
  var sceneFade = 1;
  var links = [], ganttBars = [], racks = [], slots = [], traces = [];
  var nextFlight = 0;
  var stage = null, waveT0 = 0;
  var flameC = null;
  var photo = null;
  var route = null, routeActive = 0, routeAuto = true, routePulseT0 = 0, routeAutoT0 = 0;
  var tGlyph = null;

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
    };
  }

  function startIntro() {
    if (!logoPts || reducedMotion) return;
    try { sessionStorage.setItem('mk-intro', '1'); } catch (e) { /* private mode */ }
    document.body.classList.add('mk-intro-running');
    logoPhase = 'assemble'; logoT0 = performance.now();
    var box = Math.min(W, H) * (isMobile ? 0.62 : 0.5);
    var ox = W / 2 - box / 2;
    var oy = H * 0.44 - box / 2;
    P.forEach(function (p) {
      var q = logoPts[Math.floor(p.seed * (logoPts.length - 1))];
      p.lx = ox + q[0] * box + rand(-1.5, 1.5);
      p.ly = oy + q[1] * box + rand(-1.5, 1.5);
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

  // ---------- Layout helpers ----------
  function homeInSlot(p) {
    var s = slots[p.slot];
    p.hx = s.x + rand(-s.rack.w * 0.32, s.rack.w * 0.32);
    p.hy = s.y + rand(-3.5, 3.5);
  }
  function makePath(a, b) {
    var x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y;
    var dx = x1 - x0, dy = y1 - y0;
    var dist = Math.hypot(dx, dy) || 1;
    var px = -dy / dist, py = dx / dist;
    var bend = dist * rand(0.05, 0.12) * (Math.random() < 0.5 ? -1 : 1);
    return {
      p0: [x0, y0], p1: [x1, y1],
      c0: [x0 + dx * 0.3 + px * bend * 0.5, y0 + dy * 0.3 + py * bend * 0.5],
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

  // ---------- Scene layouts ----------
  var layouts = {};

  layouts.constellation = function () {
    links = [];
    var CC = [];
    var nc = 7;
    for (var c = 0; c < nc; c++) {
      // clusters hug the flanks so centered or left copy stays in darkness
      var fx = (c % 2 === 0) ? rand(0.05, 0.30) : rand(0.62, 0.94);
      CC.push({
        x: W * fx, y: H * rand(0.10, 0.90),
        r: Math.min(W, H) * rand(0.06, 0.13),
        bright: c === 1
      });
    }
    var members = CC.map(function () { return []; });
    P.forEach(function (p, i) {
      if (p.seed < 0.55) {
        var ci = Math.floor(p.seed / 0.55 * nc) % nc;
        var a = rand(0, Math.PI * 2), d = Math.pow(Math.random(), 0.6) * CC[ci].r;
        p.hx = CC[ci].x + Math.cos(a) * d;
        p.hy = CC[ci].y + Math.sin(a) * d;
        p.baseAlpha = CC[ci].bright ? rand(0.7, 1) : rand(0.4, 0.9);
        p.sizeMul = rand(0.8, 1.3);
        members[ci].push(i);
      } else if (p.seed < 0.9) {
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.08, 0.3); p.sizeMul = rand(0.4, 0.8);
      } else {
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.05, 0.95);
        p.baseAlpha = rand(0.06, 0.16); p.sizeMul = rand(2.6, 4.2);
      }
    });
    members.forEach(function (m) {
      m.forEach(function (i) {
        m.filter(function (j) { return j !== i; })
          .map(function (j) {
            return { j: j, d: Math.pow(P[i].hx - P[j].hx, 2) + Math.pow(P[i].hy - P[j].hy, 2) };
          })
          .sort(function (a, b) { return a.d - b.d; })
          .slice(0, 2)
          .forEach(function (o) { if (i < o.j) links.push([i, o.j]); });
      });
    });
  };

  layouts.ai = function () {
    var cols = Math.max(isMobile ? 9 : 16, Math.floor(W / 52));
    P.forEach(function (p, i) {
      var col = i % cols;
      p.hx = (col + 0.5) * (W / cols) + rand(-2, 2);
      p.hy = rand(-H * 0.2, H * 1.2);
      p.speed = rand(0.4, 1.6);
      p.baseAlpha = p.ember ? rand(0.4, 0.95) : rand(0.15, 0.55);
      p.sizeMul = rand(0.35, 0.7);
    });
  };

  layouts.cloud = function () {
    racks = []; slots = []; traces = [];
    var rackXs = isMobile ? [0.26, 0.74] : [0.52, 0.665, 0.81, 0.955];
    var units = isMobile ? 9 : 11;
    var y0 = H * 0.13, y1 = H * 0.87;
    rackXs.forEach(function (fx) {
      var rk = { x: W * fx, w: Math.min(64, W * (isMobile ? 0.13 : 0.052)), y0: y0, y1: y1, units: units };
      racks.push(rk);
      for (var u = 0; u < units; u++) {
        slots.push({ rack: rk, x: rk.x, y: y0 + (u + 0.5) * (y1 - y0) / units });
      }
    });
    P.forEach(function (p) {
      if (p.seed < 0.85) {
        p.mode = 'srv';
        p.slot = Math.floor(p.seed / 0.85 * slots.length) % slots.length;
        homeInSlot(p);
        p.flying = false;
        p.baseAlpha = p.ember ? rand(0.3, 0.85) : rand(0.18, 0.6);
        p.sizeMul = rand(0.32, 0.6);
        p.speed = rand(0.5, 1.4);
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.03, 0.98); p.hy = H * rand(0.05, 0.95);
        p.baseAlpha = rand(0.04, 0.14); p.sizeMul = rand(0.5, 1.6);
      }
    });
    nextFlight = performance.now() + 1200;
  };

  layouts.gantt = function () {
    var rows = 8, m = H * 0.14, rh = (H - 2 * m) / rows;
    ganttBars = [];
    for (var r = 0; r < rows; r++) {
      var start = 0.08 + (r / rows) * 0.48 + rand(-0.02, 0.02);
      var len = rand(0.16, 0.30);
      ganttBars.push({
        x0: W * start, x1: W * Math.min(0.94, start + len),
        y: m + (r + 0.5) * rh,
        ember: r === 2 || r === 5
      });
    }
    P.forEach(function (p, i) {
      var b = ganttBars[i % ganttBars.length];
      p.hx = b.x0 + p.seed * (b.x1 - b.x0);
      p.hy = b.y + rand(-0.8, 0.8);
      p.milestone = p.seed > 0.985;
      if (p.milestone) p.hx = b.x1;
      p.baseAlpha = b.ember ? rand(0.5, 1) : rand(0.2, 0.6);
      p.sizeMul = p.milestone ? 1.4 : rand(0.4, 0.75);
    });
  };

  layouts.route = function () {
    route = {
      path: {
        p0: [W * (isMobile ? 0.10 : 0.42), H * 0.82],
        p1: [W * 0.95, H * 0.16],
        c0: [W * 0.62, H * 0.86],
        c1: [W * 0.70, H * 0.30]
      },
      wps: [0.06, 0.28, 0.50, 0.72, 0.94],
      pts: [],
      years: ['2010', '2014', '2018', '2022', 'IDAG']
    };
    route.pts = route.wps.map(function (s) { return bezier(route.path, s); });
    routeAutoT0 = performance.now();
    P.forEach(function (p, i) {
      if (p.seed < 0.55) {
        p.mode = 'wp';
        p.wp = i % route.wps.length;
        p.r = Math.pow(rand(0, 1), 0.7) * (isMobile ? 18 : 26) + 4;
        p.baseAlpha = rand(0.2, 0.7);
        p.sizeMul = rand(0.35, 0.75);
        p.speed = rand(0.3, 1) * (p.seed < 0.3 ? 1 : -1);
      } else if (p.seed < 0.72) {
        p.mode = 'trav';
        p.s = Math.random();
        p.speed = rand(0.00002, 0.00005);
        p.baseAlpha = rand(0.15, 0.45);
        p.sizeMul = rand(0.3, 0.55);
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.03, 0.98); p.hy = H * rand(0.05, 0.95);
        p.baseAlpha = rand(0.03, 0.12); p.sizeMul = rand(0.4, 1.2);
      }
    });
  };

  layouts.speak = function () {
    stage = { x: W * (isMobile ? 0.5 : 0.72), y: H * (isMobile ? 0.18 : 0.24) };
    waveT0 = performance.now() + 800;
    var rowN = 7;
    P.forEach(function (p) {
      if (p.seed < 0.08) {
        p.mode = 'stage';
        p.hx = stage.x + rand(-8, 8);
        p.hy = stage.y + rand(-6, 6);
        p.baseAlpha = rand(0.5, 1);
        p.sizeMul = rand(0.5, 1.1);
      } else if (p.seed < 0.86) {
        p.mode = 'aud';
        var row = Math.floor((p.seed - 0.08) / 0.78 * rowN);
        var rr = (0.16 + row * 0.075) * Math.min(W * 0.5, H * 1.1);
        var a = isMobile ? rand(Math.PI * 0.15, Math.PI * 0.85)
                         : rand(Math.PI * 0.42, Math.PI * 0.97);
        p.r = rr;
        p.hx = stage.x + Math.cos(a) * rr * 1.25;
        p.hy = stage.y + Math.sin(a) * rr;
        p.baseAlpha = rand(0.10, 0.30);
        p.sizeMul = rand(0.4, 0.75);
      } else {
        p.mode = 'spark';
        p.hx = stage.x + rand(-30, 30);
        p.hy = stage.y - rand(0, H * 0.16);
        p.speed = rand(0.008, 0.02);
        p.baseAlpha = rand(0.1, 0.4);
        p.sizeMul = rand(0.3, 0.6);
      }
    });
  };

  layouts.contact = function () {
    flameC = {
      x: W * (isMobile ? 0.5 : 0.84),
      y: H * (isMobile ? 0.82 : 0.56),
      r: Math.min(W, H) * 0.085
    };
    P.forEach(function (p) {
      if (p.seed < 0.55) {
        p.mode = 'flame';
        var a = rand(0, Math.PI * 2), d = Math.pow(Math.random(), 1.6);
        p.fa = a; p.fd = d;
        p.baseAlpha = (1 - d) * rand(0.5, 1);
        p.sizeMul = rand(0.4, 0.9);
      } else if (p.seed < 0.85) {
        p.mode = 'halo';
        p.r = flameC.r * rand(2.4, 3.4);
        p.baseAlpha = rand(0.05, 0.18);
        p.sizeMul = rand(0.4, 0.8);
        p.speed = rand(0.5, 1) * (p.seed < 0.7 ? 1 : -1);
      } else {
        p.mode = 'spark';
        p.hx = flameC.x + rand(-flameC.r, flameC.r);
        p.hy = flameC.y - rand(0, H * 0.3);
        p.speed = rand(0.004, 0.012);
        p.baseAlpha = rand(0.05, 0.22);
        p.sizeMul = rand(0.3, 0.6);
      }
    });
  };

  layouts.photo = function () {
    var fw = isMobile ? W * 0.86 : Math.min(W * 0.42, H * 1.05);
    var fh = fw / 1.5;
    var cx = isMobile ? W * 0.5 : W * 0.68;
    var cy = isMobile ? H * 0.72 : H * 0.5;
    photo = {
      x0: cx - fw / 2, y0: cy - fh / 2, x1: cx + fw / 2, y1: cy + fh / 2,
      cx: cx, cy: cy, r: fh * 0.30,
      focusPts: [], fi: 0, fj: 1, fT0: performance.now() + 1200,
      moving: false, mT0: performance.now()
    };
    var xs = [photo.x0 + fw / 3, photo.x0 + fw * 2 / 3];
    var ys = [photo.y0 + fh / 3, photo.y0 + fh * 2 / 3];
    xs.forEach(function (x) { ys.forEach(function (y) { photo.focusPts.push([x, y]); }); });
    var BLADES = 7;
    P.forEach(function (p, i) {
      if (p.seed < 0.55) {
        p.mode = 'iris';
        p.blade = i % BLADES;
        p.u = p.seed / 0.55;
        p.baseAlpha = rand(0.35, 0.9);
        p.sizeMul = rand(0.35, 0.65);
      } else if (p.seed < 0.80) {
        p.mode = 'bokeh';
        p.hx = rand(photo.x0 - fw * 0.15, photo.x1 + fw * 0.15);
        p.hy = rand(photo.y0 - fh * 0.1, photo.y1 + fh * 0.1);
        p.baseAlpha = rand(0.04, 0.13);
        p.sizeMul = rand(2.0, 4.0);
        p.speed = rand(0.2, 0.7);
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.03, 0.98); p.hy = H * rand(0.05, 0.95);
        p.baseAlpha = rand(0.03, 0.10); p.sizeMul = rand(0.4, 1.0);
      }
    });
  };

  layouts.tbanan = function () {
    // sample a bold T glyph, the tunnelbana signature
    var S = 200, off = document.createElement('canvas');
    off.width = off.height = S;
    var oc = off.getContext('2d');
    oc.fillStyle = '#fff';
    oc.font = '700 150px "Hanken Grotesk", "Helvetica Neue", Arial, sans-serif';
    oc.textAlign = 'center'; oc.textBaseline = 'middle';
    oc.fillText('T', S / 2, S / 2 + 6);
    var data = oc.getImageData(0, 0, S, S).data;
    var pts = [];
    for (var y = 0; y < S; y += 2) {
      for (var x = 0; x < S; x += 2) {
        if (data[(y * S + x) * 4 + 3] > 120) pts.push([x / S, y / S]);
      }
    }
    var box = Math.min(W, H) * (isMobile ? 0.5 : 0.42);
    var cx = isMobile ? W * 0.5 : W * 0.7;
    var cy = isMobile ? H * 0.32 : H * 0.45;
    tGlyph = { cx: cx, cy: cy, r: box * 0.72 };
    P.forEach(function (p) {
      if (p.seed < 0.6 && pts.length) {
        p.mode = 'glyph';
        var q = pts[Math.floor(p.seed / 0.6 * (pts.length - 1))];
        p.hx = cx - box / 2 + q[0] * box + rand(-1.5, 1.5);
        p.hy = cy - box / 2 + q[1] * box + rand(-1.5, 1.5);
        p.baseAlpha = rand(0.45, 0.95);
        p.sizeMul = rand(0.35, 0.6);
      } else {
        p.mode = 'dust';
        p.hx = W * rand(0.02, 0.98); p.hy = H * rand(0.04, 0.96);
        p.baseAlpha = rand(0.04, 0.16); p.sizeMul = rand(0.4, 1.4);
      }
    });
  };

  function layoutScene(name) {
    if (layouts[name]) layouts[name]();
  }

  // ---------- Per-frame targets ----------
  function targets(t, dt) {
    if (logoPhase === 'assemble' || logoPhase === 'hold') {
      var el = t - logoT0;
      if (logoPhase === 'assemble' && el > 1500) logoPhase = 'hold';
      if (logoPhase === 'hold' && el > 3300) {
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

    if (sceneName === 'constellation') {
      P.forEach(function (p) {
        p.tx = p.hx + Math.sin(t * 0.0003 * p.speed + p.phase) * 9;
        p.ty = p.hy + Math.cos(t * 0.00024 * p.speed + p.phase * 1.7) * 7;
        p.alpha = p.baseAlpha * (0.8 + 0.2 * Math.sin(t * 0.0012 + p.phase));
      });
    } else if (sceneName === 'ai') {
      P.forEach(function (p) {
        p.hy += p.speed * 1.4;
        if (p.hy > H * 1.15) p.hy = -H * 0.15;
        p.tx = p.hx; p.ty = p.hy;
        p.alpha = p.baseAlpha * (0.45 + 0.55 * Math.sin(t * 0.0022 * p.speed + p.phase));
      });
    } else if (sceneName === 'cloud') {
      if (t > nextFlight && sceneFade > 0.7) {
        var counts = new Array(slots.length).fill(0);
        P.forEach(function (p) { if (p.mode === 'srv' && !p.flying) counts[p.slot]++; });
        var rich = [];
        counts.forEach(function (c, i) { if (c >= 5) rich.push(i); });
        if (rich.length) {
          var src = rich[Math.floor(rand(0, rich.length))];
          var best = -1, bestC = Infinity;
          for (var k = 0; k < 5; k++) {
            var cand = Math.floor(rand(0, slots.length));
            if (slots[cand].rack === slots[src].rack) continue;
            if (counts[cand] < bestC) { bestC = counts[cand]; best = cand; }
          }
          if (best >= 0) {
            var path = makePath(slots[src], slots[best]);
            var portion = rand(0.7, 1.01);
            var moved = 0;
            P.forEach(function (p) {
              if (p.mode === 'srv' && !p.flying && p.slot === src && Math.random() < portion) {
                p.flying = true;
                p.f0 = t + rand(0, 260);
                p.fdur = rand(650, 950);
                p.path = path;
                p.dst = best;
                p.pox = rand(-5, 5); p.poy = rand(-4, 4);
                moved++;
              }
            });
            if (moved > 0) traces.push({ path: path, t0: t, dur: 1100 });
          }
        }
        nextFlight = t + rand(1700, 3400);
      }
      P.forEach(function (p) {
        if (p.mode === 'srv') {
          if (p.flying) {
            var ft = (t - p.f0) / p.fdur;
            if (ft >= 1) {
              p.flying = false; p.slot = p.dst; homeInSlot(p);
              p.x = p.hx + rand(-2, 2); p.y = p.hy + rand(-2, 2);
            } else if (ft > 0) {
              var pos = bezier(p.path, easeInOut(ft));
              p.tx = pos[0] + p.pox; p.ty = pos[1] + p.poy;
              p.alpha = Math.min(1, p.baseAlpha * 1.6);
              return;
            }
          }
          p.tx = p.hx + Math.sin(t * 0.0016 * p.speed + p.phase) * 1.6;
          p.ty = p.hy + Math.cos(t * 0.0013 * p.speed + p.phase) * 1.2;
          p.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.0012 * p.speed + p.phase));
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 6;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });
    } else if (sceneName === 'gantt') {
      P.forEach(function (p) {
        var pulse = ((t * 0.0001) % 1.4) - 0.2;
        var dx = Math.abs(p.hx / W - pulse);
        p.tx = p.hx; p.ty = p.hy;
        p.alpha = p.baseAlpha * (0.4 + (dx < 0.09 ? (1 - dx / 0.09) * 0.8 : 0));
        if (p.milestone) p.alpha = Math.max(p.alpha, 0.95);
      });
    } else if (sceneName === 'route') {
      if (routeAuto) {
        var idx = Math.floor((t - routeAutoT0) / 3400) % route.wps.length;
        if (idx !== routeActive && idx >= 0) { routeActive = idx; routePulseT0 = t; }
      }
      P.forEach(function (p) {
        if (p.mode === 'wp') {
          var c = route.pts[p.wp];
          var th = p.phase + t * 0.00025 * p.speed;
          var active = p.wp === routeActive ? 1 : 0;
          p.tx = c[0] + Math.cos(th) * p.r;
          p.ty = c[1] + Math.sin(th) * p.r * 0.75;
          p.alpha = p.baseAlpha * (0.45 + 0.55 * active)
            + active * 0.15 * Math.sin(t * 0.002 + p.phase);
        } else if (p.mode === 'trav') {
          p.s += p.speed * dt;
          if (p.s > 1) p.s = 0;
          var pos = bezier(route.path, p.s);
          p.tx = pos[0]; p.ty = pos[1];
          var edge = Math.min(p.s, 1 - p.s);
          p.alpha = p.baseAlpha * Math.min(1, edge * 8);
        } else {
          p.tx = p.hx; p.ty = p.hy;
          p.alpha = p.baseAlpha;
        }
      });
    } else if (sceneName === 'speak') {
      var wSpeed = 0.14 * Math.min(W * 0.5, H * 1.1) / 1000;
      var maxR = 0.72 * Math.min(W * 0.5, H * 1.1);
      var wR = -1;
      if (t > waveT0) {
        wR = (t - waveT0) * wSpeed;
        if (wR > maxR * 1.3) { waveT0 = t + rand(1800, 3600); }
      }
      P.forEach(function (p) {
        if (p.mode === 'stage') {
          p.tx = p.hx + rand(-0.6, 0.6); p.ty = p.hy + rand(-0.6, 0.6);
          p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.003 + p.phase));
        } else if (p.mode === 'aud') {
          p.tx = p.hx + Math.sin(t * 0.0004 * p.speed + p.phase) * 2;
          p.ty = p.hy + Math.cos(t * 0.0003 + p.phase) * 1.5;
          var boost = 0;
          if (wR > 0) {
            var d = Math.abs(p.r - wR) / (maxR * 0.09);
            boost = Math.exp(-d * d) * 0.75;
          }
          p.alpha = p.baseAlpha + boost;
        } else {
          p.hy -= p.speed * dt;
          if (p.hy < stage.y - H * 0.2) p.hy = stage.y;
          p.tx = p.hx + Math.sin(t * 0.001 + p.phase) * 4;
          p.ty = p.hy;
          var h = (stage.y - p.hy) / (H * 0.2);
          p.alpha = p.baseAlpha * Math.max(0, 1 - h);
        }
      });
    } else if (sceneName === 'contact') {
      P.forEach(function (p) {
        if (p.mode === 'flame') {
          var flick = 1 + 0.16 * Math.sin(t * 0.004 + p.phase) * p.fd;
          var breathe = 0.8 + 0.2 * Math.sin(t * 0.0008);
          p.tx = flameC.x + Math.cos(p.fa + Math.sin(t * 0.0006 + p.phase) * 0.2) * p.fd * flameC.r * 0.8 * flick;
          p.ty = flameC.y + Math.sin(p.fa) * p.fd * flameC.r * 1.5 * flick - (1 - p.fd) * 4;
          p.alpha = p.baseAlpha * breathe;
        } else if (p.mode === 'halo') {
          var th = p.phase + t * 0.00009 * p.speed;
          p.tx = flameC.x + Math.cos(th) * p.r * 1.15;
          p.ty = flameC.y + Math.sin(th) * p.r * 0.72;
          p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.0007 + p.phase));
        } else {
          p.hy -= p.speed * dt;
          if (p.hy < flameC.y - H * 0.34) p.hy = flameC.y - rand(0, 20);
          p.tx = p.hx + Math.sin(t * 0.0008 + p.phase) * 5;
          p.ty = p.hy;
          var h = (flameC.y - p.hy) / (H * 0.34);
          p.alpha = p.baseAlpha * Math.max(0, 1 - h);
        }
      });
    } else if (sceneName === 'photo') {
      var BLADES = 7;
      var rot = t * 0.00006;
      var breatheP = 1 + 0.13 * Math.sin(t * 0.0005);
      var R = photo.r * breatheP;
      if (!photo.moving && t > photo.fT0) {
        photo.moving = true; photo.mT0 = t;
        photo.fi = photo.fj;
        var nj = Math.floor(rand(0, photo.focusPts.length));
        if (nj === photo.fi) nj = (nj + 1) % photo.focusPts.length;
        photo.fj = nj;
      }
      if (photo.moving && t - photo.mT0 > 700) {
        photo.moving = false; photo.fT0 = t + rand(2200, 3800);
      }
      P.forEach(function (p) {
        if (p.mode === 'iris') {
          var a0 = rot + p.blade * Math.PI * 2 / BLADES;
          var a1 = rot + (p.blade + 1.55) * Math.PI * 2 / BLADES;
          var e0x = photo.cx + Math.cos(a0) * R, e0y = photo.cy + Math.sin(a0) * R;
          var e1x = photo.cx + Math.cos(a1) * R, e1y = photo.cy + Math.sin(a1) * R;
          p.tx = e0x + (e1x - e0x) * p.u;
          p.ty = e0y + (e1y - e0y) * p.u;
          p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.0015 + p.phase));
        } else if (p.mode === 'bokeh') {
          p.tx = p.hx + Math.sin(t * 0.00013 * p.speed + p.phase) * 16;
          p.ty = p.hy + Math.cos(t * 0.0001 * p.speed + p.phase * 1.6) * 12;
          p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.0006 + p.phase));
        } else {
          p.tx = p.hx; p.ty = p.hy;
          p.alpha = p.baseAlpha;
        }
      });
    } else if (sceneName === 'tbanan') {
      P.forEach(function (p) {
        if (p.mode === 'glyph') {
          p.tx = p.hx + Math.sin(t * 0.0005 * p.speed + p.phase) * 1.6;
          p.ty = p.hy + Math.cos(t * 0.0004 + p.phase) * 1.3;
          p.alpha = p.baseAlpha * (0.75 + 0.25 * Math.sin(t * 0.0014 + p.phase));
        } else {
          p.tx = p.hx + Math.sin(t * 0.0002 * p.speed + p.phase) * 7;
          p.ty = p.hy + Math.cos(t * 0.00016 + p.phase) * 5;
          p.alpha = p.baseAlpha;
        }
      });
    } else {
      // unknown scene: hold positions, dim
      P.forEach(function (p) { p.tx = p.x; p.ty = p.y; p.alpha = 0; });
    }
  }

  // ---------- Structural line work ----------
  function drawStructure(t) {
    ctx.lineWidth = 0.6;
    if (sceneName === 'constellation' && logoPhase === 'off' && sceneFade > 0.05) {
      links.forEach(function (pair) {
        var a = P[pair[0]], b = P[pair[1]];
        var al = 0.10 * sceneFade * Math.min(a.alpha, b.alpha);
        ctx.strokeStyle = (a.ember && b.ember)
          ? 'rgba(255,100,50,' + (al * 1.6) + ')'
          : 'rgba(200,200,215,' + al + ')';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
    }
    if (sceneName === 'cloud' && sceneFade > 0.05) {
      racks.forEach(function (rk) {
        ctx.strokeStyle = 'rgba(200,200,215,' + (0.10 * sceneFade) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(rk.x - rk.w / 2, rk.y0, rk.w, rk.y1 - rk.y0, 4);
        ctx.stroke();
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = 'rgba(200,200,215,' + (0.045 * sceneFade) + ')';
        for (var u = 1; u < rk.units; u++) {
          var y = rk.y0 + u * (rk.y1 - rk.y0) / rk.units;
          ctx.beginPath();
          ctx.moveTo(rk.x - rk.w / 2 + 3, y); ctx.lineTo(rk.x + rk.w / 2 - 3, y);
          ctx.stroke();
        }
      });
      traces = traces.filter(function (tr) { return t - tr.t0 < tr.dur + 2600; });
      ctx.lineWidth = 0.8;
      traces.forEach(function (tr) {
        var SEG = 28;
        var prev = bezier(tr.path, 0);
        for (var i = 1; i <= SEG; i++) {
          var si = i / SEG;
          var pt = bezier(tr.path, si);
          var revealAt = tr.t0 + easeInOutInv(si) * tr.dur;
          var age = t - revealAt;
          if (age > 0) {
            var al = Math.max(0, 1 - age / 2200) * 0.20 * sceneFade;
            if (al > 0.004) {
              ctx.strokeStyle = 'rgba(255,77,28,' + al + ')';
              ctx.beginPath();
              ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pt[0], pt[1]);
              ctx.stroke();
            }
          }
          prev = pt;
        }
      });
    }
    if (sceneName === 'gantt' && sceneFade > 0.05) {
      ganttBars.forEach(function (b) {
        ctx.strokeStyle = b.ember
          ? 'rgba(255,77,28,' + (0.28 * sceneFade) + ')'
          : 'rgba(200,200,215,' + (0.07 * sceneFade) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(b.x0 - 6, b.y - 4, (b.x1 - b.x0) + 12, 8, 3);
        ctx.stroke();
      });
      var tx = W * (0.15 + 0.6 * ((t * 0.00003) % 1));
      var g = ctx.createLinearGradient(0, H * 0.08, 0, H * 0.92);
      g.addColorStop(0, 'rgba(255,77,28,0)');
      g.addColorStop(0.5, 'rgba(255,77,28,' + (0.20 * sceneFade) + ')');
      g.addColorStop(1, 'rgba(255,77,28,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx, H * 0.08); ctx.lineTo(tx, H * 0.92); ctx.stroke();
    }
    if (sceneName === 'route' && sceneFade > 0.05 && route) {
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.09 * sceneFade) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(route.path.p0[0], route.path.p0[1]);
      ctx.bezierCurveTo(route.path.c0[0], route.path.c0[1],
        route.path.c1[0], route.path.c1[1], route.path.p1[0], route.path.p1[1]);
      ctx.stroke();
      ctx.font = '9px "JetBrains Mono", Menlo, monospace';
      route.pts.forEach(function (pt, i) {
        var active = i === routeActive;
        var g = ctx.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], active ? 40 : 22);
        var al = active ? 0.16 : 0.06;
        g.addColorStop(0, 'rgba(255,77,28,' + (al * sceneFade) + ')');
        g.addColorStop(1, 'rgba(255,77,28,0)');
        ctx.fillStyle = g;
        ctx.fillRect(pt[0] - 40, pt[1] - 40, 80, 80);
        ctx.fillStyle = 'rgba(200,200,215,' + ((active ? 0.5 : 0.25) * sceneFade) + ')';
        ctx.fillText(route.years[i], pt[0] - 12, pt[1] + 34);
      });
      if (routePulseT0) {
        var el = t - routePulseT0;
        if (el < 900) {
          var pt2 = route.pts[routeActive];
          var rr = 10 + el * 0.05;
          ctx.strokeStyle = 'rgba(255,77,28,' + (0.30 * (1 - el / 900) * sceneFade) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(pt2[0], pt2[1], rr, rr * 0.75, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    if (sceneName === 'speak' && sceneFade > 0.05 && stage) {
      var g2 = ctx.createRadialGradient(stage.x, stage.y, 0, stage.x, stage.y, 90);
      g2.addColorStop(0, 'rgba(245,166,35,' + (0.10 * sceneFade) + ')');
      g2.addColorStop(1, 'rgba(245,166,35,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(stage.x - 90, stage.y - 90, 180, 180);
    }
    if (sceneName === 'contact' && sceneFade > 0.05 && flameC) {
      var breathe2 = 0.8 + 0.2 * Math.sin(t * 0.0008);
      var g3 = ctx.createRadialGradient(flameC.x, flameC.y, 0, flameC.x, flameC.y, flameC.r * 3.4);
      g3.addColorStop(0, 'rgba(245,166,35,' + (0.13 * breathe2 * sceneFade) + ')');
      g3.addColorStop(0.4, 'rgba(255,77,28,' + (0.05 * breathe2 * sceneFade) + ')');
      g3.addColorStop(1, 'rgba(255,77,28,0)');
      ctx.fillStyle = g3;
      var R3 = flameC.r * 3.4;
      ctx.fillRect(flameC.x - R3, flameC.y - R3, R3 * 2, R3 * 2);
    }
    if (sceneName === 'photo' && sceneFade > 0.05 && photo) {
      var L = 20;
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.16 * sceneFade) + ')';
      ctx.lineWidth = 1.2;
      [[photo.x0, photo.y0, 1, 1], [photo.x1, photo.y0, -1, 1],
       [photo.x0, photo.y1, 1, -1], [photo.x1, photo.y1, -1, -1]].forEach(function (c) {
        ctx.beginPath();
        ctx.moveTo(c[0] + c[2] * L, c[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0], c[1] + c[3] * L);
        ctx.stroke();
      });
      ctx.strokeStyle = 'rgba(200,200,215,' + (0.035 * sceneFade) + ')';
      ctx.lineWidth = 0.5;
      var fw = photo.x1 - photo.x0, fh = photo.y1 - photo.y0;
      [1, 2].forEach(function (i) {
        ctx.beginPath();
        ctx.moveTo(photo.x0 + fw * i / 3, photo.y0); ctx.lineTo(photo.x0 + fw * i / 3, photo.y1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(photo.x0, photo.y0 + fh * i / 3); ctx.lineTo(photo.x1, photo.y0 + fh * i / 3);
        ctx.stroke();
      });
      var a4 = photo.focusPts[photo.fi], b4 = photo.focusPts[photo.fj];
      var fx = b4[0], fy = b4[1], pulse4 = 1, lockAl = 0.4;
      if (photo.moving) {
        var mt = easeInOut(Math.min(1, (t - photo.mT0) / 700));
        fx = a4[0] + (b4[0] - a4[0]) * mt;
        fy = a4[1] + (b4[1] - a4[1]) * mt;
        lockAl = 0.22;
      } else {
        var since = t - (photo.mT0 + 700);
        pulse4 = 1 + 0.35 * Math.max(0, 1 - since / 320);
      }
      var s4 = 11 * pulse4;
      ctx.strokeStyle = 'rgba(255,77,28,' + (lockAl * sceneFade) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(fx - s4, fy - s4, s4 * 2, s4 * 2, 2);
      ctx.stroke();
      var g4 = ctx.createRadialGradient(fx, fy, 0, fx, fy, 34);
      g4.addColorStop(0, 'rgba(255,77,28,' + (0.10 * sceneFade) + ')');
      g4.addColorStop(1, 'rgba(255,77,28,0)');
      ctx.fillStyle = g4;
      ctx.fillRect(fx - 34, fy - 34, 68, 68);
    }
    if (sceneName === 'tbanan' && sceneFade > 0.05 && tGlyph) {
      ctx.strokeStyle = 'rgba(255,77,28,' + (0.22 * sceneFade) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(tGlyph.cx, tGlyph.cy, tGlyph.r, 0, Math.PI * 2);
      ctx.stroke();
    }
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
      var k = assembling ? p.k * 1.7
        : (sceneName === 'cloud' && p.flying) ? 0.5 : p.k;
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
      var s = p.size * 4.6 * p.sizeMul;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.drawImage(p.sprite, p.x - s / 2, p.y - s / 2, s, s);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function staticFrame() {
    // reduced motion: one composed still, no animation
    targets(0, 16);
    P.forEach(function (p) { p.x = p.tx; p.y = p.ty; });
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    sceneFade = 1;
    drawStructure(0);
    P.forEach(function (p) {
      var s = p.size * 4.6 * p.sizeMul;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
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

  // ---------- Route waypoint sync with case cards ----------
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-waypoint]'));
  function setWaypoint(i) {
    routeAuto = false;
    if (i !== routeActive) {
      routeActive = i;
      routePulseT0 = performance.now();
      if (reducedMotion && sceneName === 'route') staticFrame();
    }
    cards.forEach(function (c) {
      c.classList.toggle('mk-case--active', +c.getAttribute('data-waypoint') === i);
    });
  }
  if (cards.length && 'IntersectionObserver' in window) {
    var cardObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setWaypoint(+e.target.getAttribute('data-waypoint'));
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    cards.forEach(function (c) { cardObs.observe(c); });
  }

  window.mkCanvas = { setScene: setScene, setWaypoint: setWaypoint };

  // ---------- Resize ----------
  function resize() {
    isMobile = window.matchMedia('(max-width: 720px)').matches;
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
    if (sceneName) layoutScene(sceneName);
    if (logoPhase !== 'off') startIntroPositions();
    if (reducedMotion && sceneName) staticFrame();
  }
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

  var introRequested = false;
  if (first && first.hasAttribute('data-intro') && !reducedMotion) {
    var seen = null;
    try { seen = sessionStorage.getItem('mk-intro'); } catch (e) { seen = '1'; }
    if (!seen && window.scrollY < window.innerHeight * 0.3) {
      introRequested = true;
      wantIntro = true;
      if (logoPts) startIntro();
    }
  }
  start();
})();
