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

-- =========================================================
-- 커뮤니티 게시판 — instructor_posts + instructor_comments
-- =========================================================
--
-- ⚠ 이전에 불완전하게 만들어진 instructor_posts / instructor_comments /
--   instructor_testimonials 가 있어 42703 등 컬럼 에러가 반복된다면,
--   아래 4줄의 주석(--)을 풀어 깨끗이 초기화 후 재실행하세요.
--   주의: 이 4줄을 실행하면 게시판/후기 데이터가 모두 삭제됩니다
--         (instructor_profiles는 영향 없음).
--
-- drop view  if exists public.instructor_posts_with_counts cascade;
-- drop table if exists public.instructor_comments cascade;
-- drop table if exists public.instructor_posts cascade;
-- drop table if exists public.instructor_testimonials cascade;

create table if not exists public.instructor_posts (
  id          bigserial primary key,
  user_id     uuid      not null references auth.users(id) on delete cascade,
  site_id     text      default 'halla',
  category    text      default 'free',
  title       text      not null,
  body        text      not null,
  pinned      boolean   default false,
  view_count  integer   default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 기존 테이블 호환: 누락 컬럼 안전 추가 (42703 방지)
alter table public.instructor_posts add column if not exists user_id    uuid;
alter table public.instructor_posts add column if not exists site_id    text default 'halla';
alter table public.instructor_posts add column if not exists category   text default 'free';
alter table public.instructor_posts add column if not exists pinned     boolean default false;
alter table public.instructor_posts add column if not exists view_count integer default 0;
alter table public.instructor_posts add column if not exists updated_at timestamptz default now();

-- 기존 행에 NULL 채워서 NOT NULL 적용 가능하게
update public.instructor_posts set category = 'free' where category is null;
update public.instructor_posts set site_id  = 'halla' where site_id  is null;

-- NOT NULL 적용 (DO 블록으로 안전: 이미 NOT NULL이면 그대로)
do $$ begin
  alter table public.instructor_posts alter column category set not null;
exception when others then null; end $$;

-- user_id 외래키 제약 안전 추가 (이미 있으면 skip)
do $$ begin
  alter table public.instructor_posts
    add constraint instructor_posts_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
exception when duplicate_object then null; end $$;

-- user_id NOT NULL — 기존 NULL 행이 없을 때만 가능 (예외 시 그대로 둠)
do $$ begin
  alter table public.instructor_posts alter column user_id set not null;
exception when others then null; end $$;

-- CHECK 제약 추가 (이미 있으면 skip)
do $$ begin
  alter table public.instructor_posts
    add constraint instructor_posts_category_check
    check (category in ('notice', 'question', 'showcase', 'free'));
exception when duplicate_object then null; end $$;

comment on table public.instructor_posts is '커뮤니티 게시판 — 한라 사이트 글';
comment on column public.instructor_posts.category is 'notice(공지) | question(질문) | showcase(결과물) | free(자유)';

create index if not exists instructor_posts_site_idx on public.instructor_posts (site_id, created_at desc);
create index if not exists instructor_posts_category_idx on public.instructor_posts (category, created_at desc);
create index if not exists instructor_posts_pinned_idx on public.instructor_posts (pinned, created_at desc) where pinned = true;

alter table public.instructor_posts enable row level security;

-- 누구나(비로그인 포함) 읽기 가능 — 게시판은 공개
drop policy if exists "instructor_posts_select_public" on public.instructor_posts;
create policy "instructor_posts_select_public"
  on public.instructor_posts for select using (true);

-- 로그인한 사용자만 글쓰기 + 본인만 가능
drop policy if exists "instructor_posts_insert_own" on public.instructor_posts;
create policy "instructor_posts_insert_own"
  on public.instructor_posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "instructor_posts_update_own" on public.instructor_posts;
create policy "instructor_posts_update_own"
  on public.instructor_posts for update using (auth.uid() = user_id);

drop policy if exists "instructor_posts_delete_own" on public.instructor_posts;
create policy "instructor_posts_delete_own"
  on public.instructor_posts for delete using (auth.uid() = user_id);

drop trigger if exists instructor_posts_set_updated_at on public.instructor_posts;
create trigger instructor_posts_set_updated_at
  before update on public.instructor_posts
  for each row execute procedure public.instructor_set_updated_at();

-- 댓글
create table if not exists public.instructor_comments (
  id          bigserial primary key,
  post_id     bigint,
  user_id     uuid,
  body        text      not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 기존 테이블 호환 (42703 방지)
alter table public.instructor_comments add column if not exists post_id    bigint;
alter table public.instructor_comments add column if not exists user_id    uuid;
alter table public.instructor_comments add column if not exists updated_at timestamptz default now();

-- 외래키 제약 안전 추가
do $$ begin
  alter table public.instructor_comments
    add constraint instructor_comments_post_id_fkey
    foreign key (post_id) references public.instructor_posts(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.instructor_comments
    add constraint instructor_comments_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
exception when duplicate_object then null; end $$;

-- NOT NULL 적용 (NULL 데이터 없을 때만 성공)
do $$ begin
  alter table public.instructor_comments alter column post_id set not null;
exception when others then null; end $$;
do $$ begin
  alter table public.instructor_comments alter column user_id set not null;
exception when others then null; end $$;

comment on table public.instructor_comments is '게시글 댓글';

create index if not exists instructor_comments_post_idx on public.instructor_comments (post_id, created_at);

alter table public.instructor_comments enable row level security;

drop policy if exists "instructor_comments_select_public" on public.instructor_comments;
create policy "instructor_comments_select_public"
  on public.instructor_comments for select using (true);

drop policy if exists "instructor_comments_insert_own" on public.instructor_comments;
create policy "instructor_comments_insert_own"
  on public.instructor_comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "instructor_comments_update_own" on public.instructor_comments;
create policy "instructor_comments_update_own"
  on public.instructor_comments for update using (auth.uid() = user_id);

drop policy if exists "instructor_comments_delete_own" on public.instructor_comments;
create policy "instructor_comments_delete_own"
  on public.instructor_comments for delete using (auth.uid() = user_id);

drop trigger if exists instructor_comments_set_updated_at on public.instructor_comments;
create trigger instructor_comments_set_updated_at
  before update on public.instructor_comments
  for each row execute procedure public.instructor_set_updated_at();

-- 게시글에 댓글 수를 노출하는 view (이전 버전과 컬럼 차이 시 재생성 안전을 위해 drop)
drop view if exists public.instructor_posts_with_counts;
create view public.instructor_posts_with_counts as
select
  p.*,
  coalesce(c.cnt, 0)::int as comment_count
from public.instructor_posts p
left join (
  select post_id, count(*) as cnt from public.instructor_comments group by post_id
) c on c.post_id = p.id;

-- =========================================================
-- 수강생 후기 — instructor_testimonials
-- =========================================================

create table if not exists public.instructor_testimonials (
  id           bigserial primary key,
  site_id      text     default 'halla',
  cohort       text     check (cohort in ('am', 'pm', 'both')),
  display_name text     not null,
  affiliation  text,
  cohort_year  text,
  quote        text     not null,
  rating       smallint default 5 check (rating between 1 and 5),
  avatar_color smallint default 1 check (avatar_color between 1 and 6),
  is_published boolean  default true,
  is_external  boolean  default false,
  source_note  text,
  created_at   timestamptz default now()
);

-- 기존 테이블 호환: 누락 컬럼 추가 (42703 undefined_column 방지)
alter table public.instructor_testimonials add column if not exists site_id      text default 'halla';
alter table public.instructor_testimonials add column if not exists cohort       text;
alter table public.instructor_testimonials add column if not exists display_name text;
alter table public.instructor_testimonials add column if not exists affiliation  text;
alter table public.instructor_testimonials add column if not exists cohort_year  text;
alter table public.instructor_testimonials add column if not exists quote        text;
alter table public.instructor_testimonials add column if not exists rating       smallint default 5;
alter table public.instructor_testimonials add column if not exists avatar_color smallint default 1;
alter table public.instructor_testimonials add column if not exists is_published boolean default true;
alter table public.instructor_testimonials add column if not exists is_external  boolean default false;
alter table public.instructor_testimonials add column if not exists source_note  text;

-- cohort/rating/avatar_color CHECK 제약 안전 추가
do $$ begin
  alter table public.instructor_testimonials
    add constraint instructor_testimonials_cohort_check
    check (cohort is null or cohort in ('am', 'pm', 'both'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.instructor_testimonials
    add constraint instructor_testimonials_rating_check
    check (rating between 1 and 5);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.instructor_testimonials
    add constraint instructor_testimonials_avatar_check
    check (avatar_color between 1 and 6);
exception when duplicate_object then null; end $$;

comment on table public.instructor_testimonials is '수강생 후기. is_external=true는 타 대학 사례, is_published=false는 비공개';
comment on column public.instructor_testimonials.cohort is 'am | pm | both';

alter table public.instructor_testimonials enable row level security;

drop policy if exists "instructor_testimonials_select_public" on public.instructor_testimonials;
create policy "instructor_testimonials_select_public"
  on public.instructor_testimonials for select using (is_published = true);

-- 관리자만 추가 — RLS 없이 service_role로 SQL에서 insert (또는 별도 admin 정책)

-- 초기 시드: 다른 학교 동일 커리큘럼 수강생 후기 (한라 첫 회차 전 참고용)
insert into public.instructor_testimonials
  (cohort, display_name, affiliation, cohort_year, quote, rating, avatar_color, is_external, source_note)
values
  ('am', '김O지', '경기대학교', '23학번',
   '평생 컴퓨터를 무서워했는데 5일 만에 Canva·Gamma로 발표자료 5장을 만들었어요. 학과 발표가 두렵지 않아졌습니다.',
   5, 1, true, '경기대 동일 커리큘럼 시범 회차 (2025)'),
  ('pm', '박O혁', '한신대학교', '22학번',
   'HTML이 뭔지도 몰랐는데 금요일에 본인 웹사이트를 인터넷에 공개했어요. URL을 부모님께 보여드리니 표정이 잊혀지지 않습니다.',
   5, 2, true, '한신대 동일 커리큘럼 시범 회차 (2025)'),
  ('am', '이O아', '경기대학교', '21학번',
   '프롬프트 3대 무기 배우고 나서 리포트 작성 시간이 절반으로 줄었어요. 이메일 답장도 30분이면 끝납니다.',
   5, 3, true, '경기대 동일 커리큘럼 시범 회차 (2025)'),
  ('pm', '정O준', '한신대학교', '24학번',
   '"AI한테 시키면 진짜 되네"라는 게 신기했어요. 다크모드 토글까지 직접 추가해 발표 때 박수받았습니다.',
   5, 4, true, '한신대 동일 커리큘럼 시범 회차 (2025)'),
  ('am', '최O연', '경기대학교', '22학번',
   'Gamma로 30분 만에 발표자료 만든 게 가장 충격적이었어요. 학기 중 다른 과목 발표에도 그대로 쓰는 중입니다.',
   4, 5, true, '경기대 동일 커리큘럼 시범 회차 (2025)'),
  ('pm', '한O서', '한신대학교', '23학번',
   '에러가 나서 막혔는데 Claude에게 에러 메시지 그대로 보여주니 5초 만에 해결됐어요. 디버깅이 무섭지 않아졌습니다.',
   5, 6, true, '한신대 동일 커리큘럼 시범 회차 (2025)')
on conflict do nothing;

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
