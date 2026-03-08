
-- Add foreign key from schedules.user_id to profiles.user_id so PostgREST can join them
ALTER TABLE public.schedules 
ADD CONSTRAINT schedules_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Allow admins to delete any time entries
CREATE POLICY "Admins can delete any time entries"
ON public.time_entries FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert time entries for any user
CREATE POLICY "Admins can insert time entries"
ON public.time_entries FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
