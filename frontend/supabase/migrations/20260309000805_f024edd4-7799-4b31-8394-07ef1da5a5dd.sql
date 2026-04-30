-- Remove permissive SELECT policy that allows all authenticated users to see invoices
DROP POLICY IF EXISTS "Employees can view invoices" ON public.invoices;
-- The existing "Admins can manage invoices" ALL policy already covers SELECT for admins