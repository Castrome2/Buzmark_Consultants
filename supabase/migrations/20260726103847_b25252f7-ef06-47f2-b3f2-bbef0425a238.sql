CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_full text := COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '');
  v_first text := NULLIF(NEW.raw_user_meta_data ->> 'first_name', '');
  v_last text := NULLIF(NEW.raw_user_meta_data ->> 'last_name', '');
BEGIN
  IF v_first IS NULL AND v_full <> '' THEN
    v_first := split_part(v_full, ' ', 1);
    v_last := NULLIF(regexp_replace(v_full, '^\S+\s*', ''), '');
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, email, phone, company)
  VALUES (
    NEW.id,
    v_first,
    v_last,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NEW.phone),
    NEW.raw_user_meta_data ->> 'company'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client') ON CONFLICT DO NOTHING;

  IF lower(COALESCE(NEW.email, '')) = 'admin@buzmark.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;