-- Storage Buckets + RLS Policies
-- Erstellt die benötigten Supabase Storage Buckets und deren Zugriffsregeln.

-- ── Buckets anlegen ────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-avatars',  'profile-avatars',  true, 5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('fragrance-images', 'fragrance-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('challenge-logos',  'challenge-logos',  true, 5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- ── profile-avatars ────────────────────────────────────────────────────────
CREATE POLICY IF NOT EXISTS "profile-avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-avatars');

CREATE POLICY IF NOT EXISTS "profile-avatars: auth upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY IF NOT EXISTS "profile-avatars: own delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── fragrance-images ────────────────────────────────────────────────────────
CREATE POLICY IF NOT EXISTS "fragrance-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fragrance-images');

CREATE POLICY IF NOT EXISTS "fragrance-images: creator upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fragrance-images'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.fragrances f
      WHERE f.id::text = (storage.foldername(name))[1]
        AND f.owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "fragrance-images: creator delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fragrance-images'
    AND EXISTS (
      SELECT 1 FROM public.fragrances f
      WHERE f.id::text = (storage.foldername(name))[1]
        AND f.owner_id = auth.uid()
    )
  );

-- ── challenge-logos ────────────────────────────────────────────────────────
CREATE POLICY IF NOT EXISTS "challenge-logos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'challenge-logos');

CREATE POLICY IF NOT EXISTS "challenge-logos: admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'challenge-logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
