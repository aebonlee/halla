/**
 * 한라대 AC 기초 트랙 파비콘 생성기
 * — 다크 블루 5컬러 팔레트 기반
 * — "한" 흰색 텍스트 + 둥근 사각형 배경 (브랜드 로고 박스와 동일 디자인)
 *
 * 실행: npm run favicon
 * 결과:
 *   favicon.svg                — 벡터 원본 (스케일 무관)
 *   favicon-16.png   · 16x16   — 탭 아이콘
 *   favicon-32.png   · 32x32   — 브라우저 북마크
 *   favicon-180.png  · 180x180 — apple-touch-icon
 *   favicon-192.png  · 192x192 — Android Chrome
 *   favicon-512.png  · 512x512 — PWA / share preview
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PALETTE = {
  NAVY_900:    '#0A1428',
  NAVY_800:    '#1B2A4A',
  NAVY_700:    '#24365C',
  BLUE_ACCENT: '#3D6FE0',
  BLUE_LIGHT:  '#5B8AF0',
};

// SVG (512x512 기준 — sharp가 다른 사이즈로 리사이즈)
// 작은 사이즈에서도 "한" 글자가 또렷이 보이도록 굵게·여백 작게
function makeSvg(size) {
  const r = Math.round(size * 0.22);          // 모서리 반경
  const fontSize = Math.round(size * 0.66);    // 글자 크기
  const cx = size / 2;
  const ty = Math.round(size * 0.74);           // baseline (한글이 잘 잘리지 않도록)

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${PALETTE.NAVY_900}"/>
      <stop offset="55%"  stop-color="${PALETTE.NAVY_800}"/>
      <stop offset="100%" stop-color="${PALETTE.BLUE_ACCENT}"/>
    </linearGradient>
    <linearGradient id="hi" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="rgba(255,255,255,0.18)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#hi)"/>
  <text x="${cx}" y="${ty}" fill="white"
        font-family="'Pretendard','Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif"
        font-size="${fontSize}" font-weight="900" text-anchor="middle">한</text>
</svg>`;
}

const SIZES = [16, 32, 180, 192, 512];

(async () => {
  const outDir = path.join(__dirname, '..');

  // 1. 벡터 원본 (브라우저가 직접 사용)
  fs.writeFileSync(path.join(outDir, 'favicon.svg'), makeSvg(512).trim(), 'utf8');
  console.log('✓ favicon.svg');

  // 2. PNG 다중 사이즈
  for (const size of SIZES) {
    const svg = makeSvg(size);
    const outPath = path.join(outDir, `favicon-${size}.png`);
    await sharp(Buffer.from(svg))
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    const stats = fs.statSync(outPath);
    console.log(`✓ favicon-${size}.png (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  console.log('');
  console.log('  Palette (5색):');
  Object.entries(PALETTE).forEach(([k, v]) => console.log(`    ${k.padEnd(13)} ${v}`));
})().catch((err) => {
  console.error('Favicon generation failed:', err);
  process.exit(1);
});
