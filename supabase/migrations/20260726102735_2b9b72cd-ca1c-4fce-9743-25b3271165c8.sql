
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','staff','client');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone, company)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NEW.phone),
    NEW.raw_user_meta_data ->> 'company'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PUBLIC MARKETING CONTENT
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  items TEXT[] NOT NULL DEFAULT '{}',
  price_from NUMERIC,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services are public" ON public.services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage services" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  services TEXT[] NOT NULL DEFAULT '{}',
  socials JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies are public" ON public.companies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage companies" ON public.companies FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  client TEXT,
  industry TEXT,
  problem TEXT,
  solution TEXT,
  results TEXT,
  image_url TEXT,
  tech TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portfolio_projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.portfolio_projects TO authenticated;
GRANT ALL ON public.portfolio_projects TO service_role;
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolio is public" ON public.portfolio_projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage portfolio" ON public.portfolio_projects FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  role TEXT,
  quote TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Testimonials are public" ON public.testimonials FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage testimonials" ON public.testimonials FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- BOOKINGS
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_category TEXT NOT NULL,
  staff_preference TEXT NOT NULL DEFAULT 'Any Available',
  booking_date DATE NOT NULL,
  booking_time TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  description TEXT,
  budget TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookings_status_check CHECK (status IN ('new','contacted','pending','in_progress','sold','closed','cancelled'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients read own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Clients create own bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clients update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Clients delete own bookings" ON public.bookings FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ORDERS
CREATE SEQUENCE public.order_number_seq START 1001;
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('BM-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_status_check CHECK (status IN ('pending','in_progress','sold','completed','closed','cancelled'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT USAGE ON SEQUENCE public.order_number_seq TO authenticated, service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients read own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  note TEXT,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients read own order events" ON public.order_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.log_order_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_events (order_id, event_type, to_value, note, actor_id)
    VALUES (NEW.id, 'created', NEW.status, 'Order ' || NEW.order_number || ' created', auth.uid());
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_events (order_id, event_type, from_value, to_value, actor_id)
    VALUES (NEW.id, 'status_changed', OLD.status, NEW.status, auth.uid());
  END IF;
  IF NEW.category IS DISTINCT FROM OLD.category THEN
    INSERT INTO public.order_events (order_id, event_type, from_value, to_value, actor_id)
    VALUES (NEW.id, 'category_changed', OLD.category, NEW.category, auth.uid());
  END IF;
  IF NEW.deadline IS DISTINCT FROM OLD.deadline THEN
    INSERT INTO public.order_events (order_id, event_type, from_value, to_value, actor_id)
    VALUES (NEW.id, 'deadline_changed', OLD.deadline::text, NEW.deadline::text, auth.uid());
  END IF;
  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
    INSERT INTO public.order_events (order_id, event_type, from_value, to_value, actor_id)
    VALUES (NEW.id, 'amount_changed', OLD.amount::text, NEW.amount::text, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER orders_event_log AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_order_event();

-- CART
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients manage own cart" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SEED CONTENT
INSERT INTO public.services (slug, title, category, summary, description, items, price_from, icon, sort_order) VALUES
('brand-strategy','Brand Strategy','Branding','Positioning, messaging and identity systems that make you unmistakable.','We define who you are, who you serve and why you win — then build the identity system to prove it.', ARRAY['Brand audit','Positioning & messaging','Brand architecture','Naming','Brand guidelines'], 65000,'Sparkles',1),
('logo-design','Logo Design','Branding','Distinctive marks and full visual identity kits.','Logo, colour, type and stationery — delivered as a usable brand kit.', ARRAY['Logo design','Colour & type system','Stationery','Packaging','Rebranding'], 25000,'PenTool',2),
('website-development','Website Development','Websites','Corporate sites, e-commerce, booking and management systems.','Fast, secure, SEO-ready websites and custom systems built to convert.', ARRAY['Corporate websites','E-commerce','Landing pages','School & hospital systems','Booking systems','Maintenance'], 85000,'Globe',3),
('social-media-management','Social Media Management','Marketing','Always-on content, community and growth across every channel.','Strategy, calendars, creative and reporting for the platforms that matter.', ARRAY['Content calendars','Community management','Paid social','Influencer campaigns','Monthly reporting'], 40000,'Share2',4),
('content-creation','Content Creation','Marketing','Copy, design and campaign assets that actually get used.','Editorial, design and motion content produced on a reliable cadence.', ARRAY['Copywriting','Graphic design','Motion graphics','Email content','Blog & SEO articles'], 30000,'FileText',5),
('digital-marketing','Digital Marketing','Marketing','SEO, Google, Meta, TikTok and LinkedIn campaigns that pay back.','Full-funnel performance marketing with transparent reporting.', ARRAY['SEO','Google Ads','Meta Ads','TikTok marketing','LinkedIn marketing','Email marketing','Analytics'], 50000,'TrendingUp',6),
('photography','Photography','Creative','Product, corporate and campaign photography.','Studio and on-location shoots with full retouching.', ARRAY['Product photography','Corporate portraits','Event coverage','Lifestyle shoots','Retouching'], 35000,'Camera',7),
('videography','Videography','Creative','Brand films, adverts, reels and documentary content.','Scripting to final grade, built for the platform it will live on.', ARRAY['Brand films','TV & digital adverts','Reels & shorts','Event films','Post-production'], 60000,'Video',8),
('corporate-branding','Corporate Branding','Branding','Enterprise identity rollouts across every touchpoint.','Signage, vehicles, uniforms, interiors and internal comms.', ARRAY['Signage','Vehicle branding','Uniforms','Interior branding','Internal comms'], 90000,'Building2',9),
('business-consulting','Business Consulting','Consulting','Strategy, sales and digital transformation advisory.','Practical consulting engagements with measurable outcomes.', ARRAY['Business strategy','Marketing strategy','Sales enablement','Startup advisory','Digital transformation'], 75000,'Briefcase',10),
('training','Training','Consulting','Corporate workshops that upskill your team fast.','Hands-on training in branding, marketing, sales and digital tools.', ARRAY['Corporate workshops','Marketing bootcamps','Sales training','Digital skills','Leadership sessions'], 45000,'GraduationCap',11),
('events-team-building','Events & Team Building','Creative','Launches, activations and team experiences.','End-to-end event planning, production and post-event content.', ARRAY['Product launches','Brand activations','Conferences','Team building','Event content'], 55000,'PartyPopper',12);

INSERT INTO public.companies (slug, name, industry, description, website, services, socials) VALUES
('serrari-fintech','Serrari Fintech','Financial Intelligence','Financial intelligence platform we support with marketing, web and brand management.','https://serrari.io', ARRAY['Marketing','Website','Social Media','Branding','Consulting'], '{"linkedin":"#","x":"#"}'),
('abc-holdings','ABC Holdings','Investment','Diversified holding company with a portfolio-wide brand system.','#', ARRAY['Branding','Corporate Communications','Reporting'], '{"linkedin":"#"}'),
('xyz-travels','XYZ Travels','Travel & Hospitality','Travel brand with always-on social and performance campaigns.','#', ARRAY['Social Media','Photography','Digital Marketing'], '{"instagram":"#","facebook":"#"}'),
('technova','TechNova','Technology','B2B technology company with demand-gen and product marketing support.','#', ARRAY['Website','SEO','Content','Consulting'], '{"linkedin":"#"}'),
('greenfarm-ltd','GreenFarm Ltd','Agribusiness','Agribusiness brand built from naming through to packaging and retail rollout.','#', ARRAY['Branding','Packaging','Photography','Marketing'], '{"instagram":"#"}');

INSERT INTO public.portfolio_projects (slug, title, category, client, industry, problem, solution, results, tech) VALUES
('serrari-brand-refresh','Serrari Brand Refresh','Branding','Serrari Fintech','Financial Intelligence','A technical product with no coherent brand story.','New positioning, identity system and messaging framework rolled out across product and web.','3x increase in qualified demo requests within two quarters.', ARRAY['Figma','Webflow']),
('xyz-travels-social','XYZ Travels Social Growth','Social Media','XYZ Travels','Travel','Low engagement and inconsistent posting.','Content pillars, a monthly shoot cadence and paid amplification.','From 4k to 61k followers in 9 months.', ARRAY['Meta Ads','TikTok']),
('greenfarm-packaging','GreenFarm Retail Packaging','Branding','GreenFarm Ltd','Agribusiness','Products invisible on a crowded shelf.','Bold packaging system with a clear product hierarchy.','Retail sell-through up 42%.', ARRAY['Illustrator']),
('technova-website','TechNova Corporate Website','Websites','TechNova','Technology','A slow site that did not explain the product.','New information architecture, copy and a fast modern build.','Bounce rate down 38%, demo conversion up 2.4x.', ARRAY['Next.js','Analytics']),
('abc-campaign','ABC Holdings Investor Campaign','Campaigns','ABC Holdings','Investment','Low awareness among institutional investors.','Integrated LinkedIn, email and print campaign.','KES 180M in tracked pipeline.', ARRAY['LinkedIn Ads','HubSpot']),
('serrari-video','Serrari Product Film','Video','Serrari Fintech','Financial Intelligence','Complex product, short attention spans.','A 90-second product film plus 12 cut-downs.','1.2M views across channels.', ARRAY['Premiere Pro','After Effects']);

INSERT INTO public.testimonials (name, company, role, quote, rating) VALUES
('Castro Mwangi','Serrari Fintech','Founder','Buzmark rebuilt our brand and our pipeline followed. They think like owners, not vendors.',5),
('Achieng Otieno','GreenFarm Ltd','Marketing Lead','Our packaging finally looks like the quality inside the bag. Sell-through jumped immediately.',5),
('Daniel Kimani','TechNova','CEO','The new site does the selling for us. Clear, fast and genuinely well designed.',5),
('Fatuma Ali','XYZ Travels','Director','Nine months of consistent, beautiful content — and the follower growth to match.',5);
