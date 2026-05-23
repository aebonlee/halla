// 한라대학교 AC 기초 트랙 — 커뮤니티 게시판
// Supabase 백엔드 (instructor_posts + instructor_comments)
// 비로그인: 읽기 가능 / 로그인: 글쓰기·댓글·삭제(본인 글만)

(function () {
  const SITE_ID = (window.HallaSite && window.HallaSite.id) || 'halla';

  const CATEGORIES = [
    { key: 'all',      label: '전체',     color: '#475569' },
    { key: 'notice',   label: '공지',     color: '#dc2626' },
    { key: 'question', label: '질문',     color: '#2563eb' },
    { key: 'showcase', label: '결과물',   color: '#7c3aed' },
    { key: 'free',     label: '자유',     color: '#10b981' },
  ];

  let supabase = null;
  let currentUser = null;
  let activeCategory = 'all';

  function getClient() {
    if (supabase) return supabase;
    if (window.HallaAuth && window.HallaAuth.getClient) {
      supabase = window.HallaAuth.getClient();
    }
    return supabase;
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function timeAgo(iso) {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return '방금';
    if (diff < 3600) return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + '일 전';
    return d.toLocaleDateString('ko-KR');
  }

  function catBadge(key) {
    const c = CATEGORIES.find(x => x.key === key) || CATEGORIES[4];
    return `<span class="board-cat" style="background:${c.color}1a; color:${c.color}; border:1px solid ${c.color}33;">${c.label}</span>`;
  }

  // ── 게시글 목록 fetch + 렌더
  async function loadPosts() {
    const c = getClient();
    if (!c) return [];
    let q = c.from('instructor_posts_with_counts')
      .select('*')
      .eq('site_id', SITE_ID)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    if (activeCategory !== 'all') q = q.eq('category', activeCategory);
    const { data, error } = await q;
    if (error) {
      console.warn('[community] posts fetch error:', error.message);
      return [];
    }
    return data || [];
  }

  async function renderList() {
    const listEl = document.getElementById('board-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="board-loading">불러오는 중...</div>';

    const posts = await loadPosts();
    if (posts.length === 0) {
      listEl.innerHTML = `
        <div class="board-empty">
          <p>아직 등록된 글이 없습니다.</p>
          ${currentUser
            ? '<p style="margin-top:8px; color:var(--color-text-muted); font-size:13px;">첫 번째 글을 작성해 보세요!</p>'
            : '<p style="margin-top:8px; color:var(--color-text-muted); font-size:13px;">로그인하면 글을 작성할 수 있습니다.</p>'}
        </div>
      `;
      return;
    }

    // 작성자 프로필 모음 (이름 표시)
    const userIds = [...new Set(posts.map(p => p.user_id))];
    let profiles = {};
    if (userIds.length > 0) {
      const { data } = await getClient()
        .from('instructor_profiles').select('id, full_name').in('id', userIds);
      profiles = Object.fromEntries((data || []).map(p => [p.id, p.full_name || '익명']));
    }

    listEl.innerHTML = posts.map(p => `
      <article class="board-item" data-post-id="${p.id}">
        <div class="board-item-head">
          ${p.pinned ? '<span class="board-pinned">고정</span>' : ''}
          ${catBadge(p.category)}
          <a href="#post-${p.id}" class="board-title" data-action="open-post" data-id="${p.id}">${escapeHtml(p.title)}</a>
        </div>
        <div class="board-meta">
          <span>${escapeHtml(profiles[p.user_id] || '익명')}</span>
          <span>·</span>
          <span>${timeAgo(p.created_at)}</span>
          ${p.comment_count > 0 ? `<span class="board-cmt">💬 ${p.comment_count}</span>` : ''}
        </div>
      </article>
    `).join('');

    // 글 클릭 → 상세
    listEl.querySelectorAll('[data-action="open-post"]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        openPost(parseInt(a.dataset.id, 10));
      });
    });
  }

  // ── 글 상세 + 댓글
  async function openPost(postId) {
    const c = getClient();
    if (!c) return;
    const modal = document.getElementById('board-modal');
    const body = document.getElementById('board-modal-body');
    if (!modal || !body) return;
    body.innerHTML = '<p style="text-align:center; padding:40px;">불러오는 중...</p>';
    modal.classList.add('shown');

    // 조회수 증가 (best-effort, RPC 없이 단순 update)
    c.rpc('noop', {}).catch(() => {});

    const [{ data: post, error: postErr }, { data: comments }] = await Promise.all([
      c.from('instructor_posts').select('*').eq('id', postId).single(),
      c.from('instructor_comments').select('*').eq('post_id', postId).order('created_at'),
    ]);
    if (postErr || !post) {
      body.innerHTML = '<p>글을 불러올 수 없습니다.</p>';
      return;
    }

    // 작성자/댓글 작성자 프로필
    const userIds = [...new Set([post.user_id, ...(comments || []).map(c => c.user_id)])];
    const { data: profileRows } = await c.from('instructor_profiles')
      .select('id, full_name').in('id', userIds);
    const profiles = Object.fromEntries((profileRows || []).map(p => [p.id, p.full_name || '익명']));

    const isOwner = currentUser && currentUser.id === post.user_id;

    body.innerHTML = `
      <div class="post-detail-head">
        ${catBadge(post.category)}
        <h2 class="post-detail-title">${escapeHtml(post.title)}</h2>
        <div class="post-detail-meta">
          <span>${escapeHtml(profiles[post.user_id] || '익명')}</span>
          <span>·</span>
          <span>${new Date(post.created_at).toLocaleString('ko-KR')}</span>
        </div>
      </div>
      <div class="post-detail-body">${escapeHtml(post.body).replace(/\n/g, '<br>')}</div>
      ${isOwner ? `
        <div class="post-detail-actions">
          <button type="button" class="btn btn-ghost" data-action="delete-post" data-id="${post.id}">삭제</button>
        </div>
      ` : ''}
      <hr style="margin:24px 0; border:none; border-top:1px solid var(--color-border);">
      <h3 style="font-size:15px; margin-bottom:12px;">댓글 ${(comments || []).length}</h3>
      <div class="comment-list">
        ${(comments || []).length === 0
          ? '<p style="color:var(--color-text-muted); font-size:13px;">첫 댓글을 남겨 주세요.</p>'
          : comments.map(cm => `
              <div class="comment-item" data-id="${cm.id}">
                <div class="comment-meta">
                  <strong>${escapeHtml(profiles[cm.user_id] || '익명')}</strong>
                  <span style="color:var(--color-text-muted); font-size:12px;">${timeAgo(cm.created_at)}</span>
                  ${currentUser && currentUser.id === cm.user_id
                    ? `<button type="button" class="comment-delete" data-id="${cm.id}">삭제</button>`
                    : ''}
                </div>
                <div class="comment-body">${escapeHtml(cm.body).replace(/\n/g, '<br>')}</div>
              </div>
            `).join('')}
      </div>
      ${currentUser ? `
        <form id="comment-form" class="comment-form">
          <textarea id="comment-input" placeholder="댓글을 입력하세요" rows="2" required></textarea>
          <button type="submit" class="btn btn-primary">댓글 작성</button>
        </form>
      ` : `
        <p style="text-align:center; padding:16px; color:var(--color-text-muted); font-size:13px;">
          댓글을 작성하려면 <a href="/login.html">로그인</a>이 필요합니다.
        </p>
      `}
    `;

    // 글 삭제
    const delBtn = body.querySelector('[data-action="delete-post"]');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        if (!confirm('이 글을 삭제할까요?')) return;
        const { error } = await c.from('instructor_posts').delete().eq('id', post.id);
        if (error) { alert('삭제 실패: ' + error.message); return; }
        closeModal();
        renderList();
      });
    }

    // 댓글 삭제
    body.querySelectorAll('.comment-delete').forEach(b => {
      b.addEventListener('click', async () => {
        if (!confirm('댓글을 삭제할까요?')) return;
        const { error } = await c.from('instructor_comments').delete().eq('id', parseInt(b.dataset.id, 10));
        if (error) { alert('삭제 실패: ' + error.message); return; }
        openPost(postId); // refresh
      });
    });

    // 댓글 작성
    const form = body.querySelector('#comment-form');
    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const textarea = document.getElementById('comment-input');
        const text = textarea.value.trim();
        if (!text) return;
        const { error } = await c.from('instructor_comments').insert({
          post_id: post.id,
          user_id: currentUser.id,
          body: text,
        });
        if (error) { alert('댓글 작성 실패: ' + error.message); return; }
        openPost(postId); // refresh
      });
    }
  }

  function closeModal() {
    document.getElementById('board-modal')?.classList.remove('shown');
  }

  // ── 글쓰기 폼
  async function submitNew(e) {
    e.preventDefault();
    if (!currentUser) { alert('로그인이 필요합니다.'); return; }
    const c = getClient();
    const titleEl = document.getElementById('new-title');
    const bodyEl = document.getElementById('new-body');
    const catEl = document.getElementById('new-category');
    const title = titleEl.value.trim();
    const body = bodyEl.value.trim();
    const category = catEl.value;
    if (!title || !body) { alert('제목과 내용을 모두 입력하세요.'); return; }
    const { error } = await c.from('instructor_posts').insert({
      user_id: currentUser.id,
      site_id: SITE_ID,
      category,
      title,
      body,
    });
    if (error) { alert('작성 실패: ' + error.message); return; }
    titleEl.value = ''; bodyEl.value = '';
    document.getElementById('new-post').classList.remove('shown');
    renderList();
  }

  // ── 카테고리 필터
  function renderCategoryTabs() {
    const tabsEl = document.getElementById('board-tabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = CATEGORIES.map(c => `
      <button type="button" class="board-tab${c.key === activeCategory ? ' active' : ''}" data-cat="${c.key}">${c.label}</button>
    `).join('');
    tabsEl.querySelectorAll('.board-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        renderCategoryTabs();
        renderList();
      });
    });
  }

  // ── 초기화
  document.addEventListener('DOMContentLoaded', async () => {
    if (!document.getElementById('board-list')) return; // 커뮤니티 페이지가 아니면 skip

    renderCategoryTabs();

    // 로그인 상태 확인
    const tryUser = async () => {
      const c = getClient();
      if (!c) return setTimeout(tryUser, 200);
      if (window.HallaAuth && window.HallaAuth.getUser) {
        currentUser = await window.HallaAuth.getUser();
      }
      renderList();
      // 로그인 상태에 따라 글쓰기 버튼 표시
      const writeBtn = document.getElementById('btn-write');
      if (writeBtn) {
        if (currentUser) {
          writeBtn.style.display = '';
          writeBtn.textContent = '글쓰기';
          writeBtn.addEventListener('click', () => {
            document.getElementById('new-post')?.classList.add('shown');
          });
        } else {
          writeBtn.textContent = '로그인 후 글쓰기';
          writeBtn.addEventListener('click', () => {
            location.href = '/login.html';
          });
        }
      }
    };
    tryUser();

    // 모달 닫기
    document.getElementById('board-modal')?.addEventListener('click', e => {
      if (e.target.id === 'board-modal') closeModal();
    });
    document.getElementById('board-modal-close')?.addEventListener('click', closeModal);

    // 새 글 폼
    document.getElementById('new-post-form')?.addEventListener('submit', submitNew);
    document.getElementById('new-post-cancel')?.addEventListener('click', () => {
      document.getElementById('new-post')?.classList.remove('shown');
    });
    document.getElementById('new-post')?.addEventListener('click', e => {
      if (e.target.id === 'new-post') {
        document.getElementById('new-post').classList.remove('shown');
      }
    });
  });
})();
