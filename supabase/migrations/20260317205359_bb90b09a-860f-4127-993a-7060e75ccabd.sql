ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS customer_type text NOT NULL DEFAULT 'Privat',
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS contact_person text;

ALTER TABLE public.customers
ADD CONSTRAINT customers_customer_type_valid
CHECK (customer_type IN ('Privat', 'Erhverv'));

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS case_description text;

UPDATE public.customers
SET customer_type = 'Privat'
WHERE customer_type IS NULL OR btrim(customer_type) = '';

UPDATE public.cases
SET case_description = CASE case_number
  WHEN '1' THEN 'El-installation 2024'
  WHEN '2' THEN 'Lejlighedsrenovering'
  WHEN '3' THEN 'Serviceopgave'
  WHEN '4' THEN 'Intern opgave'
  ELSE COALESCE(NULLIF(btrim(case_description), ''), NULLIF(btrim(description), ''), 'Opgave')
END
WHERE case_description IS NULL OR btrim(case_description) = '';

UPDATE public.customers
SET company_name = name,
    contact_person = NULL,
    customer_type = 'Erhverv'
WHERE lower(btrim(name)) = 'asa aps';

UPDATE public.customers
SET name = 'Julie',
    customer_type = 'Privat'
WHERE lower(btrim(name)) = lower('Julie "Lejlighedsrenovering"');