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
    (viewportHeight * 0.60 - rect.top) / (viewportHeight * 0.60)
  );

  const pinnedProgress = rect.top <= 0
    ? clamp(-rect.top / scrollableDistance)
    : 0;

  const revealProgress = rect.top > 0
    ? entryProgress * 0.18
    : clamp(0.18 + pinnedProgress * 0.92);

  aboutWords.forEach((word, index) => {
    const wordPosition = aboutWords.length <= 1
      ? 0
      : index / (aboutWords.length - 1);

    const focus = smoothstep(
      wordPosition * 0.90,
      wordPosition * 0.90 + 0.11,
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

  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;
  let moved = false;

  const dragThreshold = opts.dragThreshold ?? 10;

  el.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;

    isDragging = true;
    moved = false;
    startX = event.clientX;
    startScrollLeft = el.scrollLeft;
    el.classList.add('dragging');
  });

  window.addEventListener('mousemove', (event) => {
    if (!isDragging) return;

    const deltaX = event.clientX - startX;

    if (Math.abs(deltaX) >= dragThreshold) {
      moved = true;
      el.scrollLeft = startScrollLeft - deltaX;
      event.preventDefault();
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    el.classList.remove('dragging');
  });

  if (opts.preventClickAfterDrag) {
    el.addEventListener(
      'click',
      (event) => {
        if (!moved) return;

        moved = false;
        event.preventDefault();
        event.stopPropagation();
      },
      true
    );
  }
}

makeDraggable(document.getElementById('dragGallery'), {
  preventClickAfterDrag: true,
  dragThreshold: 10,
});
makeDraggable(document.getElementById('footerMarquee'));

const marqueeEl = document.getElementById('footerMarquee');

// ---------- Persistent header + scroll indicator ----------
const scrollIndicator = document.getElementById('scrollIndicator');
const pageFooter = document.querySelector('footer');

function updateScrollIndicator() {
  if (!scrollIndicator) return;

  const documentElement = document.documentElement;
  const remaining =
    documentElement.scrollHeight - window.innerHeight - window.scrollY;

  const footerHasEntered = pageFooter
    ? pageFooter.getBoundingClientRect().top <= window.innerHeight * 0.92
    : false;

  scrollIndicator.classList.toggle(
    'at-end',
    remaining < 80 || footerHasEntered
  );
}

window.addEventListener('scroll', updateScrollIndicator, { passive: true });
window.addEventListener('resize', updateScrollIndicator);
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

function applyFocusState(element, distanceRatio) {
  element.classList.remove(
    'viewport-focus',
    'viewport-soft',
    'viewport-blur'
  );

  if (distanceRatio <= 0.28) {
    element.classList.add('viewport-focus');
  } else if (distanceRatio <= 0.68) {
    element.classList.add('viewport-soft');
  } else {
    element.classList.add('viewport-blur');
  }
}

function updateFeaturedFocus() {
  const viewportCenterX = window.innerWidth / 2;

  featuredItems.forEach((item, index) => {
    if (index === 0) {
      item.classList.remove(
        'viewport-soft',
        'viewport-blur'
      );
      item.classList.add('viewport-focus');
      return;
    }

    const rect = item.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const distance = Math.abs(centerX - viewportCenterX);
    const ratio = distance / Math.max(window.innerWidth / 2, 1);

    applyFocusState(item, ratio);
  });
}

function updateVerticalFocus(items) {
  const viewportCenterY = window.innerHeight / 2;

  items.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const distance = Math.abs(centerY - viewportCenterY);
    const ratio = distance / Math.max(window.innerHeight / 2, 1);

    applyFocusState(item, ratio);
  });
}

let galleryFocusFrame = 0;

function updateGalleryFocus() {
  cancelAnimationFrame(galleryFocusFrame);

  galleryFocusFrame = requestAnimationFrame(() => {
    updateFeaturedFocus();
    updateVerticalFocus(digitalItems);
    updateVerticalFocus(behindItems);
  });
}

window.addEventListener('scroll', updateGalleryFocus, { passive: true });
window.addEventListener('resize', updateGalleryFocus);
dragGallery?.addEventListener('scroll', updateGalleryFocus, { passive: true });
updateGalleryFocus();
