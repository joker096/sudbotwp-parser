import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, Clock, ChevronLeft, Share2 } from 'lucide-react';
import { sanitizeHtml } from '../lib/sanitizeHtml';

interface BlogPostProps {
  title: string;
  content: string;
  category?: string;
  author?: string;
  read_time?: string;
  created_at?: string;
  image_url?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  onShare?: () => void;
}

/**
 * BlogPost - компонент для отображения полного поста блога
 */
export const BlogPost: React.FC<BlogPostProps> = ({
  title,
  content,
  category,
  author,
  read_time,
  created_at,
  image_url,
  onShare,
}) => {
  return (
    <article className="max-w-none">
      {/* Back Link */}
      <Link
        to="/blog"
        className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6"
      >
        <ChevronLeft size={18} />
        К списку постов
      </Link>

      {/* Featured Image */}
      {image_url && (
        <img
          src={image_url}
          alt={title}
          className="w-full h-64 md:h-96 object-cover rounded-xl mb-8"
        />
      )}

      {/* Meta Info */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
        {category && (
          <Link
            to={`/blog?category=${category}`}
            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-blue-200"
          >
            {category}
          </Link>
        )}
        
        {created_at && (
          <span className="flex items-center gap-1">
            <Calendar size={16} />
            {new Date(created_at).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        )}
        
        {author && (
          <span className="flex items-center gap-1">
            <User size={16} />
            {author}
          </span>
        )}
        
        {read_time && (
          <span className="flex items-center gap-1">
            <Clock size={16} />
            {read_time} чтения
          </span>
        )}

        {onShare && (
          <button
            onClick={onShare}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-600 ml-auto"
          >
            <Share2 size={16} />
            Поделиться
          </button>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
        {title}
      </h1>

      {/* Content */}
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content, { allowYouTubeIframes: true }) }}
      />

      {/* Tags / Keywords (if any) */}
      <div className="mt-8 pt-6 border-t">
        {/* Could add tags here if implemented */}
      </div>
    </article>
  );
};