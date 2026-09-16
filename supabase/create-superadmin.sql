-- STEP 2 ONLY: first create YOUR user in Authentication > Users > Add user.
-- Set and keep your password there; never put a password in SQL.
-- Replace the email below with the exact email you created. Then run this file.
do $$
declare
 owner_email text := 'REPLACE_WITH_YOUR_EMAIL';
 owner_id uuid;
begin
 if owner_email='REPLACE_WITH_YOUR_EMAIL' then
  raise exception 'Replace REPLACE_WITH_YOUR_EMAIL with your own Auth user email first.';
 end if;
 select id into owner_id from auth.users where lower(email)=lower(trim(owner_email));
 if owner_id is null then
  raise exception 'Create this user in Authentication > Users first.';
 end if;
 if exists(select 1 from public.sl_profiles where role='admin' and id<>owner_id) then
  raise exception 'A Super Admin already exists. This script will not replace them.';
 end if;
 if exists(select 1 from public.sl_profiles where id=owner_id and role<>'admin') then
  raise exception 'This email belongs to a teacher/student. Use your own dedicated owner account.';
 end if;
 insert into public.sl_profiles(id,role,email,active,must_change_password,data)
 values(owner_id,'admin',lower(trim(owner_email)),true,false,
        jsonb_build_object('name','Super Admin','status','Active'))
 on conflict(id) do nothing;
 insert into public.sl_workspaces(owner_id) values(owner_id) on conflict do nothing;
end $$;
select email,role,active from public.sl_profiles where role='admin';
