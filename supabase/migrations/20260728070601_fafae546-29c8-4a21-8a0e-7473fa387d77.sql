-- 1. Orders: pipeline + payment columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'request',
  ADD COLUMN IF NOT EXISTS deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

-- Clients may create their own orders (checkout)
DROP POLICY IF EXISTS "Clients create own orders" ON public.orders;
CREATE POLICY "Clients create own orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  kind text NOT NULL DEFAULT 'deposit',
  method text NOT NULL DEFAULT 'mpesa',
  reference text,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients read own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients record own payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Payment applied to order
CREATE OR REPLACE FUNCTION public.apply_payment_to_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_paid numeric;
BEGIN
  SELECT amount INTO v_total FROM public.orders WHERE id = NEW.order_id;
  SELECT COALESCE(sum(amount), 0) INTO v_paid FROM public.payments
    WHERE order_id = NEW.order_id AND status = 'confirmed';

  UPDATE public.orders
     SET amount_paid = v_paid,
         payment_status = CASE
           WHEN v_paid >= COALESCE(v_total, 0) AND v_paid > 0 THEN 'paid'
           WHEN v_paid > 0 THEN 'deposit_paid'
           ELSE 'unpaid' END,
         stage = CASE
           WHEN v_paid >= COALESCE(v_total, 0) AND v_paid > 0 THEN 'service'
           WHEN v_paid > 0 THEN 'payment'
           ELSE stage END,
         status = CASE WHEN status = 'pending' AND v_paid > 0 THEN 'in_progress' ELSE status END
   WHERE id = NEW.order_id;

  INSERT INTO public.order_events (order_id, event_type, to_value, note, actor_id)
  VALUES (NEW.order_id, 'payment_recorded', NEW.amount::text,
          initcap(NEW.kind) || ' payment via ' || NEW.method, NEW.user_id);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_payment_to_order() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER payments_apply_to_order
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_payment_to_order();

-- 4. Activity / traffic audit log
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  path text,
  detail text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read activity" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users write own activity" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments (order_id);