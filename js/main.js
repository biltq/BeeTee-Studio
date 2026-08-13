// ---------- Splash screen ----------
const splashScreen = document.getElementById('splashScreen');
if (splashScreen) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      splashScreen.classList.add('splash-hidden');
      setTimeout(() => splashScreen.remove(), 700);
    }, 1200);
  });
}

// ---------- Pinned reversible About reveal ----------
document.querySelectorAll('.word-reveal').forEach((paragraph) => {
  const words = paragraph.dataset.text.split(' ');
  const highlights = paragraph.dataset.highlight
    ? paragraph.dataset.highlight.split(',')
    : [];

  paragraph.innerHTML = words.map((word) => {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    const highlightClass = highlights.includes(cleanWord)
      ? 'word-highlight'
      : '';

    return `<span class="${highlightClass}">${word}</span>`;
  }).join(' ');
});

const aboutSection = document.getElementById('aboutSection');
const aboutWords = Array.from(
  document.querySelectorAll('#aboutSection .word-reveal span')
);

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function smoothstep(start, end, value) {
  const progress = clamp((value - start) / (end - start));
  return progress * progress * (3 - (2 * progress));
}

function updateAboutReveal() {
  if (!aboutSection || aboutWords.length === 0) return;

  const rect = aboutSection.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const scrollableDistance = Math.max(
    aboutSection.offsetHeight - viewportHeight,
    1
  );

  const entryProgress = clamp(
    (viewportHeight * 0.18 - rect.top) / (viewportHeight * 0.18)
  );

  const pinnedProgress = rect.top <= 0
    ? clamp(-rect.top / scrollableDistance)
    : 0;

  const revealProgress = rect.top > 0
    ? entryProgress * 0.10
    : clamp(0.10 + pinnedProgress * 2.10);

  aboutWords.forEach((word, index) => {
    const wordPosition = aboutWords.length <= 1
      ? 0
      : index / (aboutWords.length - 1);

    const focus = smoothstep(
      wordPosition * 0.92,
      wordPosition * 0.92 + 0.075,
      revealProgress
    );

    const opacity = 0.08 + focus * 0.92;
    const blur = (1 - focus) * 11;
    const translateY = (1 - focus) * 4;

    word.style.opacity = opacity.toFixed(3);
    word.style.filter = `blur(${blur.toFixed(2)}px)`;
    word.style.transform = `translateY(${translateY.toFixed(2)}px)`;
  });
}

window.addEventListener('scroll', updateAboutReveal, { passive: true });
window.addEventListener('resize', updateAboutReveal);
updateAboutReveal();

// ---------- Pinned "I [WORD]" section ----------
// "I" is static throughout. Each of the 5 words zooms in from 0->1 opacity (with a scale-up),
// and its paired description text + image fade in on that exact same frame index — all three
// driven by one continuous scroll progress, so they always move together, never independently.
const pinSection = document.getElementById('pinServices');
const frameDesc = document.querySelectorAll('.frame-desc');
const frameImg = document.querySelectorAll('.frame-img');
const manifestoWords = document.querySelectorAll('.manifesto-word');
const frameCount = manifestoWords.length; // 5: PRODUCE / CAPTURE / EDIT / ANIMATE / CREATE

// Each word gets its own dedicated 1-unit window of scroll progress: it enters (rises + fades in),
// then fully lands and holds, THEN only once it's completely settled does the next word's window
// begin. No two words are ever mid-entrance at the same time.
const ENTER_FRAC = 0.25; // first 25% of a word's window: rising in from below
const EXIT_START = 0.75; // last 25% of a word's window: rising out to fade above

// cp = local progress within this frame's own 1-unit window (<=0 before its turn, >=1 after).
function frameOpacity(cp) {
  if (cp <= 0 || cp >= 1) return 0;
  if (cp < ENTER_FRAC) return cp / ENTER_FRAC;
  if (cp < EXIT_START) return 1;
  return 1 - (cp - EXIT_START) / (1 - EXIT_START);
}

function wordTransform(cp) {
  if (cp <= 0) return { opacity: 0, y: 60, scale: 0.82 };
  if (cp < ENTER_FRAC) {
    const t = cp / ENTER_FRAC;
    return { opacity: t, y: (1 - t) * 60, scale: 0.82 + 0.18 * t };
  }
  if (cp < EXIT_START) return { opacity: 1, y: 0, scale: 1 };
  if (cp < 1) {
    const t = (cp - EXIT_START) / (1 - EXIT_START);
    return { opacity: 1 - t, y: -t * 60, scale: 1 - 0.18 * t };
  }
  return { opacity: 0, y: -60, scale: 0.82 };
}

function updatePinned() {
  if (!pinSection || frameCount === 0) return;

  const rect = pinSection.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const total = Math.max(rect.height - viewportHeight, 1);

  const previewStart = viewportHeight * 1.08;
  const previewProgress = rect.top > 0
    ? clamp(1 - (rect.top / previewStart))
    : 1;

  const pinnedProgress = rect.top <= 0
    ? clamp(-rect.top / total)
    : 0;

  // PRODUCE reaches roughly half visibility as the section approaches,
  // then continues from that exact state without resetting.
  const entryProgress = ENTER_FRAC * 0.62;
  const frameProgress = rect.top > 0
    ? entryProgress * previewProgress
    : entryProgress + (pinnedProgress * (frameCount - entryProgress));

  manifestoWords.forEach((element, index) => {
    const state = wordTransform(frameProgress - index);
    element.style.opacity = state.opacity;
    element.style.transform =
      `translateY(${state.y}px) scale(${state.scale})`;
  });

  frameDesc.forEach((element, index) => {
    element.style.opacity = frameOpacity(frameProgress - index);
  });

  frameImg.forEach((element, index) => {
    element.style.opacity = frameOpacity(frameProgress - index);
  });
}

window.addEventListener('scroll', updatePinned, { passive: true });
window.addEventListener('resize', updatePinned);
updatePinned();

// ---------- Generic drag-to-scroll (featured gallery + footer marquee) ----------
function makeDraggable(el, opts = {}) {
  if (!el) return;

  let pointerDown = false;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let horizontalDrag = false;

  const dragThreshold = opts.dragThreshold ?? 14;

  el.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    pointerDown = true;
    horizontalDrag = false;
    startX = event.clientX;
    startY = event.clientY;
    startScrollLeft = el.scrollLeft;
    el.classList.add('dragging');

    if (el.setPointerCapture) {
      el.setPointerCapture(event.pointerId);
    }
  });

  el.addEventListener('pointermove', (event) => {
    if (!pointerDown) return;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (
      !horizontalDrag &&
      Math.abs(deltaX) > dragThreshold &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      horizontalDrag = true;
    }

    if (horizontalDrag) {
      el.scrollLeft = startScrollLeft - deltaX;
      event.preventDefault();
    }
  });

  const endDrag = (event) => {
    if (!pointerDown) return;
    pointerDown = false;
    el.classList.remove('dragging');

    if (el.releasePointerCapture && el.hasPointerCapture?.(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }

    window.setTimeout(() => {
      horizontalDrag = false;
    }, 0);
  };

  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);

  if (opts.preventClickAfterDrag) {
    el.addEventListener(
      'click',
      (event) => {
        if (!horizontalDrag) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true
    );
  }
}

makeDraggable(document.getElementById('dragGallery'), {
  preventClickAfterDrag: true,
  dragThreshold: 14,
});
makeDraggable(document.getElementById('footerMarquee'));

const marqueeEl = document.getElementById('footerMarquee');

// ---------- Persistent header + scroll indicator ----------
const scrollIndicator = document.getElementById('scrollIndicator');

function updateScrollIndicator() {
  if (!scrollIndicator) return;

  const documentHeight = document.documentElement.scrollHeight;
  const viewportBottom = window.scrollY + window.innerHeight;
  const endThreshold = 24;
  const atEnd = viewportBottom >= documentHeight - endThreshold;

  scrollIndicator.classList.toggle('at-end', atEnd);
}

window.addEventListener('scroll', updateScrollIndicator, { passive: true });
window.addEventListener('resize', updateScrollIndicator);
window.addEventListener('load', updateScrollIndicator);
updateScrollIndicator();

// ---------- Trailing custom cursor (desktop only) ----------
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const dots = Array.from(document.querySelectorAll('.cursor-dot'));
  const positions = dots.map(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
  let mouseX = positions[0].x, mouseY = positions[0].y;
  let started = false;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!started) {
      started = true;
      document.body.classList.add('cursor-active');
      positions.forEach((p) => { p.x = mouseX; p.y = mouseY; });
    }
  });

  function animateCursor() {
    let x = mouseX, y = mouseY;
    positions.forEach((p, i) => {
      p.x += (x - p.x) * 0.35;
      p.y += (y - p.y) * 0.35;
      x = p.x; y = p.y;
      dots[i].style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
    });
    requestAnimationFrame(animateCursor);
  }
  requestAnimationFrame(animateCursor);
}


// ---------- Viewport-center gallery focus ----------
const featuredItems = Array.from(document.querySelectorAll('[data-card]'));
const digitalItems = Array.from(document.querySelectorAll('.reel-card'));
const behindItems = Array.from(document.querySelectorAll('.behind-img'));
const dragGallery = document.getElementById('dragGallery');

function setFocusClass(element, distanceRatio) {
  element.classList.remove('viewport-focus', 'viewport-soft', 'viewport-blur');

  if (distanceRatio <= 0.22) {
    element.classList.add('viewport-focus');
    return;
  }

  if (distanceRatio <= 0.48) {
    element.classList.add('viewport-soft');
    return;
  }

  element.classList.add('viewport-blur');
}

function updateFeaturedFocus() {
  const viewportCenterX = window.innerWidth / 2;

  featuredItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const itemCenterX = rect.left + rect.width / 2;
    const distance = Math.abs(itemCenterX - viewportCenterX);
    const ratio = distance / Math.max(window.innerWidth / 2, 1);
    setFocusClass(item, ratio);
  });
}

function updateVerticalGalleryFocus(items) {
  const viewportCenterY = window.innerHeight / 2;

  items.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const itemCenterY = rect.top + rect.height / 2;
    const distance = Math.abs(itemCenterY - viewportCenterY);
    const ratio = distance / Math.max(window.innerHeight / 2, 1);
    setFocusClass(item, ratio);
  });
}

let focusFrame = 0;

function updateGalleryFocus() {
  cancelAnimationFrame(focusFrame);
  focusFrame = requestAnimationFrame(() => {
    updateFeaturedFocus();
    updateVerticalGalleryFocus(digitalItems);
    updateVerticalGalleryFocus(behindItems);
  });
}

window.addEventListener('scroll', updateGalleryFocus, { passive: true });
window.addEventListener('resize', updateGalleryFocus);
dragGallery?.addEventListener('scroll', updateGalleryFocus, { passive: true });
updateGalleryFocus();
