/* ============================================================
   MKLab Quiz: the game controller
   A host-driven game-show state machine. Nothing advances on its
   own; the countdown is pressure for the room, never a controller
   of state. Talks to the particle canvas through window.MKQuiz.
   No dependencies, no network after load.
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('mk-quiz');
  if (!root) return;

  // ---------- the bank ----------
  var BANK = {};
  try {
    BANK = JSON.parse(document.getElementById('mk-quiz-bank').textContent) || {};
  } catch (e) { BANK = {}; }
  var CAT_IDS = Object.keys(BANK).sort();

  var VALUES = [100, 200, 300, 400, 500];
  var MAX_TEAMS = 6;
  var MIN_TEAMS = 2;
  var CLOCK_MS = 10000;
  var STORE_KEY = 'mk-quiz-state-v1';

  var TEAM_COLORS = [
    'var(--q-team-1)', 'var(--q-team-2)', 'var(--q-team-3)',
    'var(--q-team-4)', 'var(--q-team-5)', 'var(--q-team-6)'
  ];
  var TEAM_HEX = ['#ffb02e', '#2f9bd8', '#4fb477', '#a24bd8', '#e8341c', '#d9b46a'];

  // ---------- strings ----------
  var S = {
    sv: {
      setupEyebrow: 'MKLab Quiz · steg 1 av 2',
      setupTitle: 'Vilka lag spelar?',
      setupLead: 'Namnge lagen. Två till sex stycken. Du kan ändra det här mitt i spelet också, poängen följer med.',
      addTeam: 'Lägg till lag',
      toPick: 'Vidare: välj kategorier',
      backToTeams: 'Tillbaka till lagen',
      pickEyebrow: 'MKLab Quiz · steg 2 av 2',
      pickTitle: 'Välj sex kategorier',
      play: 'Spela',
      cancel: 'Avbryt',
      sound: 'Ljud',
      editGame: 'Ändra',
      endGame: 'Avsluta',
      newGame: 'Nytt spel',
      allTalks: 'Alla tech talks',
      answerLabel: 'Svar',
      awardEyebrow: 'Vem tar poängen?',
      nobody: 'Ingen',
      podiumEyebrow: 'Slutresultat',
      winner: 'vinner',
      draw: 'Oavgjort',
      resumeEyebrow: 'Ett spel pågår',
      resumeTitle: 'Vill du fortsätta?',
      resumeYes: 'Fortsätt spelet',
      resumeNo: 'Börja om',
      revealAnswer: 'Klicka eller mellanslag för svaret',
      toAward: 'Klicka eller mellanslag för att dela ut poängen',
      teamCount: 'lag',
      picked: 'valda',
      removeTeamTitle: 'Ta bort laget?',
      removeTeamBody: 'Lagets poäng försvinner med det. Det går inte att ångra.',
      removeTeamYes: 'Ta bort laget',
      endGameTitle: 'Avsluta spelet nu?',
      endGameBody: 'Resultatet visas på prispallen. Korten som är kvar spelas inte.',
      endGameYes: 'Avsluta och visa resultat',
      resumeDetail: function (n, spent) {
        return n + ' lag, ' + spent + ' av 30 kort spelade.';
      },
      teamDefault: function (i) { return 'Lag ' + i; }
    },
    en: {
      setupEyebrow: 'MKLab Quiz · step 1 of 2',
      setupTitle: 'Which teams are playing?',
      setupLead: 'Name the teams. Two to six of them. You can change this mid-game too, and the scores come along.',
      addTeam: 'Add team',
      toPick: 'Next: pick categories',
      backToTeams: 'Back to teams',
      pickEyebrow: 'MKLab Quiz · step 2 of 2',
      pickTitle: 'Pick six categories',
      play: 'Play',
      cancel: 'Cancel',
      sound: 'Sound',
      editGame: 'Edit',
      endGame: 'End',
      newGame: 'New game',
      allTalks: 'All tech talks',
      answerLabel: 'Answer',
      awardEyebrow: 'Who takes the points?',
      nobody: 'Nobody',
      podiumEyebrow: 'Final score',
      winner: 'wins',
      draw: 'A draw',
      resumeEyebrow: 'A game is in progress',
      resumeTitle: 'Pick up where you left off?',
      resumeYes: 'Resume the game',
      resumeNo: 'Start over',
      revealAnswer: 'Click or press space for the answer',
      toAward: 'Click or press space to award the points',
      teamCount: 'teams',
      picked: 'picked',
      removeTeamTitle: 'Remove the team?',
      removeTeamBody: 'Its score goes with it. This cannot be undone.',
      removeTeamYes: 'Remove the team',
      endGameTitle: 'End the game now?',
      endGameBody: 'The result goes up on the podium. The remaining cards stay unplayed.',
      endGameYes: 'End and show the result',
      resumeDetail: function (n, spent) {
        return n + ' teams, ' + spent + ' of 30 cards played.';
      },
      teamDefault: function (i) { return 'Team ' + i; }
    }
  };
  function t(key) { return S[state.lang][key]; }

  // ---------- state ----------
  var state = null;
  var pickOrder = [];      // shuffled category ids for the pick screen
  var pickSel = [];        // ids selected on the pick screen
  var editing = false;     // true when reached from a game in progress
  var clockRAF = null;
  var clockStart = 0;

  function freshState() {
    return {
      lang: 'sv',
      sound: true,
      screen: 'setup',
      teams: [
        { id: 1, name: '', color: 0, score: 0 },
        { id: 2, name: '', color: 1, score: 0 }
      ],
      nextTeamId: 3,
      cats: [],
      draw: {},
      spent: [],
      current: null,
      phase: 'question'
    };
  }

  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* fine */ }
  }
  function load() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.teams) return null;
      return s;
    } catch (e) { return null; }
  }
  function clearSaved() {
    try { sessionStorage.removeItem(STORE_KEY); } catch (e) { /* fine */ }
  }

  // ---------- canvas bridge ----------
  window.MKQuiz = {
    scene: 'setup',
    teams: [],
    clock: 1,
    clockDone: false,
    burst: null,
    spent: 0,
    total: 30,
    picked: 0
  };
  function pushCanvas() {
    var q = window.MKQuiz;
    q.teams = (state.teams || []).map(function (tm, i) {
      return { name: teamName(tm, i), hex: TEAM_HEX[tm.color % TEAM_HEX.length], score: tm.score };
    });
    q.spent = (state.spent || []).length;
    q.picked = pickSel.length;
  }
  function setScene(name) {
    window.MKQuiz.scene = name;
    window.dispatchEvent(new CustomEvent('mk-scene', { detail: name }));
  }

  // ---------- helpers ----------
  function el(id) { return document.getElementById(id); }
  function teamName(tm, i) {
    return (tm.name && tm.name.trim()) || S[state.lang].teamDefault(i + 1);
  }
  function catName(id) {
    var c = BANK[id];
    return c ? (c.name[state.lang] || c.name.en) : id;
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function drawFor(catId) {
    var qs = BANK[catId].questions;
    return VALUES.map(function (v) {
      var pool = [];
      for (var i = 0; i < qs.length; i++) if (qs[i].value === v) pool.push(i);
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : -1;
    });
  }
  function questionAt(catId, value) {
    var vi = VALUES.indexOf(value);
    var idx = state.draw[catId] && state.draw[catId][vi];
    if (idx === undefined || idx < 0) return null;
    return BANK[catId].questions[idx];
  }
  function isSpent(catId, value) {
    return state.spent.indexOf(catId + ':' + value) !== -1;
  }

  // ---------- sound ----------
  var actx = null;
  function audio() {
    if (!state.sound) return null;
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, dur, type, gain, when, sweepTo) {
    var a = audio(); if (!a) return;
    var t0 = a.currentTime + (when || 0);
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, gain) {
    var a = audio(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur);
    var buf = a.createBuffer(1, n, a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = a.createBufferSource(); src.buffer = buf;
    var f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100;
    var g = a.createGain(); g.gain.value = gain || 0.07;
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start();
  }
  var SFX = {
    flip:   function () { noise(0.26, 0.09); tone(180, 0.22, 'sine', 0.05, 0, 90); },
    tick:   function (urgent) { tone(urgent ? 1500 : 1050, 0.045, 'square', urgent ? 0.075 : 0.04); },
    reveal: function () { tone(330, 0.5, 'sine', 0.10, 0, 220); tone(440, 0.55, 'triangle', 0.06, 0.02); },
    award:  function (value) {
      var base = 300 + (value / 100) * 55;
      tone(base, 0.16, 'triangle', 0.10);
      tone(base * 1.5, 0.24, 'sine', 0.08, 0.09);
      tone(base * 2, 0.34, 'sine', 0.06, 0.18);
    },
    flap:   function () { noise(0.045, 0.05); },
    none:   function () { tone(200, 0.28, 'sawtooth', 0.05, 0, 120); },
    fanfare: function () {
      [0, 0.13, 0.26, 0.42].forEach(function (w, i) {
        tone([392, 494, 587, 784][i], i === 3 ? 0.9 : 0.2, 'triangle', 0.11, w);
      });
    }
  };

  // ---------- split-flap ----------
  function digitsFor(value) {
    var neg = value < 0;
    var s = String(Math.abs(value));
    while (s.length < 4) s = '0' + s;
    return (neg ? '-' : '') + s;
  }
  function buildFlaps(container, str) {
    container.innerHTML = '';
    for (var i = 0; i < str.length; i++) {
      var f = document.createElement('div');
      f.className = 'q-flap';
      f.dataset.d = str[i];
      f.innerHTML =
        '<div class="q-flap__half q-flap__half--top"><span>' + str[i] + '</span></div>' +
        '<div class="q-flap__half q-flap__half--bottom"><span>' + str[i] + '</span></div>';
      container.appendChild(f);
    }
  }
  function setFlapStatic(flap, ch) {
    flap.querySelector('.q-flap__half--top span').textContent = ch;
    flap.querySelector('.q-flap__half--bottom span').textContent = ch;
    flap.dataset.d = ch;
  }
  // one physical flip: cur tumbles away, next drops in
  function flipOnce(flap, next, done) {
    var cur = flap.dataset.d;
    flap.querySelector('.q-flap__half--top span').textContent = next;
    flap.querySelector('.q-flap__half--bottom span').textContent = cur;

    var fold = document.createElement('div');
    fold.className = 'q-flap__leaf q-flap__leaf--fold';
    fold.innerHTML = '<span>' + cur + '</span>';
    var unfold = document.createElement('div');
    unfold.className = 'q-flap__leaf q-flap__leaf--unfold';
    unfold.innerHTML = '<span>' + next + '</span>';
    flap.appendChild(fold);
    flap.appendChild(unfold);
    SFX.flap();

    setTimeout(function () {
      if (fold.parentNode) fold.parentNode.removeChild(fold);
      if (unfold.parentNode) unfold.parentNode.removeChild(unfold);
      setFlapStatic(flap, next);
      if (done) done();
    }, 265);
  }
  // roll a digit through the wheel until it reads target
  function rollFlap(flap, target) {
    var seq = [];
    var cur = flap.dataset.d;
    if (cur === target) return;
    if (cur === '-' || target === '-') { seq = [target]; }
    else {
      var c = parseInt(cur, 10), tg = parseInt(target, 10), guard = 0;
      while (c !== tg && guard++ < 12) { c = (c + 1) % 10; seq.push(String(c)); }
    }
    var i = 0;
    (function step() {
      if (i >= seq.length) return;
      flipOnce(flap, seq[i++], step);
    })();
  }
  function setScore(container, value) {
    var str = digitsFor(value);
    if (container.children.length !== str.length) { buildFlaps(container, str); return; }
    for (var i = 0; i < str.length; i++) rollFlap(container.children[i], str[i]);
  }

  // ---------- i18n paint ----------
  function paintStrings() {
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute('data-i18n');
      if (S[state.lang][k] !== undefined) nodes[i].textContent = S[state.lang][k];
    }
    el('q-lang').textContent = state.lang.toUpperCase();
    el('q-sound').classList.toggle('is-off', !state.sound);
    document.documentElement.lang = state.lang;
  }

  // ---------- screens ----------
  var SCREENS = ['setup', 'pick', 'board', 'question', 'award', 'podium'];
  function show(name) {
    state.screen = name;
    SCREENS.forEach(function (s) {
      var node = el('scr-' + s);
      if (!node) return;
      if (s === name) {
        node.classList.add('is-active');
        requestAnimationFrame(function () { node.classList.add('is-shown'); });
      } else {
        node.classList.remove('is-active', 'is-shown');
      }
    });
    var inGame = state.cats.length === 6 && (name === 'board' || name === 'question' || name === 'award');
    el('q-edit').hidden = !inGame;
    el('q-end').hidden = !inGame;
    el('q-setup-cancel').hidden = !editing;
    el('q-pick-cancel').hidden = !editing;
    // push state to the canvas BEFORE announcing the scene: the scene's layout
    // reads teams and scores, and would otherwise lay out against stale data
    pushCanvas();
    setScene(name === 'question' && state.phase === 'answer' ? 'answer' : name);
    save();
  }

  // ---------- SETUP ----------
  function renderSetup() {
    var wrap = el('q-teams-edit');
    wrap.innerHTML = '';
    state.teams.forEach(function (tm, i) {
      var row = document.createElement('div');
      row.className = 'q-team-row';

      var sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'q-swatch';
      sw.style.background = TEAM_COLORS[tm.color % TEAM_COLORS.length];
      sw.title = 'Colour';
      sw.addEventListener('click', function () {
        tm.color = (tm.color + 1) % TEAM_COLORS.length;
        renderSetup(); pushCanvas(); save();
      });

      var input = document.createElement('input');
      input.type = 'text';
      input.value = tm.name;
      input.placeholder = S[state.lang].teamDefault(i + 1);
      input.maxLength = 24;
      input.addEventListener('input', function () {
        tm.name = input.value; pushCanvas(); save();
      });

      row.appendChild(sw);
      row.appendChild(input);

      if (editing && tm.score) {
        var sc = document.createElement('span');
        sc.className = 'q-team-score';
        sc.textContent = tm.score;
        row.appendChild(sc);
      }

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'q-team-del';
      del.textContent = '×';
      del.disabled = state.teams.length <= MIN_TEAMS;
      del.style.visibility = state.teams.length <= MIN_TEAMS ? 'hidden' : 'visible';
      del.addEventListener('click', function () {
        if (tm.score) {
          confirmAsk(t('removeTeamTitle'), t('removeTeamBody'), t('removeTeamYes'), function () {
            state.teams = state.teams.filter(function (x) { return x.id !== tm.id; });
            renderSetup(); pushCanvas(); save();
          });
        } else {
          state.teams = state.teams.filter(function (x) { return x.id !== tm.id; });
          renderSetup(); pushCanvas(); save();
        }
      });
      row.appendChild(del);
      wrap.appendChild(row);
    });

    el('q-add-team').disabled = state.teams.length >= MAX_TEAMS;
    el('q-team-hint').textContent = state.teams.length + ' ' + t('teamCount');
  }

  // ---------- PICK ----------
  function renderPick() {
    var wrap = el('q-cats');
    wrap.innerHTML = '';
    pickOrder.forEach(function (id, i) {
      var c = BANK[id];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'q-cat';
      var sel = pickSel.indexOf(id);
      if (sel !== -1) b.classList.add('is-picked');
      else if (pickSel.length >= 6) b.classList.add('is-locked');
      b.innerHTML =
        '<span class="q-cat__tag q-cat__tag--' + (c.tag || 'anyone') + '"></span>' +
        '<span class="q-cat__num">' + (i + 1) + '</span>' +
        '<span class="q-cat__name">' + catName(id) + '</span>' +
        (sel !== -1 ? '<span class="q-cat__slot">' + (sel + 1) + '</span>' : '');
      b.addEventListener('click', function () {
        var at = pickSel.indexOf(id);
        if (at !== -1) pickSel.splice(at, 1);
        else if (pickSel.length < 6) { pickSel.push(id); SFX.flap(); }
        renderPick(); pushCanvas();
      });
      wrap.appendChild(b);
    });
    el('q-pick-count').textContent = pickSel.length + '/6 ' + t('picked');
    el('q-play').disabled = pickSel.length !== 6;
  }

  function enterPick() {
    if (!pickOrder.length) pickOrder = shuffle(CAT_IDS);
    if (!pickSel.length && state.cats.length) pickSel = state.cats.slice();
    renderPick();
    show('pick');
  }

  // Commit teams + categories. Kept columns survive intact; swapped ones reset.
  function commitGame() {
    var newDraw = {}, newSpent = [];
    pickSel.forEach(function (cid) {
      var kept = state.cats.indexOf(cid) !== -1 && state.draw[cid];
      if (kept) {
        newDraw[cid] = state.draw[cid];
        VALUES.forEach(function (v) {
          if (isSpent(cid, v)) newSpent.push(cid + ':' + v);
        });
      } else {
        newDraw[cid] = drawFor(cid);
      }
    });
    state.cats = pickSel.slice();
    state.draw = newDraw;
    state.spent = newSpent;
    editing = false;
    renderBoard();
    show('board');
  }

  // ---------- BOARD ----------
  function renderBoard() {
    var b = el('q-board');
    b.innerHTML = '';
    state.cats.forEach(function (cid) {
      var h = document.createElement('div');
      h.className = 'q-head';
      h.textContent = catName(cid);
      b.appendChild(h);
    });
    VALUES.forEach(function (v) {
      state.cats.forEach(function (cid) {
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'q-cell';
        c.textContent = v;
        if (isSpent(cid, v)) {
          c.classList.add('is-spent');
          c.setAttribute('aria-hidden', 'true');
        } else {
          c.addEventListener('click', function () { openCard(cid, v, c); });
        }
        b.appendChild(c);
      });
    });
    renderScores(el('q-scores'));
    renderScores(el('q-scores-q'));
  }

  function renderScores(wrap) {
    if (!wrap) return;
    var best = Math.max.apply(null, state.teams.map(function (x) { return x.score; }));
    wrap.innerHTML = '';
    state.teams.forEach(function (tm, i) {
      var hex = TEAM_HEX[tm.color % TEAM_HEX.length];
      var box = document.createElement('div');
      box.className = 'q-score' + (tm.score === best && best !== 0 ? ' is-leader' : '');
      box.style.setProperty('--team-color', hex);

      var nm = document.createElement('div');
      nm.className = 'q-score__name';
      nm.textContent = teamName(tm, i);

      var flaps = document.createElement('div');
      flaps.className = 'q-flaps';
      flaps.dataset.team = tm.id;
      buildFlaps(flaps, digitsFor(tm.score));
      flaps.addEventListener('click', function () { editScore(tm, flaps); });

      box.appendChild(nm);
      box.appendChild(flaps);
      wrap.appendChild(box);
    });
  }

  function updateScoreFlaps(teamId, value) {
    var nodes = document.querySelectorAll('.q-flaps[data-team="' + teamId + '"]');
    for (var i = 0; i < nodes.length; i++) setScore(nodes[i], value);
  }

  function editScore(tm, flaps) {
    if (flaps.querySelector('input')) return;
    var input = document.createElement('input');
    input.type = 'number';
    input.className = 'q-score__edit';
    input.value = tm.score;
    var prev = flaps.innerHTML;
    flaps.innerHTML = '';
    flaps.appendChild(input);
    input.focus();
    input.select();
    function commit(ok) {
      var v = parseInt(input.value, 10);
      if (ok && !isNaN(v)) {
        tm.score = Math.max(-99999, Math.min(99999, v));
        renderScores(el('q-scores'));
        renderScores(el('q-scores-q'));
        pushCanvas(); save();
        if (state.screen === 'award') renderAward();
      } else {
        flaps.innerHTML = prev;
      }
    }
    input.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') commit(true);
      if (e.key === 'Escape') commit(false);
    });
    input.addEventListener('blur', function () { commit(true); });
  }

  // ---------- QUESTION ----------
  function openCard(cid, value, cell) {
    var q = questionAt(cid, value);
    if (!q) return;
    state.current = { cat: cid, value: value };
    state.phase = 'question';

    el('q-flip-value').textContent = value;
    el('q-qcat').textContent = catName(cid);
    el('q-qval').textContent = value;
    el('q-question').textContent = q.q[state.lang] || q.q.en;
    el('q-answer-text').textContent = q.a[state.lang] || q.a.en;
    el('q-answer').hidden = true;
    el('q-advance').textContent = t('revealAnswer');

    var flip = el('q-flip');
    flip.classList.remove('is-flipped');
    show('question');
    SFX.flip();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { flip.classList.add('is-flipped'); });
    });
    startClock();
  }

  function startClock() {
    stopClock();
    clockStart = performance.now();
    var lastTick = -1;
    window.MKQuiz.clockDone = false;
    (function frame(now) {
      var p = Math.min(1, (now - clockStart) / CLOCK_MS);
      window.MKQuiz.clock = 1 - p;
      var sec = Math.ceil((1 - p) * 10);
      if (sec !== lastTick && sec >= 0 && state.phase === 'question') {
        lastTick = sec;
        if (sec < 10) SFX.tick(sec <= 3);
      }
      if (p >= 1) {
        window.MKQuiz.clockDone = true;
        clockRAF = null;
        return;
      }
      clockRAF = requestAnimationFrame(frame);
    })(performance.now());
  }
  function stopClock() {
    if (clockRAF) cancelAnimationFrame(clockRAF);
    clockRAF = null;
    window.MKQuiz.clock = 1;
    window.MKQuiz.clockDone = false;
  }

  function revealAnswer() {
    if (state.phase !== 'question') return;
    state.phase = 'answer';
    stopClock();
    el('q-answer').hidden = false;
    el('q-advance').textContent = t('toAward');
    setScene('answer');
    SFX.reveal();
    save();
  }

  // ---------- AWARD ----------
  function renderAward() {
    el('q-award-value').textContent = state.current ? state.current.value : '';
    var wrap = el('q-award-teams');
    wrap.innerHTML = '';
    state.teams.forEach(function (tm, i) {
      var hex = TEAM_HEX[tm.color % TEAM_HEX.length];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'q-award-team';
      b.style.setProperty('--team-color', hex);
      b.innerHTML =
        '<div class="q-award-team__name">' + teamName(tm, i) + '</div>' +
        '<div class="q-award-team__score">' + tm.score + '</div>' +
        '<span class="q-award-team__key">' + (i + 1) + '</span>';
      b.addEventListener('click', function () { award(tm.id); });
      wrap.appendChild(b);
    });
    var none = document.createElement('button');
    none.type = 'button';
    none.className = 'q-award-team q-award-team--none';
    none.innerHTML =
      '<div class="q-award-team__name">' + t('nobody') + '</div>' +
      '<div class="q-award-team__score">&nbsp;</div>' +
      '<span class="q-award-team__key">0</span>';
    none.addEventListener('click', function () { award(null); });
    wrap.appendChild(none);
  }

  function toAward() {
    if (state.phase !== 'answer') return;
    renderAward();
    show('award');
  }

  function award(teamId) {
    if (!state.current) return;
    var value = state.current.value;
    var key = state.current.cat + ':' + value;
    if (state.spent.indexOf(key) === -1) state.spent.push(key);

    if (teamId !== null) {
      var tm = state.teams.filter(function (x) { return x.id === teamId; })[0];
      if (tm) {
        tm.score += value;
        window.MKQuiz.burst = {
          hex: TEAM_HEX[tm.color % TEAM_HEX.length],
          teamId: tm.id
        };
        SFX.award(value);
      }
    } else {
      SFX.none();
    }

    state.current = null;
    state.phase = 'question';
    renderBoard();
    show('board');
    if (teamId !== null) {
      setTimeout(function () { updateScoreFlaps(teamId, findTeam(teamId).score); }, 260);
    }
    save();

    if (state.spent.length >= 30) {
      setTimeout(showPodium, 1500);
    }
  }
  function findTeam(id) {
    return state.teams.filter(function (x) { return x.id === id; })[0];
  }

  // ---------- PODIUM ----------
  function showPodium() {
    var ranked = state.teams.slice().sort(function (a, b) { return b.score - a.score; });
    var top = ranked.slice(0, 3);
    var rest = ranked.slice(3);

    var title = el('q-podium-title');
    if (ranked.length && ranked[0].score === (ranked[1] && ranked[1].score)) {
      title.textContent = t('draw');
    } else if (ranked.length) {
      title.textContent = teamName(ranked[0], state.teams.indexOf(ranked[0])) + ' ' + t('winner');
    }

    // visual order: second, first, third
    var order = top.length >= 3 ? [top[1], top[0], top[2]]
              : top.length === 2 ? [top[1], top[0]]
              : top;
    var placeOf = function (tm) { return ranked.indexOf(tm) + 1; };

    var pod = el('q-podium');
    pod.innerHTML = '';
    order.forEach(function (tm) {
      if (!tm) return;
      var place = placeOf(tm);
      var hex = TEAM_HEX[tm.color % TEAM_HEX.length];
      var step = document.createElement('div');
      step.className = 'q-step q-step--' + place;
      step.style.setProperty('--team-color', hex);
      step.innerHTML =
        '<div class="q-step__place">' + place + '</div>' +
        '<div class="q-step__name">' + teamName(tm, state.teams.indexOf(tm)) + '</div>' +
        '<div class="q-step__score">' + tm.score + '</div>';
      pod.appendChild(step);
    });

    var restWrap = el('q-podium-rest');
    restWrap.innerHTML = '';
    rest.forEach(function (tm) {
      var s = document.createElement('span');
      s.innerHTML = '<strong>' + teamName(tm, state.teams.indexOf(tm)) + '</strong> ' + tm.score;
      restWrap.appendChild(s);
    });

    show('podium');
    SFX.fanfare();
  }

  // ---------- modals ----------
  var confirmCb = null;
  function confirmAsk(title, body, yes, cb) {
    el('q-confirm-title').textContent = title;
    el('q-confirm-body').textContent = body;
    el('q-confirm-yes').textContent = yes;
    el('q-confirm').hidden = false;
    confirmCb = cb;
  }
  el('q-confirm-yes').addEventListener('click', function () {
    el('q-confirm').hidden = true;
    if (confirmCb) confirmCb();
    confirmCb = null;
  });
  el('q-confirm-no').addEventListener('click', function () {
    el('q-confirm').hidden = true;
    confirmCb = null;
  });

  // ---------- wiring ----------
  el('q-add-team').addEventListener('click', function () {
    if (state.teams.length >= MAX_TEAMS) return;
    state.teams.push({
      id: state.nextTeamId++,
      name: '',
      color: state.teams.length % TEAM_COLORS.length,
      score: 0
    });
    renderSetup(); pushCanvas(); save();
  });
  el('q-to-pick').addEventListener('click', enterPick);
  el('q-to-setup').addEventListener('click', function () { renderSetup(); show('setup'); });
  el('q-play').addEventListener('click', commitGame);
  el('q-setup-cancel').addEventListener('click', cancelEdit);
  el('q-pick-cancel').addEventListener('click', cancelEdit);

  function cancelEdit() {
    editing = false;
    pickSel = state.cats.slice();
    renderBoard();
    show('board');
  }

  el('q-edit').addEventListener('click', function () {
    editing = true;
    pickOrder = pickOrder.length ? pickOrder : shuffle(CAT_IDS);
    pickSel = state.cats.slice();
    renderSetup();
    show('setup');
  });

  el('q-end').addEventListener('click', function () {
    confirmAsk(t('endGameTitle'), t('endGameBody'), t('endGameYes'), showPodium);
  });

  el('q-new-game').addEventListener('click', function () {
    clearSaved();
    state = freshState();
    pickOrder = []; pickSel = []; editing = false;
    paintStrings(); renderSetup(); show('setup');
  });

  el('q-lang').addEventListener('click', function () {
    state.lang = state.lang === 'sv' ? 'en' : 'sv';
    paintStrings();
    repaintCurrentScreen();
    save();
  });

  el('q-sound').addEventListener('click', function () {
    state.sound = !state.sound;
    el('q-sound').classList.toggle('is-off', !state.sound);
    if (state.sound) SFX.flap();
    save();
  });

  function repaintCurrentScreen() {
    if (state.screen === 'setup') renderSetup();
    if (state.screen === 'pick') renderPick();
    if (state.screen === 'board') renderBoard();
    if (state.screen === 'award') renderAward();
    if (state.screen === 'question' && state.current) {
      var q = questionAt(state.current.cat, state.current.value);
      if (q) {
        el('q-qcat').textContent = catName(state.current.cat);
        el('q-question').textContent = q.q[state.lang] || q.q.en;
        el('q-answer-text').textContent = q.a[state.lang] || q.a.en;
      }
      el('q-advance').textContent = state.phase === 'answer' ? t('toAward') : t('revealAnswer');
    }
    if (state.screen === 'podium') showPodium();
  }

  // click anywhere on the question card advances it
  el('scr-question').addEventListener('click', function (e) {
    if (e.target.closest('.q-flaps')) return;
    if (state.phase === 'question') revealAnswer();
    else toAward();
  });

  // ---------- keyboard ----------
  window.addEventListener('keydown', function (e) {
    if (document.body.classList.contains('mk-gated')) return;
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (!el('q-confirm').hidden || !el('q-resume').hidden) return;

    var k = e.key;
    if (k === ' ' || k === 'Spacebar') {
      if (state.screen === 'question') {
        e.preventDefault();
        if (state.phase === 'question') revealAnswer(); else toAward();
      }
      return;
    }
    if (k === 'Escape' && (state.screen === 'question' || state.screen === 'award')) {
      stopClock();
      state.current = null; state.phase = 'question';
      renderBoard(); show('board');
      return;
    }
    if (state.screen === 'award') {
      if (k === '0') { award(null); return; }
      var n = parseInt(k, 10);
      if (n >= 1 && n <= state.teams.length) { award(state.teams[n - 1].id); return; }
    }
    if (k === 'f' || k === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
      return;
    }
    var inGame = state.cats.length === 6 &&
      (state.screen === 'board' || state.screen === 'question' || state.screen === 'award');
    if ((k === 'e' || k === 'E') && inGame) { el('q-end').click(); return; }
    if ((k === 'g' || k === 'G') && inGame) { el('q-edit').click(); return; }
  }, false);

  // ---------- boot ----------
  function boot() {
    var saved = load();
    state = freshState();
    paintStrings();

    if (saved && saved.cats && saved.cats.length === 6) {
      state.lang = saved.lang || 'sv';
      paintStrings();
      el('q-resume-detail').textContent =
        S[state.lang].resumeDetail(saved.teams.length, (saved.spent || []).length);
      el('q-resume').hidden = false;

      el('q-resume-yes').addEventListener('click', function () {
        state = saved;
        if (!state.nextTeamId) {
          state.nextTeamId = Math.max.apply(null, state.teams.map(function (x) { return x.id; })) + 1;
        }
        pickSel = state.cats.slice();
        pickOrder = shuffle(CAT_IDS);
        el('q-resume').hidden = true;
        paintStrings();
        renderBoard();
        show(state.screen === 'question' || state.screen === 'award' ? 'board' : state.screen);
      });
      el('q-resume-no').addEventListener('click', function () {
        clearSaved();
        state = freshState();
        el('q-resume').hidden = true;
        paintStrings(); renderSetup(); show('setup');
      });
      return;
    }

    renderSetup();
    show('setup');
  }

  boot();
})();
