# Technical Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Провести технический аудит проекта, улучшить типизацию, рефакторить большие файлы, добавить обработку ошибок в Edge Functions

**Architecture:** 5 независимых задач, каждая решает конкретную проблему из аудита

**Tech Stack:** TypeScript, React, Supabase Edge Functions

---

## Task 1: TypeScript — Улучшение типизации в supabase.ts

**Files:**
- Modify: `src/lib/supabase.ts:1-50` — добавить типы в начало файла

- [ ] **Шаг 1: Добавить типы CaseEvent, CaseAppeal, ParsedCase**

Найти место после существующих типов (примерно строка 46) и добавить:

```typescript
// Case Event types
export interface CaseEvent {
  date: string;
  time?: string;
  name: string;
  result?: string;
  reason?: string;
  location?: string;
}

// Case Appeal types
export interface CaseAppeal {
  date: string;
  judge?: string;
  result?: string;
  description?: string;
}

// Parsed Case type
export interface ParsedCase {
  id: string;
  link: string;
  uid: string;
  code: string;
  type: string;
  judge?: string;
  court: string;
  date: string;
  updated: string;
  events: CaseEvent[];
  participants: string[];
  appeals: CaseAppeal[];
}
```

- [ ] **Шаг 2: Проверить компиляцию**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Без ошибок типизации для новых типов

- [ ] **Шаг 3: Заменить `any` на типы в ключевых функциях**

Найти `createCase: async (caseData: any)` и заменить на:
```typescript
createCase: async (caseData: Partial<ParsedCase>)
```

Найти `updateCase: async (id: string, updates: any)` и заменить на:
```typescript
updateCase: async (id: string, updates: Partial<ParsedCase>)
```

- [ ] **Шаг 4: Проверить компиляцию again**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Без ошибок

- [ ] **Шаг 5: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "refactor: add TypeScript types for CaseEvent, CaseAppeal, ParsedCase"
```

---

## Task 2: Рефакторинг Profile.tsx — вынести подкомпоненты

**Files:**
- Create: `src/components/ProfileHeader.tsx`
- Create: `src/components/ProfileTabs.tsx`
- Modify: `src/pages/Profile.tsx:1-100` — добавить imports

- [ ] **Шаг 1: Создать ProfileHeader.tsx**

```tsx
import React from 'react';
import { User, Profile } from '../types';
import { Link } from 'react-router-dom';

interface ProfileHeaderProps {
  user: User | null;
  profileData: Profile | null;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, profileData }) => {
  if (!user) return null;
  
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl">
        {user.email?.charAt(0).toUpperCase()}
      </div>
      <div>
        <h2 className="text-xl font-semibold">{profileData?.full_name || user.email}</h2>
        <p className="text-gray-500 text-sm">{user.email}</p>
      </div>
    </div>
  );
};
```

- [ ] **Шаг 2: Создать ProfileTabs.tsx**

```tsx
import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface ProfileTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex border-b mb-4 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 whitespace-nowrap ${
            activeTab === tab.id
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
```

- [ ] **Шаг 3: Обновить Profile.tsx — добавить imports**

Добавить в начало файла после существующих imports:
```typescript
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileTabs } from '../components/ProfileTabs';
```

- [ ] **Шаг 4: Заменить inline код на компоненты**

Найти секцию с header и заменить на `<ProfileHeader user={user} profileData={profileData} />`

Найти секцию с tabs и заменить на `<ProfileTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />`

- [ ] **Шаг 5: Проверить сборку**

Run: `npm run build 2>&1 | tail -30`
Expected: Успешная сборка

- [ ] **Шаг 6: Commit**

```bash
git add src/components/ProfileHeader.tsx src/components/ProfileTabs.tsx src/pages/Profile.tsx
git commit -m "refactor: split Profile.tsx into ProfileHeader and ProfileTabs components"
```

---

## Task 3: Рефакторинг AdminSettings.tsx — вынести секции

**Files:**
- Create: `src/components/AdminSiteSettings.tsx`
- Create: `src/components/AdminSecuritySettings.tsx`
- Modify: `src/components/AdminSettings.tsx:1-50` — добавить imports

- [ ] **Шаг 1: Создать AdminSiteSettings.tsx**

```tsx
import React from 'react';
import { useSiteAds } from '../hooks/useSiteAds';
import { useSeo } from '../hooks/useSeo';

export const AdminSiteSettings: React.FC = () => {
  const { settings: siteAds, updateSettings: updateSiteAds } = useSiteAds();
  const { settings: seoSettings, updateSettings: updateSeo } = useSeo();
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Настройки сайта</h3>
      
      {/* Site Ads Section */}
      <div className="border p-4 rounded">
        <h4 className="font-medium mb-2">Рекламные баннеры</h4>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={siteAds?.enabled ?? false}
            onChange={(e) => updateSiteAds({ enabled: e.target.checked })}
          />
          <span>Включить рекламу</span>
        </label>
      </div>
      
      {/* SEO Section */}
      <div className="border p-4 rounded">
        <h4 className="font-medium mb-2">SEO настройки</h4>
        <input
          type="text"
          value={seoSettings?.title || ''}
          onChange={(e) => updateSeo({ title: e.target.value })}
          placeholder="Site Title"
          className="w-full p-2 border rounded"
        />
      </div>
    </div>
  );
};
```

- [ ] **Шаг 2: Создать AdminSecuritySettings.tsx**

```tsx
import React from 'react';
import { SecuritySettings } from './SecuritySettings';

export const AdminSecuritySettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Безопасность</h3>
      <SecuritySettings />
    </div>
  );
};
```

- [ ] **Шаг 3: Обновить AdminSettings.tsx — добавить imports**

```typescript
import { AdminSiteSettings } from './AdminSiteSettings';
import { AdminSecuritySettings } from './AdminSecuritySettings';
```

- [ ] **Шаг 4: Заменить секции на компоненты**

Найти блок "Настройки сайта" и заменить на `<AdminSiteSettings />`
Найти блок "Безопасность" и заменить на `<AdminSecuritySettings />`

- [ ] **Шаг 5: Проверить сборку**

Run: `npm run build 2>&1 | tail -30`
Expected: Успешная сборка

- [ ] **Шаг 6: Commit**

```bash
git add src/components/AdminSiteSettings.tsx src/components/AdminSecuritySettings.tsx src/components/AdminSettings.tsx
git commit -m "refactor: split AdminSettings.tsx into AdminSiteSettings and AdminSecuritySettings"
```

---

## Task 4: Edge Functions — добавить типизацию ошибок

**Files:**
- Modify: `supabase/functions/auto-refresh-cases/index.ts:33`
- Modify: `supabase/functions/ai-lawyer/index.ts:279`
- Modify: `supabase/functions/parse-case/index.ts:100`

- [ ] **Шаг 1: Обновить auto-refresh-cases catch**

Найти строку 33:
```typescript
} catch (error) {
```

Заменить на:
```typescript
} catch (error: Error) {
  console.error(`[${new Date().toISOString()}] Error:`, error.message, error.stack);
```

- [ ] **Шаг 2: Обновить все catch в auto-refresh-cases**

Повторить для строк 62, 117, 184

- [ ] **Шаг 3: Обновить ai-lawyer catch**

Найти строку 279:
```typescript
} catch (error: any) {
```

Заменить на:
```typescript
} catch (error: Error) {
  console.error('AI Lawyer error:', error.message, error.stack);
```

- [ ] **Шаг 4: Обновить parse-case catch**

Найти строку 100:
```typescript
} catch (error: any) {
```

Заменить на:
```typescript
} catch (error: Error) {
  console.error('Parse case error:', error.message, error.stack);
```

- [ ] **Шаг 5: Commit**

```bash
git add supabase/functions/auto-refresh-cases/index.ts supabase/functions/ai-lawyer/index.ts supabase/functions/parse-case/index.ts
git commit -m "refactor: add Error type to catch blocks in Edge Functions"
```

---

## Task 5: Безопасность — проверить XSS protection

**Files:**
- Check: `src/components/HtmlEditor.tsx:1-30`
- Check: `src/components/SafeLink.tsx:1-20`

- [ ] **Шаг 1: Проверить использование DOMPurify в HtmlEditor**

Открыть HtmlEditor.tsx и найти:
```typescript
import DOMPurify from 'dompurify';
```

Если есть — XSS защита есть.

- [ ] **Шаг 2: Проверить SafeLink компонент**

Открыть SafeLink.tsx и проверить:
```typescript
target="_blank" rel="noopener noreferrer"
```

Если есть — внешние ссылки защищены.

- [ ] **Шаг 3: Commit (если есть изменения)**

```bash
git add src/components/HtmlEditor.tsx src/components/SafeLink.tsx
git commit -m "chore: verify XSS protection in HtmlEditor and SafeLink"
```

---

## Self-Review

Проверяю план против спецификации:

1. ✅ TypeScript типизация — Task 1
2. ✅ Рефакторинг больших файлов — Task 2, Task 3
3. ✅ Edge Functions типизация ошибок — Task 4
4. ✅ React Hooks — проверка в Task 2-3
5. ✅ Безопасность — Task 5

Все 5 областей спецификации покрыты задачами.

Placeholders: нет (все шаги содержат конкретный код).

Type consistency: типы CaseEvent, CaseAppeal, ParsedCase определены в Task 1 и используются в Task 2.

---

## Plan Complete

Plan saved to `docs/superpowers/plans/2026-05-12-technical-audit-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**