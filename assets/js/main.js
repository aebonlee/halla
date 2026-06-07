// 한라대학교 강의 사이트 - 공통 스크립트

// ── 다크/라이트 모드 토글 (FOUC 방지를 위해 DOMContentLoaded 전 즉시 실행) ──
(function () {
  const KEY = 'halla-theme';
  const stored = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = stored || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  // 강조색(accent)도 깜빡임 없이 즉시 적용
  const accent = (() => { try { return localStorage.getItem('halla-accent'); } catch { return null; } })();
  if (accent && accent !== 'blue') document.documentElement.setAttribute('data-accent', accent);
})();

// 강조색 적용 + 저장
function setAccent(accent) {
  const root = document.documentElement;
  if (accent && accent !== 'blue') root.setAttribute('data-accent', accent);
  else root.removeAttribute('data-accent');
  try { localStorage.setItem('halla-accent', accent || 'blue'); } catch {}
}
function currentAccent() {
  try { return localStorage.getItem('halla-accent') || 'blue'; } catch { return 'blue'; }
}

// 네비 끝(아바타 앞)에 팔레트·모드전환 아이콘 주입
function buildNavTools(menu) {
  if (!menu || menu.querySelector('.nav-tools')) return;   // 메뉴 없거나 이미 주입됨

  const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const ICON_PALETTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="8.5" cy="7.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12.5" r="1.3" fill="currentColor" stroke="none"/><path d="M12 2C6.5 2 2 6 2 11c0 3.9 3.1 7 7 7 1.1 0 2-.9 2-2 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.3 0-1 .8-1.8 1.8-1.8H14c3.3 0 6-2.6 6-5.7C20 4.8 16.4 2 12 2z"/></svg>';

  const ACCENTS = [
    { key: 'blue',   color: '#2563eb', label: '기본' },
    { key: 'teal',   color: '#0891b2', label: '청록' },
    { key: 'pink',   color: '#db2777', label: '핑크' },
    { key: 'violet', color: '#7c3aed', label: '보라' },
  ];
  const swatches = ACCENTS.map((a) =>
    `<button type="button" class="nav-swatch" data-accent="${a.key}" title="${a.label}" style="background:${a.color}"></button>`
  ).join('');

  const li = document.createElement('li');
  li.className = 'nav-tools';
  li.innerHTML = `
    <div style="position:relative;display:flex;">
      <button type="button" class="nav-tool-btn" id="nav-palette-btn" aria-haspopup="true" aria-expanded="false" title="강조색 바꾸기">${ICON_PALETTE}</button>
      <div class="nav-palette" id="nav-palette-pop" role="menu">
        <div class="nav-palette-label">강조색</div>
        <div class="nav-palette-swatches">${swatches}</div>
      </div>
    </div>
    <button type="button" class="nav-tool-btn" id="nav-mode-btn" title="라이트/다크 전환">${ICON_MOON}</button>
  `;

  const authSlot = menu.querySelector('#auth-slot');
  if (authSlot) menu.insertBefore(li, authSlot);
  else menu.appendChild(li);

  // ── 모드전환 (해/달) ──
  const modeBtn = li.querySelector('#nav-mode-btn');
  const updateModeIcon = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    modeBtn.innerHTML = dark ? ICON_SUN : ICON_MOON;   // 다크면 해(→라이트), 라이트면 달(→다크)
  };
  updateModeIcon();
  modeBtn.addEventListener('click', () => { toggleTheme(); updateModeIcon(); });
  // 계정 팝오버 등 다른 곳에서 테마가 바뀌어도 아이콘 동기화
  new MutationObserver(updateModeIcon).observe(
    document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }
  );

  // ── 팔레트(강조색) 팝오버 ──
  const palBtn = li.querySelector('#nav-palette-btn');
  const palPop = li.querySelector('#nav-palette-pop');
  const markSwatch = () => {
    const cur = currentAccent();
    palPop.querySelectorAll('.nav-swatch').forEach((s) =>
      s.classList.toggle('active', s.getAttribute('data-accent') === cur)
    );
  };
  markSwatch();
  palBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = palPop.classList.toggle('open');
    palBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) markSwatch();
  });
  palPop.addEventListener('click', (e) => e.stopPropagation());
  palPop.querySelectorAll('.nav-swatch').forEach((s) => {
    s.addEventListener('click', () => { setAccent(s.getAttribute('data-accent')); markSwatch(); });
  });
  document.addEventListener('click', () => { palPop.classList.remove('open'); palBtn.setAttribute('aria-expanded', 'false'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') palPop.classList.remove('open'); });
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('halla-theme', theme); } catch {}
  // theme-color meta도 같이 변경 (모바일 주소창 색)
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0A1428' : '#1B2A4A');
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(cur === 'dark' ? 'light' : 'dark');
}

document.addEventListener('DOMContentLoaded', () => {
  // 모바일 네비 토글
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => menu.classList.toggle('open'));
  }

  // 네비 도구 아이콘 주입 — 팔레트(강조색) + 모드전환(라이트/다크)
  buildNavTools(menu);

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

  // 코드 주석 녹색 강조 — 의존성 없이 주석만 .cmt로 감쌈
  // 파이썬/셸 '#' 주석, JS '//' 주석. URL '://' 와 이스케이프 '&#39;' 오작동 방지.
  document.querySelectorAll('pre code').forEach((codeEl) => {
    if (codeEl.dataset.cmt) return;          // 재실행 안전
    codeEl.dataset.cmt = '1';
    const out = codeEl.innerHTML.split('\n').map((line) => {
      if (line.indexOf('class="cmt"') !== -1) return line;
      // 1) 파이썬/셸: (줄시작|공백) + # ~ 줄끝  ('&#39;' 같은 숫자엔티티는 제외)
      if (/(^|\s)#(?!\d{1,3};)/.test(line)) {
        return line.replace(/(^|\s)(#(?!\d{1,3};).*)$/,
          (m, p1, c) => p1 + '<span class="cmt">' + c + '</span>');
      }
      // 2) JS: // ~ 줄끝  (단, http:// 처럼 ':' 뒤 // 는 제외)
      if (/(^|[^:"'\/])\/\//.test(line)) {
        return line.replace(/(^|[^:"'\/])(\/\/.*)$/,
          (m, p1, c) => p1 + '<span class="cmt">' + c + '</span>');
      }
      return line;
    });
    codeEl.innerHTML = out.join('\n');
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
