
-- 1. Employee certificates
CREATE TABLE public.employee_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  certificate_name TEXT NOT NULL,
  file_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on employee_certificates" ON public.employee_certificates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own certificates" ON public.employee_certificates FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 2. Company documents (authorization docs)
CREATE TABLE public.company_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT,
  expiry_date DATE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on company_documents" ON public.company_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view company_documents" ON public.company_documents FOR SELECT TO authenticated USING (true);

-- 3. Audit reports
CREATE TABLE public.audit_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on audit_reports" ON public.audit_reports FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view audit_reports" ON public.audit_reports FOR SELECT TO authenticated USING (true);

-- 4. Instruments
CREATE TABLE public.instruments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  serial_number TEXT,
  last_calibrated DATE,
  next_calibration DATE,
  certificate_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on instruments" ON public.instruments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view instruments" ON public.instruments FOR SELECT TO authenticated USING (true);

-- 5. Deviations
CREATE TABLE public.deviations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deviation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  case_id UUID REFERENCES public.cases(id),
  corrective_action TEXT,
  responsible_user_id UUID,
  status TEXT NOT NULL DEFAULT 'Åben',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.deviations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on deviations" ON public.deviations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view deviations" ON public.deviations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert deviations" ON public.deviations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Add cleanup for new tables
CREATE OR REPLACE FUNCTION public.cleanup_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cutoff TIMESTAMPTZ := now() - INTERVAL '5 years';
BEGIN
  DELETE FROM public.reports WHERE created_at < cutoff;
  DELETE FROM public.documentation WHERE created_at < cutoff;
  DELETE FROM public.verification_forms WHERE created_at < cutoff;
  DELETE FROM public.chat_messages WHERE created_at < cutoff;
  DELETE FROM public.field_reports WHERE created_at < cutoff;
  DELETE FROM public.time_entries WHERE created_at < cutoff;
  DELETE FROM public.invoices WHERE created_at < cutoff;
  DELETE FROM public.audit_reports WHERE created_at < cutoff;
  DELETE FROM public.deviations WHERE created_at < cutoff;
  DELETE FROM public.employee_certificates WHERE created_at < cutoff;
  DELETE FROM public.company_documents WHERE created_at < cutoff;
  DELETE FROM public.instruments WHERE created_at < cutoff;
END;
$$;
