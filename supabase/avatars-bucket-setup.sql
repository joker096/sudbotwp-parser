-- SQL для настройки bucket 'avatars' в Supabase Storage
-- Выполните это в SQL Editor панели Supabase

-- 1. Создание bucket 'avatars' (если не существует)
-- Используем upsert чтобы обновить настройки если bucket уже есть
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Политики RLS для storage.objects
-- Сначала удаляем старые политики (если есть), затем создаём новые

-- Политика для SELECT (чтение аватарок) - публичный доступ
drop policy if exists "Public avatars are viewable by everyone" on storage.objects;
create policy "Public avatars are viewable by everyone"
on storage.objects for select
using (bucket_id = 'avatars');

-- Политика для INSERT (загрузка аватарок) - только авторизованные пользователи
drop policy if exists "Users can upload their own avatars" on storage.objects;
create policy "Users can upload their own avatars"
on storage.objects for insert
with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'public'
    and name like 'public/' || auth.uid() || '-%'
);

-- Политика для UPDATE (обновление аватарок) - только владелец
drop policy if exists "Users can update their own avatars" on storage.objects;
create policy "Users can update their own avatars"
on storage.objects for update
using (
    bucket_id = 'avatars'
    and auth.uid() = owner
    and name like 'public/' || auth.uid() || '-%'
);

-- Политика для DELETE (удаление аватарок) - только владелец
drop policy if exists "Users can delete their own avatars" on storage.objects;
create policy "Users can delete their own avatars"
on storage.objects for delete
using (
    bucket_id = 'avatars'
    and auth.uid() = owner
    and name like 'public/' || auth.uid() || '-%'
);
