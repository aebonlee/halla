/**
 * 한라대 AC 기초 트랙 OG 이미지 생성기
 * — templete_2의 generate-og.cjs를 참고해 한라 브랜드로 재구성
 *
 * 실행: npm run og-image (또는 node scripts/generate-og.cjs)
 * 결과: og-image.png (1200x630) — 사이트 root에 저장돼 og:image로 사용
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const W = 1200;
const H = 630;

// 한라 브랜드 팔레트 (assets/css/style.css와 일치)
const PRIMARY = '#2563eb';
const PRIMARY_DARK = '#1e40af';
const SECONDARY = '#7c3aed';
const AI_CYAN = '#06b6d4';
const VIBE_PINK = '#ec4899';
const ACCENT = '#f59e0b';
const TEXT = '#0f172a';

const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F8FAFC"/>
    </linearGradient>
    <linearGradient id="primaryAccent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${PRIMARY}"/>
      <stop offset="100%" stop-color="${SECONDARY}"/>
    </linearGradient>
    <radialGradient id="glowAI" cx="0.85" cy="0.15" r="0.5">
      <stop offset="0%" stop-color="${AI_CYAN}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${AI_CYAN}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowVibe" cx="0.15" cy="0.85" r="0.5">
      <stop offset="0%" stop-color="${VIBE_PINK}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${VIBE_PINK}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- 배경 -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glowAI)"/>
  <rect width="${W}" height="${H}" fill="url(#glowVibe)"/>

  <!-- 격자 보조선 -->
  <line x1="400" y1="0" x2="400" y2="${H}" stroke="${PRIMARY}" stroke-width="0.5" opacity="0.04"/>
  <line x1="800" y1="0" x2="800" y2="${H}" stroke="${PRIMARY}" stroke-width="0.5" opacity="0.04"/>
  <line x1="0" y1="210" x2="${W}" y2="210" stroke="${PRIMARY}" stroke-width="0.5" opacity="0.04"/>
  <line x1="0" y1="420" x2="${W}" y2="420" stroke="${PRIMARY}" stroke-width="0.5" opacity="0.04"/>

  <!-- 로고 박스 -->
  <rect x="72" y="68" width="72" height="72" rx="18" fill="url(#primaryAccent)"/>
  <text x="108" y="120" fill="white" font-family="'Pretendard', 'Noto Sans KR', sans-serif" font-size="40" font-weight="800" text-anchor="middle">한</text>

  <!-- 브랜딩 텍스트 -->
  <text x="164" y="98" fill="${TEXT}" font-family="'Pretendard', 'Noto Sans KR', sans-serif" font-size="22" font-weight="800">한라대학교</text>
  <text x="164" y="128" fill="#475569" font-family="'Pretendard', 'Noto Sans KR', sans-serif" font-size="16" font-weight="500">AC 기초 트랙 · 2026 여름학기</text>

  <!-- 액센트 라인 -->
  <rect x="72" y="184" width="120" height="4" fill="url(#primaryAccent)" rx="2"/>

  <!-- 메인 타이틀 -->
  <text x="72" y="266" fill="${TEXT}" font-family="'Pretendard', 'Noto Sans KR', sans-serif" font-size="60" font-weight="900" letter-spacing="-2">AI를 도구로 쓰는</text>
  <text x="72" y="338" fill="${TEXT}" font-family="'Pretendard', 'Noto Sans KR', sans-serif" font-size="60" font-weight="900" letter-spacing="-2">사람이 가장 먼저</text>
  <text x="72" y="410" fill="url(#primaryAccent)" font-family="'Pretendard', 'Noto Sans KR', sans-serif" font-size="60" font-weight="900" letter-spacing="-2">미래를 만듭니다</text>

  <!-- 두 과정 배지 -->
  <g>
    <!-- 오전반 -->
    <rect x="72" y="464" width="220" height="58" rx="29" fill="${AI_CYAN}" opacity="0.12"/>
    <rect x="72" y="464" width="220" height="58" rx="29" fill="none" stroke="${AI_CYAN}" stroke-width="2"/>
    <text x="182" y="500" fill="${AI_CYAN}" font-family="'Pretendard', sans-serif" font-size="20" font-weight="700" text-anchor="middle">🌤 오전반 · 15H</text>

    <!-- 오후반 -->
    <rect x="308" y="464" width="220" height="58" rx="29" fill="${VIBE_PINK}" opacity="0.12"/>
    <rect x="308" y="464" width="220" height="58" rx="29" fill="none" stroke="${VIBE_PINK}" stroke-width="2"/>
    <text x="418" y="500" fill="${VIBE_PINK}" font-family="'Pretendard', sans-serif" font-size="20" font-weight="700" text-anchor="middle">🌙 오후반 · 25H</text>
  </g>

  <!-- 도메인 -->
  <text x="72" y="578" fill="#94A3B8" font-family="'JetBrains Mono', monospace" font-size="18" letter-spacing="1">halla.dreamitbiz.com</text>

  <!-- 오른쪽 큰 장식 텍스트 -->
  <text x="1000" y="510" fill="${PRIMARY}" opacity="0.05" font-family="'Pretendard', sans-serif" font-size="280" font-weight="900" text-anchor="end" letter-spacing="-10">AI</text>

  <!-- 하단 액센트 바 -->
  <rect x="0" y="${H - 8}" width="${W}" height="8" fill="url(#primaryAccent)"/>
</svg>`;

(async () => {
  const outPath = path.join(__dirname, '..', 'og-image.png');
  await sharp(Buffer.from(svg))
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(outPath);

  const stats = fs.statSync(outPath);
  console.log(`✓ OG image generated: ${outPath}`);
  console.log(`  Size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`  Dimensions: ${W}x${H}`);
})().catch((err) => {
  console.error('OG image generation failed:', err);
  process.exit(1);
});
