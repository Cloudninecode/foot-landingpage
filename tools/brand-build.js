/**
 * Identidade Meia10 — gera todos os assets a partir de UMA fonte de verdade.
 * Rodar: npm i sharp text-to-svg && node tools/brand-build.js (na raiz do repo,
 * com foot-mobile ao lado — a fonte TTF vem do node_modules dele).
 *
 * A MARCA (escolhida 2026-07-14): campo listrado visto de cima, goleiras nas
 * laterais e o monograma M10 no centro do gramado — "o M10 é o dono do
 * meio-campo". Wordmark: MEIA10 (MEIA marfim + 10 lime), Hanken Grotesk
 * ExtraBold em paths (SVG independente de fonte instalada).
 *
 * Paleta (foot-mobile/src/theme): carvão #1B1A16 · lime #C6F24E · marfim #F0EEE6
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

const t2s = TextToSVG.loadSync(FONT);

function glyph(text, size, tracking = 0) {
  const opts = { fontSize: size, anchor: 'left top', letterSpacing: tracking };
  return { d: t2s.getD(text, opts), ...t2s.getMetrics(text, opts) };
}

// ─── A MARCA: campo listrado com goleiras e M10 no centro ───────────────────
// Desenhada num viewBox 512×512 (conteúdo paisagem centrado). `fg` permite a
// versão monocromática (Android themed icon); `knock` é o miolo das goleiras
// (carvão sobre fundos escuros; transparente no monochrome).
function markSVG({ fg = LIME, knock = CHARCOAL, stripes = true, uid = 'fld' } = {}) {
  const g = glyph('M10', 100, -0.04);
  const sc = 218 / g.width;
  const x = 256 - (g.width * sc) / 2;
  const y = 256 - (g.height * sc) / 2;
  const bands = stripes
    ? [0, 1, 2, 3, 4, 5].map((i) =>
        `<rect x="${56 + i * 66.6}" y="126" width="33.3" height="260" fill="${fg}" opacity="0.13"/>`).join('')
    : '';
  return `
    <clipPath id="${uid}"><rect x="56" y="126" width="400" height="260" rx="28"/></clipPath>
    <g clip-path="url(#${uid})">${bands}</g>
    <rect x="56" y="126" width="400" height="260" rx="28" fill="none" stroke="${fg}" stroke-width="22"/>
    <line x1="256" y1="126" x2="256" y2="170" stroke="${fg}" stroke-width="14"/>
    <line x1="256" y1="342" x2="256" y2="386" stroke="${fg}" stroke-width="14"/>
    <rect x="56" y="212" width="46" height="88" fill="${knock}" stroke="${fg}" stroke-width="14"/>
    <rect x="410" y="212" width="46" height="88" fill="${knock}" stroke="${fg}" stroke-width="14"/>
    <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc.toFixed(4)})"><path d="${g.d}" fill="${fg}"/></g>`;
}

// marca dentro de um tile quadrado (ícone de app / favicon)
function tileSVG({ size = 512, radius = 0.226, rounded = true, scale = 0.92, mono = false } = {}) {
  const rect = `<rect width="512" height="512" ${rounded ? `rx="${Math.round(512 * radius)}"` : ''} fill="${CHARCOAL}"/>`;
  const off = (512 * (1 - scale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
${rect}
<g transform="translate(${off} ${off}) scale(${scale})">${markSVG({ mono })}</g>
</svg>`;
}

// marca solta (transparente) — splash, adaptive foreground, uso in-app
function looseSVG({ size = 1024, fg = LIME, knock = CHARCOAL, occupancy = 1 } = {}) {
  const off = (512 * (1 - occupancy)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
<g transform="translate(${off} ${off}) scale(${occupancy})">${markSVG({ fg, knock })}</g>
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
  await img(looseSVG({ size: 1024, fg: '#FFFFFF', knock: 'none', occupancy: 0.58 })).png().toFile(out('android-icon-monochrome.png'));
  await img(looseSVG({ size: 1024, occupancy: 0.96 })).png().toFile(out('splash-icon.png'));
  await img(tileSVG({ size: 96, radius: 0.24 })).resize(48).png().toFile(out('favicon.png'));

  console.log('OK — assets gerados com a marca campo/M10');
}

main().catch((e) => { console.error(e); process.exit(1); });
