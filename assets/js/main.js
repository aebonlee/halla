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
