ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payer_phone text;

CREATE POLICY "Clients delete own unpaid orders"
ON public.orders FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND COALESCE(amount_paid, 0) = 0);