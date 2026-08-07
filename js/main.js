(function () {
  'use strict';

  var isTouch = window.matchMedia('(hover: none), (max-width: 767px)').matches;

  /* ---------------- Custom cursor trail ---------------- */
  if (!isTouch) {
    var dots = Array.prototype.slice.call(document.querySelectorAll('.cursor-dot'));
    var positions = dots.map(function () { return { x: -100, y: -100 }; });
    var mouse = { x: -100, y: -100 };
    var hasMoved = false;

    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      hasMoved = true;
    });

    function animateCursor() {
      if (hasMoved) {
        var prevX = mouse.x, prevY = mouse.y;
        dots.forEach(function (dot, i) {
          var pos = positions[i];
          var lerp = i === 0 ? 1 : 0.35;
          pos.x += (prevX - pos.x) * lerp;
          pos.y += (prevY - pos.y) * lerp;
          dot.style.transform = 'translate(' + pos.x + 'px,' + pos.y + 'px) translate(-50%,-50%)';
          prevX = pos.x;
          prevY = pos.y;
        });
      }
      requestAnimationFrame(animateCursor);
    }
    requestAnimationFrame(animateCursor);
  }

  /* ---------------- Click ripple ---------------- */
  var rippleLayer = document.querySelector('.ripple-layer');
  document.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) return;
    var ring = document.createElement('span');
    ring.className = 'ripple-ring';
    ring.style.left = e.clientX + 'px';
    ring.style.top = e.clientY + 'px';
    rippleLayer.appendChild(ring);
    ring.addEventListener('animationend', function () { ring.remove(); });
  });

  /* ---------------- Scroll reveal ---------------- */
  var revealEls = document.querySelectorAll('.reveal-fade, .reveal-up');
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
  revealEls.forEach(function (el) { revealObserver.observe(el); });

  /* Hero content reveals immediately on load */
  window.addEventListener('load', function () {
    document.querySelectorAll('.hero .reveal-fade').forEach(function (el, i) {
      setTimeout(function () { el.classList.add('is-visible'); }, 300 + i * 250);
    });
  });

  /* ---------------- Intro scrollytelling ---------------- */
  var introSection = document.getElementById('introScroll');
  var captions = document.querySelectorAll('.intro-caption');
  var floats = document.querySelectorAll('.intro-float');
  var words = document.querySelectorAll('.intro-word-cycle span');

  function activeIndexFor(progress, count) {
    var idx = Math.floor(progress * count);
    if (idx >= count) idx = count - 1;
    if (idx < 0) idx = 0;
    return idx;
  }

  function updateIntroScroll() {
    var rect = introSection.getBoundingClientRect();
    var total = introSection.offsetHeight - window.innerHeight;
    var scrolled = -rect.top;
    var progress = total > 0 ? scrolled / total : 0;
    progress = Math.max(0, Math.min(1, progress));

    if (rect.top > window.innerHeight || rect.bottom < 0) return;

    var capIdx = activeIndexFor(progress, captions.length);
    captions.forEach(function (el, i) { el.classList.toggle('is-active', i === capIdx); });

    var floatIdx = activeIndexFor(progress, floats.length);
    floats.forEach(function (el, i) { el.classList.toggle('is-active', i === floatIdx); });

    var wordIdx = activeIndexFor(progress, words.length);
    words.forEach(function (el, i) { el.classList.toggle('is-active', i === wordIdx); });
  }

  window.addEventListener('scroll', updateIntroScroll, { passive: true });
  window.addEventListener('resize', updateIntroScroll);
  updateIntroScroll();

  /* ---------------- Featured work: drag to scroll ---------------- */
  var scrollEl = document.getElementById('featuredScroll');
  var isDown = false, startX, scrollLeft, dragged = false;

  scrollEl.addEventListener('mousedown', function (e) {
    isDown = true;
    dragged = false;
    scrollEl.classList.add('dragging');
    startX = e.pageX - scrollEl.offsetLeft;
    scrollLeft = scrollEl.scrollLeft;
  });
  window.addEventListener('mouseup', function () {
    isDown = false;
    scrollEl.classList.remove('dragging');
  });
  scrollEl.addEventListener('mouseleave', function () {
    isDown = false;
    scrollEl.classList.remove('dragging');
  });
  scrollEl.addEventListener('mousemove', function (e) {
    if (!isDown) return;
    e.preventDefault();
    var x = e.pageX - scrollEl.offsetLeft;
    var walk = x - startX;
    if (Math.abs(walk) > 5) dragged = true;
    scrollEl.scrollLeft = scrollLeft - walk;
  });
  /* Prevent click-through firing a video open right after a drag */
  scrollEl.addEventListener('click', function (e) {
    if (dragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  /* ---------------- Video lightbox ---------------- */
  var lightbox = document.getElementById('lightbox');
  var lightboxIframe = document.getElementById('lightboxIframe');
  var lightboxClose = document.getElementById('lightboxClose');

  function openLightbox(videoId) {
    lightboxIframe.src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0&modestbranding=1';
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightboxIframe.src = '';
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.work-card[data-video]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (dragged) return;
      openLightbox(btn.getAttribute('data-video'));
    });
  });
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
  });

})();
