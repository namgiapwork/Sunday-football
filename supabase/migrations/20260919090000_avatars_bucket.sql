-- Profile pictures. One public-read bucket; every write goes through a server
-- action using the service role, so — as everywhere else — no write policy is
-- created on storage.objects.
--
-- Guarded because the schema tests replay migrations on a bare Postgres that has
-- no Supabase storage schema.

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatars', 'avatars', true, 524288, array['image/webp', 'image/jpeg', 'image/png'])
    on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end
$$;
