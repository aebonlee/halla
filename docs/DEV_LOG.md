# 개발 일지 (DEV_LOG)

한라대학교 하계 방학특강 강의 사이트 (halla.dreamitbiz.com) 개발 기록.

---

## 2026-06-12 · 메인 페이지 아이콘 전환 & 결과물 갤러리 리디자인

### 작업 요약

메인 페이지(`index.html`)의 컬러 이모지를 **Font Awesome 6 아이콘**으로 전면 교체하고,
"결과물 갤러리" 섹션을 **과정 계열(오전반·오후반·종일반) 그룹** 구조로 재설계.
이후 레이아웃·카드 크기를 반복 조정해 **3 / 3 / 3** 정렬로 마무리.

대상 파일: `index.html`, `assets/css/style.css`

### 1) 이모지 → Font Awesome 아이콘 전환

- `<head>`에 Font Awesome 6.5.2 CDN 추가
  - `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/css/all.min.css`
- 컬러 이모지를 의미에 맞는 아이콘으로 교체 (총 12개 → 이후 그룹 헤더/카드 추가로 15개 사용)

| 위치 | 기존 이모지 | Font Awesome |
|---|---|---|
| 도구 · Claude | 🤖 | `fa-robot` |
| 도구 · Cursor | 💻 | `fa-laptop-code` |
| 도구 · Gamma | 🎯 | `fa-wand-magic-sparkles` |
| 도구 · Canva AI | 🎨 | `fa-palette` |
| 갤러리 · 발표자료 | 🎯 | `fa-person-chalkboard` |
| 갤러리 · 챗봇 | 💬 | `fa-comments` |
| 갤러리 · AI 서비스 | 🚀 | `fa-rocket` |
| 갤러리 · 워크플로 문서 | 📝 | `fa-file-pen` |
| 갤러리 · 웹사이트 | 🌐 | `fa-globe` |
| 갤러리 · 파이썬 | 💻 | `fa-brands fa-python` |
| 갤러리 · 방명록 | 📋 | `fa-clipboard-list` |
| 갤러리 · 개별·팀별 프로젝트(신규) | — | `fa-people-group` |

- 크기·색상 조정
  - `.tool-emoji`: 32 → 30px, 브랜드 컬러(`--color-primary`), 호버 시 `--color-primary-dark`
  - `.gallery-card-emoji`: 화이트(`rgba(255,255,255,0.85)`)
  - 햄버거 메뉴(`☰`)는 UI 컨트롤이라 유지

### 2) 결과물 갤러리 — 과정 계열 그룹화

- 단일 그리드에 섞여 있던 카드를 **오전반 / 오후반 / 종일반** 3개 그룹으로 분리
- 각 그룹에 과정 컬러 + 아이콘이 들어간 헤더(`.gallery-group-title`, 밑줄 구분선) 추가
  - 오전반 `--color-ai`, 오후반 `--color-vibe`, 종일반 `--color-dev`

### 3) 레이아웃·카드 크기 조정 (반복 피드백 반영)

시행착오 기록:

1. 4열 고정 그리드 → 카드가 좌측으로 치우침
2. 그룹별 3열 / 2열(종일반 가운데 정렬)로 변경 — 카드 폭은 동일 유지
3. "너비 1/2 축소" 요청 → 그리드 max-width 50%로 줄임 → **요청 오해(세로가 아닌 가로를 줄임)**, 롤백
4. 너비 원복 + 카드 강제 비율(`aspect-ratio: 5/4`) 제거 → 세로 높이 축소
5. 3/3/2가 어색 → 종일반 2개 줄을 전체 폭으로 채우고 카드 `min-height` 부여
6. **최종**: 종일반에 카드 1개 추가하여 **3/3/3** 정렬

최종 CSS 상태:
- `.gallery-grid`: `repeat(3, 1fr)`, 반응형 (≤1100px 2열, ≤560px 1열)
- `.gallery-card`: `min-height: 112px`, `aspect-ratio` 제거, `padding: 16px 18px`, `gap: 8px`,
  `justify-content: space-between` → 내용이 위·아래로 균형 배치
- 상단 행을 좌우 배치(`display:flex; justify-content:space-between`)하여 **태그=왼쪽 / 아이콘=오른쪽 위**

### 4) 콘텐츠 추가

- 종일반 그룹에 카드 추가: **"개별·팀별 프로젝트 제작"** (`fa-people-group`)
  - 설명: "혼자 또는 팀으로 기획부터 구현·배포까지. 실제 동작하는 결과물을 완성해 발표."
  - 종일반이 프로젝트 결과물을 산출하는 과정임을 갤러리에 반영

### 설계 결정

1. **이모지 → 아이콘**: 플랫폼별로 들쭉날쭉하던 컬러 이모지 대신 Font Awesome으로 통일해
   렌더링 일관성 확보 및 색상·크기 제어 가능.
2. **계열 그룹화**: 결과물을 과정별로 묶어 "어떤 반에서 무엇을 만드는지"를 한눈에 구분.
3. **아이콘 우상단 + 흐름 배치**: 절대배치는 짧은 카드에서 제목과 겹칠 위험이 있어,
   상단 행 flex 좌우 배치로 안전하게 우상단 고정.
4. **강제 비율 제거**: `aspect-ratio`가 불필요한 세로 여백을 만들어 카드가 길어지던 문제를,
   비율 제거 + `min-height`로 내용에 맞는 낮은 카드로 해결.

### 커밋 (시간순)

- `9eef2ee` 메인 페이지 이모지를 Font Awesome 아이콘으로 교체 + 결과물 갤러리 계열 그룹화
- `5b42811` 결과물 갤러리 계열 그룹 너비 조정 — 3열/2열, 2개 그룹 가운데 정렬
- `7e5c9dc` 결과물 갤러리 박스 너비 1/2 축소 + 가운데 정렬 (요청 오해 → 이후 롤백)
- `2d260c9` 결과물 갤러리 카드 세로 높이 축소 (너비 원복)
- `66861d0` 결과물 갤러리 3/3/2 레이아웃 자연스럽게 정리
- `6b2938b` 종일반에 개별·팀별 프로젝트 카드 추가(3/3/3) + 아이콘 우상단 + 카드 높이 축소

### 배포

- **방식**: GitHub Pages (legacy, source `main` / `/`), CNAME `halla.dreamitbiz.com`
- **빌드 단계 없음**: 정적 HTML/CSS/JS → main 푸시 시 자동 배포
- CSS 캐시 버스팅: `style.css?v=` 쿼리를 단계별로 증가 (… → `v=20260622`)
