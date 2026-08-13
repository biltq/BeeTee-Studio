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

// ---------- Reversible About reveal ----------
document.querySelectorAll('.word-reveal').forEach((paragraph) => {
  const words = paragraph.dataset.text.split(' ');
  const highlights = paragraph.dataset.highlight
    ? paragraph.dataset.highlight.split(',')
    : [];

  paragraph.innerHTML = words.map((word) => {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    const highlightClass = highlights.includes(cleanWord) ? 'word-highlight' : '';
    return `<span class="${highlightClass}">${word}</span>`;
  }).join(' ');
});

const aboutSection = document.getElementById('aboutSection');
const aboutParagraphs = Array.from(
  document.querySelectorAll('#aboutSection .word-reveal')
);

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function updateAboutReveal() {
  if (!aboutSection || aboutParagraphs.length === 0) return;

  const rect = aboutSection.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const travel = viewportHeight + rect.height;
  const rawProgress = (viewportHeight - rect.top) / travel;
  const centerProgress = clamp(rawProgress);
  const visibilityEnvelope = 1 - Math.abs(centerProgress - 0.5) * 2;
  const sectionVisibility = clamp(visibilityEnvelope * 1.55);

  const allWords = aboutParagraphs.flatMap((paragraph) =>
    Array.from(paragraph.querySelectorAll('span'))
  );

  allWords.forEach((span, index) => {
    const wordPosition = allWords.length <= 1
      ? 0
      : index / (allWords.length - 1);
    const focusProgress = clamp(
      (centerProgress * 1.45) - (wordPosition * 0.45)
    );
    const opacity = clamp(focusProgress * sectionVisibility);
    const blur = (1 - focusProgress) * 10 + (1 - sectionVisibility) * 4;
    const translateY = (1 - focusProgress) * 10;

    span.style.opacity = opacity.toFixed(3);
    span.style.filter = `blur(${blur.toFixed(2)}px)`;
    span.style.transform = `translateY(${translateY.toFixed(2)}px)`;
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
  const progress = clamp(-rect.top / total);
  const frameProgress = progress * frameCount;

  const previewDistance = viewportHeight * 0.55;
  const preview = rect.top > 0 && rect.top < previewDistance
    ? clamp(1 - (rect.top / previewDistance))
    : 0;

  manifestoWords.forEach((element, index) => {
    const localProgress = frameProgress - index;
    const state = wordTransform(localProgress);

    if (index === 0 && progress === 0 && preview > 0) {
      state.opacity = Math.max(state.opacity, preview * 0.55);
      state.y = 28 - (preview * 18);
      state.scale = 0.9 + (preview * 0.06);
    }

    element.style.opacity = state.opacity;
    element.style.transform = `translateY(${state.y}px) scale(${state.scale})`;
  });

  frameDesc.forEach((element, index) => {
    element.style.opacity = frameOpacity(frameProgress - index);
  });

  frameImg.forEach((element, index) => {
    let opacity = frameOpacity(frameProgress - index);

    if (index === 0 && progress === 0 && preview > 0) {
      opacity = Math.max(opacity, preview * 0.42);
    }

    element.style.opacity = opacity;
  });
}

window.addEventListener('scroll', updatePinned, { passive: true });
window.addEventListener('resize', updatePinned);
updatePinned();

// ---------- Generic drag-to-scroll (featured gallery + footer marquee) ----------
function makeDraggable(el, opts = {}) {
  if (!el) return;
  let isDown = false, startX = 0, scrollLeft = 0, moved = false;
  const start = (x) => {
    isDown = true; moved = false;
    el.classList.add('dragging');
    startX = x - el.offsetLeft;
    scrollLeft = el.scrollLeft;
  };
  const move = (x) => {
    if (!isDown) return;
    const walk = x - el.offsetLeft - startX;
    if (Math.abs(walk) > 5) moved = true;
    el.scrollLeft = scrollLeft - walk;
  };
  const end = () => { isDown = false; el.classList.remove('dragging'); };

  el.addEventListener('mousedown', (e) => start(e.pageX));
  el.addEventListener('mousemove', (e) => move(e.pageX));
  window.addEventListener('mouseup', end);
  el.addEventListener('mouseleave', end);
  el.addEventListener('touchstart', (e) => start(e.touches[0].pageX), { passive: true });
  el.addEventListener('touchmove', (e) => move(e.touches[0].pageX), { passive: true });
  el.addEventListener('touchend', end);

  if (opts.preventClickAfterDrag) {
    el.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', (e) => { if (moved) e.preventDefault(); });
    });
  }
}

makeDraggable(document.getElementById('dragGallery'), { preventClickAfterDrag: true });
makeDraggable(document.getElementById('footerMarquee'));

const marqueeEl = document.getElementById('footerMarquee');
document.getElementById('marqueeLeft')?.addEventListener('click', () => {
  marqueeEl.scrollBy({ left: -400, behavior: 'smooth' });
});
document.getElementById('marqueeRight')?.addEventListener('click', () => {
  marqueeEl.scrollBy({ left: 400, behavior: 'smooth' });
});

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
