-- Таблица для хранения блоков публикации pravo.gov.ru
CREATE TABLE IF NOT EXISTS public.pravo_blocks (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT,
  parent_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица для хранения документов pravo.gov.ru
CREATE TABLE IF NOT EXISTS public.pravo_documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  number TEXT,
  sign_date TEXT,
  published_date TEXT,
  url TEXT NOT NULL,
  html_url TEXT,
  pdf_url TEXT,
  xml_url TEXT,
  block_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_pravo_documents_block ON public.pravo_documents(block_code);
CREATE INDEX IF NOT EXISTS idx_pravo_documents_type ON public.pravo_documents(type);
CREATE INDEX IF NOT EXISTS idx_pravo_documents_date ON public.pravo_documents(date);

-- Включить RLS
ALTER TABLE public.pravo_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pravo_documents ENABLE ROW LEVEL SECURITY;

-- Разрешить чтение всем
CREATE POLICY "Public access for pravo_blocks" ON public.pravo_blocks FOR SELECT USING (true);
CREATE POLICY "Public access for pravo_documents" ON public.pravo_documents FOR SELECT USING (true);
