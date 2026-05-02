
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'client');
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'refused', 'cancelled', 'completed');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ SERVICES ============
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  category TEXT,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ============ BUSINESS HOURS ============
CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week SMALLINT NOT NULL, -- 0=Sunday ... 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- ============ TIME BLOCKS (admin closures) ============
CREATE TABLE public.time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

-- ============ APPOINTMENTS ============
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_first_name TEXT,
  guest_last_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  refusal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_appointments_start_at ON public.appointments (start_at);
CREATE INDEX idx_appointments_status ON public.appointments (status);
CREATE INDEX idx_appointments_user ON public.appointments (client_user_id);

-- ============ TRIGGERS: updated_at ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TRIGGER: auto-create profile + client role on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert profile" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- services
CREATE POLICY "Anyone reads active services" ON public.services FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages services" ON public.services FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- products
CREATE POLICY "Anyone reads active products" ON public.products FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- business_hours
CREATE POLICY "Anyone reads business hours" ON public.business_hours FOR SELECT USING (true);
CREATE POLICY "Admin manages business hours" ON public.business_hours FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- time_blocks
CREATE POLICY "Anyone reads time blocks" ON public.time_blocks FOR SELECT USING (true);
CREATE POLICY "Admin manages time blocks" ON public.time_blocks FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- appointments
-- Anyone (incl. anon) can insert a pending appointment (guest booking)
CREATE POLICY "Anyone can request appointment" ON public.appointments FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND (
      (client_user_id IS NULL AND guest_email IS NOT NULL AND guest_phone IS NOT NULL)
      OR (client_user_id = auth.uid())
    )
  );

CREATE POLICY "Users view own appointments" ON public.appointments FOR SELECT
  USING (auth.uid() = client_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users cancel own appointments" ON public.appointments FOR UPDATE
  USING (auth.uid() = client_user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = client_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin deletes appointments" ON public.appointments FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ SEED DATA: services ============
INSERT INTO public.services (name, description, price, duration_minutes, category, sort_order) VALUES
  ('Coiffure', 'Coupe cheveux homme classique ou moderne', 18.00, 30, 'Coiffure', 1),
  ('Coiffure barbe seulement', 'Taille et entretien de la barbe', 12.00, 20, 'Barbe', 2),
  ('Coiffure barbe + cheveux', 'Coupe de cheveux et taille de barbe', 28.00, 45, 'Combo', 3),
  ('Brushing', 'Brushing professionnel', 15.00, 30, 'Coiffure', 4),
  ('Soins protéine', 'Soin protéine pour cheveux', 45.00, 60, 'Soins', 5),
  ('Soins kératine', 'Soin kératine reconstructeur', 60.00, 75, 'Soins', 6),
  ('Lissage', 'Lissage professionnel longue durée', 80.00, 90, 'Soins', 7),
  ('Soin visage - gommage', 'Gommage et nettoyage en profondeur du visage', 25.00, 30, 'Visage', 8);

-- ============ SEED DATA: business hours (Tue-Sat 9-12:30 + 14-19) ============
-- 0=Sun, 1=Mon, 2=Tue ... 6=Sat
INSERT INTO public.business_hours (day_of_week, start_time, end_time) VALUES
  (2, '09:00', '12:30'), (2, '14:00', '19:00'),
  (3, '09:00', '12:30'), (3, '14:00', '19:00'),
  (4, '09:00', '12:30'), (4, '14:00', '19:00'),
  (5, '09:00', '12:30'), (5, '14:00', '19:00'),
  (6, '09:00', '19:00');
