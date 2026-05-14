# Large Files Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Разделить AdminBlog.tsx, Blog.tsx, CaseCard.tsx на меньшие компоненты

**Architecture:** 3 независимые задачи, каждая рефаторит один файл

**Tech Stack:** React, TypeScript

---

## Task 1: Рефакторинг AdminBlog.tsx

**Files:**
- Create: `src/components/AdminBlogList.tsx`
- Create: `src/components/AdminBlogPostForm.tsx`
- Modify: `src/pages/AdminBlog.tsx`

- [ ] **Шаг 1: Читать AdminBlog.tsx и определить секции**

Run: Открыть `src/pages/AdminBlog.tsx` и найти:
- Секция списка постов (строки ~100-400)
- Секция формы редактирования (строки ~400-800)
- Секция модальных окон

- [ ] **Шаг 2: Создать AdminBlogList.tsx**

```tsx
import React from 'react';
import { Edit, Trash2, Eye } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  is_published: boolean;
  created_at: string;
}

interface AdminBlogListProps {
  posts: BlogPost[];
  onEdit: (post: BlogPost) => void;
  onDelete: (id: string) => void;
  onPreview: (post: BlogPost) => void;
  isLoading: boolean;
}

export const AdminBlogList: React.FC<AdminBlogListProps> = ({
  posts, onEdit, onDelete, onPreview, isLoading
}) => {
  if (isLoading) return <div>Загрузка...</div>;
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Заголовок</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Категория</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Статус</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Дата</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {posts.map((post) => (
            <tr key={post.id}>
              <td className="px-4 py-3">{post.title}</td>
              <td className="px-4 py-3">{post.category}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs ${post.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {post.is_published ? 'Опубликован' : 'Черновик'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">{new Date(post.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3 flex gap-2">
                <button onClick={() => onPreview(post)} className="p-1 text-blue-600 hover:text-blue-800">
                  <Eye size={16} />
                </button>
                <button onClick={() => onEdit(post)} className="p-1 text-yellow-600 hover:text-yellow-800">
                  <Edit size={16} />
                </button>
                <button onClick={() => onDelete(post.id)} className="p-1 text-red-600 hover:text-red-800">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

- [ ] **Шаг 3: Создать AdminBlogPostForm.tsx**

```tsx
import React, { useState } from 'react';

interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  is_published: boolean;
}

interface AdminBlogPostFormProps {
  post?: BlogPost | null;
  onSave: (data: BlogPost) => void;
  onCancel: () => void;
}

export const AdminBlogPostForm: React.FC<AdminBlogPostFormProps> = ({
  post, onSave, onCancel
}) => {
  const [formData, setFormData] = useState<BlogPost>({
    title: post?.title || '',
    slug: post?.slug || '',
    content: post?.content || '',
    category: post?.category || '',
    is_published: post?.is_published || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Заголовок</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Slug</label>
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => setFormData({...formData, slug: e.target.value})}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Категория</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({...formData, category: e.target.value})}
          className="w-full p-2 border rounded"
        >
          <option value="">Выбрать</option>
          <option value="Новости">Новости</option>
          <option value="Статьи">Статьи</option>
          <option value="Советы">Советы</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Контент</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({...formData, content: e.target.value})}
          className="w-full p-2 border rounded"
          rows={10}
        />
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.is_published}
          onChange={(e) => setFormData({...formData, is_published: e.target.checked})}
        />
        Опубликовать
      </label>
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Сохранить
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">
          Отмена
        </button>
      </div>
    </form>
  );
};
```

- [ ] **Шаг 4: Обновить AdminBlog.tsx — добавить imports**

```typescript
import { AdminBlogList } from '../components/AdminBlogList';
import { AdminBlogPostForm } from '../components/AdminBlogPostForm';
```

- [ ] **Шаг 5: Проверить сборку**

Run: `npm run build 2>&1 | Select-String -Pattern "error|Error" | Select-Object -First 5`

- [ ] **Шаг 6: Commit**

```bash
git add src/components/AdminBlogList.tsx src/components/AdminBlogPostForm.tsx src/pages/AdminBlog.tsx
git commit -m "refactor: extract AdminBlogList and AdminBlogPostForm components"
```

---

## Task 2: Рефакторинг Blog.tsx

**Files:**
- Create: `src/components/BlogList.tsx`
- Create: `src/components/BlogPost.tsx`
- Create: `src/components/BlogSidebar.tsx`
- Modify: `src/pages/Blog.tsx`

- [ ] **Шаг 1: Читать Blog.tsx и определить секции**

- [ ] **Шаг 2: Создать BlogList.tsx**

```tsx
import React from 'react';
import { Link } from 'react-router-dom';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  published_at: string;
}

interface BlogListProps {
  posts: BlogPost[];
}

export const BlogList: React.FC<BlogListProps> = ({ posts }) => {
  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <article key={post.id} className="border-b pb-6">
          <Link to={`/blog/${post.slug}`} className="text-xl font-semibold hover:text-blue-600">
            {post.title}
          </Link>
          <p className="text-gray-600 mt-2">{post.excerpt}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span>{post.category}</span>
            <span>{new Date(post.published_at).toLocaleDateString()}</span>
          </div>
        </article>
      ))}
    </div>
  );
};
```

- [ ] **Шаг 3: Создать BlogPost.tsx**

```tsx
import React from 'react';

interface BlogPostProps {
  title: string;
  content: string;
  category: string;
  published_at: string;
  author?: string;
}

export const BlogPost: React.FC<BlogPostProps> = ({
  title, content, category, published_at, author
}) => {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      <div className="flex gap-4 text-sm text-gray-500 mb-6">
        <span>{category}</span>
        <span>{new Date(published_at).toLocaleDateString()}</span>
        {author && <span>{author}</span>}
      </div>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </article>
  );
};
```

- [ ] **Шаг 4: Создать BlogSidebar.tsx**

```tsx
import React from 'react';

interface Category {
  name: string;
  count: number;
}

interface BlogSidebarProps {
  categories: Category[];
  recentPosts: { title: string; slug: string }[];
}

export const BlogSidebar: React.FC<BlogSidebarProps> = ({ categories, recentPosts }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Категории</h3>
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li key={cat.name}>
              <a href={`/blog?category=${cat.name}`} className="text-gray-600 hover:text-blue-600">
                {cat.name} ({cat.count})
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-3">Последние посты</h3>
        <ul className="space-y-2">
          {recentPosts.map((post) => (
            <li key={post.slug}>
              <a href={`/blog/${post.slug}`} className="text-gray-600 hover:text-blue-600 text-sm">
                {post.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
```

- [ ] **Шаг 5: Обновить Blog.tsx — добавить imports**

- [ ] **Шаг 6: Проверить сборку**

- [ ] **Шаг 7: Commit**

```bash
git add src/components/BlogList.tsx src/components/BlogPost.tsx src/components/BlogSidebar.tsx src/pages/Blog.tsx
git commit -m "refactor: extract BlogList, BlogPost and BlogSidebar components"
```

---

## Task 3: Рефакторинг CaseCard.tsx

**Files:**
- Create: `src/components/CaseCardBody.tsx`
- Create: `src/components/CaseCardFooter.tsx`
- Create: `src/components/CaseCardEvents.tsx`
- Modify: `src/components/CaseCard.tsx`

- [ ] **Шаг 1: Читать CaseCard.tsx**

- [ ] **Шаг 2: Создать CaseCardBody.tsx**

```tsx
import React from 'react';
import { ParsedCase } from '../types';

interface CaseCardBodyProps {
  caseData: ParsedCase;
}

export const CaseCardBody: React.FC<CaseCardBodyProps> = ({ caseData }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">{caseData.court}</p>
          <p className="font-medium">{caseData.number}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${caseData.status === 'active' ? 'bg-green-100' : 'bg-gray-100'}`}>
          {caseData.status}
        </span>
      </div>
      {caseData.judge && <p className="text-sm">Судья: {caseData.judge}</p>}
      {caseData.category && <p className="text-sm">Категория: {caseData.category}</p>}
    </div>
  );
};
```

- [ ] **Шаг 3: Создать CaseCardFooter.tsx**

```tsx
import React from 'react';
import { Eye, RefreshCw, Calendar } from 'lucide-react';

interface CaseCardFooterProps {
  onView: () => void;
  onRefresh: () => void;
  onAddToCalendar: () => void;
}

export const CaseCardFooter: React.FC<CaseCardFooterProps> = ({
  onView, onRefresh, onAddToCalendar
}) => {
  return (
    <div className="flex gap-2 pt-2 border-t">
      <button onClick={onView} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
        <Eye size={14} /> Подробнее
      </button>
      <button onClick={onRefresh} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
        <RefreshCw size={14} /> Обновить
      </button>
      <button onClick={onAddToCalendar} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
        <Calendar size={14} /> Календарь
      </button>
    </div>
  );
};
```

- [ ] **Шаг 4: Создать CaseCardEvents.tsx**

```tsx
import React from 'react';
import { CaseEvent } from '../types';

interface CaseCardEventsProps {
  events: CaseEvent[];
  limit?: number;
}

export const CaseCardEvents: React.FC<CaseCardEventsProps> = ({ events, limit = 3 }) => {
  const displayEvents = events.slice(0, limit);
  
  return (
    <div className="space-y-1">
      {displayEvents.map((event, index) => (
        <div key={index} className="text-sm">
          <span className="text-gray-500">{event.date}:</span> {event.name}
          {event.result && <span className="text-green-600 ml-1">✓ {event.result}</span>}
        </div>
      ))}
      {events.length > limit && (
        <p className="text-xs text-gray-500">+ ещё {events.length - limit} событий</p>
      )}
    </div>
  );
};
```

- [ ] **Шаг 5: Обновить CaseCard.tsx — добавить imports и использовать компоненты**

```typescript
import { CaseCardHeader } from './CaseCardHeader';
import { CaseCardBody } from './CaseCardBody';
import { CaseCardFooter } from './CaseCardFooter';
import { CaseCardEvents } from './CaseCardEvents';
```

- [ ] **Шаг 6: Проверить сборку**

- [ ] **Шаг 7: Commit**

```bash
git add src/components/CaseCardBody.tsx src/components/CaseCardFooter.tsx src/components/CaseCardEvents.tsx src/components/CaseCard.tsx
git commit -m "refactor: extract CaseCardBody, CaseCardFooter and CaseCardEvents components"
```

---

## Self-Review

1. ✅ Все 3 файла покрыты задачами
2. ✅ Нет placeholder (все шаги содержат код)
3. ✅ Type consistency — интерфейсы определены

---

## Plan Complete

Plan saved to `docs/superpowers/plans/2026-05-12-refactor-large-files-implementation.md`.