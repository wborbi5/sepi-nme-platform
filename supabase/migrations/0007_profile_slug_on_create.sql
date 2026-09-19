-- Generate profiles.slug on auth signup when missing.
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_slug text;
begin
  v_name := nullif(new.raw_user_meta_data ->> 'full_name', '');
  v_slug := trim(both '-' from regexp_replace(
    lower(coalesce(v_name, split_part(new.email, '@', 1))),
    '[^a-z0-9]+', '-', 'g'
  ));
  if v_slug is null or v_slug = '' then
    v_slug := 'member';
  end if;
  -- avoid unique collisions
  if exists (select 1 from profiles where slug = v_slug) then
    v_slug := v_slug || '-' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  insert into profiles (id, email, full_name, role, slug)
  values (
    new.id,
    new.email,
    v_name,
    coalesce(new.raw_user_meta_data ->> 'role', 'new_member'),
    v_slug
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
