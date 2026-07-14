/**
 * Identidade Meia10 — gera todos os assets a partir de UMA fonte de verdade:
 * o glifo "10" e o wordmark "MEIA10" em Hanken Grotesk ExtraBold (a fonte do
 * app), convertidos em paths (SVG independente de fonte instalada).
 *
 * Paleta (foot-mobile/src/theme): carvão #1B1A16 · lime #C6F24E · marfim #F0EEE6
 */
// Rodar: npm i sharp text-to-svg && node tools/brand-build.js (na raiz do repo,
// com foot-mobile ao lado — a fonte TTF vem do node_modules dele).
const fs = require('fs');
const path = require('path');
const TextToSVG = require('text-to-svg');
const sharp = require('sharp');

const FONT = '/home/fillipi/development/foot/foot-mobile/node_modules/@expo-google-fonts/hanken-grotesk/800ExtraBold/HankenGrotesk_800ExtraBold.ttf';
const LIME = '#C6F24E';
const CHARCOAL = '#1B1A16';
const IVORY = '#F0EEE6';
const ON_PRIMARY = '#0A0B0D';

const LANDING = '/home/fillipi/development/foot/foot-landingpage';
const MOBILE = '/home/fillipi/development/foot/foot-mobile';

const t2s = TextToSVG.loadSync(FONT);

// path + largura real de um texto na fonte (baseline em y=0)
function glyph(text, size, tracking = 0) {
  const opts = { fontSize: size, anchor: 'left top', letterSpacing: tracking };
  const d = t2s.getD(text, opts);
  const m = t2s.getMetrics(text, opts);
  return { d, width: m.width, height: m.height };
}

// ─── 1. Ícone (marca): "10" lime no quadrado carvão arredondado ─────────────
function iconSVG({ size = 512, bg = CHARCOAL, fg = LIME, radius = 0.226, pad = 0.18, rounded = true }) {
  const g = glyph('10', 100, -0.03); // mede em 100 e escala
  const target = size * (1 - pad * 2);
  const scale = target / g.width;
  const w = g.width * scale;
  const h = g.height * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  const rect = rounded ? `<rect width="${size}" height="${size}" rx="${Math.round(size * radius)}" fill="${bg}"/>` : bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
${rect}
<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)})"><path d="${g.d}" fill="${fg}"/></g>
</svg>`;
}

// glifo solto (sem fundo) — pro adaptive/monochrome/splash
function glyphOnlySVG({ size = 1024, fg = LIME, occupancy = 0.62 }) {
  const g = glyph('10', 100, -0.03);
  const target = size * occupancy;
  const scale = target / g.width;
  const w = g.width * scale;
  const h = g.height * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)})"><path d="${g.d}" fill="${fg}"/></g>
</svg>`;
}

// ─── 2. Wordmark: MEIA (marfim) + 10 (lime), caixa alta, tracking apertado ──
function wordmarkSVG({ meiaColor = IVORY, tenColor = LIME }) {
  const SIZEPX = 100;
  const meia = glyph('MEIA', SIZEPX, -0.015);
  const ten = glyph('10', SIZEPX, -0.03);
  const gap = SIZEPX * 0.06;
  const w = meia.width + gap + ten.width;
  const h = Math.max(meia.height, ten.height);
  const padX = 6, padY = 6;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${(w + padX * 2).toFixed(0)} ${(h + padY * 2).toFixed(0)}" role="img" aria-label="MEIA10">
<g transform="translate(${padX} ${padY})">
  <path d="${meia.d}" fill="${meiaColor}"/>
  <g transform="translate(${(meia.width + gap).toFixed(2)} 0)"><path d="${ten.d}" fill="${tenColor}"/></g>
</g>
</svg>`;
}

// ─── 3. OG image 1200×630 ────────────────────────────────────────────────────
function ogSVG() {
  const SIZEPX = 150;
  const meia = glyph('MEIA', SIZEPX, -0.015);
  const ten = glyph('10', SIZEPX, -0.03);
  const gap = SIZEPX * 0.06;
  const w = meia.width + gap + ten.width;
  const x = (1200 - w) / 2;
  const y = 200;
  const tag = glyph('O futebol amador valendo.', 44, 0);
  const tagX = (1200 - tag.width) / 2;
  const url = glyph('meia10.com.br', 30, 0.08);
  const urlX = (1200 - url.width) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${CHARCOAL}"/>
<rect x="0" y="0" width="1200" height="8" fill="${LIME}"/>
<g transform="translate(${x.toFixed(2)} ${y})">
  <path d="${meia.d}" fill="${IVORY}"/>
  <g transform="translate(${(meia.width + gap).toFixed(2)} 0)"><path d="${ten.d}" fill="${LIME}"/></g>
</g>
<g transform="translate(${tagX.toFixed(2)} 400)"><path d="${tag.d}" fill="#A8A296"/></g>
<g transform="translate(${urlX.toFixed(2)} 520)"><path d="${url.d}" fill="${LIME}"/></g>
</svg>`;
}

async function main() {
  const brandDir = path.join(LANDING, 'assets', 'brand');
  fs.mkdirSync(brandDir, { recursive: true });

  // SVGs mestres (landing/brand kit)
  const icon = iconSVG({});
  fs.writeFileSync(path.join(brandDir, 'icon.svg'), icon);
  fs.writeFileSync(path.join(brandDir, 'logo.svg'), wordmarkSVG({})); // p/ fundo escuro
  fs.writeFileSync(path.join(brandDir, 'logo-light-bg.svg'), wordmarkSVG({ meiaColor: CHARCOAL, tenColor: '#7A9E1E' }));
  fs.writeFileSync(path.join(LANDING, 'assets', 'favicon.svg'), iconSVG({ size: 64, radius: 0.24 }));

  // OG image
  await sharp(Buffer.from(ogSVG())).png().toFile(path.join(LANDING, 'assets', 'og.png'));

  // Assets do Expo
  const img = (svg) => sharp(Buffer.from(svg));
  const out = (f) => path.join(MOBILE, 'assets', 'images', f);
  await img(iconSVG({ size: 1024, rounded: false, pad: 0.22 })).resize(1024).png().toFile(out('icon.png'));
  await img(glyphOnlySVG({ size: 1024, occupancy: 0.52 })).png().toFile(out('android-icon-foreground.png'));
  await img(glyphOnlySVG({ size: 1024, fg: '#FFFFFF', occupancy: 0.52 })).png().toFile(out('android-icon-monochrome.png'));
  await img(glyphOnlySVG({ size: 1024, occupancy: 0.86 })).png().toFile(out('splash-icon.png'));
  await img(iconSVG({ size: 96, radius: 0.24 })).resize(48).png().toFile(out('favicon.png'));

  console.log('OK — assets gerados');
}

main().catch((e) => { console.error(e); process.exit(1); });
