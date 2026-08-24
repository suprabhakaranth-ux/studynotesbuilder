CREATE POLICY "Admins manage owner presentations files insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'presentations' AND (storage.foldername(name))[1] = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage owner presentations files update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'presentations' AND (storage.foldername(name))[1] = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage owner presentations files delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'presentations' AND (storage.foldername(name))[1] = 'b6dc6569-25ba-4ea0-a7bf-607219aa8daf' AND public.has_role(auth.uid(), 'admin'));