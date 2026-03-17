-- SQL миграция для ограничений на ручное обновление дел
-- Добавляем поле для отслеживания времени последнего ручного обновления

-- Добавляем поле last_manual_refresh_at в таблицу cases
ALTER TABLE cases ADD COLUMN IF NOT EXISTS last_manual_refresh_at TIMESTAMPTZ;

-- Добавляем поле auto_refresh_enabled для включения/отключения автообновления (для администрирования)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS auto_refresh_enabled BOOLEAN DEFAULT true;

-- Индекс для быстрой проверки времени обновления
CREATE INDEX IF NOT EXISTS idx_cases_last_manual_refresh_at ON cases(user_id, last_manual_refresh_at);

-- Индекс для автообновления (дела, которые нужно обновить)
CREATE INDEX IF NOT EXISTS idx_cases_auto_refresh ON cases(auto_refresh_enabled, updated_at) 
WHERE auto_refresh_enabled = true;

-- Функция для проверки, может ли пользователь обновить дело вручную
CREATE OR REPLACE FUNCTION can_refresh_case_manually(
    p_user_id UUID,
    p_case_id UUID DEFAULT NULL
) RETURNS TABLE (
    can_refresh BOOLEAN,
    reason TEXT,
    next_refresh_at TIMESTAMPTZ
) AS $$
DECLARE
    v_subscription_tier TEXT;
    v_last_refresh TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
    v_midnight TIMESTAMPTZ := DATE_TRUNC('day', v_now) + INTERVAL '1 day';
BEGIN
    -- Получаем уровень подписки пользователя
    SELECT subscription_tier INTO v_subscription_tier
    FROM profiles
    WHERE id = p_user_id;
    
    -- Если подписка не указана, считаем бесплатной
    v_subscription_tier := COALESCE(v_subscription_tier, 'free');
    
    -- Бесплатный пользователь не может обновлять вручную
    IF v_subscription_tier = 'free' THEN
        RETURN QUERY SELECT 
            false, 
            'Ручное обновление доступно только для подписчиков. Оформите подписку для ручного обновления или дождитесь автоматического обновления (1 раз в день).'::TEXT,
            NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Получаем время последнего ручного обновления любого дела пользователем
    SELECT MAX(last_manual_refresh_at) INTO v_last_refresh
    FROM cases
    WHERE user_id = p_user_id
    AND last_manual_refresh_at IS NOT NULL
    AND last_manual_refresh_at > DATE_TRUNC('day', v_now);
    
    -- Если сегодня уже было ручное обновление - запрещаем
    IF v_last_refresh IS NOT NULL THEN
        RETURN QUERY SELECT 
            false, 
            format('Вы уже обновляли дело сегодня (%s). Следующее ручное обновление будет доступно завтра.', 
                   TO_CHAR(v_last_refresh AT TIME ZONE 'Europe/Moscow', 'HH24:MI'))::TEXT,
            v_midnight::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Подписчик может обновить
    RETURN QUERY SELECT 
        true, 
        'Ручное обновление доступно.'::TEXT,
        NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для автоматического обновления всех дел (вызывается по расписанию)
CREATE OR REPLACE FUNCTION get_cases_for_auto_refresh(
    p_batch_size INTEGER DEFAULT 100
) RETURNS TABLE (
    case_id UUID,
    user_id UUID,
    case_link TEXT,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    -- Возвращаем дела, которые:
    -- 1. Имеют включенное автообновление
    -- 2. Не обновлялись последние 24 часа
    -- 3. Не удалены (status != 'deleted')
    RETURN QUERY
    SELECT 
        c.id::UUID,
        c.user_id::UUID,
        c.link::TEXT,
        c.updated_at::TIMESTAMPTZ
    FROM cases c
    WHERE c.auto_refresh_enabled = true
    AND c.status != 'deleted'
    AND (c.updated_at IS NULL OR c.updated_at < NOW() - INTERVAL '24 hours')
    ORDER BY c.updated_at ASC NULLS FIRST
    LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Представление для отображения ограничений пользователю
CREATE OR REPLACE VIEW user_refresh_limits AS
SELECT 
    p.id as user_id,
    p.subscription_tier,
    CASE 
        WHEN p.subscription_tier = 'free' THEN false
        ELSE true
    END as can_refresh_manually,
    (SELECT MAX(last_manual_refresh_at) 
     FROM cases 
     WHERE user_id = p.id 
     AND last_manual_refresh_at > DATE_TRUNC('day', NOW())) as last_manual_refresh_today,
    CASE 
        WHEN p.subscription_tier = 'free' THEN 'Только автоматическое обновление (1 раз в день)'
        WHEN (SELECT MAX(last_manual_refresh_at) 
              FROM cases 
              WHERE user_id = p.id 
              AND last_manual_refresh_at > DATE_TRUNC('day', NOW())) IS NOT NULL 
        THEN 'Ручное обновление уже использовано сегодня'
        ELSE 'Ручное обновление доступно'
    END as refresh_status
FROM profiles p;

-- Комментарии
COMMENT ON COLUMN cases.last_manual_refresh_at IS 'Время последнего ручного обновления дела';
COMMENT ON COLUMN cases.auto_refresh_enabled IS 'Включено ли автоматическое обновление для этого дела';
COMMENT ON FUNCTION can_refresh_case_manually IS 'Проверяет, может ли пользователь обновить дело вручную';
COMMENT ON FUNCTION get_cases_for_auto_refresh IS 'Возвращает список дел для автоматического обновления';
