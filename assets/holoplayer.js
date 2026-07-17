// Holograma do jogador — "scanner de craque" na seção Para o Jogador.
// Nuvem de ~900 pontos 3D gerada por geometria paramétrica (cabeça, tronco,
// braços, pernas — pose neutra de scan), girando sobre uma plataforma de
// anéis pulsantes, com varredura de scan periódica. Canvas puro, zero libs.
// Arrastar gira; solto, volta a girar sozinho. Anima só quando visível.
(() => {
  const canvas = document.getElementById('holoplayer');
  if (!canvas) return;
  const stage = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const motionOK = matchMedia('(prefers-reduced-motion: no-preference)').matches;

  // ── Geometria: pontos {x,y,z} em unidades de corpo (y=0 no chão) ──────
  const pts = [];
  const TAU = Math.PI * 2;

  // Anel horizontal de pontos (elipse: corpo é mais "largo" que "fundo").
  function ring(cx, y, cz, rx, n, squash, phase) {
    const rz = rx * (squash ?? 0.62);
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU + (phase ?? 0);
      pts.push({ x: cx + rx * Math.cos(t), y, z: cz + rz * Math.sin(t) });
    }
  }
  // Membro: sequência de anéis entre dois centros, raio afunilando.
  function limb(x0, y0, x1, y1, r0, r1, rings, per) {
    for (let s = 0; s <= rings; s++) {
      const t = s / rings;
      ring(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0,
           r0 + (r1 - r0) * t, per, 0.8, s * 0.35);
    }
  }

  // Cabeça (esfera por paralelos) + pescoço.
  for (let row = 1; row < 9; row++) {
    const phi = (row / 9) * Math.PI;
    ring(0, 1.62 + 0.105 * Math.cos(phi), 0, 0.105 * Math.sin(phi),
         Math.max(4, Math.round(16 * Math.sin(phi))), 0.85, row * 0.4);
  }
  limb(0, 1.5, 0, 1.55, 0.05, 0.05, 2, 8);

  // Tronco: raio por pontos-chave (quadril→cintura→peito→ombros).
  const torso = [[0.92, 0.135], [1.0, 0.118], [1.12, 0.105], [1.28, 0.125], [1.40, 0.16], [1.48, 0.145]];
  for (let i = 0; i < torso.length - 1; i++) {
    const [ya, ra] = torso[i], [yb, rb] = torso[i + 1];
    for (let y = ya; y < yb; y += 0.034) {
      const t = (y - ya) / (yb - ya);
      ring(0, y, 0, ra + (rb - ra) * t, 20, 0.58, y * 9);
    }
  }

  // Braços levemente abertos (pose de scan) e pernas.
  limb(0.20, 1.42, 0.36, 0.78, 0.048, 0.034, 13, 7);
  limb(-0.20, 1.42, -0.36, 0.78, 0.048, 0.034, 13, 7);
  limb(0.085, 0.90, 0.115, 0.05, 0.072, 0.046, 16, 8);
  limb(-0.085, 0.90, -0.115, 0.05, 0.072, 0.046, 16, 8);
  // Pés apontando pra frente (+z).
  limb(0.115, 0.04, 0.115, 0.03, 0.045, 0.04, 1, 7);
  limb(-0.115, 0.04, -0.115, 0.03, 0.045, 0.04, 1, 7);
  pts.forEach(p => { if (p.y < 0.06) p.z += 0.05; });

  // ── Estado ────────────────────────────────────────────────────────────
  let w = 0, h = 0, dpr = 1, cx = 0, cy = 0, S = 1;
  let angle = -0.6, vel = 0, dragging = false, lastX = 0, lastT = 0;
  let running = false, t0 = 0;
  const AUTO = 0.35; // rad/s de cruzeiro

  function resize() {
    // Mede o próprio canvas (no mobile ele não cobre o palco inteiro).
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

  function project(p, sinA, cosA) {
    const xr = p.x * cosA + p.z * sinA;
    const zr = -p.x * sinA + p.z * cosA;
    const s = 3 / (3 + zr);
    return [cx + xr * S * s, cy - (p.y - 0.9) * S * s, s, zr];
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const sinA = Math.sin(angle), cosA = Math.cos(angle);
    const baseY = cy + 0.9 * S * (3 / 3.0);

    // Plataforma: anéis pulsando + anel expandindo (sonar).
    const pulse = motionOK ? 0.5 + 0.5 * Math.sin(now / 900) : 0.5;
    for (const [r, a] of [[0.50, 0.35], [0.36, 0.2], [0.62, 0.14]]) {
      ctx.globalAlpha = a * (0.7 + 0.3 * pulse);
      ctx.strokeStyle = '#c6f24e';
      ctx.lineWidth = 1.2;
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
    // Disco de luz sob os pés.
    const grad = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, 0.5 * S);
    grad.addColorStop(0, 'rgba(198,242,78,0.14)');
    grad.addColorStop(1, 'rgba(198,242,78,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, baseY, 0.55 * S, 0.55 * S * 0.26, 0, 0, TAU);
    ctx.fill();

    // Scan: faixa sobe pelo corpo a cada ~5.5s.
    let scanY = -1;
    if (motionOK) {
      const sc = (now % 5500) / 5500;
      if (sc < 0.55) scanY = (sc / 0.55) * 1.8;
    }

    // Corpo: pontos com brilho por profundidade (frente acende).
    for (const p of pts) {
      const [sx, sy, s, zr] = project(p, sinA, cosA);
      const depth = (0.45 - zr) * 1.2; // zr negativo = mais perto
      let a = 0.28 + Math.max(0, Math.min(0.5, depth * 0.5));
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
      // Inércia do arrasto decai de volta pro giro de cruzeiro.
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
