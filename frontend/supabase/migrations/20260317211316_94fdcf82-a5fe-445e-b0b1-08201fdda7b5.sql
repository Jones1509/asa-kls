ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS customer_number text;

CREATE UNIQUE INDEX IF NOT EXISTS customers_customer_number_unique_idx
ON public.customers (lower(btrim(customer_number)))
WHERE customer_number IS NOT NULL AND btrim(customer_number) <> '';
