// 한라대학교 강의 사이트 - Supabase 인증 모듈 (멀티사이트 패턴)
// - Google · Kakao OAuth 로그인
// - 사이트 식별(signup_domain, visited_sites)로 같은 Supabase 프로젝트의
//   다른 사이트와 데이터 분리
// - DB 테이블 접두사는 site-config.js의 dbPrefix 사용
//
// 사전 조건:
//   1. <script src="assets/js/site-config.js"></script>  (HallaSite 글로벌 노출)
//   2. <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   3. <li id="auth-slot"></li>를 nav-menu 끝에 배치

(function () {
  const SUPABASE_URL = 'https://hcmgdztsgjvzcyxyayaj.supabase.co';
  // ANON KEY는 브라우저용 공개키 (Supabase 설계상 노출 안전, RLS로 데이터 보호)
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbWdkenRzZ2p2emN5eHlheWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzU4ODcsImV4cCI6MjA4NzAxMTg4N30.gznaPzY1l8qDAPsEyYNR9KS7f7VqS3xaw-_2HTSwSZw';

  // 사이트 식별 (site-config.js에서 정의)
  const SITE = (typeof window !== 'undefined' && window.HallaSite) || {
    id: 'halla',
    domain: 'halla.dreamitbiz.com',
    dbPrefix: 'instructor_',
    tables: { profiles: 'instructor_profiles' },
  };
  const PROFILES = SITE.tables.profiles; // 'instructor_profiles'
  const ADMIN_EMAILS = (SITE.adminEmails || []).map((e) => String(e).toLowerCase());

  // OAuth 후 돌아올 페이지 — 사이트 root 기준 절대 경로
  const REDIRECT_PATH = '/profile.html';

  let client = null;
  let userCache = null;

  function getClient() {
    if (client) return client;
    if (!window.supabase || !window.supabase.createClient) {
      console.warn('[auth] supabase-js SDK 미로드 — CDN 스크립트 확인 필요');
      return null;
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return client;
  }

  async function getUser() {
    const c = getClient();
    if (!c) return null;
    if (userCache) return userCache;
    const { data: { user } } = await c.auth.getUser();
    userCache = user;
    return user;
  }

  function getRedirectTo() {
    return window.location.origin + REDIRECT_PATH;
  }

  async function signInWithGoogle() {
    const c = getClient();
    if (!c) return;
    await c.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getRedirectTo() },
    });
  }

  async function signInWithKakao() {
    const c = getClient();
    if (!c) return;
    await c.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: getRedirectTo() },
    });
  }

  async function signOut() {
    const c = getClient();
    if (!c) return;
    await c.auth.signOut();
    userCache = null;
    window.location.href = '/';
  }

  async function getProfile() {
    const c = getClient();
    if (!c) return null;
    const user = await getUser();
    if (!user) return null;
    const { data, error } = await c
      .from(PROFILES)
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      console.warn('[auth] profile fetch error:', error.message);
      return null;
    }
    return data;
  }

  async function upsertProfile(patch) {
    const c = getClient();
    if (!c) return { error: 'no client' };
    const user = await getUser();
    if (!user) return { error: 'not logged in' };
    const row = {
      id: user.id,
      email: user.email,
      full_name: patch.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      avatar_url: patch.avatar_url ?? user.user_metadata?.avatar_url ?? null,
      affiliation: patch.affiliation ?? null,
      major: patch.major ?? null,
      cohort: patch.cohort ?? null,
      bio: patch.bio ?? null,
    };
    return await c.from(PROFILES).upsert(row).select().single();
  }

  // ───────────────────────────────────────────────────────────────
  // 멀티사이트 식별 — 같은 Supabase 프로젝트의 다른 사이트와 분리
  // 로그인 직후 1회 실행: signup_domain·visited_sites·site_id 자동 보강
  // ───────────────────────────────────────────────────────────────
  async function ensureSiteIdentity() {
    const c = getClient();
    if (!c) return;
    const user = await getUser();
    if (!user) return;
    const currentDomain = window.location.hostname;
    // 현재 프로필 조회
    const { data: profile } = await c
      .from(PROFILES)
      .select('signup_domain, visited_sites, site_id, role')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile) return; // 트리거가 아직 안 만들었으면 다음 기회에

    const updates = {};
    // 최초 가입 사이트 기록 (한 번만)
    if (!profile.signup_domain) {
      updates.signup_domain = currentDomain;
    }
    // 사이트 식별자 (halla)
    if (!profile.site_id) {
      updates.site_id = SITE.id;
    }
    // 방문 사이트 누적
    const visited = Array.isArray(profile.visited_sites) ? profile.visited_sites : [];
    if (!visited.includes(currentDomain)) {
      updates.visited_sites = [...visited, currentDomain];
    }
    // 기본 role
    if (!profile.role) {
      updates.role = 'student';
    }
    if (Object.keys(updates).length > 0) {
      await c.from(PROFILES).update(updates).eq('id', user.id);
    }
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 관리자 여부 — site-config의 adminEmails 또는 프로필 role 기준
  function isAdminUser(user, profile) {
    const email = (user && user.email ? user.email : '').toLowerCase();
    if (email && ADMIN_EMAILS.includes(email)) return true;
    if (profile && (profile.role === 'admin' || profile.role === 'instructor')) return true;
    return false;
  }

  async function isAdmin() {
    const user = await getUser();
    if (!user) return false;
    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
    const profile = await getProfile();
    return isAdminUser(user, profile);
  }

  // ── 외형(테마) 옵션 — 라이트 / 다크 / 시스템 ──
  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === 'system') {
      try { localStorage.removeItem('halla-theme'); } catch {}
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', mode);
      try { localStorage.setItem('halla-theme', mode); } catch {}
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', root.getAttribute('data-theme') === 'dark' ? '#0A1428' : '#1B2A4A');
    markActiveTheme();
  }
  function currentThemeMode() {
    let stored = null;
    try { stored = localStorage.getItem('halla-theme'); } catch {}
    return stored || 'system';
  }
  function markActiveTheme() {
    const mode = currentThemeMode();
    document.querySelectorAll('.nav-pop-theme [data-theme-mode]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-theme-mode') === mode);
    });
  }

  function appearanceSectionHtml() {
    return `
      <div class="nav-pop-section">
        <div class="nav-pop-label">화면 모드</div>
        <div class="nav-pop-theme">
          <button type="button" data-theme-mode="light">라이트</button>
          <button type="button" data-theme-mode="dark">다크</button>
          <button type="button" data-theme-mode="system">시스템</button>
        </div>
      </div>`;
  }

  function wirePopover() {
    const btn = document.getElementById('nav-user-btn');
    const pop = document.getElementById('nav-pop');
    if (!btn || !pop) return;
    const close = () => { pop.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = pop.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) markActiveTheme();
    });
    pop.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    pop.querySelectorAll('[data-theme-mode]').forEach((b) => {
      b.addEventListener('click', () => applyTheme(b.getAttribute('data-theme-mode')));
    });
    const logoutBtn = document.getElementById('nav-pop-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); signOut(); });
  }

  async function renderNavAuth() {
    const slot = document.getElementById('auth-slot');
    if (!slot) return;
    const user = await getUser();

    if (user) {
      const name =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        (user.email ? user.email.split('@')[0] : '사용자');
      const email = user.email || '';
      const avatar = user.user_metadata?.avatar_url;
      const admin = await isAdmin();
      const avatarInner = avatar
        ? `<img src="${escapeHtml(avatar)}" alt="">`
        : `<span class="nav-user-initial">${escapeHtml((name[0] || '?').toUpperCase())}</span>`;
      slot.innerHTML = `
        <button class="nav-user-btn" id="nav-user-btn" aria-haspopup="true" aria-expanded="false" title="${escapeHtml(name)}">
          ${avatarInner}
        </button>
        <div class="nav-pop" id="nav-pop" role="menu">
          <div class="nav-pop-head">
            <span class="nav-pop-avatar">${avatarInner}</span>
            <span class="nav-pop-id">
              <span class="nav-pop-name">${escapeHtml(name)}${admin ? ' <span class="nav-pop-badge">관리자</span>' : ''}</span>
              <span class="nav-pop-email">${escapeHtml(email)}</span>
            </span>
          </div>
          <div class="nav-pop-section">
            <a href="/profile.html" class="nav-pop-link">🙋 마이페이지</a>
            ${admin ? '<a href="/admin.html" class="nav-pop-link nav-pop-admin">🛠️ 관리자 대시보드</a>' : ''}
          </div>
          ${appearanceSectionHtml()}
          <div class="nav-pop-section">
            <a href="#" class="nav-pop-link nav-pop-danger" id="nav-pop-logout">↩ 로그아웃</a>
          </div>
        </div>
      `;
    } else {
      slot.innerHTML = `
        <button class="nav-user-btn guest" id="nav-user-btn" aria-haspopup="true" aria-expanded="false" title="계정">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
        </button>
        <div class="nav-pop" id="nav-pop" role="menu">
          <div class="nav-pop-section">
            <a href="/login.html" class="nav-pop-link nav-pop-primary">→ 로그인 / 회원가입</a>
          </div>
          ${appearanceSectionHtml()}
        </div>
      `;
    }
    wirePopover();
    markActiveTheme();
  }

  // ───────────────────────────────────────────────────────────────
  // 알림 발송 — notifications.js의 HallaNotify를 우선 사용. 미로드 시 fallback.
  // ───────────────────────────────────────────────────────────────
  async function sendEmail(params) {
    if (window.HallaNotify && window.HallaNotify.sendEmail) {
      return await window.HallaNotify.sendEmail(params);
    }
    // Fallback: 직접 호출
    const c = getClient();
    if (!c) return { success: false, error: 'Supabase client unavailable' };
    try {
      const { data, error } = await c.functions.invoke('send-email', {
        body: { ...params, type: params.type || 'halla-notification' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { success: true, data };
    } catch (e) {
      return { success: false, error: String(e?.message || e) };
    }
  }

  // 가입 환영 메일 — SIGNED_IN 이벤트에서 1회만 호출 (localStorage로 중복 방지)
  let welcomeMailSent = false;
  async function maybeSendWelcomeMail() {
    if (welcomeMailSent) return;
    const user = await getUser();
    if (!user || !user.email) return;
    const key = `halla_welcome_${user.id}`;
    if (localStorage.getItem(key)) {
      welcomeMailSent = true;
      return;
    }
    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email.split('@')[0];

    // HallaNotify.buildEmailHtml로 일관된 다크 블루 브랜딩 템플릿 사용
    const html = (window.HallaNotify && window.HallaNotify.buildEmailHtml)
      ? window.HallaNotify.buildEmailHtml({
          title: '한라대학교 AC 기초 트랙에 오신 것을 환영합니다 👋',
          greeting: `안녕하세요 ${escapeHtml(name)}님,`,
          body: [
            '한라대학교 AC 기초 트랙 강의 사이트에 가입해 주셔서 감사합니다.',
            '오전반(AI 기초 · 15H)과 오후반(바이브 코딩 · 25H) 중 본인에게 맞는 과정을 선택해 학습을 시작해 보세요.',
          ],
          cta: { label: '내 프로필 열기 →', url: 'https://halla.dreamitbiz.com/profile.html' },
        })
      : `<p>${escapeHtml(name)}님, 한라대학교 AC 기초 트랙에 가입을 환영합니다.</p>`;

    const result = await sendEmail({
      to: user.email,
      subject: '[한라대 AC 기초 트랙] 가입을 환영합니다',
      html,
      type: 'halla-welcome',
    });
    if (result.success) {
      localStorage.setItem(key, new Date().toISOString());
      welcomeMailSent = true;
    }
  }

  // 외부 API
  window.HallaAuth = {
    getClient,
    getUser,
    getProfile,
    upsertProfile,
    signInWithGoogle,
    signInWithKakao,
    signOut,
    renderNavAuth,
    sendEmail,
    isAdmin,
  };

  // 로드 시 자동으로 nav 갱신 + auth 상태 변화 구독
  document.addEventListener('DOMContentLoaded', () => {
    // supabase SDK가 늦게 로드될 수 있으니 약간 대기 후 시도
    const tryRender = () => {
      const c = getClient();
      if (!c) return setTimeout(tryRender, 150);
      renderNavAuth();
      c.auth.onAuthStateChange((event) => {
        userCache = null;
        renderNavAuth();
        // 로그인 시: 사이트 식별 보강 + 환영 메일 1회 발송
        if (event === 'SIGNED_IN') {
          ensureSiteIdentity().catch(() => {});
          maybeSendWelcomeMail();
        }
      });
    };
    tryRender();
  });
})();
