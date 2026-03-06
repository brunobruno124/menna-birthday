/* ============================================================
   script.js — Menna's Birthday Site · Deep Polish Edition
   ============================================================ */

'use strict';

/* ── DOM references ── */
const screens = {
  intro:    document.getElementById('screen-intro'),
  envelope: document.getElementById('screen-envelope'),
  letter:   document.getElementById('screen-letter'),
  final:    document.getElementById('screen-final'),
};

const btnIntro       = document.getElementById('btn-intro');
const envelopeWrap   = document.getElementById('envelope-wrap');   // owns float + open state
const envelope       = document.getElementById('envelope');        // click target
const btnEnvelope    = document.getElementById('btn-envelope');
const envelopeHint   = document.getElementById('envelope-hint');
const btnToFinal     = document.getElementById('btn-to-final');
const musicToggle    = document.getElementById('music-toggle');
const bgMusic        = document.getElementById('bg-music');
const revealCards    = document.querySelectorAll('.reveal-card');
const overlay        = document.getElementById('reveal-overlay');
const overlayMsg     = document.getElementById('overlay-message');
const overlayClose   = document.getElementById('overlay-close');
const quizBtns       = document.querySelectorAll('.quiz-btn');
const quizResponse   = document.getElementById('quiz-response');
const confettiCanvas = document.getElementById('confetti-canvas');
const finalHeartsEl  = document.getElementById('final-hearts');
const heartsLayer    = document.getElementById('hearts-layer');

let currentScreen  = 'intro';
let envelopeOpened = false;
let musicPlaying   = false;
let confettiRafId  = null;


/* ════════════════════════════════════════════════════════════
   SCREEN TRANSITIONS
   blur-in / blur-out handled entirely by CSS classes
   ════════════════════════════════════════════════════════════ */
function goToScreen(from, to, onEnter) {
  const fromEl = screens[from];
  const toEl   = screens[to];
  if (!fromEl || !toEl) return;

  fromEl.classList.remove('active');
  fromEl.classList.add('exit');

  fromEl.addEventListener('transitionend', () => {
    fromEl.classList.remove('exit');
    fromEl.style.zIndex = '';
  }, { once: true });

  toEl.style.zIndex = '10';

  // Double rAF — ensures browser commits z-index before animating in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toEl.classList.add('active');
      currentScreen = to;
      if (typeof onEnter === 'function') onEnter();
    });
  });
}


/* ════════════════════════════════════════════════════════════
   INTRO → ENVELOPE
   ════════════════════════════════════════════════════════════ */
btnIntro.addEventListener('click', () => {
  goToScreen('intro', 'envelope');
});


/* ════════════════════════════════════════════════════════════
   ENVELOPE OPEN
   The `open` class is toggled on envelope-wrap (not envelope)
   so the interior, ground shadow, and float all respond.
   ════════════════════════════════════════════════════════════ */
function openEnvelope() {
  if (envelopeOpened) return;
  envelopeOpened = true;

  // Add open class to the wrapper — triggers:
  //   flap 3-D rotation, letter peek rise, interior reveal,
  //   seal shrink, shadow shrink, float stop
  envelopeWrap.classList.add('open');

  // Hide the hint text
  if (envelopeHint) envelopeHint.classList.add('hidden');

  // Navigate to letter after animation settles
  // Flap: 1.2s  +  letter peek delay 0.65s  +  buffer  = 1.55s
  setTimeout(() => {
    goToScreen('envelope', 'letter', onLetterEnter);
  }, 1600);
}

if (envelope) {
  envelope.addEventListener('click', openEnvelope);
  envelope.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openEnvelope();
    }
  });
}

if (btnEnvelope) {
  btnEnvelope.addEventListener('click', openEnvelope);
}


/* ════════════════════════════════════════════════════════════
   LETTER SCREEN — IntersectionObserver stagger
   ════════════════════════════════════════════════════════════ */
let letterObserver = null;

function onLetterEnter() {
  screens.letter.scrollTop = 0;

  const items = screens.letter.querySelectorAll('.animate-in');

  if ('IntersectionObserver' in window) {
    letterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            letterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.10, rootMargin: '0px 0px -20px 0px' }
    );
    items.forEach((el) => letterObserver.observe(el));
  } else {
    items.forEach((el) => el.classList.add('visible'));
  }

  setTimeout(polaroidNudge, 1600);
}


/* ════════════════════════════════════════════════════════════
   REVEAL CARD OVERLAY
   ════════════════════════════════════════════════════════════ */
revealCards.forEach((card) => {
  card.addEventListener('click', () => {
    const message = card.getAttribute('data-message');
    if (!message) return;
    overlayMsg.textContent = message;
    overlay.removeAttribute('aria-hidden');
    overlay.classList.add('open');
  });
});

function closeOverlay() {
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

overlayClose.addEventListener('click', closeOverlay);
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeOverlay();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlay.classList.contains('open')) closeOverlay();
});


/* ════════════════════════════════════════════════════════════
   QUIZ
   ════════════════════════════════════════════════════════════ */
quizBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const response = btn.getAttribute('data-response');
    if (!response) return;
    quizResponse.textContent = response;
    quizResponse.classList.add('show');
    quizBtns.forEach((b) => {
      b.classList.toggle('selected', b === btn);
      b.classList.toggle('dimmed',   b !== btn);
    });
  });
});


/* ════════════════════════════════════════════════════════════
   LETTER → FINAL
   ════════════════════════════════════════════════════════════ */
btnToFinal.addEventListener('click', () => {
  goToScreen('letter', 'final', onFinalEnter);
});


/* ════════════════════════════════════════════════════════════
   FINAL SCREEN
   ════════════════════════════════════════════════════════════ */
function onFinalEnter() {
  startConfetti();
  spawnRisingHearts();
}


/* ── Romantic confetti — cream, blush, gold only ── */
function startConfetti() {
  if (!confettiCanvas) return;
  const ctx = confettiCanvas.getContext('2d');

  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  const PALETTE = [
    '#d6a48a', '#b58d48', '#d9c490',
    '#b46b54', '#efe3d3', '#d5b690',
    '#fefcf8', '#8b4132', '#e8d5c0',
  ];

  const COUNT = 90;

  const particles = Array.from({ length: COUNT }, () => ({
    x:      Math.random() * confettiCanvas.width,
    y:      Math.random() * confettiCanvas.height - confettiCanvas.height,
    r:      Math.random() * 5 + 2.0,
    color:  PALETTE[Math.floor(Math.random() * PALETTE.length)],
    // 0=circle, 1=wide rect, 2=thin tall rect
    shape:  Math.floor(Math.random() * 3),
    speed:  Math.random() * 1.9 + 0.8,
    sway:   Math.random() * 1.1 - 0.55,
    angle:  Math.random() * Math.PI * 2,
    spin:   (Math.random() - 0.5) * 0.09,
  }));

  let startTs   = null;
  const FADE_AT = 4200;
  const END_AT  = 6000;

  function draw(ts) {
    if (!startTs) startTs = ts;
    const elapsed = ts - startTs;

    const alpha = elapsed < FADE_AT
      ? 1
      : Math.max(0, 1 - (elapsed - FADE_AT) / (END_AT - FADE_AT));

    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = alpha * 0.84;
      ctx.fillStyle   = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      switch (p.shape) {
        case 0:  // circle
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 1:  // wide rect
          ctx.fillRect(-p.r * 1.5, -p.r * 0.45, p.r * 3, p.r * 0.9);
          break;
        case 2:  // thin tall rect
          ctx.fillRect(-p.r * 0.4, -p.r, p.r * 0.8, p.r * 2.2);
          break;
      }

      ctx.restore();

      p.y     += p.speed;
      p.x     += p.sway;
      p.angle += p.spin;

      if (p.y > confettiCanvas.height + 16) {
        p.y = -14;
        p.x = Math.random() * confettiCanvas.width;
      }
    });

    if (alpha > 0 && elapsed < END_AT) {
      confettiRafId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  if (confettiRafId) cancelAnimationFrame(confettiRafId);
  confettiRafId = requestAnimationFrame(draw);
}


/* ── Rising hearts ── */
function spawnRisingHearts() {
  if (!finalHeartsEl) return;
  finalHeartsEl.innerHTML = '';

  const SYMBOLS = ['♡', '✦', '♡', '·', '✦', '♡', '°'];
  const COUNT   = 18;

  for (let i = 0; i < COUNT; i++) {
    const h   = document.createElement('span');
    const dur = (Math.random() * 5.5 + 5).toFixed(1);
    const dly = (Math.random() * 7).toFixed(1);
    const sz  = (Math.random() * 11 + 7).toFixed(1);
    const rda = (Math.random() * 18 - 6).toFixed(1);
    const rdb = (Math.random() * -16 + 5).toFixed(1);
    const col = i % 4 === 0
      ? 'var(--gold)'
      : (i % 3 === 0 ? 'var(--blush)' : 'var(--rose)');

    h.className   = 'rise-heart';
    h.textContent = SYMBOLS[i % SYMBOLS.length];
    h.style.cssText = `
      left:      ${(Math.random() * 86 + 7).toFixed(1)}%;
      font-size: ${sz}px;
      color:     ${col};
      --rdur:    ${dur}s;
      --rdelay:  ${dly}s;
      --rda:     ${rda}px;
      --rdb:     ${rdb}px;
    `;
    finalHeartsEl.appendChild(h);
  }
}


/* ════════════════════════════════════════════════════════════
   BACKGROUND FLOATING PARTICLES
   Whisper-quiet symbols that add romance without noise.
   ════════════════════════════════════════════════════════════ */
(function spawnParticles() {
  const DEFS = [
    { sym: '♡', color: 'var(--rose)',  op: 0.10 },
    { sym: '✦', color: 'var(--gold)',  op: 0.13 },
    { sym: '·', color: 'var(--gold)',  op: 0.20 },
    { sym: '°', color: 'var(--blush)', op: 0.14 },
    { sym: '✦', color: 'var(--rose)',  op: 0.08 },
    { sym: '♡', color: 'var(--gold)',  op: 0.09 },
    { sym: '·', color: 'var(--blush)', op: 0.17 },
  ];

  const COUNT = 20;

  for (let i = 0; i < COUNT; i++) {
    const d   = DEFS[i % DEFS.length];
    const el  = document.createElement('span');

    const dur  = (Math.random() * 14 + 12).toFixed(1); // 12–26s — very slow
    const dly  = (Math.random() * 22).toFixed(1);
    const sz   = (Math.random() * 7 + 5).toFixed(1);   // 5–12px
    const da   = (Math.random() * 20 - 10).toFixed(1);
    const db   = (Math.random() * -18 + 5).toFixed(1);
    const spin = (Math.random() * 22 - 4).toFixed(1);

    el.className   = 'float-heart';
    el.textContent = d.sym;
    el.style.cssText = `
      left:    ${(Math.random() * 92 + 4).toFixed(1)}%;
      font-size: ${sz}px;
      color:   ${d.color};
      --dur:   ${dur}s;
      --delay: ${dly}s;
      --op:    ${d.op};
      --da:    ${da}px;
      --db:    ${db}px;
      --spin:  ${spin}deg;
    `;
    heartsLayer.appendChild(el);
  }
})();


/* ════════════════════════════════════════════════════════════
   MUSIC TOGGLE
   ════════════════════════════════════════════════════════════ */
musicToggle.addEventListener('click', () => {
  const labelEl = musicToggle.querySelector('.music-label');

  if (!musicPlaying) {
    bgMusic.volume = 0.33;
    bgMusic.play()
      .then(() => {
        musicPlaying = true;
        if (labelEl) labelEl.textContent = 'pause music';
        musicToggle.classList.add('playing');
      })
      .catch(() => {
        if (labelEl) labelEl.textContent = '(add music.mp3 to /assets)';
      });
  } else {
    bgMusic.pause();
    musicPlaying = false;
    if (labelEl) labelEl.textContent = 'play our little soundtrack';
    musicToggle.classList.remove('playing');
  }
});


/* ════════════════════════════════════════════════════════════
   POLAROID NUDGE — hints the strip is swipeable
   ════════════════════════════════════════════════════════════ */
function polaroidNudge() {
  const stack = document.getElementById('polaroid-stack');
  if (!stack) return;
  stack.scrollBy({ left: 36, behavior: 'smooth' });
  setTimeout(() => stack.scrollBy({ left: -36, behavior: 'smooth' }), 480);
}


/* ════════════════════════════════════════════════════════════
   RESIZE — keep confetti canvas sized to window
   ════════════════════════════════════════════════════════════ */
window.addEventListener('resize', () => {
  if (confettiCanvas) {
    confettiCanvas.width  = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
});


/* ════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  if (screens.letter) screens.letter.scrollTop = 0;
});
