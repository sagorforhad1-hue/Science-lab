-- Science Lab: run this whole file once in Supabase > SQL Editor.
-- Safe to re-run. Does not import demo data or create a password.
begin;
create table if not exists public.sl_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('admin','teacher','student')),
 teacher_id uuid references public.sl_profiles(id),
 email text not null,
 active boolean not null default true,
 must_change_password boolean not null default true,
 data jsonb not null default '{}'::jsonb check(jsonb_typeof(data)='object'),
 preferences jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 constraint sl_role_parent check (
   (role in ('admin','teacher') and teacher_id is null) or
   (role='student' and teacher_id is not null and teacher_id<>id)
 )
);
-- There can only ever be ONE Super Admin profile.
create unique index if not exists sl_one_superadmin on public.sl_profiles(role) where role='admin';
create unique index if not exists sl_profile_email on public.sl_profiles(lower(email));
create index if not exists sl_profiles_teacher on public.sl_profiles(teacher_id) where teacher_id is not null;
create table if not exists public.sl_workspaces (
 owner_id uuid primary key references public.sl_profiles(id) on delete cascade,
 version bigint not null default 0,
 data jsonb not null default '{}'::jsonb check(jsonb_typeof(data)='object'),
 updated_at timestamptz not null default now()
);
create table if not exists public.sl_files (
 id uuid primary key,
 owner_id uuid not null references public.sl_profiles(id),
 tenant_id uuid not null references public.sl_profiles(id),
 path text not null unique,
 name text not null,
 mime text not null,
 size bigint not null check(size>0 and size<=10485760),
 created_at timestamptz not null default now()
);
create index if not exists sl_files_tenant on public.sl_files(tenant_id);
create index if not exists sl_files_owner on public.sl_files(owner_id);
-- All business-data access goes through /api/app after live Auth + role checks.
-- No browser can query, change, or promote a profile directly, even if signed in.
alter table public.sl_profiles enable row level security;
alter table public.sl_workspaces enable row level security;
alter table public.sl_files enable row level security;
revoke all on public.sl_profiles,public.sl_workspaces,public.sl_files from public,anon,authenticated;
grant select,insert,update,delete on public.sl_profiles,public.sl_workspaces,public.sl_files to service_role;
insert into storage.buckets(id,name,public,file_size_limit)
values ('science-lab-private','science-lab-private',false,10485760)
on conflict(id) do update set public=false,file_size_limit=10485760;
-- No public object policies. Short-lived upload/download URLs are issued by the server.

-- Service-only transactional account registration, serialized per creator.
-- SECURITY INVOKER: the API's service role supplies the privileges.
create or replace function public.sl_register_account(
 creator_id uuid, new_id uuid, new_role text, login_email text, profile_data jsonb
) returns void language plpgsql set search_path='' as $$
declare creator public.sl_profiles%rowtype;
 w jsonb; b jsonb; batch_id text; enrolled bigint;
begin
 select * into creator from public.sl_profiles where id=creator_id for update;
 if not found or not creator.active then raise exception 'Creator is inactive'; end if;
 if not ((creator.role='admin' and new_role='teacher') or (creator.role='teacher' and new_role='student')) then
  raise exception 'Account creation not permitted';
 end if;
 if new_role='student' then
  if (select count(*) from public.sl_profiles where teacher_id=creator_id and active)
       >= coalesce((creator.data->>'studentLimit')::int,0) then raise exception 'Student limit reached'; end if;
  if exists(select 1 from public.sl_profiles where teacher_id=creator_id and data->>'studentId'=profile_data->>'studentId') then
   raise exception 'Student ID already exists';
  end if;
  select data into w from public.sl_workspaces where owner_id=creator_id;
  for batch_id in select jsonb_array_elements_text(profile_data->'batchIds') loop
   select value into b from jsonb_array_elements(coalesce(w->'batches','[]'::jsonb)) where value->>'id'=batch_id;
   if b is null or b->>'status'<>'Active' then raise exception 'Select an active batch'; end if;
   select count(*) into enrolled from public.sl_profiles where teacher_id=creator_id and active and (data->'batchIds') ? batch_id;
   if enrolled >= (b->>'capacity')::int then raise exception 'Batch is full'; end if;
  end loop;
 end if;
 insert into public.sl_profiles(id,role,teacher_id,email,active,must_change_password,data)
 values(new_id,new_role,case when new_role='student' then creator_id end,lower(login_email),
 coalesce(profile_data->>'status','Active') not in ('Suspended','Archived'),true,profile_data);
 if new_role='teacher' then insert into public.sl_workspaces(owner_id) values(new_id); end if;
end $$;
revoke all on function public.sl_register_account(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.sl_register_account(uuid,uuid,text,text,jsonb) to service_role;

commit;
