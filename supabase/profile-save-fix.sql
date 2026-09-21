-- Run once in the Science Lab Supabase SQL Editor. Safe to repeat.
-- Keeps profile images out of URLs and preserves concurrent-edit protection.
begin;
create or replace function public.sl_update_profile(
 profile_id uuid, expected_data jsonb, replacement_data jsonb, replacement_active boolean
) returns table(id uuid)
language sql security invoker set search_path='' as $$
 update public.sl_profiles p
 set data=replacement_data, active=replacement_active
 where p.id=profile_id and p.data=expected_data
 returning p.id;
$$;
revoke all on function public.sl_update_profile(uuid,jsonb,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.sl_update_profile(uuid,jsonb,jsonb,boolean) to service_role;
alter table public.sl_profiles enable row level security;
alter table public.sl_workspaces enable row level security;
alter table public.sl_files enable row level security;
revoke all on public.sl_profiles,public.sl_workspaces,public.sl_files from public,anon,authenticated;
notify pgrst, 'reload schema';
commit;
