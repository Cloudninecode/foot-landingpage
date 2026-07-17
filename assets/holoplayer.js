// Holograma do jogador — "scanner de craque" na seção Para o Jogador.
// v3 (feedback 2026-07-17): de volta aos PONTOS (v1) — o Fillipi preferiu —
// mas com a anatomia atlética da v2: ombros largos, cintura, quadril
// estreito em V, pernas retas com vão. Pontos com densidade proporcional à
// superfície e fase girada por anel (nuvem de partículas, sem listras).
// Canvas puro, zero libs. Arrastar gira; anima só quando visível.
(() => {
  const canvas = document.getElementById('holoplayer');
  if (!canvas) return;
  const stage = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const motionOK = matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const TAU = Math.PI * 2;

  // ── Geometria: nuvem de pontos {x,y,z} (y=0 no chão) ─────────────────
  const pts = [];
  const DENSITY = 30; // pontos por unidade de circunferência

  function ring(cx, y, rx, squash, phase) {
    const rz = rx * squash;
    const n = Math.max(6, Math.round(TAU * rx * DENSITY));
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU + phase;
      pts.push({ x: cx + rx * Math.cos(t), y, z: rz * Math.sin(t) });
    }
  }
  // Tubo: perfil [[y, raio, xCentro?], ...] interpolado em anéis.
  let ph = 0;
  function tube(profile, squash, step) {
    for (let i = 0; i < profile.length - 1; i++) {
      const [ya, ra, xa = 0] = profile[i], [yb, rb, xb = 0] = profile[i + 1];
      const steps = Math.max(1, Math.round(Math.abs(yb - ya) / step));
      for (let s = (i === 0 ? 0 : 1); s <= steps; s++) {
        const t = s / steps;
        ring(xa + (xb - xa) * t, ya + (yb - ya) * t, ra + (rb - ra) * t, squash, (ph += 0.7));
      }
    }
  }

  // Cabeça: esfera por paralelos, leve oval.
  for (let row = 1; row < 10; row++) {
    const phi = (row / 10) * Math.PI;
    ring(0, 1.605 + 0.112 * Math.cos(phi), 0.096 * Math.sin(phi), 0.9, (ph += 0.9));
  }
  // Pescoço.
  tube([[1.47, 0.048], [1.55, 0.044]], 0.9, 0.03);
  // Tronco atlético: ombros largos → peito → cintura → quadril estreito em V.
  tube([
    [1.47, 0.07],
    [1.445, 0.172],  // deltoides
    [1.30, 0.152],   // peito
    [1.10, 0.096],   // cintura
    [0.97, 0.11],    // quadril
    [0.885, 0.072],  // pelve fechando em V
  ], 0.55, 0.03);
  // Braços afastados com leve flexão de cotovelo.
  for (const side of [1, -1]) {
    tube([
      [1.43, 0.048, side * 0.205],
      [1.13, 0.04, side * 0.265],
      [0.86, 0.028, side * 0.295],
    ], 0.85, 0.035);
  }
  // Pernas retas e próximas, com joelho e panturrilha.
  for (const side of [1, -1]) {
    tube([
      [0.92, 0.06, side * 0.072],
      [0.52, 0.045, side * 0.075],
      [0.30, 0.048, side * 0.076],
      [0.06, 0.027, side * 0.074],
    ], 0.8, 0.038);
    // Pé apontando pra frente.
    for (let s = 0; s <= 2; s++) {
      const before = pts.length;
      ring(side * 0.074, 0.042 - s * 0.011, 0.031 - s * 0.004, 1.1, (ph += 0.8));
      for (let i = before; i < pts.length; i++) pts[i].z += 0.05 + s * 0.012;
    }
  }

  // ── Estado / render ───────────────────────────────────────────────────
  let w = 0, h = 0, dpr = 1, cx = 0, cy = 0, S = 1;
  let angle = -0.6, vel = 0, dragging = false, lastX = 0, lastT = 0;
  let running = false, t0 = 0;
  const AUTO = 0.35;

  function resize() {
    canvas.style.width = canvas.style.height = '';
    const box = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = box.width; h = box.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2; cy = h * 0.50;
    S = Math.min(h * 0.48, w * 0.42);
    draw(t0);
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const sinA = Math.sin(angle), cosA = Math.cos(angle);
    const baseY = cy + 0.9 * S;

    // Plataforma: anéis pulsando + sonar + disco de luz.
    const pulse = motionOK ? 0.5 + 0.5 * Math.sin(now / 900) : 0.5;
    ctx.strokeStyle = '#c6f24e';
    ctx.lineWidth = 1.2;
    for (const [r, a] of [[0.50, 0.35], [0.36, 0.2], [0.62, 0.14]]) {
      ctx.globalAlpha = a * (0.7 + 0.3 * pulse);
      ctx.beginPath();
      ctx.ellipse(cx, baseY, r * S, r * S * 0.26, 0, 0, TAU);
      ctx.stroke();
    }
    if (motionOK) {
      const st = (now % 3200) / 3200;
      ctx.globalAlpha = 0.35 * (1 - st);
      ctx.beginPath();
      ctx.ellipse(cx, baseY, (0.4 + st * 0.5) * S, (0.4 + st * 0.5) * S * 0.26, 0, 0, TAU);
      ctx.stroke();
    }
    const grad = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, 0.5 * S);
    grad.addColorStop(0, 'rgba(198,242,78,0.14)');
    grad.addColorStop(1, 'rgba(198,242,78,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, baseY, 0.55 * S, 0.55 * S * 0.26, 0, 0, TAU);
    ctx.fill();

    // Scan sobe pelo corpo a cada ~5.5s.
    let scanY = -1;
    if (motionOK) {
      const sc = (now % 5500) / 5500;
      if (sc < 0.55) scanY = (sc / 0.55) * 1.8;
    }

    // Corpo: pontos com brilho por profundidade (frente acende).
    for (const p of pts) {
      const xr = p.x * cosA + p.z * sinA;
      const zr = -p.x * sinA + p.z * cosA;
      const s = 3 / (3 + zr);
      const sx = cx + xr * S * s, sy = cy - (p.y - 0.9) * S * s;
      const depth = (0.45 - zr) * 1.2;
      let a = 0.26 + Math.max(0, Math.min(0.52, depth * 0.5));
      let r = 1.5 * s;
      let color = '#c6f24e';
      if (scanY >= 0 && Math.abs(p.y - scanY) < 0.07) {
        a = Math.min(1, a + 0.6); r *= 1.7; color = '#eaffb0';
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, TAU);
      ctx.fill();
    }
    // Linha do scan atravessando a silhueta.
    if (scanY >= 0) {
      const yPix = cy - (scanY - 0.9) * S;
      ctx.globalAlpha = 0.30;
      ctx.strokeStyle = '#eaffb0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 0.5 * S, yPix);
      ctx.lineTo(cx + 0.5 * S, yPix);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - t0) / 1000, 0.05);
    t0 = now;
    if (!dragging) {
      vel += (AUTO - vel) * Math.min(1, dt * 1.2);
      angle += vel * dt;
    }
    draw(now);
    requestAnimationFrame(tick);
  }

  // Arrastar pra girar (touch-action: pan-y preserva o scroll no celular).
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastT = performance.now();
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const nowT = performance.now();
    const dx = e.clientX - lastX;
    angle += dx * 0.008;
    vel = (dx * 0.008) / Math.max((nowT - lastT) / 1000, 0.016);
    vel = Math.max(-6, Math.min(6, vel));
    lastX = e.clientX; lastT = nowT;
    if (!running) draw(performance.now());
  });
  const drop = () => { dragging = false; };
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);

  resize();
  addEventListener('resize', resize, { passive: true });

  // Liga HUD (flicker + contadores) e a animação quando a seção aparece.
  function activate() {
    stage.classList.add('on');
    stage.querySelectorAll('[data-count]').forEach((el) => {
      const target = +el.dataset.count;
      if (!motionOK) { el.textContent = target; return; }
      const start = performance.now(), dur = 1200;
      (function step(t) {
        const p = Math.min((t - start) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      })(start);
    });
  }

  if ('IntersectionObserver' in window) {
    let activated = false;
    new IntersectionObserver((entries) => {
      const vis = entries[0].isIntersecting;
      if (vis && !activated) { activated = true; activate(); }
      if (motionOK) {
        if (vis && !running) { running = true; t0 = performance.now(); vel = AUTO; requestAnimationFrame(tick); }
        else if (!vis) running = false;
      }
    }, { threshold: 0.25 }).observe(stage);
  } else activate();
})();
