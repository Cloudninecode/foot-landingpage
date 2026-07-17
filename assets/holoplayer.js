// Holograma do jogador — "scanner de craque" na seção Para o Jogador.
// v2 (feedback 2026-07-17): wireframe de LINHAS em vez de pontos — anéis de
// contorno + meridianos, como scanner corporal sci-fi — e anatomia atlética
// (ombros largos, cintura, quadril estreito, pernas retas) pra matar o
// efeito "vestido" da v1. Canvas puro, zero libs. Arrastar gira.
(() => {
  const canvas = document.getElementById('holoplayer');
  if (!canvas) return;
  const stage = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const motionOK = matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const TAU = Math.PI * 2;

  // ── Geometria: partes do corpo como sequências de anéis ──────────────
  // Cada parte = { rings: [ [{x,y,z}...], ... ] } com nº de pontos IGUAL em
  // todos os anéis da parte (pra ligar meridianos entre anéis vizinhos).
  const parts = [];

  function ring(cx, y, rx, n, squash) {
    const rz = rx * squash;
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU;
      out.push({ x: cx + rx * Math.cos(t), y, z: rz * Math.sin(t) });
    }
    return out;
  }
  // Parte tubular: perfil = [[y, raio, xCentro?], ...], interpolado.
  function tube(profile, n, squash, step) {
    const rings = [];
    for (let i = 0; i < profile.length - 1; i++) {
      const [ya, ra, xa = 0] = profile[i], [yb, rb, xb = 0] = profile[i + 1];
      const steps = Math.max(1, Math.round(Math.abs(yb - ya) / step));
      for (let s = (i === 0 ? 0 : 1); s <= steps; s++) {
        const t = s / steps;
        rings.push(ring(xa + (xb - xa) * t, ya + (yb - ya) * t, ra + (rb - ra) * t, n, squash));
      }
    }
    parts.push({ rings });
  }

  // Cabeça: esfera por paralelos (levemente oval).
  {
    const rings = [];
    for (let row = 1; row < 9; row++) {
      const phi = (row / 9) * Math.PI;
      rings.push(ring(0, 1.605 + 0.115 * Math.cos(phi), 0.098 * Math.sin(phi), 14, 0.9));
    }
    parts.push({ rings });
  }
  // Pescoço.
  tube([[1.47, 0.05], [1.545, 0.045]], 10, 0.9, 0.035);
  // Tronco atlético: trapézio→ombros LARGOS→peito→cintura→quadril ESTREITO
  // fechando em V (nada de saia).
  tube([
    [1.47, 0.075],          // base do pescoço
    [1.445, 0.175],         // ombros/deltoides
    [1.30, 0.155],          // peito
    [1.10, 0.098],          // cintura marcada
    [0.97, 0.112],          // quadril (estreito, masculino)
    [0.885, 0.075],         // pelve fechando em V
  ], 18, 0.55, 0.04);
  // Braços com leve flexão no cotovelo, afastados do corpo (pose de scan).
  for (const side of [1, -1]) {
    tube([
      [1.43, 0.05, side * 0.205],
      [1.13, 0.041, side * 0.265],  // cotovelo
      [0.86, 0.03, side * 0.295],   // mão
    ], 8, 0.85, 0.045);
  }
  // Pernas RETAS e próximas (vão claro entre elas): coxa→joelho→canela→tornozelo.
  for (const side of [1, -1]) {
    tube([
      [0.92, 0.062, side * 0.072],
      [0.52, 0.046, side * 0.075],  // joelho
      [0.30, 0.05, side * 0.076],   // panturrilha
      [0.06, 0.028, side * 0.074],  // tornozelo
    ], 10, 0.8, 0.05);
    // Pé apontando pra frente.
    const foot = [];
    for (let s = 0; s <= 2; s++) {
      const r = ring(side * 0.074, 0.045 - s * 0.012, 0.032 - s * 0.004, 8, 1.1);
      r.forEach(p => { p.z += 0.05 + s * 0.01; });
      foot.push(r);
    }
    parts.push({ rings: foot });
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

  // Buckets de alpha (8 níveis × 2 cores): 1 stroke por bucket por frame,
  // em vez de ~1500 — barato até em celular.
  const LEVELS = 8;
  const buckets = [];
  for (let i = 0; i < LEVELS * 2; i++) buckets.push([]);

  function seg(x1, y1, x2, y2, alpha, hot) {
    const lv = Math.min(LEVELS - 1, Math.max(0, (alpha * LEVELS) | 0));
    buckets[lv + (hot ? LEVELS : 0)].push(x1, y1, x2, y2);
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

    // Projeta e acumula segmentos nos buckets.
    for (const b of buckets) b.length = 0;
    for (const part of parts) {
      const proj = part.rings.map(rg => rg.map(p => {
        const xr = p.x * cosA + p.z * sinA;
        const zr = -p.x * sinA + p.z * cosA;
        const s = 3 / (3 + zr);
        return [cx + xr * S * s, cy - (p.y - 0.9) * S * s, zr, p.y];
      }));
      for (let k = 0; k < proj.length; k++) {
        const rg = proj[k], n = rg.length;
        const hotRing = scanY >= 0 && Math.abs(part.rings[k][0].y - scanY) < 0.07;
        // Anel de contorno (fecha o loop).
        for (let i = 0; i < n; i++) {
          const a = rg[i], b = rg[(i + 1) % n];
          const depth = (0.45 - (a[2] + b[2]) / 2) * 0.9;
          const alpha = Math.min(0.85, Math.max(0.1, 0.16 + depth * 0.55)) + (hotRing ? 0.4 : 0);
          seg(a[0], a[1], b[0], b[1], Math.min(1, alpha), hotRing);
        }
        // Meridianos: liga este anel ao próximo (a cada 3 pontos, mais leve).
        if (k + 1 < proj.length && proj[k + 1].length === n) {
          const nx = proj[k + 1];
          for (let i = 0; i < n; i += 3) {
            const a = rg[i], b = nx[i];
            const depth = (0.45 - (a[2] + b[2]) / 2) * 0.9;
            seg(a[0], a[1], b[0], b[1], Math.max(0.06, (0.16 + depth * 0.55) * 0.45), false);
          }
        }
      }
    }
    // Desenha os buckets (1 stroke por nível de alpha/cor).
    ctx.lineWidth = 1;
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      if (!b.length) continue;
      ctx.globalAlpha = ((i % LEVELS) + 1) / LEVELS;
      ctx.strokeStyle = i < LEVELS ? '#c6f24e' : '#eaffb0';
      ctx.beginPath();
      for (let j = 0; j < b.length; j += 4) {
        ctx.moveTo(b[j], b[j + 1]);
        ctx.lineTo(b[j + 2], b[j + 3]);
      }
      ctx.stroke();
    }
    // Linha do scan atravessando a silhueta.
    if (scanY >= 0) {
      const yPix = cy - (scanY - 0.9) * S;
      ctx.globalAlpha = 0.30;
      ctx.strokeStyle = '#eaffb0';
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
