import React, { useState } from 'react';
import { X, FileText, Upload, Download, Share2 } from 'lucide-react';

interface UploadedDoc {
  id: string;
  name: string;
  url: string;
  created_at: string;
}

interface TemplateInfo {
  name: string;
  icon: string;
}

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (doc: { id: string; name: string; url: string }) => void;
  uploadedDocs: UploadedDoc[];
}

const TEMPLATES: TemplateInfo[] = [
  { name: 'Договор аренды', icon: '🏠' },
  { name: 'Договор купли-продажи', icon: '💰' },
  { name: 'Трудовой договор', icon: '👔' },
  { name: 'Исковое заявление', icon: '⚖️' },
  { name: 'Доверенность', icon: '📜' },
  { name: 'Расписка', icon: '✍️' },
];

export const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, onInsert, uploadedDocs }) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'templates'>('documents');

  if (!isOpen) return null;

  const insertTemplate = (template: TemplateInfo) => {
    const templateHtml = `<div class="document-template" style="display: flex; align-items: center; gap: 12px; padding: 16px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 12px; margin: 16px 0;">
      <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px;">${template.icon}</div>
      <div style="flex: 1;">
        <p style="font-weight: 600; color: #0c4a6e; margin: 0; font-size: 14px;">${template.name}</p>
        <p style="color: #0369a1; margin: 4px 0 0; font-size: 12px;">Шаблон документа</p>
      </div>
      <span style="color: #0ea5e9;">+</span>
    </div>`;
    onInsert({ id: `template-${Date.now()}`, name: template.name, url: templateHtml } as { id: string; name: string; url: string });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            Документы и шаблоны
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 py-3 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'documents' ? 'bg-accent text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}`}
          >
            Документы
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'templates' ? 'bg-accent text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}`}
          >
            Шаблоны ({TEMPLATES.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'documents' ? (
            <>
              {uploadedDocs.length === 0 && (
                <div className="text-center py-8">
                  <Upload className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Нет загруженных документов</p>
                </div>
              )}
              {uploadedDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onInsert({ id: doc.id, name: doc.name, url: doc.url })}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md cursor-pointer group transition-all"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{doc.name}</p>
                    <p className="text-xs text-slate-500">Документ</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <a href={doc.url} download={doc.name} onClick={(e) => e.stopPropagation()} className="p-2 text-slate-500 hover:text-blue-500 rounded-lg" title="Скачать">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((template) => (
                <button
                  key={template.name}
                  onClick={() => insertTemplate(template)}
                  className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 hover:bg-blue-900/20 rounded-xl text-left transition-all"
                >
                  <span className="text-xl">{template.icon}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{template.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <p className="text-xs text-slate-500">Нажмите на документ для вставки в статью</p>
        </div>
      </div>
    </div>
  );
};
