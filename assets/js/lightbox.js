/* ============================================================
   MKLab Foto lightbox
   Click a framed photo to view it near full-screen, still
   framed and matted. <dialog> gives focus trap and Esc for
   free; backdrop click and the close button also dismiss.
   No dependencies.
   ============================================================ */
(function () {
  'use strict';

  var dialog = document.getElementById('mk-lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  var img = document.getElementById('mk-lightbox-img');
  var closeBtn = dialog.querySelector('.mk-lightbox__close');

  function open(sourceImg) {
    img.src = sourceImg.currentSrc || sourceImg.src;
    img.alt = sourceImg.alt;
    document.body.classList.add('mk-lightbox-open');
    dialog.showModal();
  }

  document.querySelectorAll('.mk-frame__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var source = btn.querySelector('img');
      if (source) open(source);
    });
  });

  closeBtn.addEventListener('click', function () { dialog.close(); });

  // Click anywhere dismisses; the only control inside is the close
  // button, which closes too.
  dialog.addEventListener('click', function () { dialog.close(); });

  dialog.addEventListener('close', function () {
    document.body.classList.remove('mk-lightbox-open');
    img.src = '';
    img.alt = '';
  });
})();
