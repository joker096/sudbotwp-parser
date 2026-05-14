import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface ChatListProps {
  chats: any[]; // Accepts the actual chat data shape passed from Messages.tsx parent component
  selectedChat: any | null;
  onSelectChat: (chat: any) => void;
  onMobileBack?: () => void;
  mobileShowChat: boolean;
}


export default function ChatList({ chats, selectedChat, onSelectChat, onMobileBack, mobileShowChat }: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter(chat =>
    chat.lawyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`w-full md:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full md:h-[calc(100vh-120px)] ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Сообщения</h2>
          <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-lg font-bold">
            {chats.filter(c => c.unread > 0).length} новых
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по чатам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.map(chat => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800/50 ${
              selectedChat?.id === chat.id ? 'bg-slate-50 dark:bg-slate-800' : ''
            }`}
          >
            <div className="relative shrink-0">
              <img 
                src={chat.lawyerAvatar} 
                alt={chat.lawyerName}
                className="w-12 h-12 rounded-xl object-cover bg-slate-100"
              />
              {chat.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{chat.lawyerName}</h3>
                <span className="text-xs text-slate-400 shrink-0">{chat.lastTime}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{chat.lastMessage}</p>
            </div>
            {chat.unread > 0 && (
              <div className="shrink-0 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">{chat.unread}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
