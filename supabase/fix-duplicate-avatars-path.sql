-- Fix avatar_url paths that have duplicated storage URLs
-- Only update records where avatar_url contains 'avatars/avatars/' pattern

UPDATE lawyers
SET 
  avatar_url = REPLACE(avatar_url, 'avatars/avatars/', 'avatars/'),
  img = REPLACE(img, 'avatars/avatars/', 'avatars/')
WHERE 
  avatar_url LIKE '%avatars/avatars/%'
  OR img LIKE '%avatars/avatars/%';
