-- 1. Create a public bucket for squad previews
insert into storage.buckets (id, name, public)
values ('squad-previews', 'squad-previews', true)
on conflict (id) do nothing;

-- 2. Allow public access to view previews
create policy "Public Access to Previews"
on storage.objects for select
using ( bucket_id = 'squad-previews' );

-- 3. Allow anybody to upload previews (Anonymous upload for simplicity in this MVP)
create policy "Public Upload Access"
on storage.objects for insert
with check ( bucket_id = 'squad-previews' );

-- Note: In a production environment, you should restrict 'insert' to authenticated users
-- or use signed URLs for uploads.
