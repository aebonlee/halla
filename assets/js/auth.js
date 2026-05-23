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

  async function renderNavAuth() {
    const slot = document.getElementById('auth-slot');
    if (!slot) return;
    const user = await getUser();
    if (user) {
      const name =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        (user.email ? user.email.split('@')[0] : '사용자');
      const avatar = user.user_metadata?.avatar_url;
      slot.innerHTML = `
        <a href="/profile.html" class="auth-user" title="${escapeHtml(name)} · 프로필">
          ${avatar
            ? `<img src="${escapeHtml(avatar)}" alt="" class="auth-avatar">`
            : `<span class="auth-avatar auth-avatar-fallback">${escapeHtml(name[0] || '?')}</span>`}
          <span class="auth-user-name">${escapeHtml(name)}</span>
        </a>
      `;
    } else {
      slot.innerHTML = `<a href="/login.html" class="auth-login-btn">로그인</a>`;
    }
  }

  // ───────────────────────────────────────────────────────────────
  // 공용 Supabase Edge Function 호출 (templete_2 패턴 — send-email은 이미 배포됨)
  // 모든 dreamitbiz.com 사이트에서 공유 사용. Resend 발신: noreply@dreamitbiz.com
  // ───────────────────────────────────────────────────────────────
  async function sendEmail({ to, subject, html, type }) {
    const c = getClient();
    if (!c) return { success: false, error: 'Supabase client unavailable' };
    try {
      const { data, error } = await c.functions.invoke('send-email', {
        body: { to, subject, html, type: type || 'halla-notification' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { success: true, data };
    } catch (e) {
      console.warn('[auth] sendEmail failed:', e?.message || e);
      return { success: false, error: String(e?.message || e) };
    }
  }

  // 가입 환영 메일 — onAuthStateChange의 SIGNED_IN 이벤트에서 1회만 호출
  let welcomeMailSent = false;
  async function maybeSendWelcomeMail() {
    if (welcomeMailSent) return;
    const user = await getUser();
    if (!user || !user.email) return;
    // 이미 보낸 적 있는지 localStorage로 1회 제한 (재로그인 시 재전송 방지)
    const key = `halla_welcome_${user.id}`;
    if (localStorage.getItem(key)) {
      welcomeMailSent = true;
      return;
    }
    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email.split('@')[0];
    const html = `
      <div style="font-family:'Pretendard',sans-serif;color:#0f172a;max-width:520px;margin:0 auto;padding:24px;">
        <h1 style="color:#2563eb;font-size:24px;margin-bottom:12px;">한라대학교 AC 기초 트랙에 오신 것을 환영합니다 👋</h1>
        <p>안녕하세요 ${escapeHtml(name)}님,</p>
        <p>한라대학교 AC 기초 트랙 강의 사이트에 가입해 주셔서 감사합니다.</p>
        <p style="margin-top:20px;">
          오전반(AI 기초 · 15H)과 오후반(바이브 코딩 · 25H) 중 본인에게 맞는 과정을 선택해
          학습을 시작해 보세요.
        </p>
        <p style="margin-top:24px;">
          <a href="https://halla.dreamitbiz.com/profile.html"
             style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;
                    text-decoration:none;border-radius:8px;font-weight:700;">
            내 프로필 열기 →
          </a>
        </p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:13px;">
          한라대학교 · DreamIT Biz<br>
          문의: aebon@kyonggi.ac.kr
        </p>
      </div>
    `;
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
