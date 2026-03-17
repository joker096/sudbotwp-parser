-- SQL для настройки bucket 'documents' в Supabase Storage
-- Выполните это в SQL Editor панели Supabase

-- 1. Создание bucket 'documents' (если не существует)
-- Используем upsert чтобы обновить настройки если bucket уже есть
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 104857600, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
    public = false,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/webp'];

-- 2. Политики RLS для storage.objects

-- Политика для SELECT (чтение документов) - только владелец или общие документы
drop policy if exists "Users can read their own documents" on storage.objects;
create policy "Users can read their own documents"
on storage.objects for select
using (
    bucket_id = 'documents'
    and (
        -- Документы пользователя в его папке
        (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text)
        -- Или общие документы для всех авторизованных
        or (auth.role() = 'authenticated' and (storage.foldername(name))[1] = 'shared')
    )
);

-- Политика для INSERT (загрузка документов) - только авторизованные пользователи
drop policy if exists "Users can upload their own documents" on storage.objects;
create policy "Users can upload their own documents"
on storage.objects for insert
with check (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (
        -- Загрузка в свою папку
        (storage.foldername(name))[1] = auth.uid()::text
        -- Или в общую папку
        or (storage.foldername(name))[1] = 'shared'
    )
);

-- Политика для UPDATE (обновление документов) - только владелец
drop policy if exists "Users can update their own documents" on storage.objects;
create policy "Users can update their own documents"
on storage.objects for update
using (
    bucket_id = 'documents'
    and (
        (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text)
        or (auth.role() = 'authenticated' and (storage.foldername(name))[1] = 'shared')
    )
);

-- Политика для DELETE (удаление документов) - только владелец
drop policy if exists "Users can delete their own documents" on storage.objects;
create policy "Users can delete their own documents"
on storage.objects for delete
using (
    bucket_id = 'documents'
    and (
        (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text)
        or (auth.role() = 'authenticated' and (storage.foldername(name))[1] = 'shared')
    )
);
