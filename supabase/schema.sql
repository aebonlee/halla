-- =========================================================
-- 한라대학교 AC 기초 트랙 - Supabase 스키마
-- 테이블 접두사: instructor_
-- 적용 방법: Supabase 대시보드 → SQL Editor → 본 파일 전체 붙여넣기 → Run
-- =========================================================

-- ---------- 프로필 테이블 ----------
create table if not exists public.instructor_profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  full_name     text,
  email         text,
  avatar_url    text,
  affiliation   text        default '한라대학교',
  major         text,
  cohort        text        check (cohort in ('am', 'pm', 'both')),
  bio           text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

comment on table public.instructor_profiles is '한라대 AC 기초 트랙 학습자 프로필. cohort: am=오전반, pm=오후반, both=둘다';
comment on column public.instructor_profiles.cohort is 'am | pm | both — 수강하는 과정';

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
create or replace function public.instructor_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.instructor_profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
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
create index if not exists instructor_profiles_cohort_idx on public.instructor_profiles (cohort);
create index if not exists instructor_profiles_created_at_idx on public.instructor_profiles (created_at desc);
