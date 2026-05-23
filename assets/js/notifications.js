// 한라대 AC 기초 트랙 — 이메일·SMS 발송 공용 유틸리티
// templete-ref의 notifications.ts 패턴을 정적 사이트(브라우저)용으로 포팅.
//
// 인프라 (이미 배포됨, 공용):
//   - Supabase Edge Function "send-email" → Resend API
//     발신: noreply@dreamitbiz.com
//   - Supabase Edge Function "send-sms"   → icode TCP SMS
//     (등록된 발신번호)
//
// 사용법 (브라우저에서):
//   await HallaNotify.sendEmail({ to:'user@example.com', subject:'제목', html:'<p>내용</p>' });
//   await HallaNotify.sendSMS({ receiver:'01012345678', message:'안녕하세요' });
//   await HallaNotify.sendBoth({
//     email: { to:'u@example.com', subject:'알림', html:'...' },
//     sms:   { receiver:'01012345678', message:'알림' }
//   });
//   const html = HallaNotify.buildEmailHtml({ title:'환영', greeting:'안녕하세요 홍길동님', body:'...', cta:{label:'시작',url:'...'} });

(function () {
  // 공용 Supabase 클라이언트 (auth.js의 HallaAuth.getClient() 활용)
  const getClient = () => (window.HallaAuth && window.HallaAuth.getClient && window.HallaAuth.getClient()) || null;

  // ── 이메일 발송 ─────────────────────────────────────────────────
  async function sendEmail({ to, subject, html, type }) {
    const sb = getClient();
    if (!sb) return { success: false, error: 'Supabase client unavailable' };
    if (!to || !subject || !html) {
      return { success: false, error: 'to, subject, html 필수' };
    }
    try {
      const { data, error } = await sb.functions.invoke('send-email', {
        body: { to, subject, html, type: type || 'halla-notification' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { success: true, data };
    } catch (e) {
      console.warn('[notify] sendEmail failed:', e?.message || e);
      return { success: false, error: String(e?.message || e) };
    }
  }

  // ── SMS 발송 ────────────────────────────────────────────────────
  async function sendSMS({ receiver, message }) {
    const sb = getClient();
    if (!sb) return { success: false, error: 'Supabase client unavailable' };
    if (!receiver || !message) {
      return { success: false, error: 'receiver, message 필수' };
    }
    // 하이픈 자동 제거
    const cleanedReceiver = String(receiver).replace(/[^0-9]/g, '');
    try {
      const { data, error } = await sb.functions.invoke('send-sms', {
        body: { receiver: cleanedReceiver, message },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { success: true, data };
    } catch (e) {
      console.warn('[notify] sendSMS failed:', e?.message || e);
      return { success: false, error: String(e?.message || e) };
    }
  }

  // ── 이메일 + SMS 동시 발송 ─────────────────────────────────────
  async function sendBoth({ email, sms }) {
    const results = await Promise.all([
      email ? sendEmail(email) : Promise.resolve({ success: true, skipped: true }),
      sms   ? sendSMS(sms)     : Promise.resolve({ success: true, skipped: true }),
    ]);
    return {
      email: results[0],
      sms:   results[1],
      success: results[0].success && results[1].success,
    };
  }

  // ── 이메일 HTML 템플릿 빌더 ─────────────────────────────────────
  // 사이트 브랜딩(다크 블루 팔레트)을 일관되게 적용한 이메일 본문 생성.
  // 옵션:
  //   title:    제목 (h1)
  //   greeting: 인사 (p)
  //   body:     본문 — string | string[] (배열이면 각 항목이 <p>)
  //   cta:      { label, url }  — 행동 유도 버튼 (선택)
  //   footer:   푸터 텍스트 (선택, 기본 한라/DreamIT Biz)
  function buildEmailHtml({ title, greeting, body, cta, footer }) {
    const NAVY = '#1B2A4A';
    const BLUE = '#3D6FE0';
    const MUTED = '#94A3B8';
    const TEXT = '#0F172A';

    const bodyArr = Array.isArray(body) ? body : (body ? [body] : []);
    const bodyHtml = bodyArr.map(p => `<p style="margin:0 0 12px;line-height:1.6;color:${TEXT};">${p}</p>`).join('');

    const ctaHtml = cta ? `
      <p style="margin:24px 0 0;">
        <a href="${cta.url}" style="display:inline-block;padding:12px 24px;background:${BLUE};color:white;
           text-decoration:none;border-radius:8px;font-weight:700;">
          ${cta.label || '바로가기 →'}
        </a>
      </p>` : '';

    const footerHtml = footer || `한라대학교 · DreamIT Biz<br>문의: aebon@kyonggi.ac.kr`;

    return `
<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Pretendard','Noto Sans KR',sans-serif;color:${TEXT};">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="height:4px;background:linear-gradient(90deg,${NAVY},${BLUE});border-radius:2px;margin-bottom:20px;"></div>
      ${title ? `<h1 style="margin:0 0 12px;color:${NAVY};font-size:22px;font-weight:800;">${title}</h1>` : ''}
      ${greeting ? `<p style="margin:0 0 16px;color:${TEXT};">${greeting}</p>` : ''}
      ${bodyHtml}
      ${ctaHtml}
      <hr style="margin:32px 0 16px;border:none;border-top:1px solid #E2E8F0;">
      <p style="margin:0;color:${MUTED};font-size:13px;line-height:1.6;">${footerHtml}</p>
    </div>
    <p style="text-align:center;color:${MUTED};font-size:12px;margin:16px 0 0;">
      © 2026 한라대학교 · DreamIT Biz · halla.dreamitbiz.com
    </p>
  </div>
</body></html>`;
  }

  // 외부 API
  window.HallaNotify = {
    sendEmail,
    sendSMS,
    sendBoth,
    buildEmailHtml,
  };
})();
