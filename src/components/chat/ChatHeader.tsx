import React from 'react';
import { ArrowLeft, Phone, Video, MoreVertical } from 'lucide-react';

export interface ChatData {
  id: string;
  lawyerId: string;
  lawyerName: string;
  lawyerAvatar: string;
  online?: boolean;
}

interface ChatHeaderProps {
  chat: ChatData;
  onBack: () => void;
  mobileShowChat: boolean;
}

export default function ChatHeader({ chat, onBack, mobileShowChat }: ChatHeaderProps) {
  return (
    <div className={`p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
      <button
        onClick={onBack}
        className="md:hidden p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
      </button>
      
      <img 
        src={chat.lawyerAvatar} 
        alt={chat.lawyerName}
        className="w-10 h-10 rounded-xl object-cover bg-slate-100"
      />
      
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{chat.lawyerName}</h3>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${chat.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {chat.online ? 'В сети' : 'Не в сети'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <Phone className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <Video className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <MoreVertical className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
      </div>
    </div>
  );
}
