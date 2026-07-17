// Central de comando do organizador — simulação do dia de jogo em loop:
// pulsos de PIX chegam, vagas acendem, arrecadação rola, e no fim o repasse
// cai na chave PIX com a taxa descontada à vista (12×R$75 → R$900 − 10% →
// R$810, o take rate real). HTML pros textos (nítido), canvas só pros
// efeitos de luz. Zero libs; roda apenas com a seção visível.
(() => {
  const panel = document.getElementById('cmdPanel');
  if (!panel) return;
  const canvas = document.getElementById('cmdFx');
  const ctx = canvas.getContext('2d');
  const roster = document.getElementById('cmdRoster');
  const $ = (id) => document.getElementById(id);
  const money = $('cmdMoney'), bar = $('cmdBar'), count = $('cmdCount'),
        status = $('cmdStatus'), payout = $('cmdPayoutVal'), fee = $('cmdFee'),
        payoutBox = $('cmdPayout');
  const motionOK = matchMedia('(prefers-reduced-motion: no-preference)').matches;

  const SLOTS = 12, PRICE = 7500; // centavos
  const TOTAL = SLOTS * PRICE, FEE = TOTAL * 0.10;

  // Monta o elenco.
  const slots = [];
  for (let i = 1; i <= SLOTS; i++) {
    const el = document.createElement('div');
    el.className = 'slot';
    el.innerHTML = '<span>' + i + '</span>';
    roster.appendChild(el);
    slots.push(el);
  }

  const fmt = (c) => 'R$ ' + Math.round(c / 100).toLocaleString('pt-BR');

  // Estado da simulação.
  let paid = 0, shown = 0, target = 0;
  let pulses = [], beams = [], floats = [];
  let running = false, phase = 'filling', phaseT = 0, nextPay = 0;

  function reset() {
    paid = 0; shown = 0; target = 0;
    pulses = []; beams = []; floats = [];
    slots.forEach(s => s.classList.remove('paid'));
    money.textContent = fmt(0);
    bar.style.width = '0%';
    count.textContent = '0/' + SLOTS + ' vagas pagas';
    status.textContent = 'Inscrições abertas';
    status.className = 'cmd-status';
    payout.textContent = '—';
    fee.textContent = '';
    payoutBox.classList.remove('done');
    phase = 'filling'; phaseT = 0; nextPay = 400;
  }

  function finalState() { // reduced-motion: retrato final, sem loop
    slots.forEach(s => s.classList.add('paid'));
    money.textContent = fmt(TOTAL);
    bar.style.width = '100%';
    count.textContent = SLOTS + '/' + SLOTS + ' vagas pagas';
    status.textContent = 'Repasse feito ✓';
    status.className = 'cmd-status ok';
    payout.textContent = fmt(TOTAL - FEE);
    fee.textContent = 'taxa de serviço −' + fmt(FEE);
    payoutBox.classList.add('done');
  }

  function resize() {
    const box = panel.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = box.width * dpr; canvas.height = box.height * dpr;
    canvas.style.width = box.width + 'px'; canvas.style.height = box.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const center = (el) => {
    const p = panel.getBoundingClientRect(), r = el.getBoundingClientRect();
    return [r.left - p.left + r.width / 2, r.top - p.top + r.height / 2];
  };

  function spawnPulse() {
    const unpaid = slots.filter(s => !s.classList.contains('paid'));
    if (!unpaid.length) return;
    const slot = unpaid[(Math.random() * unpaid.length) | 0];
    const [x0, y0] = center(slot), [x1, y1] = center(money);
    pulses.push({ slot, x0, y0, x1, y1, t0: performance.now(), dur: 480 });
  }

  function arrive(p) {
    p.slot.classList.add('paid');
    paid++; target += PRICE;
    bar.style.width = (paid / SLOTS * 100) + '%';
    count.textContent = paid + '/' + SLOTS + ' vagas pagas';
    floats.push({ x: p.x1, y: p.y1 - 14, t0: performance.now(), txt: '+ R$ 75' });
    if (paid === SLOTS) {
      status.textContent = 'Elenco completo ✓';
      status.className = 'cmd-status ok';
      phase = 'full'; phaseT = performance.now();
    }
  }

  function doPayout() {
    const [x0, y0] = center(money), [x1, y1] = center(payoutBox);
    beams.push({ x0, y0, x1, y1, t0: performance.now(), dur: 700 });
    setTimeout(() => {
      payout.textContent = fmt(TOTAL - FEE);
      fee.textContent = 'taxa de serviço −' + fmt(FEE);
      payoutBox.classList.add('done');
      status.textContent = 'Repasse feito ✓';
    }, 650);
    phase = 'paid'; phaseT = performance.now();
  }

  function tick(now) {
    if (!running) return;

    // Orquestração do loop.
    if (phase === 'filling' && now > nextPay) {
      spawnPulse();
      nextPay = now + 700 + Math.random() * 700;
    } else if (phase === 'full' && now - phaseT > 1100) {
      doPayout();
    } else if (phase === 'paid' && now - phaseT > 4200) {
      panel.classList.add('reset');
      setTimeout(() => { reset(); panel.classList.remove('reset'); }, 350);
      phase = 'resetting'; phaseT = now;
    }

    // Contador rolando suave até o alvo.
    if (shown < target) {
      shown = Math.min(target, shown + Math.max(80, (target - shown) * 0.12));
      money.textContent = fmt(shown);
    }

    // FX no canvas.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      const t = (now - p.t0) / p.dur;
      if (t >= 1) { arrive(p); pulses.splice(i, 1); continue; }
      // Bézier com arco pra cima; cauda de 5 fantasmas.
      const cxp = (p.x0 + p.x1) / 2, cyp = Math.min(p.y0, p.y1) - 46;
      for (let g = 0; g < 5; g++) {
        const tt = Math.max(0, t - g * 0.045);
        const u = 1 - tt;
        const x = u * u * p.x0 + 2 * u * tt * cxp + tt * tt * p.x1;
        const y = u * u * p.y0 + 2 * u * tt * cyp + tt * tt * p.y1;
        ctx.globalAlpha = (1 - g / 5) * 0.9;
        ctx.fillStyle = g ? '#c6f24e' : '#eaffb0';
        ctx.beginPath();
        ctx.arc(x, y, 3.2 - g * 0.5, 0, 6.2832);
        ctx.fill();
      }
    }
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      const t = (now - b.t0) / b.dur;
      if (t >= 1.4) { beams.splice(i, 1); continue; }
      const head = Math.min(1, t * 1.4), tail = Math.max(0, t * 1.4 - 0.45);
      ctx.globalAlpha = 0.85 * (1.4 - t);
      ctx.strokeStyle = '#d8b94a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x0 + (b.x1 - b.x0) * tail, b.y0 + (b.y1 - b.y0) * tail);
      ctx.lineTo(b.x0 + (b.x1 - b.x0) * head, b.y0 + (b.y1 - b.y0) * head);
      ctx.stroke();
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      const t = (now - f.t0) / 900;
      if (t >= 1) { floats.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = '#c6f24e';
      ctx.font = '700 12px "Hanken Grotesk", sans-serif';
      ctx.fillText(f.txt, f.x + 8, f.y - t * 22);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }

  resize();
  addEventListener('resize', resize, { passive: true });

  if (!motionOK) { finalState(); return; }
  reset();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      const vis = entries[0].isIntersecting;
      if (vis && !running) { running = true; requestAnimationFrame(tick); }
      else if (!vis) running = false;
    }, { threshold: 0.3 }).observe(panel);
  } else { running = true; requestAnimationFrame(tick); }
})();
