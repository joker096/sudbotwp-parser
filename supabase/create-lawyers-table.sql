-- Create lawyers table for management system
-- Run this in Supabase SQL Editor

-- Drop table if exists (for recreation)
DROP TABLE IF EXISTS lawyers CASCADE;

-- Create lawyers table
CREATE TABLE lawyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  spec TEXT,
  specialization TEXT,
  city TEXT,
  region TEXT,
  phone TEXT,
  email TEXT,
  experience_years INTEGER DEFAULT 0,
  description TEXT,
  avatar_url TEXT,
  rating NUMERIC(3,2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'blocked')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'featured')),
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_lawyers_user_id ON lawyers(user_id);
CREATE INDEX idx_lawyers_active_status ON lawyers(is_active, status);
CREATE INDEX idx_lawyers_rating ON lawyers(rating) WHERE is_active = true AND status = 'approved';
CREATE INDEX idx_lawyers_city ON lawyers(city);
CREATE INDEX idx_lawyers_spec ON lawyers(spec);

-- Enable RLS
ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;

-- Initial data (sample lawyers)
INSERT INTO lawyers (user_id, name, spec, city, phone, email, experience_years, description, is_active, status) VALUES
(NULL, 'Иванов Иван Иванович', 'Гражданское право', 'Москва', '+7 (999) 123-45-67', 'ivanov@example.com', 15, 'Специалист по гражданским делам с 15-летним стажем. Высокий процент выигранных дел.', true, 'approved'),
(NULL, 'Петров Петр Петрович', 'Уголовное право', 'Санкт-Петербург', '+7 (999) 234-56-78', 'petrov@example.com', 12, 'Адвокат по уголовным делам. Работаю с 2012 года.', true, 'approved'),
(NULL, 'Сидорова Анна Сергеевна', 'Семейное право', 'Новосибирск', '+7 (999) 345-67-89', 'sidorova@example.com', 8, 'Семейный юрист. Разводы, алименты, наследство.', true, 'approved');

-- Verify creation
SELECT COUNT(*) as lawyer_count FROM lawyers;
SELECT * FROM lawyers ORDER BY created_at DESC;

