# Supabase 운영 가이드

한라대학교 AC 기초 트랙 사이트의 인증·DB는 Supabase로 운영합니다.
이 폴더는 **운영자용** 자료입니다 (학생에게 노출 안 됨).

- 프로젝트: `hcmgdztsgjvzcyxyayaj`
- URL: <https://hcmgdztsgjvzcyxyayaj.supabase.co>
- 테이블 접두사: `instructor_`

## 1. 초기 셋업 — SQL Editor에서 스키마 실행

1. <https://supabase.com/dashboard/project/hcmgdztsgjvzcyxyayaj/sql/new> 접속
2. `schema.sql` 전체 복사 → 붙여넣기 → **Run**
3. 생성 확인:
   - `public.instructor_profiles` 테이블
   - RLS 정책 4개 (select/insert/update/delete own)
   - 트리거 2개 (`instructor_profiles_set_updated_at`, `instructor_on_auth_user_created`)

## 2. OAuth 공급자 활성화

### Google OAuth

#### Google Cloud Console 쪽 (먼저)
1. <https://console.cloud.google.com/apis/credentials> 접속
2. **CREATE CREDENTIALS → OAuth client ID**
3. Application type: **Web application**
4. Authorized JavaScript origins:
   - `https://halla.dreamitbiz.com`
   - `https://hcmgdztsgjvzcyxyayaj.supabase.co`
5. Authorized redirect URIs:
   - `https://hcmgdztsgjvzcyxyayaj.supabase.co/auth/v1/callback`
6. Client ID · Client Secret 복사

#### Supabase 쪽
1. <https://supabase.com/dashboard/project/hcmgdztsgjvzcyxyayaj/auth/providers> 접속
2. **Google** 활성화 → Client ID · Client Secret 입력 → Save

### Kakao OAuth

#### Kakao Developers 쪽 (먼저)
1. <https://developers.kakao.com/console/app> 접속 → 앱 생성 또는 기존 앱 선택
2. **앱 설정 → 플랫폼 → Web** 사이트 도메인:
   - `https://halla.dreamitbiz.com`
3. **카카오 로그인 → 활성화 설정 ON**
4. **카카오 로그인 → Redirect URI**:
   - `https://hcmgdztsgjvzcyxyayaj.supabase.co/auth/v1/callback`
5. **동의 항목**: 닉네임 · 프로필 사진 · 카카오계정(이메일) 필수 동의로 설정
6. **앱 키 → REST API 키** 복사
7. **보안 → Client Secret 코드 발급 후 ON**

#### Supabase 쪽
1. <https://supabase.com/dashboard/project/hcmgdztsgjvzcyxyayaj/auth/providers> 접속
2. **Kakao** 활성화 → REST API 키 (Client ID) · Client Secret 입력 → Save

## 3. URL Configuration

<https://supabase.com/dashboard/project/hcmgdztsgjvzcyxyayaj/auth/url-configuration>

- **Site URL**: `https://halla.dreamitbiz.com`
- **Redirect URLs** (개행으로 추가):
  - `https://halla.dreamitbiz.com/profile.html`
  - `https://halla.dreamitbiz.com/**`
  - `http://localhost:8000/profile.html` (로컬 개발)
  - `http://localhost:8000/**`

## 4. 동작 점검

1. <https://halla.dreamitbiz.com/login.html> 접속
2. Google · Kakao 두 버튼 클릭 → 정상 인증 흐름 확인
3. 자동으로 `/profile.html`로 리디렉션
4. SQL Editor에서 확인:
   ```sql
   select * from public.instructor_profiles order by created_at desc limit 5;
   ```
5. 신규 가입자 1건이 자동 생성되어야 함 (트리거 동작)

## 5. 클라이언트 코드 위치

- `assets/js/auth.js` — Supabase 클라이언트 초기화, OAuth, 프로필 CRUD, nav 슬롯 갱신
- `login.html` — Google · Kakao 버튼
- `profile.html` — 프로필 조회·수정·로그아웃

ANON KEY는 `auth.js`에 상수로 들어 있습니다. (공개해도 안전한 키지만, RLS 설정이 필수)

## 6. 운영 점검

```sql
-- 누적 가입자 수
select count(*) from public.instructor_profiles;

-- 과정별 가입자
select cohort, count(*) from public.instructor_profiles group by cohort;

-- 최근 가입자 10명
select full_name, email, cohort, created_at
from public.instructor_profiles
order by created_at desc
limit 10;
```

## 7. 보안 노트

- **ANON KEY**: 클라이언트(브라우저) 노출 OK. 단 RLS 정책이 막아 줘야 함.
- **Service Role Key**: 절대 클라이언트에 두지 말 것. Edge Function·서버에서만.
- **sbp_* Access Token**: 절대 Git에 커밋 금지. 로컬 환경변수 또는 1Password.
- 사용자가 자기 데이터만 수정할 수 있도록 RLS 정책이 모두 `auth.uid() = id`로 제한됨.

## 8. 추후 확장 (Phase 2)

- `instructor_progress` 테이블 (Day별 완료 체크)
- `instructor_submissions` 테이블 (발표 자료 업로드)
- Resend Edge Function (가입 환영 메일)
- 강사용 대시보드 (수강생 목록·진도 조회)
