// 한라대학교 하계 방학특강 - 과정별 조회 권한 가드
// 정책: 미리보기(과정 개요)는 공개, 일차 상세(day 페이지)는 등록 수강생만 열람.
//
// 사용법: 보호할 day 페이지에서
//   <body data-course="dev"> (am | pm | dev)
//   <main class="lesson-main" data-course-content> ... </main>
//   <script src="../assets/js/course-guard.js?v=20260702"></script>  (auth.js 뒤)
//
// 정적 사이트의 클라이언트 측 소프트 게이팅입니다.
// (열람 편의용 차단 — 민감 데이터 보호는 RLS가 담당)

(function () {
  const COURSES = {
    am:  { name: 'AI 기초 실습 (오전반)', overview: '/ai-basic/index.html' },
    pm:  { name: '바이브 코딩 (오후반)', overview: '/vibe-coding/index.html' },
    dev: { name: '생성형 AI 개발', overview: '/gen-ai-dev/index.html' },
  };

  const required = (document.body && document.body.dataset.course) || '';
  if (!required || !COURSES[required]) return;

  const content =
    document.querySelector('[data-course-content]') ||
    document.querySelector('.lesson-main');
  if (!content) return;

  const courseInfo = COURSES[required];

  const ADMIN_EMAILS = ((window.HallaSite && window.HallaSite.adminEmails) || [])
    .map((e) => String(e).toLowerCase());

  function isAdminEmail(user) {
    const email = (user && user.email ? user.email : '').toLowerCase();
    return !!email && ADMIN_EMAILS.includes(email);
  }

  // 등록 과정이 본 페이지를 열람할 수 있는가
  function hasAccess(profile) {
    if (!profile) return false;
    if (profile.role === 'instructor' || profile.role === 'admin') return true;
    const c = profile.cohort;
    if (!c) return false;
    if (c === 'all') return true;            // 전체 과정 등록
    if (c === required) return true;          // 본인 등록 과정과 일치
    if (c === 'both' && (required === 'am' || required === 'pm')) return true; // 오전+오후
    return false;
  }

  // ---------- 잠금 UI ----------
  let lockEl = null;

  function lock(state, profile) {
    content.classList.add('course-locked-blur');
    if (!lockEl) {
      lockEl = document.createElement('div');
      lockEl.className = 'course-lock';
      content.parentNode.insertBefore(lockEl, content);
    }

    if (state === 'guest') {
      lockEl.innerHTML = `
        <div class="course-lock-icon">🔒</div>
        <h3>이 강의 노트는 등록 수강생에게 열립니다</h3>
        <p>
          <strong>${escapeHtml(courseInfo.name)}</strong> 상세 강의 노트입니다.<br>
          로그인하면 본인이 등록한 과정의 노트를 모두 볼 수 있습니다.
        </p>
        <a href="/login.html" class="btn btn-primary">로그인하고 열기</a>
        <a href="${courseInfo.overview}" class="btn btn-secondary">과정 개요 보기</a>
      `;
    } else if (state === 'wrong') {
      const mine = profile && profile.cohort && COURSES[profile.cohort]
        ? COURSES[profile.cohort]
        : null;
      lockEl.innerHTML = `
        <div class="course-lock-icon">🚧</div>
        <h3>등록한 과정이 아닙니다</h3>
        <p>
          이 노트는 <strong>${escapeHtml(courseInfo.name)}</strong> 수강생 전용입니다.<br>
          ${mine
            ? `회원님의 등록 과정은 <strong>${escapeHtml(mine.name)}</strong> 입니다.`
            : `프로필에서 수강 과정을 먼저 선택해 주세요.`}
        </p>
        ${mine ? `<a href="${mine.overview}" class="btn btn-primary">내 과정으로 가기</a>` : ''}
        <a href="/profile.html" class="btn btn-secondary">수강 과정 변경</a>
        <a href="/portal.html" class="btn btn-secondary">과정 다시 선택</a>
      `;
    }
  }

  function unlock() {
    content.classList.remove('course-locked-blur');
    if (lockEl) {
      lockEl.remove();
      lockEl = null;
    }
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- 권한 확인 ----------
  async function evaluate() {
    if (!window.HallaAuth) return; // auth.js 미로드 — 잠시 후 재시도
    try {
      const user = await window.HallaAuth.getUser();
      if (!user) { lock('guest'); return; }
      if (isAdminEmail(user)) { unlock(); return; }   // 관리자 이메일은 전 과정 열람
      const profile = await window.HallaAuth.getProfile();
      if (hasAccess(profile)) {
        unlock();
      } else {
        lock('wrong', profile);
      }
    } catch (e) {
      lock('guest');
    }
  }

  // 콘텐츠 깜빡임 방지: 우선 잠가두고 판정
  document.addEventListener('DOMContentLoaded', () => {
    content.classList.add('course-locked-blur');
    let tries = 0;
    const tick = () => {
      if (window.HallaAuth) { evaluate(); return; }
      if (tries++ < 40) setTimeout(tick, 150);
      else lock('guest'); // 끝내 로드 안 되면 잠금 유지
    };
    tick();

    // 로그인/로그아웃 상태 변화에 반응
    const sub = () => {
      const c = window.HallaAuth && window.HallaAuth.getClient && window.HallaAuth.getClient();
      if (!c) return setTimeout(sub, 200);
      c.auth.onAuthStateChange(() => evaluate());
    };
    sub();
  });
})();
