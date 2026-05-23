// 한라대학교 강의 사이트 - 공통 스크립트

document.addEventListener('DOMContentLoaded', () => {
  // 모바일 네비 토글
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => menu.classList.toggle('open'));
  }

  // 드롭다운 메뉴 — 클릭/호버 토글 + 지연 close로 6px 갭 통과 허용
  const dropdowns = document.querySelectorAll('.nav-dropdown');
  const isDesktop = window.matchMedia('(min-width: 801px)').matches;
  let closeTimer = null;

  const closeAll = () => {
    dropdowns.forEach(d => d.classList.remove('open'));
  };
  const cancelClose = () => {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  };
  const scheduleClose = (dd) => {
    cancelClose();
    closeTimer = setTimeout(() => dd.classList.remove('open'), 220);
  };

  dropdowns.forEach(dd => {
    const trigger = dd.querySelector('.nav-dropdown-trigger');
    const menu = dd.querySelector('.nav-dropdown-menu');
    if (!trigger) return;

    // 클릭: 토글. 클릭으로 열린 건 mouseleave에도 닫히지 않게 sticky 표시.
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = dd.classList.contains('open');
      cancelClose();
      closeAll();
      if (!wasOpen) dd.classList.add('open');
    });

    // 호버 (데스크탑): 즉시 열고, 떠나면 지연 후 닫기
    if (isDesktop) {
      dd.addEventListener('mouseenter', () => {
        cancelClose();
        dropdowns.forEach(d => { if (d !== dd) d.classList.remove('open'); });
        dd.classList.add('open');
      });
      dd.addEventListener('mouseleave', () => scheduleClose(dd));

      // 메뉴 박스 자체에도 동일 핸들러 — 트리거 → 갭 → 메뉴 이동 시 close 취소
      if (menu) {
        menu.addEventListener('mouseenter', cancelClose);
        menu.addEventListener('mouseleave', () => scheduleClose(dd));
      }
    }
  });

  // 바깥 클릭 시 닫기 — 단, 드롭다운 내부 클릭은 무시
  document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-dropdown')) return;
    closeAll();
  });

  // 현재 페이지 메뉴 활성화
  const path = window.location.pathname;
  document.querySelectorAll('.nav-menu a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    if (path.endsWith(href) || (href !== '/' && path.includes(href.replace('../','')))) {
      a.classList.add('active');
    }
  });

  // 코드/프롬프트 블록 복사 버튼 자동 주입
  // — 페이지의 모든 <pre>에 우측 상단 복사 버튼 추가
  // — 클릭 시 navigator.clipboard로 코드/프롬프트 텍스트 복사
  // — 성공 시 "복사됨!" 0.5초 표시 후 원래 라벨로 복원
  const copyIconSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const checkIconSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  document.querySelectorAll('pre').forEach((pre) => {
    // 이미 버튼이 있으면 skip (재실행 안전)
    if (pre.querySelector('.code-copy-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy-btn';
    btn.setAttribute('aria-label', '코드 복사');
    btn.innerHTML = copyIconSVG + '<span>복사</span>';

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      // pre 안의 텍스트만 (버튼 라벨 제외)
      const clone = pre.cloneNode(true);
      const btnClone = clone.querySelector('.code-copy-btn');
      if (btnClone) btnClone.remove();
      const text = clone.textContent.trim();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // fallback: 보조 textarea로 execCommand
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        btn.classList.add('copied');
        btn.innerHTML = checkIconSVG + '<span>복사됨!</span>';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = copyIconSVG + '<span>복사</span>';
        }, 1500);
      } catch (err) {
        console.warn('[copy] failed:', err);
        btn.innerHTML = copyIconSVG + '<span>실패</span>';
        setTimeout(() => {
          btn.innerHTML = copyIconSVG + '<span>복사</span>';
        }, 1500);
      }
    });

    pre.appendChild(btn);
  });

  // 스크롤 등장 애니메이션
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.card, .track-card, .schedule-row').forEach(el => io.observe(el));
  }

  // 좌측 사이드바 스크롤 스파이 — 현재 보이는 섹션을 사이드바에서 강조
  const sidebarLinks = document.querySelectorAll('.lesson-sidebar a[href^="#"]');
  if (sidebarLinks.length > 0 && 'IntersectionObserver' in window) {
    const linkMap = new Map();
    sidebarLinks.forEach(a => {
      const id = a.getAttribute('href').slice(1);
      if (id) linkMap.set(id, a);
    });
    const sections = document.querySelectorAll('[data-toc]');
    const visible = new Set();
    const setActive = () => {
      sidebarLinks.forEach(a => a.classList.remove('active'));
      const orderedIds = Array.from(sections).map(s => s.id);
      const firstVisible = orderedIds.find(id => visible.has(id));
      if (firstVisible && linkMap.has(firstVisible)) {
        linkMap.get(firstVisible).classList.add('active');
      }
    };
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) visible.add(e.target.id);
        else visible.delete(e.target.id);
      });
      setActive();
    }, { rootMargin: '-90px 0px -55% 0px', threshold: 0 });
    sections.forEach(s => spy.observe(s));

    // 클릭 시 스크롤 오프셋 보정 (sticky header 고려)
    sidebarLinks.forEach(a => {
      a.addEventListener('click', ev => {
        const id = a.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (target) {
          ev.preventDefault();
          const y = target.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: y, behavior: 'smooth' });
          history.replaceState(null, '', '#' + id);
        }
      });
    });
  }
});
