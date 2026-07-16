/**
 * Identidade Meia10 — gera todos os assets a partir de UMA fonte de verdade.
 * Rodar: npm i sharp text-to-svg && node tools/brand-build.js (na raiz do repo,
 * com foot-mobile ao lado — a fonte TTF vem do node_modules dele).
 *
 * A MARCA (redesenhada 2026-07-16, SVG do Fillipi): bola de futebol estilizada
 * — pentágono central lime com costuras — dentro de um anel lime, e o
 * monograma M10 embaixo (M branco, 10 lime). O texto Arial do SVG original
 * virou path de Hanken Grotesk SemiBold (a fonte da marca; renderiza igual em
 * qualquer servidor). Wordmark MEIA10 continua ExtraBold marfim+lime.
 *
 * Paleta da marca nova: lime #E4FF7A→#C4F146→#7FA828 · fundos #1B2530→#0A0E13
 * Paleta do produto (foot-mobile/src/theme): carvão #1B1A16 · marfim #F0EEE6
 */
const fs = require('fs');
const path = require('path');
const TextToSVG = require('text-to-svg');
const sharp = require('sharp');

const FONT = '/home/fillipi/development/foot/foot-mobile/node_modules/@expo-google-fonts/hanken-grotesk/800ExtraBold/HankenGrotesk_800ExtraBold.ttf';
const LIME = '#C6F24E';
const CHARCOAL = '#1B1A16';
const IVORY = '#F0EEE6';

const LANDING = '/home/fillipi/development/foot/foot-landingpage';
const MOBILE = '/home/fillipi/development/foot/foot-mobile';

const FONT600 = '/home/fillipi/development/foot/foot-mobile/node_modules/@expo-google-fonts/hanken-grotesk/600SemiBold/HankenGrotesk_600SemiBold.ttf';

const t2s = TextToSVG.loadSync(FONT);
const t2s600 = TextToSVG.loadSync(FONT600);

function glyph(text, size, tracking = 0) {
  const opts = { fontSize: size, anchor: 'left top', letterSpacing: tracking };
  return { d: t2s.getD(text, opts), ...t2s.getMetrics(text, opts) };
}

// ─── A MARCA: bola (pentágono + costuras) no anel + M10 ─────────────────────
// Desenhada num viewBox 512×512 (SVG do Fillipi, 2026-07-16). `fg` com cor
// única gera a versão monocromática (Android themed icon): traços em fg, sem
// gradientes nem painéis.
const BALL_LIME = '#C4F146';
function markSVG({ fg = null, uid = 'm10' } = {}) {
  const mono = fg != null && fg !== LIME;
  const stroke = mono ? fg : `url(#${uid}-lime)`;
  // M10 (Hanken Grotesk SemiBold em paths; baseline em y=384 como no original)
  const m = { d: t2s600.getD('M', { fontSize: 52, anchor: 'left baseline' }), w: t2s600.getMetrics('M', { fontSize: 52 }).width };
  const ten = { d: t2s600.getD('10', { fontSize: 52, anchor: 'left baseline' }), w: t2s600.getMetrics('10', { fontSize: 52 }).width };
  const x0 = 256 - (m.w + ten.w) / 2;
  const defs = mono ? '' : `
    <defs>
      <linearGradient id="${uid}-lime" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#E4FF7A"/><stop offset="0.5" stop-color="${BALL_LIME}"/><stop offset="1" stop-color="#7FA828"/>
      </linearGradient>
      <radialGradient id="${uid}-ball" cx="36%" cy="28%" r="95%">
        <stop offset="0" stop-color="#232F3A"/><stop offset="0.65" stop-color="#121B24"/><stop offset="1" stop-color="#080C10"/>
      </radialGradient>
      <clipPath id="${uid}-clip"><circle cx="256" cy="256" r="157"/></clipPath>
    </defs>`;
  const panels = mono ? '' : `
      <circle cx="256" cy="256" r="157" fill="url(#${uid}-ball)"/>
      <polygon points="256,170.7 307.2,208.2 370.7,148.8 256,99" fill="#141F2A"/>
      <polygon points="307.2,208.2 286.7,269.7 399.4,319.8 370.7,148.8" fill="#0E1721"/>
      <polygon points="286.7,269.7 225.3,269.7 112.6,319.8 399.4,319.8" fill="#141F2A"/>
      <polygon points="225.3,269.7 204.8,208.2 141.3,148.8 112.6,319.8" fill="#0E1721"/>
      <polygon points="204.8,208.2 256,170.7 256,99 141.3,148.8" fill="#141F2A"/>
      <polygon points="256,170.7 307.2,208.2 286.7,269.7 225.3,269.7 204.8,208.2" fill="#05080B"/>`;
  const ballGroup = mono
    ? `<g>
      <polygon points="256,170.7 307.2,208.2 286.7,269.7 225.3,269.7 204.8,208.2" fill="none" stroke="${stroke}" stroke-width="8.5" stroke-linejoin="round"/>
      <path d="M256 170.7 L256 136.5 M204.8 208.2 L170.7 194.6 M307.2 208.2 L341.3 194.6 M225.3 269.7 L204.8 314 M286.7 269.7 L307.2 314" fill="none" stroke="${stroke}" stroke-width="8.5" stroke-linecap="round"/>
      <circle cx="256" cy="218.5" r="13.7" fill="${fg}"/>
      <circle cx="256" cy="256" r="157" fill="none" stroke="${stroke}" stroke-width="10"/>
    </g>`
    : `<g clip-path="url(#${uid}-clip)">${panels}
      <polygon points="256,170.7 307.2,208.2 286.7,269.7 225.3,269.7 204.8,208.2" fill="none" stroke="${stroke}" stroke-width="8.5" stroke-linejoin="round"/>
      <path d="M256 170.7 L256 136.5 M204.8 208.2 L170.7 194.6 M307.2 208.2 L341.3 194.6 M225.3 269.7 L204.8 314 M286.7 269.7 L307.2 314" fill="none" stroke="${stroke}" stroke-width="8.5" stroke-linecap="round"/>
      <circle cx="256" cy="218.5" r="13.7" fill="${BALL_LIME}"/>
      <ellipse cx="204.8" cy="180.9" rx="51" ry="27" fill="#ffffff" opacity="0.08"/>
    </g>`;
  return `${defs}
    <circle cx="256" cy="256" r="205" fill="none" stroke="${stroke}" stroke-width="24"/>
    ${ballGroup}
    <g transform="translate(${x0.toFixed(1)} 384)"><path d="${m.d}" fill="${mono ? fg : '#FFFFFF'}"/></g>
    <g transform="translate(${(x0 + m.w).toFixed(1)} 384)"><path d="${ten.d}" fill="${mono ? fg : BALL_LIME}"/></g>`;
}

// marca dentro de um tile quadrado (ícone de app / favicon)
function tileSVG({ size = 512, radius = 0.226, rounded = true, scale = 0.92 } = {}) {
  const rect = `<rect width="512" height="512" ${rounded ? `rx="${Math.round(512 * radius)}"` : ''} fill="url(#tile-bg)"/>`;
  const off = (512 * (1 - scale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
<defs><radialGradient id="tile-bg" cx="40%" cy="32%" r="90%">
  <stop offset="0" stop-color="#1B2530"/><stop offset="1" stop-color="#0A0E13"/>
</radialGradient></defs>
${rect}
<g transform="translate(${off} ${off}) scale(${scale})">${markSVG({})}</g>
</svg>`;
}

// marca solta (transparente) — splash, adaptive foreground, uso in-app
function looseSVG({ size = 1024, fg = null, occupancy = 1 } = {}) {
  const off = (512 * (1 - occupancy)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
<g transform="translate(${off} ${off}) scale(${occupancy})">${markSVG({ fg })}</g>
</svg>`;
}

// ─── Wordmark MEIA10 ─────────────────────────────────────────────────────────
function wordmarkSVG({ meiaColor = IVORY, tenColor = LIME }) {
  const SIZEPX = 100;
  const meia = glyph('MEIA', SIZEPX, -0.015);
  const ten = glyph('10', SIZEPX, -0.03);
  const gap = SIZEPX * 0.06;
  const w = meia.width + gap + ten.width;
  const h = Math.max(meia.height, ten.height);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${(w + 12).toFixed(0)} ${(h + 12).toFixed(0)}" role="img" aria-label="MEIA10">
<g transform="translate(6 6)">
  <path d="${meia.d}" fill="${meiaColor}"/>
  <g transform="translate(${(meia.width + gap).toFixed(2)} 0)"><path d="${ten.d}" fill="${tenColor}"/></g>
</g>
</svg>`;
}

// ─── OG image 1200×630: marca + wordmark + tagline ──────────────────────────
function ogSVG() {
  const SIZEPX = 128;
  const meia = glyph('MEIA', SIZEPX, -0.015);
  const ten = glyph('10', SIZEPX, -0.03);
  const gap = SIZEPX * 0.06;
  const w = meia.width + gap + ten.width;
  const x = (1200 - w) / 2;
  const tag = glyph('O futebol amador valendo.', 40, 0);
  const url = glyph('meia10.com.br', 28, 0.08);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${CHARCOAL}"/>
<rect x="0" y="0" width="1200" height="8" fill="${LIME}"/>
<g transform="translate(472 30) scale(0.5)">${markSVG({ uid: 'og' })}</g>
<g transform="translate(${x.toFixed(2)} 300)">
  <path d="${meia.d}" fill="${IVORY}"/>
  <g transform="translate(${(meia.width + gap).toFixed(2)} 0)"><path d="${ten.d}" fill="${LIME}"/></g>
</g>
<g transform="translate(${((1200 - tag.width) / 2).toFixed(2)} 468)"><path d="${tag.d}" fill="#A8A296"/></g>
<g transform="translate(${((1200 - url.width) / 2).toFixed(2)} 560)"><path d="${url.d}" fill="${LIME}"/></g>
</svg>`;
}

async function main() {
  const brandDir = path.join(LANDING, 'assets', 'brand');
  fs.mkdirSync(brandDir, { recursive: true });

  // SVGs mestres
  fs.writeFileSync(path.join(brandDir, 'mark.svg'), looseSVG({}));
  fs.writeFileSync(path.join(brandDir, 'icon.svg'), tileSVG({}));
  fs.writeFileSync(path.join(brandDir, 'logo.svg'), wordmarkSVG({}));
  fs.writeFileSync(path.join(brandDir, 'logo-light-bg.svg'), wordmarkSVG({ meiaColor: CHARCOAL, tenColor: '#7A9E1E' }));
  fs.writeFileSync(path.join(LANDING, 'assets', 'favicon.svg'), tileSVG({ radius: 0.24 }));

  await sharp(Buffer.from(ogSVG())).png().toFile(path.join(LANDING, 'assets', 'og.png'));

  // Assets do Expo
  const img = (svg) => sharp(Buffer.from(svg));
  const out = (f) => path.join(MOBILE, 'assets', 'images', f);
  await img(tileSVG({ size: 1024, rounded: false, scale: 0.86 })).png().toFile(out('icon.png'));
  await img(looseSVG({ size: 1024, occupancy: 0.58 })).png().toFile(out('android-icon-foreground.png'));
  await img(looseSVG({ size: 1024, fg: '#FFFFFF', occupancy: 0.58 })).png().toFile(out('android-icon-monochrome.png'));
  await img(looseSVG({ size: 1024, occupancy: 0.96 })).png().toFile(out('splash-icon.png'));
  await img(tileSVG({ size: 96, radius: 0.24 })).resize(48).png().toFile(out('favicon.png'));

  console.log('OK — assets gerados com a marca bola/M10 (2026-07-16)');
}

main().catch((e) => { console.error(e); process.exit(1); });
