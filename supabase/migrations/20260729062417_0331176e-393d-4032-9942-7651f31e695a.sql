CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  from_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or admin messages" ON public.messages
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Send own or admin messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (auth.uid() = client_id OR public.has_role(auth.uid(), 'admin'))
  );

CREATE INDEX messages_client_created_idx ON public.messages (client_id, created_at DESC);