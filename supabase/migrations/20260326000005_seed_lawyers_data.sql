-- Add missing columns
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'Россия';
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic';
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS img TEXT;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Seed: Insert lawyers data
INSERT INTO lawyers (
   name, spec, specialization, city, region, rating, reviews_count, 
   verified, is_active, is_featured, status, subscription_tier, experience_years,
   website, phone, experience, description
) VALUES
('Александр Смирнов', 'Гражданские', 'Гражданские дела', 'Москва', 'Москва и Московская область', 4.9, 124, true, true, true, 'approved', 'featured', 12, 'smirnov-law.ru', '+7 (999) 123-45-67', '12 лет', 'Специализируюсь на сложных гражданских делах.'),
('Елена Волкова', 'Семейные', 'Семейные дела', 'Санкт-Петербург', 'Санкт-Петербург и Ленинградская область', 5.0, 89, true, true, true, 'approved', 'featured', 8, 'volkova-family.ru', '+7 (999) 234-56-78', '8 лет', 'Бракоразводные процессы, раздел имущества.'),
('Дмитрий Иванов', 'Уголовные', 'Уголовные дела', 'Москва', 'Москва и Московская область', 4.8, 56, false, true, false, 'approved', 'premium', 15, 'ivanov-advocat.ru', '+7 (999) 345-67-89', '15 лет', 'Защита по уголовным делам.'),
('Анна Петрова', 'Арбитраж', 'Арбитражные споры', 'Казань', 'Татарстан', 4.9, 210, true, true, true, 'approved', 'featured', 10, 'petrova-arbitr.ru', '+7 (999) 456-78-90', '10 лет', 'Сопровождение бизнеса.'),
('Михаил Козлов', 'Недвижимость', 'Недвижимость и земля', 'Москва', 'Москва и Московская область', 4.7, 67, true, true, false, 'approved', 'basic', 7, 'kozlov-estate.ru', '+7 (999) 567-89-01', '7 лет', 'Сделки с недвижимостью.'),
('Ольга Новикова', 'Трудовое право', 'Трудовые споры', 'Екатеринбург', 'Свердловская область', 4.8, 145, true, true, true, 'approved', 'featured', 9, 'novikova-trud.ru', '+7 (999) 678-90-12', '9 лет', 'Восстановление на работе.'),
('Сергей Морозов', 'Наследство', 'Наследственные дела', 'Новосибирск', 'Новосибирская область', 4.6, 38, false, true, false, 'approved', 'basic', 11, 'morozov-nasledstvo.ru', '+7 (999) 789-01-23', '11 лет', 'Оформление наследства.'),
('Екатерина Белова', 'Банкротство', 'Банкротство физических лиц', 'Краснодар', 'Краснодарский край', 4.9, 178, true, true, true, 'approved', 'featured', 6, 'belova-bankrot.ru', '+7 (999) 890-12-34', '6 лет', 'Банкротство физических лиц.')
ON CONFLICT DO NOTHING;

-- Verify
SELECT COUNT(*) as total FROM lawyers;

-- Проверка
SELECT COUNT(*) as total, 
       SUM(CASE WHEN is_featured THEN 1 ELSE 0 END) as featured,
       SUM(CASE WHEN verified THEN 1 ELSE 0 END) as verified
FROM lawyers;
