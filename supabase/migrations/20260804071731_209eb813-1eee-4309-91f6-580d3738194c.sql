ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS group_id uuid;
CREATE INDEX IF NOT EXISTS orders_group_id_idx ON public.orders (group_id);