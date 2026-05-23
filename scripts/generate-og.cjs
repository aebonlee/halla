/**
 * 한라대 AC 기초 트랙 OG 이미지 생성기
 * templete-ref 패턴 — 다크 블루 + 5컬러 팔레트
 *
 * 실행: npm run og-image
 * 결과: og-image.png (1200x630) — root에 저장 → og:image로 사용
 *
 * 사이트마다 CONFIG만 수정하면 동일 패턴으로 재사용 가능.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────
// 사이트별 설정 (변경 포인트)
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  siteName: '한라대학교',
  siteSubtitle: 'AC 기초 트랙 · 2026 여름학기',
  titleLines: [
    'AI를 도구로 쓰는',
    '사람이 가장 먼저',
    '미래를 만듭니다',
  ],
  tags: [
    { label: '🌤 오전반 · 15H', accentIdx: 3 }, // BLUE_ACCENT
    { label: '🌙 오후반 · 25H', accentIdx: 4 }, // BLUE_LIGHT
  ],
  domain: 'halla.dreamitbiz.com',
  logoChar: '한',
  decorativeText: 'AI', // 우측 배경 거대 텍스트
};

// ─────────────────────────────────────────────────────────────
// 5컬러 팔레트 (다크 블루 베이스)
// ─────────────────────────────────────────────────────────────
const PALETTE = {
  NAVY_900:    '#0A1428', // 1. 가장 어두운 베이스
  NAVY_800:    '#1B2A4A', // 2. 메인 배경
  NAVY_700:    '#24365C', // 3. 중간 톤
  BLUE_ACCENT: '#3D6FE0', // 4. 강조 / CTA
  BLUE_LIGHT:  '#5B8AF0', // 5. 하이라이트 / 그라데이션 끝점
};
const COLORS = [
  PALETTE.NAVY_900,
  PALETTE.NAVY_800,
  PALETTE.NAVY_700,
  PALETTE.BLUE_ACCENT,
  PALETTE.BLUE_LIGHT,
];

const W = 1200;
const H = 630;

const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 배경 그라데이션 (NAVY_900 → NAVY_800 → NAVY_700) -->
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${PALETTE.NAVY_900}"/>
      <stop offset="60%"  stop-color="${PALETTE.NAVY_800}"/>
      <stop offset="100%" stop-color="${PALETTE.NAVY_700}"/>
    </linearGradient>
    <!-- 액센트 그라데이션 (BLUE_ACCENT → BLUE_LIGHT) -->
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${PALETTE.BLUE_ACCENT}"/>
      <stop offset="100%" stop-color="${PALETTE.BLUE_LIGHT}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.55">
      <stop offset="0%"   stop-color="${PALETTE.BLUE_LIGHT}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${PALETTE.BLUE_LIGHT}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- 배경 -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- 장식 원 -->
  <circle cx="1050" cy="80"  r="280" fill="${PALETTE.BLUE_ACCENT}" opacity="0.05"/>
  <circle cx="1080" cy="50"  r="180" fill="${PALETTE.BLUE_LIGHT}"  opacity="0.04"/>
  <circle cx="100"  cy="600" r="200" fill="${PALETTE.BLUE_ACCENT}" opacity="0.04"/>

  <!-- 격자 보조선 -->
  <line x1="400" y1="0" x2="400" y2="${H}" stroke="white" stroke-width="0.3" opacity="0.04"/>
  <line x1="800" y1="0" x2="800" y2="${H}" stroke="white" stroke-width="0.3" opacity="0.04"/>
  <line x1="0" y1="210" x2="${W}" y2="210" stroke="white" stroke-width="0.3" opacity="0.04"/>
  <line x1="0" y1="420" x2="${W}" y2="420" stroke="white" stroke-width="0.3" opacity="0.04"/>

  <!-- 로고 박스 -->
  <rect x="72" y="68" width="72" height="72" rx="18" fill="url(#accent)"/>
  <text x="108" y="120" fill="white" font-family="'Pretendard', 'Noto Sans KR', sans-serif" font-size="40" font-weight="800" text-anchor="middle">${CONFIG.logoChar}</text>

  <!-- 브랜딩 -->
  <text x="164" y="98"  fill="white" font-family="'Pretendard', sans-serif" font-size="22" font-weight="800">${CONFIG.siteName}</text>
  <text x="164" y="128" fill="rgba(255,255,255,0.7)" font-family="'Pretendard', sans-serif" font-size="16" font-weight="500">${CONFIG.siteSubtitle}</text>

  <!-- 액센트 라인 -->
  <rect x="72" y="184" width="120" height="4" fill="url(#accent)" rx="2"/>

  <!-- 메인 타이틀 -->
  ${CONFIG.titleLines.map((line, i) => `
  <text x="72" y="${266 + i * 72}" fill="${i === CONFIG.titleLines.length - 1 ? 'url(#accent)' : 'white'}" font-family="'Pretendard', sans-serif" font-size="60" font-weight="900" letter-spacing="-2">${line}</text>
  `).join('')}

  <!-- 두 과정 배지 -->
  ${CONFIG.tags.map((t, i) => {
    const x = 72 + i * 236;
    const color = COLORS[t.accentIdx];
    return `
    <rect x="${x}" y="464" width="220" height="58" rx="29" fill="${color}" opacity="0.18"/>
    <rect x="${x}" y="464" width="220" height="58" rx="29" fill="none" stroke="${color}" stroke-width="2"/>
    <text x="${x + 110}" y="500" fill="white" font-family="'Pretendard', sans-serif" font-size="20" font-weight="700" text-anchor="middle">${t.label}</text>
    `;
  }).join('')}

  <!-- 도메인 -->
  <text x="72" y="578" fill="rgba(255,255,255,0.5)" font-family="'JetBrains Mono', monospace" font-size="18" letter-spacing="1">${CONFIG.domain}</text>

  <!-- 오른쪽 거대 장식 텍스트 -->
  <text x="1000" y="510" fill="white" opacity="0.04" font-family="'Pretendard', sans-serif" font-size="280" font-weight="900" text-anchor="end" letter-spacing="-10">${CONFIG.decorativeText}</text>

  <!-- 하단 액센트 바 -->
  <rect x="0" y="${H - 8}" width="${W}" height="8" fill="url(#accent)"/>
</svg>`;

(async () => {
  const outPath = path.join(__dirname, '..', 'og-image.png');
  await sharp(Buffer.from(svg))
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(outPath);

  const stats = fs.statSync(outPath);
  console.log('✓ OG image generated');
  console.log(`  Path: ${outPath}`);
  console.log(`  Size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`  Dimensions: ${W}x${H}`);
  console.log('');
  console.log('  Palette (5색):');
  Object.entries(PALETTE).forEach(([k, v]) => console.log(`    ${k.padEnd(13)} ${v}`));
})().catch((err) => {
  console.error('OG image generation failed:', err);
  process.exit(1);
});
