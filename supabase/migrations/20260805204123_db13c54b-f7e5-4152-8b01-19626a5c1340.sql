-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  link text,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete own notifications" ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

-- auto-create a notification for the order owner on every order event
CREATE OR REPLACE FUNCTION public.notify_order_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_number text;
BEGIN
  SELECT user_id, order_number INTO v_user, v_number FROM public.orders WHERE id = NEW.order_id;
  IF v_user IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, title, body, type, order_id, link)
  VALUES (
    v_user,
    CASE NEW.event_type
      WHEN 'created' THEN 'Order ' || v_number || ' created'
      WHEN 'status_changed' THEN 'Status update on ' || v_number
      WHEN 'payment_recorded' THEN 'Payment received for ' || v_number
      WHEN 'deadline_changed' THEN 'Deadline updated on ' || v_number
      WHEN 'amount_changed' THEN 'Amount updated on ' || v_number
      WHEN 'category_changed' THEN 'Category updated on ' || v_number
      ELSE 'Update on ' || v_number
    END,
    COALESCE(NEW.note, NULLIF(NEW.from_value || ' → ' || NEW.to_value, ' → '), NEW.to_value),
    CASE WHEN NEW.event_type = 'payment_recorded' THEN 'payment' ELSE 'order' END,
    NEW.order_id,
    '/dashboard?tab=timeline'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_events_notify
AFTER INSERT ON public.order_events
FOR EACH ROW EXECUTE FUNCTION public.notify_order_event();

-- notify client when a booking is created
CREATE OR REPLACE FUNCTION public.notify_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (NEW.user_id, 'Meeting booked successfully',
          NEW.service_category || ' session on ' || to_char(NEW.booking_date, 'DD Mon YYYY') || ' at ' || NEW.booking_time,
          'booking', '/dashboard?tab=bookings');
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_notify
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_booking();

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own reviews" ON public.reviews FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create own reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own reviews" ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete own reviews" ON public.reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER reviews_updated BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- USER SETTINGS
CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'light',
  language text NOT NULL DEFAULT 'en',
  email_notifications boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own settings" ON public.user_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER user_settings_updated BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();