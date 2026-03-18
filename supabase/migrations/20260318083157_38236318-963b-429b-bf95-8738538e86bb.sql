ALTER TABLE public.documentation
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

UPDATE public.documentation
SET updated_at = created_at
WHERE updated_at IS NULL;

ALTER TABLE public.documentation
ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.documentation
ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

UPDATE public.time_entries
SET updated_at = created_at
WHERE updated_at IS NULL;

ALTER TABLE public.time_entries
ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.time_entries
ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.verification_forms
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

UPDATE public.verification_forms
SET updated_at = created_at
WHERE updated_at IS NULL;

ALTER TABLE public.verification_forms
ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.verification_forms
ALTER COLUMN updated_at SET NOT NULL;

DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_cases_updated_at ON public.cases;
CREATE TRIGGER set_cases_updated_at
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_invoices_updated_at ON public.invoices;
CREATE TRIGGER set_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_reports_updated_at ON public.reports;
CREATE TRIGGER set_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_schedules_updated_at ON public.schedules;
CREATE TRIGGER set_schedules_updated_at
BEFORE UPDATE ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_documentation_updated_at ON public.documentation;
CREATE TRIGGER set_documentation_updated_at
BEFORE UPDATE ON public.documentation
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_time_entries_updated_at ON public.time_entries;
CREATE TRIGGER set_time_entries_updated_at
BEFORE UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_verification_forms_updated_at ON public.verification_forms;
CREATE TRIGGER set_verification_forms_updated_at
BEFORE UPDATE ON public.verification_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.cleanup_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cutoff TIMESTAMPTZ := now() - INTERVAL '5 years';
BEGIN
  DELETE FROM public.invoices
  WHERE COALESCE(updated_at, created_at) <= cutoff;

  DELETE FROM public.reports
  WHERE COALESCE(updated_at, created_at) <= cutoff;

  DELETE FROM public.verification_forms
  WHERE COALESCE(updated_at, created_at) <= cutoff;

  DELETE FROM public.documentation
  WHERE COALESCE(updated_at, created_at) <= cutoff;

  DELETE FROM public.schedules
  WHERE COALESCE(updated_at, created_at) <= cutoff;

  DELETE FROM public.time_entries
  WHERE COALESCE(updated_at, created_at) <= cutoff;

  WITH case_activity AS (
    SELECT
      c.id,
      GREATEST(
        COALESCE(c.updated_at, c.created_at, '-infinity'::timestamptz),
        COALESCE(cu.updated_at, cu.created_at, '-infinity'::timestamptz),
        COALESCE((SELECT MAX(COALESCE(i.updated_at, i.created_at)) FROM public.invoices i WHERE i.case_id = c.id), '-infinity'::timestamptz),
        COALESCE((SELECT MAX(COALESCE(r.updated_at, r.created_at)) FROM public.reports r WHERE r.case_id = c.id), '-infinity'::timestamptz),
        COALESCE((SELECT MAX(COALESCE(vf.updated_at, vf.created_at)) FROM public.verification_forms vf WHERE vf.case_id = c.id), '-infinity'::timestamptz),
        COALESCE((SELECT MAX(COALESCE(d.updated_at, d.created_at)) FROM public.documentation d WHERE d.case_id = c.id), '-infinity'::timestamptz),
        COALESCE((SELECT MAX(COALESCE(s.updated_at, s.created_at)) FROM public.schedules s WHERE s.case_id = c.id), '-infinity'::timestamptz),
        COALESCE((SELECT MAX(COALESCE(te.updated_at, te.created_at)) FROM public.time_entries te WHERE te.case_id = c.id), '-infinity'::timestamptz)
      ) AS last_activity
    FROM public.cases c
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
  ),
  old_cases AS (
    SELECT id
    FROM case_activity
    WHERE last_activity <= cutoff
  ),
  deleted_assignments AS (
    DELETE FROM public.case_assignments
    WHERE case_id IN (SELECT id FROM old_cases)
    RETURNING id
  )
  DELETE FROM public.cases
  WHERE id IN (SELECT id FROM old_cases);

  DELETE FROM public.customers cu
  WHERE COALESCE(cu.updated_at, cu.created_at) <= cutoff
    AND NOT EXISTS (
      SELECT 1
      FROM public.cases c
      WHERE c.customer_id = cu.id
    );
END;
$function$;