import { useState } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import EncryptedFileUpload from '../EncryptedFileUpload';

interface ChatInputProps {
  onSend: (message: string, files: Array<{ name: string; url: string; path: string }>) => void;
  showContractButton: boolean;
  onContractClick: () => void;
}

export default function ChatInput({ onSend, showContractButton, onContractClick }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; url: string; path: string }>>([]);

  const handleSend = () => {
    if (message.trim() || attachedFiles.length > 0) {
      onSend(message, attachedFiles);
      setMessage('');
      setAttachedFiles([]);
      setShowFileUpload(false);
    }
  };

  const handleFileUploaded = (fileName: string, fileUrl: string) => {
    setAttachedFiles(prev => [...prev, { name: fileName, url: fileUrl, path: fileUrl }]);
  };

  const handleFileDeleted = (fileName: string) => {
    setAttachedFiles(prev => prev.filter(file => file.name !== fileName));
  };

  return (
    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {attachedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
              <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{file.name}</span>
              <button 
                onClick={() => handleFileDeleted(file.name)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
              >
                <span className="text-xs text-red-500">✕</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Contract button */}
      {showContractButton && (
        <button
          onClick={onContractClick}
          className="mb-3 w-full bg-accent hover:bg-accent-light text-white py-2 rounded-xl text-sm font-bold transition-colors"
        >
          Заключить договор
        </button>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <button 
          onClick={() => setShowFileUpload(!showFileUpload)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Paperclip className="w-5 h-5 text-slate-500" />
        </button>

        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Введите сообщение..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[44px] max-h-[120px]"
            rows={1}
          />
        </div>

        <button 
          onClick={handleSend}
          disabled={!message.trim() && attachedFiles.length === 0}
          className="p-2 bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white rounded-lg transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* File upload modal */}
      {showFileUpload && (
        <div className="mt-3">
          <EncryptedFileUpload
            onFileUploaded={handleFileUploaded}
            onFileDeleted={handleFileDeleted}
          />
        </div>
      )}
    </div>
  );
}
