-- =====================================================
-- Migration: Add photo, website, specialization, experience fields
-- to lawyers and lawyer_applications tables
-- =====================================================

-- --- lawyer_applications: добавить новые поля ---

DO $$
BEGIN
  -- Фото/аватар заявки
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyer_applications' AND column_name = 'photo_url') THEN
    ALTER TABLE lawyer_applications ADD COLUMN photo_url TEXT;
  END IF;

  -- Дополнительные контактные данные
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyer_applications' AND column_name = 'website') THEN
    ALTER TABLE lawyer_applications ADD COLUMN website TEXT DEFAULT '';
  END IF;

  -- Специализация (короткий тег)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyer_applications' AND column_name = 'spec') THEN
    ALTER TABLE lawyer_applications ADD COLUMN spec TEXT DEFAULT '';
  END IF;

  -- Опыт (строковое поле для отображения)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyer_applications' AND column_name = 'experience') THEN
    ALTER TABLE lawyer_applications ADD COLUMN experience TEXT DEFAULT '';
  END IF;

  -- Лицензия/регистрация
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyer_applications' AND column_name = 'license_number') THEN
    ALTER TABLE lawyer_applications ADD COLUMN license_number TEXT DEFAULT '';
  END IF;

  -- Язы/практика
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyer_applications' AND column_name = 'practice_areas') THEN
    ALTER TABLE lawyer_applications ADD COLUMN practice_areas TEXT[] DEFAULT '{}';
  END IF;

  -- Язы работы
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyer_applications' AND column_name = 'languages') THEN
    ALTER TABLE lawyer_applications ADD COLUMN languages TEXT[] DEFAULT '{}';
  END IF;

  -- Статус обработки
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyer_applications' AND column_name = 'status') THEN
    ALTER TABLE lawyer_applications ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'blocked'));
  END IF;

  -- Улучшенные статусы заявок
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyer_applications' AND column_name = 'processed_by') THEN
    ALTER TABLE lawyer_applications ADD COLUMN processed_by UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyer_applications' AND column_name = 'processed_at') THEN
    ALTER TABLE lawyer_applications ADD COLUMN processed_at TIMESTAMPTZ;
  END IF;

  -- Уведновления
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyer_applications' AND column_name = 'notification_sent') THEN
    ALTER TABLE lawyer_applications ADD COLUMN notification_sent BOOLEAN DEFAULT false;
  END IF;
END $$;

-- --- lawyers: добавить новые поля ---

DO $$
BEGIN
  -- Фото
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'photo_url') THEN
    ALTER TABLE lawyers ADD COLUMN photo_url TEXT DEFAULT '';
  END IF;

  -- Сайт
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'website') THEN
    ALTER TABLE lawyers ADD COLUMN website TEXT DEFAULT '';
  END IF;

  -- Короткая специализация
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'spec') THEN
    ALTER TABLE lawyers ADD COLUMN spec TEXT DEFAULT '';
  END IF;

  -- Опыт работы (строка)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'experience') THEN
    ALTER TABLE lawyers ADD COLUMN experience TEXT DEFAULT '';
  END IF;

  -- Лицензия/регистрация
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'license_number') THEN
    ALTER TABLE lawyers ADD COLUMN license_number TEXT DEFAULT '';
  END IF;

  -- Практики/направления
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'practice_areas') THEN
    ALTER TABLE lawyers ADD COLUMN practice_areas TEXT[] DEFAULT '{}';
  END IF;

-- Язы работы
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'languages') THEN
     ALTER TABLE lawyers ADD COLUMN languages TEXT[] DEFAULT '{}';
   END IF;

   -- Платформа подписки
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'subscription_tier') THEN
    ALTER TABLE lawyers ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'featured'));
  END IF;

  -- Дата окончания подписки
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'subscription_expires_at') THEN
    ALTER TABLE lawyers ADD COLUMN subscription_expires_at TIMESTAMPTZ;
  END IF;

  -- Лиды и конверсии
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'leads_purchased') THEN
    ALTER TABLE lawyers ADD COLUMN leads_purchased INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'leads_converted') THEN
    ALTER TABLE lawyers ADD COLUMN leads_converted INTEGER DEFAULT 0;
  END IF;

  -- Уведновления
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'notify_new_leads') THEN
    ALTER TABLE lawyers ADD COLUMN notify_new_leads BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'notify_telegram') THEN
    ALTER TABLE lawyers ADD COLUMN notify_telegram TEXT;
  END IF;
END $$;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_lawyers_photo ON lawyers(photo_url) WHERE photo_url != '';
CREATE INDEX IF NOT EXISTS idx_lawyers_website ON lawyers(website) WHERE website != '';
CREATE INDEX IF NOT EXISTS idx_lawyers_spec ON lawyers(spec) WHERE spec != '';
CREATE INDEX IF NOT EXISTS idx_lawyers_experience ON lawyers(experience) WHERE experience != '';

-- RLS
ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active lawyers" ON lawyers;
CREATE POLICY "Public can view active lawyers" ON lawyers FOR SELECT
  USING (COALESCE(is_active, true) = true AND COALESCE(status, 'approved') = 'approved');

DROP POLICY IF EXISTS "Lawyer can view own profile" ON lawyers;
CREATE POLICY "Lawyer can view own profile" ON lawyers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON lawyers TO anon, authenticated;
GRANT ALL ON lawyers TO service_role;
