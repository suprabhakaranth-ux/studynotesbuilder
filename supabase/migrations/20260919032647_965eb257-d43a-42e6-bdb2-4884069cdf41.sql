DROP POLICY IF EXISTS "Public read presentations bucket" ON storage.objects;
CREATE POLICY "Public read demo presentations"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'presentations'
  AND (storage.foldername(name))[1] = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf'
);