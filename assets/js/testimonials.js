// 한라대학교 AC 기초 트랙 — 메인 페이지 후기 동적 fetch
// Supabase의 instructor_testimonials 에서 게시된 후기를 가져와 #testimonials-grid 채움.
// fetch 실패하거나 데이터 0건이면 HTML에 이미 있는 정적 카드를 그대로 둠.

(function () {
  if (!document.getElementById('testimonials-grid')) return;
  const gridEl = document.getElementById('testimonials-grid');

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function stars(n) {
    n = Math.max(1, Math.min(5, parseInt(n, 10) || 5));
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  function cohortTag(cohort) {
    if (cohort === 'am') return '<span class="testimonial-tag am">오전반 · AI 기초</span>';
    if (cohort === 'pm') return '<span class="testimonial-tag pm">오후반 · 바이브 코딩</span>';
    return '<span class="testimonial-tag">두 과정</span>';
  }

  function buildCard(t) {
    const initial = (t.display_name || '?').slice(0, 1);
    const color = Math.max(1, Math.min(6, t.avatar_color || 1));
    return `
      <article class="testimonial-card">
        ${cohortTag(t.cohort)}
        <div class="testimonial-stars">${stars(t.rating)}</div>
        <p class="testimonial-quote">${escapeHtml(t.quote)}</p>
        <div class="testimonial-footer">
          <div class="testimonial-avatar color-${color}">${escapeHtml(initial)}</div>
          <div>
            <div class="testimonial-meta-name">${escapeHtml(t.display_name)}</div>
            <div class="testimonial-meta-sub">${escapeHtml((t.affiliation || '') + (t.cohort_year ? ' · ' + t.cohort_year : ''))}</div>
          </div>
        </div>
      </article>
    `;
  }

  async function load() {
    const supabase = window.HallaAuth && window.HallaAuth.getClient && window.HallaAuth.getClient();
    if (!supabase) return; // SDK 미로드 — 정적 카드 유지
    try {
      const { data, error } = await supabase
        .from('instructor_testimonials')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) {
        console.warn('[testimonials] fetch error:', error.message);
        return;
      }
      if (!data || data.length === 0) return; // 데이터 없으면 정적 카드 유지
      gridEl.innerHTML = data.map(buildCard).join('');
    } catch (e) {
      console.warn('[testimonials] exception:', e?.message || e);
    }
  }

  // SDK 늦게 로드될 수 있어 약간 대기 후 시도
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(load, 400);
  });
})();
