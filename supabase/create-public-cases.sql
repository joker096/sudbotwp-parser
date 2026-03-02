-- =====================================================
-- SQL для создания таблицы публичных дел
-- Выполните этот скрипт в SQL-редакторе Supabase
-- =====================================================

-- Создаем таблицу публичных дел (без RLS)
CREATE TABLE IF NOT EXISTS public_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core case data from parsing
    number TEXT NOT NULL,
    court TEXT,
    status TEXT,
    date TEXT,
    category TEXT,
    judge TEXT,
    plaintiff TEXT,
    defendant TEXT,
    link TEXT NOT NULL,
    
    -- Unique case ID from court system
    unique_id TEXT,
    
    -- Dynamic data stored as JSON
    events JSONB,
    appeals JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_public_cases_number ON public_cases(number);
CREATE INDEX IF NOT EXISTS idx_public_cases_link ON public_cases(link);
