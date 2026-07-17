// Efeitos coadjuvantes da landing (2026-07-17): linha de dados do "Como
// funciona" (dispara a coreografia CSS quando visível) e partículas que o
// CTA final atrai — pontos de luz nascem nas bordas do convite e fluem pro
// botão. Canvas puro, zero libs, desligado com prefers-reduced-motion.
(() => {
  const motionOK = matchMedia('(prefers-reduced-motion: no-preference)').matches;

  // ── Como funciona: pulso 1→2→3 (coreografia toda em CSS) ─────────────
  const steps = document.querySelector('.steps');
  if (steps && motionOK && 'IntersectionObserver' in window) {
    new IntersectionObserver((e, o) => {
      if (e[0].isIntersecting) { steps.classList.add('run'); o.disconnect(); }
    }, { threshold: 0.3 }).observe(steps);
  }

  // ── FAQ: resposta se "descriptografa" ao abrir (1ª vez, ~500ms) ──────
  // O texto real fica no DOM (SEO intacto); o efeito só troca o visual
  // por meio segundo e devolve o original exato.
  const GLYPHS = '!<>-_/[]{}—=+*^?#01';
  document.querySelectorAll('.faq details').forEach((det) => {
    det.addEventListener('toggle', () => {
      if (!det.open || det.dataset.done || !motionOK) return;
      det.dataset.done = '1';
      const p = det.querySelector('p');
      if (!p) return;
      const original = p.textContent;
      const t0 = performance.now(), dur = 520;
      (function step(t) {
        const prog = Math.min((t - t0) / dur, 1);
        const solved = Math.floor(original.length * prog);
        let out = original.slice(0, solved);
        for (let i = solved; i < Math.min(solved + 14, original.length); i++) {
          out += original[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        p.textContent = out;
        if (prog < 1) requestAnimationFrame(step);
        else p.textContent = original;
      })(t0);
    });
  });

  // ── CTA final: o botão atrai partículas ──────────────────────────────
  const box = document.querySelector('.cta-final .box');
  const canvas = document.getElementById('ctaFx');
  const btn = document.querySelector('.cta-final .btn');
  if (!box || !canvas || !btn || !motionOK) return;
  const ctx = canvas.getContext('2d');

  let w = 0, h = 0, tx = 0, ty = 0, running = false;
  const parts = [];
  const N = 34;

  function resize() {
    const b = box.getBoundingClientRect(), r = btn.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = b.width; h = b.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tx = r.left - b.left + r.width / 2;
    ty = r.top - b.top + r.height / 2;
  }

  function spawn(p) {
    // Nasce numa borda aleatória do box.
    const side = Math.random() * 4 | 0;
    p.x = side === 0 ? 0 : side === 1 ? w : Math.random() * w;
    p.y = side < 2 ? Math.random() * h : (side === 2 ? 0 : h);
    p.vx = 0; p.vy = 0;
    p.life = 0.6 + Math.random() * 0.4;
    p.r = 1 + Math.random() * 1.6;
  }
  for (let i = 0; i < N; i++) { const p = {}; spawn(p); parts.push(p); }

  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      const dx = tx - p.x, dy = ty - p.y;
      const d = Math.hypot(dx, dy) || 1;
      // Acelera na direção do botão, com um tico de deriva lateral.
      p.vx += (dx / d) * 0.09 + (Math.random() - 0.5) * 0.04;
      p.vy += (dy / d) * 0.09 + (Math.random() - 0.5) * 0.04;
      p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy;
      const fade = Math.min(1, d / 90); // some ao chegar no botão
      ctx.globalAlpha = 0.5 * p.life * fade;
      ctx.fillStyle = '#c6f24e';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
      if (d < 26) spawn(p);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }

  resize();
  addEventListener('resize', resize, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      const vis = entries[0].isIntersecting;
      if (vis && !running) { running = true; requestAnimationFrame(tick); }
      else if (!vis) running = false;
    }, { threshold: 0.2 }).observe(box);
  } else { running = true; requestAnimationFrame(tick); }
})();
