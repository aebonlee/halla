// 한라대학교 AC 기초 트랙 - 사이트 식별 설정
// templete_2의 site.config 패턴을 따라, 같은 Supabase 프로젝트를 공유하는
// 다른 사이트(template.dreamitbiz.com, copilot.dreamitbiz.com 등)와의 충돌 방지.
//
// 데이터 분리 방식:
// - 사이트 전용 테이블: dbPrefix로 네임스페이스 (instructor_profiles, instructor_progress, ...)
// - 공용 사용자 메타: signup_domain / visited_sites 컬럼으로 사이트 식별
// - SQL 운영: WHERE signup_domain = 'halla.dreamitbiz.com' 등으로 사이트별 조회

window.HallaSite = {
  id: 'halla',
  name: '한라대학교 AC 기초 트랙',
  domain: 'halla.dreamitbiz.com',
  url: 'https://halla.dreamitbiz.com',

  // 관리자 이메일 — 이 계정으로 로그인하면 모든 과정 열람 + 관리자 대시보드(admin.html) 접근
  // (클라이언트 게이팅용. DB 차원 권한은 schema.sql의 admin RLS 정책으로 보강)
  adminEmails: ['aebon@kyonggi.ac.kr'],

  // DB 테이블 접두사 (사용자 지정: instructor_)
  // — 같은 Supabase 프로젝트의 다른 사이트와 분리
  dbPrefix: 'instructor_',

  // 본 사이트가 사용하는 모든 테이블의 풀네임 매핑
  // (확장 시 여기에 추가 → auth.js에서 일관되게 참조)
  tables: {
    profiles: 'instructor_profiles',
    // Phase 2:
    // progress:    'instructor_progress',
    // submissions: 'instructor_submissions',
    // attendance:  'instructor_attendance',
  },

  // 부모 사이트 (브랜드)
  parent: {
    name: 'DreamIT Biz',
    url: 'https://www.dreamitbiz.com',
  },
};
