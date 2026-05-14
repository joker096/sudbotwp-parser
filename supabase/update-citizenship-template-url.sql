-- Update citizenship template with public file_url

-- Construct public URL (replace with your project URL)
UPDATE document_templates 
SET 
  file_url = 'https://qhiietjvfuekfaehddox.supabase.co/storage/v1/object/public/documents/templates/1774381314561-forma-zayavleniya-o-prinyatii-v-grazhdanstvo-.docx',
  file_name = '1774381314561-forma-zayavleniya-o-prinyatii-v-grazhdanstvo-.docx'
WHERE name = 'Заявление о принятии в гражданство';

-- Verify update
SELECT id, name, file_url, file_name FROM document_templates 
WHERE name = 'Заявление о принятии в гражданство';

-- Check other citizenship templates (backup)
SELECT id, name, file_url FROM document_templates WHERE category = 'Гражданство';
