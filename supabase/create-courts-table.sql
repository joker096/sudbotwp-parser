-- =====================================================
-- SQL для создания таблиц судов и регионов
-- Выполните этот скрипт в SQL-редакторе Supabase
-- =====================================================

-- 1. Таблица регионов
CREATE TABLE IF NOT EXISTS court_regions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по названию региона
CREATE INDEX IF NOT EXISTS idx_court_regions_name ON court_regions(name);

-- 2. Таблица судов
CREATE TABLE IF NOT EXISTS courts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region_id TEXT REFERENCES court_regions(id),
    full_address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    code TEXT,
    recipient_account TEXT,
    recipient_bank TEXT,
    recipient_bik TEXT,
    treasury_account TEXT,
    recipient_inn TEXT,
    tax_period TEXT,
    recipient_kpp TEXT,
    recipient_name TEXT,
    kbk TEXT,
    oktmo TEXT,
    payment_basis TEXT,
    payment_type TEXT,
    jurisdiction TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_courts_name ON courts(name);
CREATE INDEX IF NOT EXISTS idx_courts_region_id ON courts(region_id);
CREATE INDEX IF NOT EXISTS idx_courts_code ON courts(code);

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Регионы видны всем и можно вставлять/обновлять данные
ALTER TABLE court_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view court regions" ON court_regions;
CREATE POLICY "Anyone can view court regions" ON court_regions
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can insert court regions" ON court_regions;
CREATE POLICY "Anyone can insert court regions" ON court_regions
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update court regions" ON court_regions;
CREATE POLICY "Anyone can update court regions" ON court_regions
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Суды видны всем и можно вставлять/обновлять данные
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view courts" ON courts;
CREATE POLICY "Anyone can view courts" ON courts
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can insert courts" ON courts;
CREATE POLICY "Anyone can insert courts" ON courts
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update courts" ON courts;
CREATE POLICY "Anyone can update courts" ON courts
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
