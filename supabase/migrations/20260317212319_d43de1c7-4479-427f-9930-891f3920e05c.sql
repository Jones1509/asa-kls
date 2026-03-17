CREATE OR REPLACE FUNCTION public.generate_next_customer_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number integer;
BEGIN
  SELECT COALESCE(MAX((regexp_match(customer_number, '^K-(\d+)$'))[1]::integer), 0) + 1
  INTO next_number
  FROM public.customers;

  RETURN 'K-' || LPAD(next_number::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_customer_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_number IS NULL OR btrim(NEW.customer_number) = '' THEN
    NEW.customer_number := public.generate_next_customer_number();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_customer_number_on_customers ON public.customers;
CREATE TRIGGER assign_customer_number_on_customers
BEFORE INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.assign_customer_number();

CREATE OR REPLACE FUNCTION public.assign_case_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  customer_no text;
  customer_name text;
  next_suffix integer;
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT customer_number,
         CASE
           WHEN customer_type = 'Erhverv' THEN COALESCE(NULLIF(btrim(company_name), ''), name)
           ELSE name
         END
  INTO customer_no, customer_name
  FROM public.customers
  WHERE id = NEW.customer_id;

  IF customer_no IS NULL OR btrim(customer_no) = '' THEN
    customer_no := public.generate_next_customer_number();
    UPDATE public.customers
    SET customer_number = customer_no
    WHERE id = NEW.customer_id;
  END IF;

  NEW.customer := COALESCE(customer_name, NEW.customer);

  IF TG_OP = 'INSERT'
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.case_number IS NULL
     OR btrim(NEW.case_number) = '' THEN
    SELECT COALESCE(MAX((regexp_match(case_number, '-(\d+)$'))[1]::integer), 0) + 1
    INTO next_suffix
    FROM public.cases
    WHERE customer_id = NEW.customer_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    NEW.case_number := customer_no || '-' || LPAD(next_suffix::text, 2, '0');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_case_number_on_cases ON public.cases;
CREATE TRIGGER assign_case_number_on_cases
BEFORE INSERT OR UPDATE OF customer_id, case_number ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.assign_case_number();

CREATE UNIQUE INDEX IF NOT EXISTS cases_case_number_unique_idx
ON public.cases (case_number);
