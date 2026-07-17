// O cofre da várzea — seção Segurança: uma bola de futebol de pontos
// (icosaedro truncado DE VERDADE: 60 vértices, 90 costuras — a geometria
// clássica da bola) girando dentro de um campo de força que absorve
// impactos, e um cadeado holográfico que TRANCA quando a seção aparece.
// Canvas puro, zero libs; reduced-motion = retrato estático já trancado.
(() => {
  const canvas = document.getElementById('vaultFx');
  if (!canvas) return;
  const stage = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const motionOK = matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const TAU = Math.PI * 2;

  // ── Geometria: icosaedro truncado (bola de futebol) ──────────────────
  const PHI = (1 + Math.sqrt(5)) / 2;
  const ico = [];
  for (const [a, b] of [[1, PHI], [-1, PHI], [1, -PHI], [-1, -PHI]]) {
    ico.push([0, a, b], [a, b, 0], [b, 0, a]);
  }
  const near = (p, q, d) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < d;
  // Arestas do icosaedro (comprimento 2).
  const edges = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
    if (near(ico[i], ico[j], 2.1)) edges.push([i, j]);
  }
  const lerp3 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  // Costuras da bola: o terço central de cada aresta (30) + os pentágonos
  // em volta de cada vértice original (60) = 90 costuras.
  const seams = [];
  for (const [i, j] of edges) seams.push([lerp3(ico[i], ico[j], 1 / 3), lerp3(ico[i], ico[j], 2 / 3)]);
  for (let v = 0; v < 12; v++) {
    const ring = edges.filter(e => e.includes(v))
      .map(([i, j]) => lerp3(ico[v], ico[i === v ? j : i], 1 / 3));
    // Ordena os 5 pontos em volta do vértice e liga em pentágono.
    const c = ico[v];
    const ux = ring[0].map((x, k) => x - c[k]);
    const uz = [c[1] * ux[2] - c[2] * ux[1], c[2] * ux[0] - c[0] * ux[2], c[0] * ux[1] - c[1] * ux[0]];
    ring.sort((p, q) => {
      const ang = (p) => Math.atan2(
        (p[0] - c[0]) * uz[0] + (p[1] - c[1]) * uz[1] + (p[2] - c[2]) * uz[2],
        (p[0] - c[0]) * ux[0] + (p[1] - c[1]) * ux[1] + (p[2] - c[2]) * ux[2]);
      return ang(p) - ang(q);
    });
    for (let k = 0; k < 5; k++) seams.push([ring[k], ring[(k + 1) % 5]]);
  }
  // Pontos ao longo das costuras, projetados na esfera unitária.
  const pts = [];
  const norm = (p) => { const l = Math.hypot(...p); return [p[0] / l, p[1] / l, p[2] / l]; };
  for (const [a, b] of seams) {
    for (let s = 0; s <= 4; s++) {
      const [x, y, z] = norm(lerp3(a, b, s / 4));
      pts.push({ x, y, z });
    }
  }

  // ── Estado ────────────────────────────────────────────────────────────
  let w = 0, h = 0, cx = 0, cy = 0, R = 1;
  let angle = 0, running = false, activated = false, lockT = -1;
  const impacts = [];
  let nextImpact = 0;

  function resize() {
    canvas.style.width = canvas.style.height = '';
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = box.width; h = box.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2; cy = h * 0.46;
    R = Math.min(h * 0.30, w * 0.22);
    draw(performance.now());
  }

  function drawLock(now) {
    // Cadeado holográfico na frente da bola; a haste desce ao trancar.
    const t = lockT < 0 ? 0 : Math.min(1, (now - lockT) / 700);
    const ease = 1 - Math.pow(1 - t, 3);
    const s = R / 90;                    // escala do cadeado
    const bw = 54 * s, bh = 40 * s;      // corpo
    const y0 = cy + R * 0.55;            // posição: baixo-frente da bola
    const lift = (1 - ease) * 26 * s;    // haste erguida antes do clack

    ctx.save();
    ctx.translate(cx, y0);
    ctx.strokeStyle = '#eaffb0';
    ctx.fillStyle = 'rgba(19,18,16,0.88)';
    ctx.lineWidth = Math.max(1.5, 2.2 * s);
    ctx.shadowColor = 'rgba(198,242,78,0.8)';
    ctx.shadowBlur = 16 * s;
    // Haste.
    ctx.beginPath();
    ctx.arc(0, -bh / 2 - lift, bw * 0.34, Math.PI, 0);
    ctx.stroke();
    // Corpo.
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 7 * s);
    ctx.fill();
    ctx.stroke();
    // Fechadura.
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#c6f24e';
    ctx.beginPath();
    ctx.arc(0, -2 * s, 4.5 * s, 0, TAU);
    ctx.fill();
    ctx.fillRect(-1.8 * s, 0, 3.6 * s, 9 * s);
    ctx.restore();

    // Clack: anel de choque no momento do tranco.
    if (t > 0 && t < 1 && ease > 0.96) stage.classList.add('locked');
    if (lockT > 0) {
      const st = (now - lockT - 700) / 600;
      if (st > 0 && st < 1) {
        ctx.globalAlpha = 0.6 * (1 - st);
        ctx.strokeStyle = '#eaffb0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, y0, bw * (0.7 + st * 2.2), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const sinA = Math.sin(angle), cosA = Math.cos(angle);
    const tilt = 0.35;

    // Campo de força: anéis + impactos absorvidos.
    ctx.strokeStyle = '#c6f24e';
    ctx.lineWidth = 1;
    const FR = R * 1.42;
    for (const [ry, a] of [[0.32, 0.16], [0.72, 0.12], [1.0, 0.2]]) {
      ctx.globalAlpha = a * (motionOK ? 0.7 + 0.3 * Math.sin(now / 1100 + ry * 5) : 1);
      ctx.beginPath();
      ctx.ellipse(cx, cy, FR, FR * ry, 0, 0, TAU);
      ctx.stroke();
    }
    for (let i = impacts.length - 1; i >= 0; i--) {
      const im = impacts[i];
      const t = (now - im.t0) / 900;
      if (t >= 1) { impacts.splice(i, 1); continue; }
      ctx.globalAlpha = 0.5 * (1 - t);
      ctx.beginPath();
      ctx.arc(cx + FR * Math.cos(im.a) * 0.92, cy + FR * 0.55 * Math.sin(im.a), 6 + t * 26, 0, TAU);
      ctx.stroke();
    }

    // A bola: pontos das costuras, frente mais acesa.
    for (const p of pts) {
      const x1 = p.x * cosA + p.z * sinA;
      const z1 = -p.x * sinA + p.z * cosA;
      const y1 = p.y * Math.cos(tilt) - z1 * Math.sin(tilt);
      const z2 = p.y * Math.sin(tilt) + z1 * Math.cos(tilt);
      const s = 3 / (3 + z2);
      ctx.globalAlpha = 0.22 + Math.max(0, -z2) * 0.55;
      ctx.fillStyle = '#c6f24e';
      ctx.beginPath();
      ctx.arc(cx + x1 * R * s, cy - y1 * R * s, 1.6 * s, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawLock(now);
  }

  function tick(now) {
    if (!running) return;
    angle += 0.0045;
    if (now > nextImpact) {
      impacts.push({ a: Math.random() * TAU, t0: now });
      nextImpact = now + 1800 + Math.random() * 1600;
    }
    draw(now);
    requestAnimationFrame(tick);
  }

  resize();
  addEventListener('resize', resize, { passive: true });

  if (!motionOK) {
    lockT = 0; stage.classList.add('locked'); draw(performance.now());
    return;
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      const vis = entries[0].isIntersecting;
      if (vis && !activated) { activated = true; lockT = performance.now() + 600; }
      if (vis && !running) { running = true; requestAnimationFrame(tick); }
      else if (!vis) running = false;
    }, { threshold: 0.3 }).observe(stage);
  } else { activated = true; lockT = performance.now() + 600; running = true; requestAnimationFrame(tick); }
})();
