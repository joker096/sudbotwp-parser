-- Добавление колонки avatar_url в таблицу profiles
-- Выполните это в SQL Editor панели Supabase

-- Добавляем колонку avatar_url если её нет
alter table profiles 
add column if not exists avatar_url text;

-- Обновляем RLS политики для profiles чтобы пользователи могли обновлять avatar_url

-- Политика для SELECT (чтение профилей) - пользователи видят только свой профиль
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
on profiles for select
using (auth.uid() = id);

-- Политика для UPDATE (обновление профиля) - пользователи могут обновлять только свой профиль
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
on profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Политика для INSERT (создание профиля) - при регистрации
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
on profiles for insert
with check (auth.uid() = id);