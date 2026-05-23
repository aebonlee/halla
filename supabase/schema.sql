-- =========================================================
-- 한라대학교 AC 기초 트랙 - Supabase 스키마
-- 테이블 접두사: instructor_
-- 멀티사이트 패턴: 같은 Supabase 프로젝트를 공유하는 다른 사이트와
--                signup_domain / visited_sites / site_id 컬럼으로 분리
-- 적용 방법: Supabase 대시보드 → SQL Editor → 본 파일 전체 붙여넣기 → Run
-- =========================================================

-- ---------- 프로필 테이블 ----------
create table if not exists public.instructor_profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  full_name       text,
  email           text,
  avatar_url      text,
  affiliation     text        default '한라대학교',
  major           text,
  cohort          text        check (cohort in ('am', 'pm', 'both')),
  bio             text,

  -- 멀티사이트 식별
  site_id         text        default 'halla',
  signup_domain   text,                    -- 최초 가입 도메인 (예: halla.dreamitbiz.com)
  visited_sites   text[]      default '{}'::text[],  -- 누적 방문 도메인
  role            text        default 'student',     -- student | instructor | admin

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 신규 컬럼 추가 (기존 테이블 있을 시 호환)
alter table public.instructor_profiles add column if not exists site_id       text default 'halla';
alter table public.instructor_profiles add column if not exists signup_domain text;
alter table public.instructor_profiles add column if not exists visited_sites text[] default '{}'::text[];
alter table public.instructor_profiles add column if not exists role          text default 'student';

comment on table public.instructor_profiles is '한라대 AC 기초 트랙 학습자 프로필. site_id=halla로 다른 사이트와 분리';
comment on column public.instructor_profiles.cohort is 'am | pm | both — 수강하는 과정';
comment on column public.instructor_profiles.site_id is '사이트 식별자 — halla (확장 시 다른 사이트 추가)';
comment on column public.instructor_profiles.signup_domain is '최초 가입 도메인 — 사이트별 가입자 필터링용';
comment on column public.instructor_profiles.visited_sites is '누적 방문 도메인 배열';
comment on column public.instructor_profiles.role is 'student(기본) | instructor | admin';

-- ---------- 행 단위 보안 (RLS) ----------
alter table public.instructor_profiles enable row level security;

-- 본인 프로필 조회
drop policy if exists "instructor_profiles_select_own" on public.instructor_profiles;
create policy "instructor_profiles_select_own"
  on public.instructor_profiles for select
  using ( auth.uid() = id );

-- 본인 프로필 생성
drop policy if exists "instructor_profiles_insert_own" on public.instructor_profiles;
create policy "instructor_profiles_insert_own"
  on public.instructor_profiles for insert
  with check ( auth.uid() = id );

-- 본인 프로필 수정
drop policy if exists "instructor_profiles_update_own" on public.instructor_profiles;
create policy "instructor_profiles_update_own"
  on public.instructor_profiles for update
  using ( auth.uid() = id );

-- 본인 프로필 삭제 (계정 삭제 시 cascade로도 처리되지만 명시)
drop policy if exists "instructor_profiles_delete_own" on public.instructor_profiles;
create policy "instructor_profiles_delete_own"
  on public.instructor_profiles for delete
  using ( auth.uid() = id );

-- ---------- updated_at 자동 갱신 트리거 ----------
create or replace function public.instructor_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists instructor_profiles_set_updated_at on public.instructor_profiles;
create trigger instructor_profiles_set_updated_at
  before update on public.instructor_profiles
  for each row
  execute procedure public.instructor_set_updated_at();

-- ---------- 신규 사용자 가입 시 프로필 자동 생성 트리거 ----------
-- raw_user_meta_data에 signup_domain이 있으면 그 값을 사용 (signUp 시 options.data로 전달 가능)
create or replace function public.instructor_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.instructor_profiles (id, full_name, email, avatar_url, signup_domain, site_id, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'signup_domain',  -- 없으면 NULL (클라이언트가 ensureSiteIdentity로 채움)
    'halla',
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists instructor_on_auth_user_created on auth.users;
create trigger instructor_on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.instructor_handle_new_user();

-- ---------- 인덱스 ----------
create index if not exists instructor_profiles_cohort_idx        on public.instructor_profiles (cohort);
create index if not exists instructor_profiles_created_at_idx    on public.instructor_profiles (created_at desc);
create index if not exists instructor_profiles_signup_domain_idx on public.instructor_profiles (signup_domain);
create index if not exists instructor_profiles_site_id_idx       on public.instructor_profiles (site_id);

-- ---------- 사이트별 운영 편의 VIEW ----------
-- 한라 사이트 가입자만 보는 view (signup_domain 또는 site_id로 필터)
create or replace view public.instructor_halla_users as
select
  id,
  full_name,
  email,
  cohort,
  affiliation,
  major,
  role,
  signup_domain,
  visited_sites,
  created_at,
  updated_at
from public.instructor_profiles
where site_id = 'halla' or signup_domain like '%halla%';

comment on view public.instructor_halla_users is '한라 사이트 가입자만 — 사이트별 모니터링에 사용';
