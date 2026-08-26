/* ============================================================
   MKLab tech talk deck: presentation chrome.
   Keyboard navigation, slide counter, progress hairline,
   fullscreen, blackout, idle cursor hiding. No dependencies.

   Beats: a talk's canvas may split a slide into steps. If it
   exposes nextBeat/prevBeat, the forward key spends a beat before
   it spends a slide, so the picture moves when the presenter is
   ready rather than when a timer says so. Decks with no beats
   behave exactly as they always did.
   ============================================================ */
(function () {
  'use strict';

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  if (!slides.length) return;

  var counterCur = document.querySelector('.deck-counter .cur');
  var counterTot = document.querySelector('.deck-counter .tot');
  var progress = document.querySelector('.deck-progress');
  var current = 0;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  if (counterTot) counterTot.textContent = pad(slides.length);

  function setActive(i) {
    if (i === current && slides[i].classList.contains('is-active')) return;
    current = i;
    slides.forEach(function (s, j) {
      s.classList.toggle('is-active', j === i);
    });
    if (counterCur) counterCur.textContent = pad(i + 1);
    if (progress) {
      progress.style.width = (slides.length > 1 ? (i / (slides.length - 1)) * 100 : 100) + '%';
    }
  }

  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setActive(slides.indexOf(e.target));
      });
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
    slides.forEach(function (s) { obs.observe(s); });
  }
  setActive(0);

  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    slides[i].scrollIntoView({ behavior: 'smooth' });
  }

  // ---------- beats: the canvas may hold the slide for a step ----------
  var beatsEl = document.createElement('div');
  beatsEl.className = 'deck-beats';
  beatsEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(beatsEl);

  function renderBeats(i, n) {
    if (!n || n < 2) { beatsEl.innerHTML = ''; return; }
    var html = '';
    for (var k = 0; k < n; k++) {
      html += '<i class="' + (k <= i ? 'on' : '') + '"></i>';
    }
    beatsEl.innerHTML = html;
  }
  var beatHook = setInterval(function () {
    if (window.mkCanvas && typeof window.mkCanvas.onBeat === 'function') {
      clearInterval(beatHook);
      window.mkCanvas.onBeat(renderBeats);
    }
  }, 200);

  function advance() {
    var c = window.mkCanvas;
    if (c && typeof c.nextBeat === 'function' && c.nextBeat()) return;
    go(current + 1);
  }
  function retreat() {
    var c = window.mkCanvas;
    if (c && typeof c.prevBeat === 'function' && c.prevBeat()) return;
    go(current - 1);
  }

  // blackout: "." fades to black (hide the screen before presenting),
  // "." again fades back to exactly where you were
  var blackout = document.createElement('div');
  blackout.className = 'deck-blackout';
  blackout.setAttribute('aria-hidden', 'true');
  document.body.appendChild(blackout);
  var isBlack = false;
  function toggleBlackout() {
    isBlack = !isBlack;
    document.body.classList.toggle('mk-blackout', isBlack);
  }
  function blockWhileBlack(e) {
    if (isBlack) e.preventDefault();
  }
  window.addEventListener('wheel', blockWhileBlack, { passive: false });
  window.addEventListener('touchmove', blockWhileBlack, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '.') {
      e.preventDefault();
      toggleBlackout();
      return;
    }
    // while black, only "." (resume) and fullscreen work
    if (isBlack && e.key !== 'f' && e.key !== 'F') {
      e.preventDefault();
      return;
    }
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        e.preventDefault(); advance(); break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault(); retreat(); break;
      case 'Home':
        e.preventDefault(); go(0); break;
      case 'End':
        e.preventDefault(); go(slides.length - 1); break;
      case 'f':
      case 'F':
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
        break;
    }
  });

  // hide the cursor when idle: it is a presentation
  var idleTimer = null;
  function wake() {
    document.body.classList.remove('mk-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      document.body.classList.add('mk-idle');
    }, 2600);
  }
  ['mousemove', 'pointerdown', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, wake, { passive: true });
  });
  wake();
})();
