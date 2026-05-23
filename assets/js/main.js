// 한라대학교 강의 사이트 - 공통 스크립트

document.addEventListener('DOMContentLoaded', () => {
  // 모바일 네비 토글
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => menu.classList.toggle('open'));
  }

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
