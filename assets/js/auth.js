// 한라대학교 강의 사이트 - Supabase 인증 모듈
// - Google · Kakao OAuth 로그인
// - 로그인 상태에 따라 상단 nav의 #auth-slot 갱신
// - 로그아웃
//
// 사전 조건: HTML에 <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> 로드
//          그리고 <li id="auth-slot"></li>를 nav-menu 끝에 배치

(function () {
  const SUPABASE_URL = 'https://hcmgdztsgjvzcyxyayaj.supabase.co';
  // ANON KEY는 브라우저용 공개키 (Supabase 설계상 노출 안전, RLS로 데이터 보호)
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbWdkenRzZ2p2emN5eHlheWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzU4ODcsImV4cCI6MjA4NzAxMTg4N30.gznaPzY1l8qDAPsEyYNR9KS7f7VqS3xaw-_2HTSwSZw';

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
      .from('instructor_profiles')
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
    return await c.from('instructor_profiles').upsert(row).select().single();
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
  };

  // 로드 시 자동으로 nav 갱신 + auth 상태 변화 구독
  document.addEventListener('DOMContentLoaded', () => {
    // supabase SDK가 늦게 로드될 수 있으니 약간 대기 후 시도
    const tryRender = () => {
      const c = getClient();
      if (!c) return setTimeout(tryRender, 150);
      renderNavAuth();
      c.auth.onAuthStateChange(() => {
        userCache = null;
        renderNavAuth();
      });
    };
    tryRender();
  });
})();
