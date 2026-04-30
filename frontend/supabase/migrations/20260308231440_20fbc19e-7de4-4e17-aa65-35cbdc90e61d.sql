
-- Invoices table for order/invoice tracking
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  customer TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Udkast',
  due_date DATE,
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employees can view invoices" ON public.invoices FOR SELECT USING (true);

-- Field reports: employees report from the field directly to management
CREATE TABLE public.field_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_id UUID REFERENCES public.cases(id),
  priority TEXT NOT NULL DEFAULT 'Normal',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  image_urls TEXT[],
  is_read BOOLEAN NOT NULL DEFAULT false,
  admin_response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own field reports" ON public.field_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own or admin all" ON public.field_reports FOR SELECT USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update field reports" ON public.field_reports FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for field_reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.field_reports;

-- Add updated_at trigger to invoices
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-cleanup function: delete records older than 5 years
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
END;
$$;

-- Enable verification_forms update for owners
CREATE POLICY "Users can update own verification forms" ON public.verification_forms FOR UPDATE USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
