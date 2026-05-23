// 한라대학교 AC 기초 트랙 — 메인 페이지 히어로 인터랙션
//
// 효과:
//   1. 캔버스 파티클 + 별자리 연결선 (블루 톤)
//   2. 마우스 호버 시 파티클 반발 (인터랙티브)
//   3. 히어로 메타 숫자 카운트업 애니메이션 (40 / 5 / 2 / 80)
//   4. 통계 바 숫자 카운트업 (스크롤 진입 시 트리거)
//   5. 메타 라인 항목 순차 페이드 인
//   6. prefers-reduced-motion 존중 (모션 끄기 OK)

(function () {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ────────────────────────────────────────────────────────────
  // 1. 캔버스 파티클 + 별자리 (Reduce Motion 시 생략)
  // ────────────────────────────────────────────────────────────
  if (!reduce) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:0;';
    canvas.setAttribute('aria-hidden', 'true');
    hero.appendChild(canvas);

    // 히어로 안 텍스트들을 캔버스 위로 (z-index)
    hero.querySelectorAll(':scope > *:not(canvas)').forEach(el => {
      if (!el.style.position) el.style.position = 'relative';
      if (!el.style.zIndex) el.style.zIndex = '1';
    });

    const ctx = canvas.getContext('2d');
    let w = 0, h = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = hero.offsetWidth;
      h = hero.offsetHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // 파티클 — 화면 크기에 비례
    const COUNT = Math.min(60, Math.floor((w * h) / 18000));
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.6 + 0.7,
      baseAlpha: Math.random() * 0.4 + 0.2,
    }));

    // 마우스 위치 (반발용)
    const mouse = { x: -9999, y: -9999 };
    hero.addEventListener('mousemove', e => {
      const rect = hero.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    hero.addEventListener('mouseleave', () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    const LINK_DIST = 130;
    const REPEL_DIST = 130;

    function tick() {
      ctx.clearRect(0, 0, w, h);

      // 별자리 연결선
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            const a = (1 - d / LINK_DIST) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(91, 138, 240, ${a})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // 파티클 + 마우스 반발
      particles.forEach(p => {
        // 마우스 반발
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < REPEL_DIST && d > 0) {
          const force = (REPEL_DIST - d) / REPEL_DIST * 0.6;
          p.vx -= (dx / d) * force;
          p.vy -= (dy / d) * force;
        }
        // 마찰
        p.vx *= 0.985;
        p.vy *= 0.985;
        // 미세 흔들림 (정지 방지)
        p.vx += (Math.random() - 0.5) * 0.01;
        p.vy += (Math.random() - 0.5) * 0.01;
        // 이동
        p.x += p.vx;
        p.y += p.vy;
        // 경계 반사
        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.x > w) { p.x = w; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        if (p.y > h) { p.y = h; p.vy *= -1; }
        // 그리기
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(91, 138, 240, ${p.baseAlpha})`;
        ctx.fill();
        // 글로우
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(91, 138, 240, ${p.baseAlpha * 0.15})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(tick);
    }
    let raf = requestAnimationFrame(tick);

    // 페이지 보이지 않을 때 일시 정지 (배터리 절약)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(tick);
      }
    });
  }

  // ────────────────────────────────────────────────────────────
  // 2. 숫자 카운트업 애니메이션
  // ────────────────────────────────────────────────────────────
  function animateNumber(el, target, duration, suffix) {
    if (reduce) {
      el.textContent = target + (suffix || '');
      return;
    }
    const start = 0;
    const startTime = performance.now();
    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const v = Math.floor(start + (target - start) * eased);
      el.textContent = v + (suffix || '');
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = target + (suffix || '');
    }
    requestAnimationFrame(step);
  }

  function parseValue(text) {
    const raw = text.trim();
    if (raw === '∞') return null;          // 무한대는 카운트 안 함
    const m = raw.match(/^(\d+)(.*)$/);
    if (!m) return null;
    return { target: parseInt(m[1], 10), suffix: m[2] };
  }

  // 히어로 메타 — 페이지 로드 즉시 시작
  hero.querySelectorAll('.hero-meta-value').forEach((el, idx) => {
    const parsed = parseValue(el.textContent);
    if (!parsed) return;
    // 살짝 순차 시작 (idx * 100ms 딜레이)
    setTimeout(() => animateNumber(el, parsed.target, 1400, parsed.suffix), 150 + idx * 120);
  });

  // 통계 바 — 스크롤로 들어올 때 트리거
  const statsBar = document.querySelector('.stats-bar');
  if (statsBar && 'IntersectionObserver' in window) {
    const statsObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          statsBar.querySelectorAll('.stat-value').forEach((el, idx) => {
            const parsed = parseValue(el.textContent);
            if (!parsed) return;
            setTimeout(() => animateNumber(el, parsed.target, 1200, parsed.suffix), idx * 100);
          });
          statsObserver.unobserve(statsBar);
        }
      });
    }, { threshold: 0.3 });
    statsObserver.observe(statsBar);
  }

  // ────────────────────────────────────────────────────────────
  // 3. 메타 항목 페이드 인 (히어로 진입 시)
  // ────────────────────────────────────────────────────────────
  if (!reduce) {
    hero.querySelectorAll('.hero-meta-item').forEach((el, idx) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(12px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 200 + idx * 120);
    });
  }
})();
