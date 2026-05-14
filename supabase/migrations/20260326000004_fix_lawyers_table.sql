-- =====================================================
-- Migration: Fix lawyers table (add missing columns if needed)
-- =====================================================

-- Проверяем и добавляем отсутствующие колонки
DO $$
BEGIN
  -- Добавляем колонки если их нет
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'region') THEN
    ALTER TABLE lawyers ADD COLUMN region TEXT DEFAULT 'Россия';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'specialization') THEN
    ALTER TABLE lawyers ADD COLUMN specialization TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'is_active') THEN
    ALTER TABLE lawyers ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'is_featured') THEN
    ALTER TABLE lawyers ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'status') THEN
    ALTER TABLE lawyers ADD COLUMN status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'subscription_tier') THEN
    ALTER TABLE lawyers ADD COLUMN subscription_tier TEXT DEFAULT 'basic';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'subscription_expires_at') THEN
    ALTER TABLE lawyers ADD COLUMN subscription_expires_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'experience_years') THEN
    ALTER TABLE lawyers ADD COLUMN experience_years INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'email') THEN
    ALTER TABLE lawyers ADD COLUMN email TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'updated_at') THEN
    ALTER TABLE lawyers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Добавляем индексы
CREATE INDEX IF NOT EXISTS idx_lawyers_region ON lawyers(region);
CREATE INDEX IF NOT EXISTS idx_lawyers_featured ON lawyers(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_lawyers_active ON lawyers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_lawyers_status ON lawyers(status);

-- Обновляем RLS для lawyers
ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;

-- Очищаем старые политики
DROP POLICY IF EXISTS "Public can view all lawyers" ON lawyers;
DROP POLICY IF EXISTS "Authenticated users can view lawyers" ON lawyers;

-- Создаём новые политики
CREATE POLICY "Public can view active verified lawyers"
  ON lawyers FOR SELECT
  USING (COALESCE(is_active, true) = true AND COALESCE(verified, false) = true AND COALESCE(status, 'approved') = 'approved');

CREATE POLICY "Users can view own lawyer profile"
  ON lawyers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON lawyers FOR ALL
  USING (auth.role() = 'service_role');

-- Гранты
GRANT SELECT ON lawyers TO anon, authenticated;
GRANT ALL ON lawyers TO service_role;

-- Проверяем количество юристов
SELECT 'Lawyers count: ' || COUNT(*) FROM lawyers;
