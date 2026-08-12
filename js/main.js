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

// ---------- Word-by-word reveal for "about" paragraphs ----------
// Paragraph 1 reveals word-by-word on scroll; paragraph 2 only starts once paragraph 1 finishes.
const WORD_STAGGER_MS = 35;

document.querySelectorAll('.word-reveal').forEach((p) => {
  const words = p.dataset.text.split(' ');
  const highlights = p.dataset.highlight ? p.dataset.highlight.split(',') : [];
  p.innerHTML = words.map((w) => {
    const clean = w.toLowerCase().replace(/[^a-z]/g, '');
    const cls = highlights.includes(clean) ? 'word-highlight' : '';
    return `<span class="${cls}">${w}</span>`;
  }).join(' ');
});

function revealParagraph(p, onDone) {
  const spans = p.querySelectorAll('span');
  spans.forEach((s, i) => setTimeout(() => s.classList.add('on'), i * WORD_STAGGER_MS));
  if (onDone) setTimeout(onDone, spans.length * WORD_STAGGER_MS + 300);
}

const aboutP1 = document.getElementById('aboutP1');
const aboutP2 = document.getElementById('aboutP2');
if (aboutP1) {
  const p1Observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        revealParagraph(aboutP1, () => { if (aboutP2) revealParagraph(aboutP2); });
        p1Observer.unobserve(aboutP1);
      }
    });
  }, { threshold: 0.4 });
  p1Observer.observe(aboutP1);
}

document.querySelectorAll('.word-reveal').forEach((p) => {
  if (p.id === 'aboutP1' || p.id === 'aboutP2') return;
  const spans = p.querySelectorAll('span');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        spans.forEach((s, i) => setTimeout(() => s.classList.add('on'), i * 25));
        observer.unobserve(p);
      }
    });
  }, { threshold: 0.4 });
  observer.observe(p);
});

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
  if (!pinSection) return;
  const rect = pinSection.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  const progress = Math.min(Math.max(-rect.top / total, 0), 1);
  const v = progress * frameCount;

  manifestoWords.forEach((el, i) => {
    const { opacity, y, scale } = wordTransform(v - i);
    el.style.opacity = opacity;
    el.style.transform = `translateY(${y}px) scale(${scale})`;
  });
  // Description + image share the exact same envelope/timing as their paired word, so all three
  // frame elements always move together.
  frameDesc.forEach((el, i) => { el.style.opacity = frameOpacity(v - i); });
  frameImg.forEach((el, i) => { el.style.opacity = frameOpacity(v - i); });
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

// ---------- Header hide-on-scroll-down ----------
let lastY = window.scrollY;
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (header) {
    header.style.transition = 'transform 0.4s ease';
    header.style.transform = (y > lastY && y > 200) ? 'translateY(-120%)' : 'translateY(0)';
  }
  lastY = y;
}, { passive: true });

// ---------- Scroll indicator hides as soon as the user scrolls ----------
const scrollIndicator = document.getElementById('scrollIndicator');
function updateScrollIndicator() {
  if (!scrollIndicator) return;
  scrollIndicator.classList.toggle('scrolled', window.scrollY > 40);
}
window.addEventListener('scroll', updateScrollIndicator, { passive: true });
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
