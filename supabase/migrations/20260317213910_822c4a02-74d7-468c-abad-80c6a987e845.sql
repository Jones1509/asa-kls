CREATE OR REPLACE FUNCTION public.generate_invoice_number(target_created_at timestamptz DEFAULT now())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_year integer := EXTRACT(YEAR FROM COALESCE(target_created_at, now()));
  next_number integer;
BEGIN
  SELECT COALESCE(
    MAX((regexp_match(invoice_number, '^F-' || invoice_year::text || '-(\d+)$'))[1]::integer),
    0
  ) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number ~ ('^F-' || invoice_year::text || '-\d+$');

  RETURN 'F-' || invoice_year::text || '-' || LPAD(next_number::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR btrim(NEW.invoice_number) = '' OR NEW.invoice_number !~ '^F-\d{4}-\d{3}$' THEN
    NEW.invoice_number := public.generate_invoice_number(COALESCE(NEW.created_at, now()));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_invoice_number_before_insert ON public.invoices;
CREATE TRIGGER assign_invoice_number_before_insert
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.assign_invoice_number();

CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_number_unique_idx
ON public.invoices (invoice_number);