-- Добавление колонки subscription_tier в таблицу profiles

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free';

-- Комментарий для документации
COMMENT ON COLUMN profiles.subscription_tier IS 'Уровень подписки пользователя (free, basic, premium)';

-- Индекс для быстрого поиска по уровню подписки
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
