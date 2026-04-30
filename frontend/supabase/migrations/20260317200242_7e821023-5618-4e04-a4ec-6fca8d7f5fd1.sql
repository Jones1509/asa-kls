-- Add columns to verification_forms for approval workflow
ALTER TABLE verification_forms ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Afventer';
ALTER TABLE verification_forms ADD COLUMN IF NOT EXISTS admin_comment text;
ALTER TABLE verification_forms ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE verification_forms ADD COLUMN IF NOT EXISTS installation_type text;
ALTER TABLE verification_forms ADD COLUMN IF NOT EXISTS measurements text;
ALTER TABLE verification_forms ADD COLUMN IF NOT EXISTS image_urls text[];
ALTER TABLE verification_forms ADD COLUMN IF NOT EXISTS form_date date NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE verification_forms ADD COLUMN IF NOT EXISTS form_time time;
ALTER TABLE verification_forms ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE verification_forms ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Add file_url to documentation for manual file uploads
ALTER TABLE documentation ADD COLUMN IF NOT EXISTS file_url text;

-- Allow admins to update all verification forms (for approval)
CREATE POLICY "Admins can update all verification forms"
ON public.verification_forms
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to insert verification forms for any user
CREATE POLICY "Admins can insert verification forms"
ON public.verification_forms
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to delete documentation
CREATE POLICY "Admins can delete documentation"
ON public.documentation
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to update documentation
CREATE POLICY "Admins can update documentation"
ON public.documentation
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to insert documentation for any user
CREATE POLICY "Admins can insert any documentation"
ON public.documentation
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));