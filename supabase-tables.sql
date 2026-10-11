-- Ajivora HR — run in Supabase SQL Editor

-- Manager flag on employees (for Dashboard Managers list)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT false;

-- Candidates (job applications)
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  source TEXT DEFAULT 'Email (recruitment@gwambina.co.tz)',
  status TEXT DEFAULT 'Applied',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all candidates" ON public.candidates;
CREATE POLICY "Allow all candidates" ON public.candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Performance reviews
CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name TEXT NOT NULL,
  period TEXT,
  rating NUMERIC,
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all performance" ON public.performance_reviews;
CREATE POLICY "Allow all performance" ON public.performance_reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Training programs (with participant names)
CREATE TABLE IF NOT EXISTS public.training_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  enrolled INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  participants TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all training" ON public.training_programs;
CREATE POLICY "Allow all training" ON public.training_programs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- If training table already existed without participants:
ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS participants TEXT[] DEFAULT '{}';

-- Departments (add / edit from app)
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all departments" ON public.departments;
CREATE POLICY "Allow all departments" ON public.departments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Optional seed defaults
INSERT INTO public.departments (name) VALUES
  ('Engineering'), ('Product'), ('Sales'), ('Design'), ('Finance'), ('HR'), ('Operations')
ON CONFLICT (name) DO NOTHING;

-- Employee payroll fields
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bonus NUMERIC DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS nssf_percent NUMERIC DEFAULT 10;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS tax_percent NUMERIC DEFAULT 0;
