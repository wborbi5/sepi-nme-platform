-- SEPi NME Platform — storage buckets and policies
--
-- Path convention puts the owner id first so a single policy per bucket
-- covers every object in it:
--   avatars/{profile_id}/avatar.webp
--   logos/{company_id}/logo.webp
--   decks/{company_id}/{timestamp}-{filename}
--   resumes/{profile_id}/resume.pdf
--
-- Tables store paths, never binaries. Avatars and logos overwrite at a fixed
-- filename rather than accumulating versions.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true,   2 * 1024 * 1024, array['image/webp', 'image/jpeg', 'image/png']),
  ('logos',   'logos',   true,   2 * 1024 * 1024, array['image/webp', 'image/jpeg', 'image/png']),
  ('decks',   'decks',   false, 20 * 1024 * 1024, array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]),
  ('resumes', 'resumes', false,  5 * 1024 * 1024, array['application/pdf']),
  ('sprint',  'sprint',  false, 10 * 1024 * 1024, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------------ avatars

create policy "avatars are readable by anyone"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "you write your own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "you replace your own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "you delete your own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- -------------------------------------------------------------------- logos

create policy "logos are readable by anyone"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "company members write the logo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (is_company_member(((storage.foldername(name))[1])::uuid) or is_admin())
  );

create policy "company members replace the logo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and (is_company_member(((storage.foldername(name))[1])::uuid) or is_admin())
  );

-- -------------------------------------------------------------------- decks

create policy "decks are readable by any member"
  on storage.objects for select to authenticated
  using (bucket_id = 'decks');

create policy "company members write the deck"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'decks'
    and (is_company_member(((storage.foldername(name))[1])::uuid) or is_admin())
  );

create policy "company members delete the deck"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'decks'
    and (is_company_member(((storage.foldername(name))[1])::uuid) or is_admin())
  );

-- ------------------------------------------------------------------ resumes

-- Resumes are yours. Other members reach them through a signed URL the
-- server mints when rendering your profile.
create policy "you read your own resume"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'resumes'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

create policy "you write your own resume"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "you replace your own resume"
  on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------------- sprint

-- Proof photos. Admins review them; entrants see their own.
create policy "sprint proof readable by owner and admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'sprint'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

create policy "you upload your own sprint proof"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'sprint' and (storage.foldername(name))[1] = auth.uid()::text);
