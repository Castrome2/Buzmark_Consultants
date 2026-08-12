ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;

-- Admins manage roles (who/which department has admin access)
CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE SEQUENCE IF NOT EXISTS public.doc_number_seq;

CREATE TABLE public.order_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('proposal','invoice')),
  doc_number text NOT NULL,
  title text NOT NULL,
  summary text,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  terms text,
  status text NOT NULL DEFAULT 'issued',
  edited boolean NOT NULL DEFAULT false,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, kind)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_documents TO authenticated;
GRANT ALL ON public.order_documents TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.doc_number_seq TO authenticated, service_role;

ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or admin documents" ON public.order_documents FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins create documents" ON public.order_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update documents" ON public.order_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete documents" ON public.order_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER order_documents_updated BEFORE UPDATE ON public.order_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_order_documents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_items jsonb;
BEGIN
  v_items := jsonb_build_array(jsonb_build_object(
    'description', NEW.title,
    'category', NEW.category,
    'quantity', 1,
    'amount', NEW.amount
  ));

  -- Proposal: generated for every order, kept in sync until an admin edits it.
  INSERT INTO public.order_documents (order_id, user_id, kind, doc_number, title, summary, line_items, subtotal, amount_paid, terms)
  VALUES (
    NEW.id, NEW.user_id, 'proposal',
    'BM-PRO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.doc_number_seq')::text, 4, '0'),
    'Proposal for ' || NEW.title,
    'Buzmark Agency proposes to deliver ' || NEW.title || ' under our ' || NEW.category || ' practice, following the agreed pipeline: request, booking, payment, service delivery and completion.',
    v_items, COALESCE(NEW.amount, 0), COALESCE(NEW.amount_paid, 0),
    'Valid for 30 days. A deposit of 30% confirms the engagement; the balance is due before completion.'
  )
  ON CONFLICT (order_id, kind) DO UPDATE
    SET subtotal = CASE WHEN public.order_documents.edited THEN public.order_documents.subtotal ELSE EXCLUDED.subtotal END,
        line_items = CASE WHEN public.order_documents.edited THEN public.order_documents.line_items ELSE EXCLUDED.line_items END,
        amount_paid = EXCLUDED.amount_paid;

  -- Invoice: generated as soon as the engagement carries a value.
  IF COALESCE(NEW.amount, 0) > 0 THEN
    INSERT INTO public.order_documents (order_id, user_id, kind, doc_number, title, summary, line_items, subtotal, amount_paid, terms)
    VALUES (
      NEW.id, NEW.user_id, 'invoice',
      'BM-INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.doc_number_seq')::text, 4, '0'),
      'Invoice for ' || NEW.title,
      'Invoice raised against order ' || NEW.order_number || '.',
      v_items, COALESCE(NEW.amount, 0), COALESCE(NEW.amount_paid, 0),
      'Payable via M-Pesa Till or bank transfer. Quote the order number as the payment reference.'
    )
    ON CONFLICT (order_id, kind) DO UPDATE
      SET subtotal = CASE WHEN public.order_documents.edited THEN public.order_documents.subtotal ELSE EXCLUDED.subtotal END,
          line_items = CASE WHEN public.order_documents.edited THEN public.order_documents.line_items ELSE EXCLUDED.line_items END,
          amount_paid = EXCLUDED.amount_paid,
          status = CASE WHEN COALESCE(NEW.amount_paid,0) >= COALESCE(NEW.amount,0) AND COALESCE(NEW.amount_paid,0) > 0 THEN 'paid' ELSE public.order_documents.status END;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_order_documents() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER orders_sync_documents
AFTER INSERT OR UPDATE OF title, category, amount, amount_paid ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_order_documents();

-- Backfill documents for existing orders
UPDATE public.orders SET updated_at = updated_at;