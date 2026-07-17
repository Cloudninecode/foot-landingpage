// Mapa-múndi de pontos no hero — "a várzea é o maior campeonato do mundo".
// Gerado offline a partir do BlankMap-World.svg (Wikimedia, domínio público),
// amostrado numa grade 112×52 e empacotado em bits (base64 abaixo). Zero
// dependência em runtime: canvas puro. Pontos acendem perto do cursor e
// "pings" de atividade pulsam pelo mapa, com viés pro Brasil.
(() => {
  const canvas = document.getElementById('worldmap');
  if (!canvas) return;

  const COLS = 112, ROWS = 52;
  const DATA = 'AAAAAAAAAAAAAAAAAAAAAAAAD//gIACAAAAAAAAAAAd+/8DAAHgAAAAAAAAAH/w/wABh/4gAAAAAAH3+/j+APE////wAAAAB///ufAB//////8AAAAP//8xwwP//////gAAAB//+MCAB3/////8AAAAGH/48AAnf////hgAAAAAf/3wAGf/////DAAAAAB///gAf//////AAAAAAH//2AA//////8AAAAAAf//AAB//////wAAAAAD//wAAf+O///+QAAAAAf/8AAD1/////xAAAAAB//gAAGRf///9kAAAAAD/+AAAfAf///6wAAAAAP/gAAD/b////kAAAAAA/yAAAP//////AAAAAAB8IAAB//////4AAAAAADwgAAP///n//wAAAAAAHZAAA///+P34AAAAAAAfBAAD//7wePCAAAAAAAOAAAP//+BweIAAAAAAAIAAA///gDB4wAAAAAAAXwAD///gMFBAAAAAAAAfgAH//8AAIUAAAAAAAB/gAAf/wABjAAAAAAAAP/AAA/+AAGcAAAAAAAA//AAD/wAANo4AAAAAAD//AAP+AAAQhwAAAAAAP/8AAf4AAA4DgAAAAAAf/wAB/wAAAAAAAAAAAB/+AAH/AAAAGgAAAAAAD/4AA/9gAAB7AAAAAAAH/gAD/sAAAP8AAAAAAAf+AAH8wAAD/4AAAAAAB/wAAfzAAAf/gAAAAAAH+AAB+AAAB/+AAAAAAAfwAAD4AAAH/4AAAAAAA/AAAPAAAAe/AAAAAAAD4AAAAAAABB4AAAAAAAPgAAAAAAAADgYAAAAAA4AAAAAAAAAIBAAAAAADgAAAAAAAAAAwAAAAAAGAAAAAAAAAACAAAAAAAYAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAA=';

  // Desempacota os bits → lista de pontos de terra (coordenadas da grade).
  const raw = atob(DATA);
  const dots = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    if ((raw.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1) {
      dots.push({ c: i % COLS, r: (i / COLS) | 0 });
    }
  }

  // Caixa aproximada do Brasil na grade (fração do mapa) — pings puxam pra cá.
  const BRAZIL = { c0: 0.26 * COLS, c1: 0.36 * COLS, r0: 0.52 * ROWS, r1: 0.74 * ROWS };
  const inBrazil = (d) => d.c >= BRAZIL.c0 && d.c <= BRAZIL.c1 && d.r >= BRAZIL.r0 && d.r <= BRAZIL.r1;
  const brazilDots = dots.filter(inBrazil);

  const ctx = canvas.getContext('2d');
  const motionOK = matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  let w = 0, h = 0, dpr = 1, step = 0, ox = 0, oy = 0;
  const mouse = { x: -1e4, y: -1e4 };
  const pings = [];
  let running = false, lastPing = 0;

  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = box.width; h = box.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Mapa cobre a largura, centralizado no eixo Y do hero.
    step = w / (COLS + 2);
    ox = step * 1.5;
    oy = (h - step * ROWS) / 2;
    draw(0);
  }

  const px = (d) => ox + d.c * step;
  const py = (d) => oy + d.r * step;

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const R = step * 0.14 + 0.6; // raio base do ponto

    for (const d of dots) {
      const x = px(d), y = py(d);
      // Proximidade do cursor: acende e cresce.
      const dx = x - mouse.x, dy = y - mouse.y;
      const dist2 = dx * dx + dy * dy;
      const near = Math.max(0, 1 - dist2 / (150 * 150));
      let a = 0.17 + near * 0.55;
      let r = R * (1 + near * 0.9);

      // Pings: anel expandindo + ponto flamejando.
      for (const p of pings) {
        if (p.d === d) {
          const t = (now - p.t0) / p.dur;
          if (t < 1) { a = Math.max(a, 0.9 * (1 - t)); r = R * (1.6 - 0.6 * t); }
        }
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = '#c6f24e';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
    }

    // Anéis dos pings (por cima dos pontos).
    for (let i = pings.length - 1; i >= 0; i--) {
      const p = pings[i];
      const t = (now - p.t0) / p.dur;
      if (t >= 1) { pings.splice(i, 1); continue; }
      ctx.globalAlpha = 0.5 * (1 - t);
      ctx.strokeStyle = '#c6f24e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px(p.d), py(p.d), 4 + t * step * 3.2, 0, 6.2832);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function tick(now) {
    if (!running) return;
    // Novo ping a cada ~1.4s; 40% das vezes nasce no Brasil.
    if (now - lastPing > 1400 && dots.length) {
      lastPing = now + Math.random() * 600;
      const pool = Math.random() < 0.4 && brazilDots.length ? brazilDots : dots;
      pings.push({ d: pool[(Math.random() * pool.length) | 0], t0: now, dur: 2200 });
    }
    draw(now);
    requestAnimationFrame(tick);
  }

  resize();
  addEventListener('resize', resize, { passive: true });

  if (finePointer) {
    const hero = canvas.closest('.hero');
    hero.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
  }

  if (motionOK && 'IntersectionObserver' in window) {
    // Anima só com o hero na tela (economiza bateria).
    new IntersectionObserver((entries) => {
      const vis = entries[0].isIntersecting;
      if (vis && !running) { running = true; requestAnimationFrame(tick); }
      else if (!vis) running = false;
    }).observe(canvas);
  } else if (finePointer) {
    // Sem animação contínua: redesenha só quando o mouse mexe.
    canvas.closest('.hero').addEventListener('pointermove', () => draw(0), { passive: true });
  }
})();
