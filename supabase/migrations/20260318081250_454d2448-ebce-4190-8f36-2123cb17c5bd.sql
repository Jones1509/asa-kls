CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.cleanup_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cutoff TIMESTAMPTZ := now() - INTERVAL '5 years';
BEGIN
  DELETE FROM public.reports WHERE created_at <= cutoff;
  DELETE FROM public.documentation WHERE created_at <= cutoff;
  DELETE FROM public.verification_forms WHERE created_at <= cutoff;
  DELETE FROM public.chat_messages WHERE created_at <= cutoff;
  DELETE FROM public.field_reports WHERE created_at <= cutoff;
  DELETE FROM public.time_entries WHERE created_at <= cutoff;
  DELETE FROM public.invoices WHERE created_at <= cutoff;
  DELETE FROM public.audit_reports WHERE created_at <= cutoff;
  DELETE FROM public.deviations WHERE created_at <= cutoff;
  DELETE FROM public.employee_certificates WHERE created_at <= cutoff;
  DELETE FROM public.company_documents WHERE created_at <= cutoff;
  DELETE FROM public.instruments WHERE created_at <= cutoff;
  DELETE FROM public.schedules WHERE created_at <= cutoff;
  DELETE FROM public.case_assignments WHERE created_at <= cutoff;

  DELETE FROM public.cases c
  WHERE c.created_at <= cutoff
    AND NOT EXISTS (SELECT 1 FROM public.case_assignments ca WHERE ca.case_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.documentation d WHERE d.case_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.verification_forms vf WHERE vf.case_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.reports r WHERE r.case_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.deviations dv WHERE dv.case_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.field_reports fr WHERE fr.case_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.case_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.schedules s WHERE s.case_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.time_entries te WHERE te.case_id = c.id);

  DELETE FROM public.customers cu
  WHERE cu.created_at <= cutoff
    AND NOT EXISTS (SELECT 1 FROM public.cases c WHERE c.customer_id = cu.id);
END;
$function$;