-- =====================================================
-- SQL для исправления политики RLS таблицы cases
-- Выполните этот скрипт в SQL-редакторе Supabase
-- =====================================================

-- Удаляем старую политику (если она есть)
DROP POLICY IF EXISTS "Users can manage their own cases" ON cases;

-- Создаем новую политику, которая разрешает:
-- 1. Авторизованным пользователям управлять своими делами
-- 2. Вставку дел без авторизации (для API)
CREATE POLICY "Anyone can create cases" ON cases
    FOR INSERT
    WITH CHECK (true);

-- Для чтения и обновления - только свои дела
CREATE POLICY "Users can read own cases" ON cases
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own cases" ON cases
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cases" ON cases
    FOR DELETE
    USING (auth.uid() = user_id);

-- Также делаем user_id необязательным для новых записей
ALTER TABLE cases ALTER COLUMN user_id DROP NOT NULL;
