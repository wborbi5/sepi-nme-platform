-- Proof files: common photos and PDFs, up to 50MB.
-- Members can delete their own upload when the sprint entry itself fails,
-- so a rejected submit does not leave an orphaned object.
-- Sprint amount columns are already numeric(12,2) in the live database.
-- This migration does not change them.

update storage.buckets
set
  file_size_limit = 50 * 1024 * 1024,
  allowed_mime_types = array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/bmp',
    'image/tiff',
    'image/avif',
    'application/pdf',
    'application/octet-stream'
  ]
where id = 'sprint';

drop policy if exists "you delete your own sprint proof" on storage.objects;
create policy "you delete your own sprint proof"
  on storage.objects for delete to authenticated
  using (bucket_id = 'sprint' and (storage.foldername(name))[1] = auth.uid()::text);
