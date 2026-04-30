-- Allow admins to update any time entry (including lunch break edits for employees)
CREATE POLICY "Admins can update any time entries"
ON public.time_entries
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));