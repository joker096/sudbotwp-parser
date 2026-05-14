-- =====================================================
-- Migration: Create lawyer_applications table and update profiles
-- =====================================================

-- Создаём таблицу заявок на регистрацию юристом
CREATE TABLE IF NOT EXISTS lawyer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Данные заявки
  name TEXT NOT NULL,
  specialization TEXT,
  city TEXT,
  region TEXT DEFAULT 'Россия',
  phone TEXT,
  email TEXT,
  experience_years INTEGER DEFAULT 0,
  description TEXT,
  
  -- Документы (сертификаты, лицензии)
  documents TEXT[], -- массив URL на документы
  certificate_number TEXT, -- номер сертификата/удостоверения
  
  -- Статус обработки
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_lawyer_applications_user ON lawyer_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_applications_status ON lawyer_applications(status);
CREATE INDEX IF NOT EXISTS idx_lawyer_applications_created ON lawyer_applications(created_at DESC);

-- RLS для заявок
ALTER TABLE lawyer_applications ENABLE ROW LEVEL SECURITY;

-- Пользователи видят только свои заявки
CREATE POLICY "Users can view own applications"
  ON lawyer_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователи могут создавать заявки
CREATE POLICY "Users can create applications"
  ON lawyer_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Сервис полный доступ
CREATE POLICY "Service role full access to applications"
  ON lawyer_applications FOR ALL
  USING (auth.role() = 'service_role');

-- Гранты
GRANT SELECT, INSERT ON lawyer_applications TO anon, authenticated;
GRANT ALL ON lawyer_applications TO service_role;

-- =====================================================
-- Обновляем таблицу profiles
-- =====================================================

-- Добавляем поле role если его нет
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'lawyer', 'admin'));
  END IF;
  
  -- Добавляем связь с юристом
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'lawyer_id') THEN
    ALTER TABLE profiles ADD COLUMN lawyer_id UUID REFERENCES lawyers(id) ON DELETE SET NULL;
  END IF;
  
  -- Добавляем флаг подтверждения email
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'email_verified') THEN
    ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Обновляем RLS для profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- Функция для обработки заявки (одобрение/отклонение)
-- =====================================================

CREATE OR REPLACE FUNCTION process_lawyer_application(
  p_application_id UUID,
  p_status TEXT, -- 'approved' или 'rejected'
  p_admin_notes TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
  v_application RECORD;
  v_lawyer_id UUID;
  v_result JSONB;
BEGIN
  -- Получаем заявку
  SELECT * INTO v_application
  FROM lawyer_applications
  WHERE id = p_application_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Заявка не найдена или уже обработана');
  END IF;
  
  IF p_status = 'approved' THEN
    -- Создаём запись юриста
    INSERT INTO lawyers (
      user_id, name, specialization, city, region, phone, email,
      experience_years, description, status
    ) VALUES (
      v_application.user_id, v_application.name, v_application.specialization,
      v_application.city, v_application.region, v_application.phone, v_application.email,
      v_application.experience_years, v_application.description, 'approved'
    )
    RETURNING id INTO v_lawyer_id;
    
    -- Обновляем профиль пользователя
    UPDATE profiles 
    SET role = 'lawyer', lawyer_id = v_lawyer_id
    WHERE id = v_application.user_id;
    
    v_result := jsonb_build_object(
      'success', true,
      'lawyer_id', v_lawyer_id,
      'message', 'Заявка одобрена, юрист создан'
    );
    
  ELSE
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Заявка отклонена'
    );
  END IF;
  
  -- Обновляем заявку
  UPDATE lawyer_applications
  SET status = p_status,
      admin_notes = p_admin_notes,
      processed_at = NOW(),
      processed_by = p_admin_id
  WHERE id = p_application_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Грант на функцию
GRANT EXECUTE ON FUNCTION process_lawyer_application TO anon, authenticated, service_role;
