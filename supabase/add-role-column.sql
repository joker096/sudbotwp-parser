-- =====================================================
-- Добавление колонки role в таблицу profiles
-- =====================================================

-- Добавляем колонку role если её нет
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Создаем индекс для быстрого поиска по роли
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Обновляем существующие записи, у которых role is null
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- Пример: назначить админа по ID пользователя (заменить 'user-uuid-here' на реальный UUID)
-- UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid-here';

-- Или найти по email через auth.users и обновить:
-- UPDATE profiles SET role = 'admin' 
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');

-- Добавляем комментарий к колонке
COMMENT ON COLUMN profiles.role IS 'Роль пользователя: user, admin, lawyer и т.д.';