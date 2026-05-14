-- LAWYERS TABLE SETUP - Copy/paste ALL into Supabase SQL Editor
-- =====================================================

-- 1. CREATE TABLE lawyers (if missing)
CREATE TABLE IF NOT EXISTS lawyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  spec TEXT,
  specialization TEXT,
  city TEXT,
  region TEXT DEFAULT 'Россия',
  rating DECIMAL(3,2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  img TEXT,
  avatar_url TEXT,
  yandex_rating DECIMAL(3,2),
  website TEXT,
  phone TEXT,
  email TEXT,
  experience TEXT,
  experience_years INTEGER DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected','blocked')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free','basic','premium','featured')),
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ADD INDEXES
CREATE INDEX IF NOT EXISTS idx_lawyers_active ON lawyers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_lawyers_status ON lawyers(status);
CREATE INDEX IF NOT EXISTS idx_lawyers_region ON lawyers(region);
CREATE INDEX IF NOT EXISTS idx_lawyers_featured ON lawyers(is_featured) WHERE is_featured = true;

-- 3. RLS POLICIES
ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active lawyers" ON lawyers;
CREATE POLICY "Public read active approved lawyers" ON lawyers FOR SELECT
USING (is_active = true AND status = 'approved');

CREATE POLICY "Users own profile" ON lawyers FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins full access" ON lawyers FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. SEED DATA (sample lawyers)
INSERT INTO lawyers (name, spec, specialization, city, region, rating, reviews_count, phone, description, status, is_active) VALUES
('Иван Петров', 'Гражданское право', 'Гражданские споры', 'Москва', 'Московская область', 4.9, 124, '+7(495)123-45-67', 'Специалист по гражданским делам с 15-летним опытом', 'approved', true),
('Анна Сидорова', 'Семейное право', 'Разводы, алименты', 'Санкт-Петербург', 'Ленинградская область', 4.8, 89, '+7(812)987-65-43', 'Эксперт по семейным спорам', 'approved', true),
('Дмитрий Иванов', 'Уголовное право', 'Защита по уголовным делам', 'Екатеринбург', 'Свердловская область', 4.7, 56, '+7(343)111-22-33', 'Уголовный адвокат', 'approved', true)
ON CONFLICT (id) DO NOTHING;

-- 5. GRANTS
GRANT SELECT ON lawyers TO anon, authenticated;
GRANT ALL ON lawyers TO service_role;

-- 6. VERIFY
SELECT COUNT(*) as lawyer_count, AVG(rating) as avg_rating FROM lawyers;
SELECT * FROM lawyers LIMIT 3;

-- 7. Link to profiles (if admin test needed)
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@example.com';
-- SELECT * FROM profiles WHERE role = 'admin';

