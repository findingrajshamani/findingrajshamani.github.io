/* ═══════════════════════════════════════════════════════
   THIS SHOULD HAVE BEEN A DM.
   script.js — Full interaction engine
═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;



  /* ─────────────────────────────────────────────────────
     SOUND — DM notification on first scroll / gesture
     One soft sound. Never repeated. User must have interacted.
  ───────────────────────────────────────────────────── */
  let soundPlayed = false;

  function playDMSound() {
    if (soundPlayed || prefersReducedMotion) return;
    soundPlayed = true;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Two-tone notification: high blip then low settle
      function tone(freq, startTime, duration, gain) {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      }

      const now = ctx.currentTime;
      tone(1046, now,        0.12, 0.09);  // C6 — the ping
      tone(784,  now + 0.11, 0.18, 0.06);  // G5 — the settle
    } catch (e) {
      // Web Audio not available — silent fail
    }
  }

  // Sound plays when the title appears — the "you've received something" moment
  // Bound during the intro sequence at the right beat
  function bindSoundTrigger() {
    // noop — sound is now triggered directly in runIntroSequence at title reveal
  }

  /* ─────────────────────────────────────────────────────
     CUSTOM CURSOR (desktop only)
  ───────────────────────────────────────────────────── */
  if (!isTouch && !prefersReducedMotion) {
    const cursorEl = document.createElement('div');
    cursorEl.id = 'cursor';
    document.body.appendChild(cursorEl);

    let cx = -100, cy = -100, tx = -100, ty = -100;

    document.addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
      document.body.classList.add('cursor-ready');
    });

    document.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-ready');
    });

    document.addEventListener('mouseover', e => {
      const onEnvelope    = !!e.target.closest('#envelope');
      const onInteractive = !!e.target.closest('a, button, [role="button"]');
      document.body.classList.toggle('cursor-envelope', onEnvelope);
      document.body.classList.toggle('cursor-hover', !onEnvelope && onInteractive);
    });

    (function animateCursor() {
      cx += (tx - cx) * 0.20;
      cy += (ty - cy) * 0.20;
      cursorEl.style.left = cx + 'px';
      cursorEl.style.top  = cy + 'px';
      requestAnimationFrame(animateCursor);
    })();
  }

  /* ─────────────────────────────────────────────────────
     TAP VS CLICK LABEL
  ───────────────────────────────────────────────────── */
  const openVerbEl = document.querySelector('.open-verb');
  if (openVerbEl) openVerbEl.textContent = isTouch ? 'tap' : 'click';

  /* ─────────────────────────────────────────────────────
     REDUCED MOTION — skip everything
  ───────────────────────────────────────────────────── */
  if (prefersReducedMotion) {
    document.body.classList.remove('is-locked');
    document.getElementById('intro').style.display = 'none';
    const main = document.getElementById('main-content');
    main.removeAttribute('aria-hidden');
    main.classList.add('is-visible');

    document.querySelectorAll('.reveal-up, .letter-reveal').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });

    const envWrapper = document.getElementById('envelope-wrapper');
    if (envWrapper) {
      envWrapper.style.opacity = '1';
      envWrapper.style.transform = 'none';
      envWrapper.classList.add('label-visible');
    }

    const statusEl = document.getElementById('status-indicator');
    if (statusEl) statusEl.classList.add('is-visible');

    initEnvelope();
    initScrollReveal();
    initShortcut();
    return;
  }

  /* ─────────────────────────────────────────────────────
     OPENING SEQUENCE
  ───────────────────────────────────────────────────── */
  const intro      = document.getElementById('intro');
  const dmLine     = document.getElementById('dm-line');
  const dmTyped    = document.getElementById('dm-typed');
  const dmCaret    = document.getElementById('dm-caret');
  const titleBlock = document.getElementById('title-block');
  const titleSub   = document.getElementById('title-sub');
  const scrollCue  = document.getElementById('scroll-cue');
  const skipBtn    = document.getElementById('skip-intro-btn');

  const TEXT_TO_TYPE = 'Hey Raj,';
  let introSkipped  = false;
  let introComplete = false;

  function unlockAndShowMain() {
    if (introComplete) return;
    introComplete = true;

    if (dmCaret) {
      dmCaret.style.animation = 'none';
      dmCaret.style.opacity = '0';
    }

    gsap.to(intro, {
      opacity: 0, duration: 0.65, ease: 'power2.inOut',
      onComplete: () => {
        intro.style.display = 'none';
        intro.setAttribute('aria-hidden', 'true');
      }
    });

    const main = document.getElementById('main-content');
    main.removeAttribute('aria-hidden');
    main.classList.add('is-visible');
    document.body.classList.remove('is-locked');

    const statusEl = document.getElementById('status-indicator');
    if (statusEl) statusEl.classList.add('is-visible');

    bindSoundTrigger();
    initScrollReveal();
    initEnvelope();
    initShortcut();
  }

  function skipIntro() {
    if (introSkipped || introComplete) return;
    introSkipped = true;

    gsap.killTweensOf([dmLine, dmTyped, dmCaret]);
    clearAllTimers();

    gsap.set(dmLine, { opacity: 0 });
    gsap.set(titleBlock, { opacity: 1, transform: 'translateY(0)' });
    gsap.set(titleSub, { opacity: 1 });
    gsap.set(scrollCue, { opacity: 0.7 });
    scrollCue.classList.add('is-breathing');
    titleBlock.style.pointerEvents = 'auto';

    allTimers.push(setTimeout(unlockAndShowMain, 700));
  }

  if (skipBtn) skipBtn.addEventListener('click', skipIntro);

  document.addEventListener('keydown', e => {
    if (introSkipped || introComplete) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (['Escape', 'Enter', ' '].includes(e.key)) skipIntro();
  });

  const allTimers = [];
  function clearAllTimers() {
    allTimers.forEach(clearTimeout);
    allTimers.length = 0;
  }

  function typeText(targetEl, text, opts) {
    opts = Object.assign({ minDelay: 72, maxDelay: 148, punctuationExtra: 260 }, opts);
    return new Promise(resolve => {
      let i = 0;
      function typeNext() {
        if (introSkipped) { resolve(); return; }
        if (i >= text.length) { resolve(); return; }
        targetEl.textContent = text.slice(0, ++i);
        const char = text[i - 1];
        const isPunct = [',', '.', '!', '?', ';', ':'].includes(char);
        const delay = isPunct
          ? opts.punctuationExtra
          : opts.minDelay + Math.random() * (opts.maxDelay - opts.minDelay);
        allTimers.push(setTimeout(typeNext, delay));
      }
      typeNext();
    });
  }

  function deleteText(targetEl, opts) {
    opts = Object.assign({ delay: 44 }, opts);
    return new Promise(resolve => {
      function deleteNext() {
        if (introSkipped) { resolve(); return; }
        const current = targetEl.textContent;
        if (!current.length) { resolve(); return; }
        targetEl.textContent = current.slice(0, -1);
        allTimers.push(setTimeout(deleteNext, opts.delay + Math.random() * 24));
      }
      deleteNext();
    });
  }

  function wait(ms) {
    return new Promise(resolve => {
      if (introSkipped) { resolve(); return; }
      allTimers.push(setTimeout(resolve, ms));
    });
  }

  /* ─────────────────────────────────────────────────────
     INTRO SEQUENCE
     Type → hold → delete halfway → hesitate → try again →
     abandon → long silence → title.
  ───────────────────────────────────────────────────── */
  async function runIntroSequence() {
    await wait(800);
    if (introSkipped) return;

    gsap.to(dmLine, { opacity: 1, duration: 0.7, ease: 'power2.out' });
    await wait(950);
    if (introSkipped) return;

    await typeText(dmTyped, TEXT_TO_TYPE);
    if (introSkipped) return;

    await wait(1100);
    if (introSkipped) return;

    // Delete all — first pass, then hesitate midway
    await deleteText(dmTyped, { delay: 52 });
    if (introSkipped) return;

    await wait(900);
    if (introSkipped) return;

    // Second attempt — try something different, abandon it
    await typeText(dmTyped, 'I wanted to say', { minDelay: 58, maxDelay: 105 });
    if (introSkipped) return;

    await wait(650);
    if (introSkipped) return;

    await deleteText(dmTyped, { delay: 32 });
    if (introSkipped) return;

    // Long silence — just the caret. Nothing left to type.
    await wait(2000);
    if (introSkipped) return;

    gsap.to(dmLine, { opacity: 0, y: -14, duration: 0.55, ease: 'power2.inOut' });
    await wait(750);
    if (introSkipped) return;

    if (dmCaret) {
      dmCaret.style.animation = 'none';
      dmCaret.style.opacity = '0';
    }
    gsap.set(dmCaret, { opacity: 0 });
    await wait(550);
    if (introSkipped) return;

    titleBlock.style.pointerEvents = 'auto';
    playDMSound(); // the "you've received something" ping — plays as the title appears
    gsap.to(titleBlock, { opacity: 1, y: 0, duration: 1.15, ease: 'power3.out' });

    await wait(1250);
    if (introSkipped) return;

    gsap.to(titleSub, { opacity: 1, duration: 0.75, ease: 'power2.out' });
    await wait(950);
    if (introSkipped) return;

    gsap.to(scrollCue, {
      opacity: 0.7, duration: 0.6, ease: 'power2.out',
      onComplete: () => scrollCue.classList.add('is-breathing')
    });

    await wait(800);
    unlockAndShowMain();
  }

  runIntroSequence();

  /* ─────────────────────────────────────────────────────
     SCROLL REVEAL + EXIT ANIMATIONS
  ───────────────────────────────────────────────────── */
  function initScrollReveal() {
    if (!window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    // Standard reveal-up for most scene elements
    document.querySelectorAll('.scene').forEach(scene => {
      if (scene.id === 's-closing') return; // closing handled separately below
      scene.querySelectorAll('.reveal-up').forEach((el, i) => {
        gsap.to(el, {
          opacity: 1, y: 0,
          duration: 0.85,
          ease: 'power3.out',
          delay: i * 0.1,
          scrollTrigger: { trigger: el, start: 'top 83%', once: true }
        });
      });
    });

    // CLOSING — slower, longer stagger. This is the exhale.
    const closingLines = document.querySelectorAll('#s-closing .reveal-up');
    closingLines.forEach((el, i) => {
      gsap.to(el, {
        opacity: 1, y: 0,
        duration: 1.1,
        ease: 'power3.out',
        delay: i * 0.18,   // longer stagger — each line lands with more weight
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });

    // Experiment question — slower, weightier
    const experimentQ = document.querySelector('.experiment-question');
    if (experimentQ) {
      ScrollTrigger.create({
        trigger: experimentQ, start: 'top 80%', once: true,
        onEnter: () => gsap.fromTo(experimentQ,
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 1.3, ease: 'power3.out', delay: 0.15 }
        )
      });
    }

    // Figuring emphasis — its own beat
    const figuringEmphasis = document.querySelector('.figuring-emphasis');
    if (figuringEmphasis) {
      ScrollTrigger.create({
        trigger: figuringEmphasis, start: 'top 82%', once: true,
        onEnter: () => gsap.fromTo(figuringEmphasis,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.12 }
        )
      });
    }

    // No exit dim animations — once revealed, text stays fully visible.

    // STATUS fades before the letter
    ScrollTrigger.create({
      trigger: '#s-letter', start: 'top 70%',
      onEnter: () => {
        const s = document.getElementById('status-indicator');
        if (s) gsap.to(s, { opacity: 0, duration: 0.8, ease: 'power2.inOut' });
      },
      onLeaveBack: () => {
        const s = document.getElementById('status-indicator');
        if (s) gsap.to(s, { opacity: 1, duration: 0.5, ease: 'power2.out' });
      }
    });

    // ENVELOPE wrapper reveal
    const envWrapper = document.getElementById('envelope-wrapper');
    if (envWrapper) {
      ScrollTrigger.create({
        trigger: envWrapper, start: 'top 72%', once: true,
        onEnter: () => gsap.to(envWrapper, {
          opacity: 1, y: 0, duration: 1.0, ease: 'power3.out',
          onComplete: () => setTimeout(() => envWrapper.classList.add('label-visible'), 900)
        })
      });
    }
  }

  /* ─────────────────────────────────────────────────────
     LETTER PARAGRAPH SCROLL REVEALS
     Called after the letter is revealed. Each paragraph
     fades in as the reader scrolls — maintains pacing
     through the longest section.
  ───────────────────────────────────────────────────── */
  function initLetterReveal() {
    const paragraphs = document.querySelectorAll('.letter-reveal');
    if (!paragraphs.length) return;

    // The letter-opening block animates immediately as a unit
    const opening = document.querySelector('.letter-opening');
    if (opening) {
      gsap.to(opening, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out', delay: 0.1 });
    }

    // All other letter-reveal paragraphs scroll in one by one
    // Skip the opening block itself — handled above
    paragraphs.forEach(el => {
      if (el.classList.contains('letter-opening')) return;

      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.75,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 90%',
          once: true
        }
      });
    });

  }

  /* ─────────────────────────────────────────────────────
     SHORTCUT
  ───────────────────────────────────────────────────── */
  function initShortcut() {
    const shortcut = document.getElementById('letter-shortcut');
    if (!shortcut) return;
    shortcut.addEventListener('click', e => {
      e.preventDefault();
      const letterSection = document.getElementById('s-letter');
      if (letterSection) letterSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ─────────────────────────────────────────────────────
     ENVELOPE INTERACTION
  ───────────────────────────────────────────────────── */
  function initEnvelope() {
    const envelope = document.getElementById('envelope');
    if (!envelope) return;

    if (document.body.hasAttribute('data-letter-opened')) {
      showLetterDirectly();
      return;
    }

    envelope.addEventListener('click', () => {
      if (envelope.getAttribute('aria-pressed') === 'true') return;
      openEnvelope();
    });

    envelope.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (envelope.getAttribute('aria-pressed') === 'true') return;
        openEnvelope();
      }
    });
  }

  function openEnvelope() {
    const envelope      = document.getElementById('envelope');
    const envWrapper    = document.getElementById('envelope-wrapper');
    const letterContent = document.getElementById('letter-content');
    if (!envelope || !envWrapper || !letterContent) return;

    envelope.setAttribute('aria-pressed', 'true');
    document.body.setAttribute('data-letter-opened', '');
    envelope.style.cursor = 'default';
    document.body.classList.remove('cursor-envelope', 'cursor-hover');

    // Begin: flap opens, seal cracks
    envelope.classList.add('is-opening');

    // Timing:
    // 0ms    — flap starts rotating (1.2s)
    // 80ms   — seal crack appears
    // 550ms  — paper starts rising (1s)
    // 2200ms — envelope fades, letter reveals
    setTimeout(() => {
      gsap.to(envWrapper, {
        opacity: 0, duration: 0.65, ease: 'power2.inOut',
        onComplete: () => {
          envWrapper.classList.add('is-gone');
          envWrapper.style.display = 'none';
          revealLetter(letterContent);
        }
      });
    }, 2200);
  }

  function revealLetter(letterContent) {
    letterContent.classList.add('is-revealed');
    letterContent.removeAttribute('aria-hidden');

    // The letter container fades in
    gsap.fromTo(
      letterContent,
      { opacity: 0, y: 22 },
      {
        opacity: 1, y: 0, duration: 1.05, ease: 'power3.out',
        onComplete: initLetterReveal  // then init paragraph scroll reveals
      }
    );
  }

  function showLetterDirectly() {
    const envWrapper    = document.getElementById('envelope-wrapper');
    const letterContent = document.getElementById('letter-content');
    if (envWrapper) envWrapper.style.display = 'none';
    if (letterContent) {
      letterContent.classList.add('is-revealed');
      letterContent.removeAttribute('aria-hidden');
      letterContent.style.opacity = '1';
      // Show all paragraphs immediately
      letterContent.querySelectorAll('.letter-reveal').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      }
  }

})();
