import { useState, useRef } from 'react';
import { Upload, File, X, Loader2, Download, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { documents } from '../lib/supabase';
import { useToast } from '../hooks/useToast';

interface EncryptedFileUploadProps {
  onFileUploaded?: (fileName: string, fileUrl: string) => void;
  existingFiles?: Array<{ name: string; url: string; path: string }>;
  onFileDeleted?: (fileName: string) => void;
  acceptedFormats?: string;
  maxFileSize?: number;
  folder?: 'private' | 'shared';
}

export default function EncryptedFileUpload({
  onFileUploaded,
  existingFiles = [],
  onFileDeleted,
  acceptedFormats = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp',
  maxFileSize = 100 * 1024 * 1024, // 100MB
  folder = 'private',
}: EncryptedFileUploadProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState(existingFiles);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      showToast('Необходимо авторизоваться для загрузки файлов', 'error');
      return;
    }

    const selectedFiles = Array.from(e.target.files || []);
    
    for (const file of selectedFiles) {
      // Проверка размера файла
      if (file.size > maxFileSize) {
        showToast(`Файл ${file.name} слишком большой. Максимальный размер: ${(maxFileSize / (1024 * 1024)).toFixed(0)} MB`, 'error');
        continue;
      }

      // Проверка формата файла
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const acceptedExtensions = acceptedFormats.split(',').map(ext => ext.trim().replace('.', ''));
      if (fileExtension && !acceptedExtensions.includes(fileExtension)) {
        showToast(`Формат файла ${file.name} не поддерживается. Поддерживаемые форматы: ${acceptedFormats}`, 'error');
        continue;
      }

      // Загрузка файла
      try {
        setIsUploading(true);
        setUploadProgress(0);

        // Имитация прогресса загрузки (на реальном проекте можно использовать нативный прогресс из Supabase)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 10;
          });
        }, 500);

        const { data, url, error } = await documents.upload(user.id, file, folder);

        clearInterval(progressInterval);

        if (error) {
          throw error;
        }

        setUploadProgress(100);

        const newFile = {
          name: file.name,
          url: url || data?.path || '',
          path: data?.path || '',
        };

        setFiles(prev => [...prev, newFile]);
        onFileUploaded?.(file.name, url || data?.path || '');
        showToast(`Файл ${file.name} успешно загружен`, 'success');
      } catch (error) {
        console.error('Error uploading file:', error);
        showToast(`Ошибка при загрузке файла ${file.name}: ${(error as any).message}`, 'error');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }

    // Очищаем input чтобы можно было выбрать тот же файл снова
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileName: string, index: number) => {
    if (!user) {
      showToast('Необходимо авторизоваться для удаления файлов', 'error');
      return;
    }

    try {
      const fileToDelete = files[index];
      const fileNameToDelete = fileToDelete.name;

      // Удаляем из Supabase Storage
      const { error } = await documents.remove(user.id, fileNameToDelete, folder);
      
      if (error) {
        throw error;
      }

      // Удаляем из локального состояния
      const updatedFiles = [...files];
      updatedFiles.splice(index, 1);
      setFiles(updatedFiles);
      onFileDeleted?.(fileNameToDelete);
      showToast(`Файл ${fileNameToDelete} успешно удален`, 'success');
    } catch (error) {
      console.error('Error deleting file:', error);
      showToast(`Ошибка при удалении файла ${fileName}: ${(error as any).message}`, 'error');
    }
  };

  const handleDownloadFile = async (fileName: string, index: number) => {
    if (!user) {
      showToast('Необходимо авторизоваться для скачивания файлов', 'error');
      return;
    }

    try {
      const { data, error } = await documents.download(user.id, fileName, folder);
      
      if (error) {
        throw error;
      }

      // Создаем временный URL и скачиваем файл
      const url = window.URL.createObjectURL(data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      showToast(`Ошибка при скачивании файла ${fileName}: ${(error as any).message}`, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Загрузка файлов */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats}
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>Загрузить документ</span>
        </label>
      </div>

      {/* Прогресс загрузки */}
      {isUploading && (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-accent h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Список загруженных файлов */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Загруженные документы</p>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <File className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Зашифрованное хранилище
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadFile(file.name, index)}
                  className="p-1.5 text-slate-400 hover:text-accent rounded-lg transition-colors"
                  title="Скачать"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteFile(file.name, index)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Подсказка о зашифровании */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">i</span>
        </div>
        <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
          Все документы хранятся в зашифрованном виде с использованием сквозного шифрования. Доступ к ним есть только у вас и выбранных пользователей.
        </p>
      </div>
    </div>
  );
}
