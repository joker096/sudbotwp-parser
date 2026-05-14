import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight } from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category_id?: number;
  image_url: string;
  author: string;
  read_time: string;
  published: boolean;
  created_at?: string;
  category?: string;
}

interface BlogListProps {
  posts: BlogPost[];
  loading?: boolean;
}

/**
 * BlogList - компонент для отображения списка постов блога
 */
export const BlogList: React.FC<BlogListProps> = ({ posts, loading }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Посты не найдены
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {posts.map((post) => (
        <article key={post.id} className="border-b border-gray-100 pb-8 last:border-0">
          {post.image_url && (
            <Link to={`/blog/${post.slug}`} className="block mb-4">
              <img
                src={post.image_url}
                alt={post.title}
                className="w-full h-48 object-cover rounded-lg"
              />
            </Link>
          )}
          
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            {post.category && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                {post.category}
              </span>
            )}
            {post.created_at && (
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {new Date(post.created_at).toLocaleDateString('ru-RU')}
              </span>
            )}
            {post.author && (
              <span className="flex items-center gap-1">
                <User size={14} />
                {post.author}
              </span>
            )}
            {post.read_time && (
              <span className="text-gray-400">{post.read_time}</span>
            )}
          </div>

          <Link to={`/blog/${post.slug}`}>
            <h2 className="text-2xl font-semibold text-gray-900 hover:text-blue-600 mb-2">
              {post.title}
            </h2>
          </Link>

          {post.excerpt && (
            <p className="text-gray-600 mb-4 line-clamp-3">
              {post.excerpt}
            </p>
          )}

          <Link
            to={`/blog/${post.slug}`}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
          >
            Читать далее <ArrowRight size={16} />
          </Link>
        </article>
      ))}
    </div>
  );
};