# Project Structure: sud.cvr.name (pravo.ai)

## Root
```
F:\AISTUDIO\sud.cvr.name\
├── .env                          # Supabase/Telegram env vars
├── .gitignore
├── .htaccess                     # Apache rewrite rules
├── package.json / package-lock.json
├── tsconfig.json / tsconfig.tsbuildinfo
├── vite.config.ts                # Vite build config
├── tailwind.config.js
├── postcss.config.js
├── Dockerfile
├── render.yaml                   # Render.com deployment
├── nginx.conf / nginx-sitemap.conf
├── package.json / render-package.json  # Render server package
├── render-server.js              # Render.com server entry
├── simple-server.js              # Simple dev server
├── simple-test-server.js
├── deploy.ps1 / deploy-*.cjs / deploy-*.js
├── deploy-telegram-bot.js / run-telegram-bot.{ps1,sh}
├── telegram-bot-server.js        # Telegram bot server
├── README.md
├── CHANGELOG.md
├── TODO.md
├── INSTRUCTIONS-DEPLOY.md
├── PARSING_OPTIONS.md
├── GET-SUPABASE-KEY.md
├── TELEGRAM_BOT_SETUP.md
├── metadata.json
├── nginx.conf
```

## src/
```
src/
├── App.tsx                       # Main app with routing
├── main.tsx                      # Entry point
├── index.css                     # Global styles (Tailwind)
├── types.ts                      # Shared TypeScript types
├── vite-env.d.ts
├── components/                    # React components (36 files)
├── hooks/                         # Custom hooks (8 files)
├── lib/                           # Utilities (7 files)
└── pages/                         # Page components (19 files)
```

## src/components/ (36 files)
```
├── ActionButton.tsx              # Action buttons
├── AdBanner.tsx                  # Ad banners
├── AdminBlogComments.tsx         # Admin blog comments
├── AdminSettings.tsx             # Admin settings panel
├── AILawyerAnalytics.tsx         # AI lawyer analytics
├── AuthCallback.tsx              # OAuth callback handler
├── BlogComments.tsx              # Blog comment component
├── CalendarSyncSettings.tsx      # Calendar sync settings
├── CaseAppealCard.tsx            # Case appeal card
├── CaseCard.tsx                  # Case card component
├── CaseCardHeader.tsx            # Case card header
├── CaseEventItem.tsx             # Case event item
├── CaseOutcomeModal.tsx          # Case outcome modal
├── CommentSection.tsx            # Comment section
├── ConfirmModal.tsx              # Confirmation dialog
├── CookieBanner.tsx              # Cookie consent banner
├── EditableField.tsx             # Editable field component
├── EmojiPicker.tsx               # Emoji picker
├── EncryptedFileUpload.tsx       # Encrypted file upload
├── ErrorBoundary.tsx             # Error boundary wrapper
├── EventModal.tsx                # Event modal
├── FloatingButtons.tsx           # Floating action buttons
├── GoogleAnalytics.tsx           # GA integration
├── HtmlEditor.tsx                # Rich text editor
├── HtmlEditorDocumentModal.tsx
├── HtmlEditorFloatingToolbar.tsx
├── HtmlEditorGooglePhotosModal.tsx
├── HtmlEditorImageModal.tsx
├── HtmlEditorLinkModal.tsx
├── HtmlEditorShortcodeModal.tsx
├── HtmlEditorYouTubeModal.tsx
├── InfoCard.tsx                  # Info card display
├── LawyerApplicationsAdmin.tsx   # Lawyer app admin panel
├── LawyerReviews.tsx             # Lawyer reviews
├── Layout.tsx                    # Main page layout
├── LazyImage.tsx                 # Lazy-loaded image
├── LeadModal.tsx                 # Lead capture modal
├── ManualCaseEntryForm.tsx       # Manual case entry
├── MentionInput.tsx              # @mention input
├── NotificationSettings.tsx      # User notification settings
├── PageLoader.tsx                # Page loading spinner
├── PartyCard.tsx                 # Party info card
├── PaymentModal.tsx              # Payment modal
├── ProtectedRoute.tsx            # Authenticated route guard
├── SafeDealCard.tsx              # Safe deal card
├── SafeDealModal.tsx             # Safe deal modal
├── SafeLink.tsx                  # Safe link renderer
├── SecuritySettings.tsx          # Security settings
├── SeoSsettings.tsx              # SEO settings
├── ShareModal.tsx                # Share link modal
├── SimpleCaptcha.tsx             # Simple CAPTCHA
├── SourceWarningModal.tsx        # Source warning dialog
├── StarRating.tsx                # Star rating display
├── TabButton.tsx                 # Tab button
├── UserRewardsPanel.tsx          # User rewards display
└── YouTubeEmbed.tsx              # YouTube embed
```

## src/hooks/ (8 files)
```
├── useApiQuery.ts                # API query hook
├── useAuth.ts                    # Auth state hook
├── useExternalLinksAdSettings.ts # External links ad settings
├── useNofollowLinks.ts           # NoFollow link hook
├── useNotifications.ts           # Notifications hook
├── useSeo.ts                     # SEO settings hook
├── useSiteAds.ts                 # Site ads hook
└── useToast.tsx                  # Toast notifications
```

## src/lib/ (7 files)
```
├── browserlessParser.ts          # HTML parser (headless)
├── chat-api.ts                   # Chat API wrapper
├── clientParser.ts               # Client-side HTML parser
├── notifications.ts              # Notification utilities
├── npd.ts                        # NPD (НПД) utilities
├── pravo.ts                      # Legal acts parser
└── supabase.ts                   # Supabase client & functions
├── transliterate.ts              # Cyrillic transliteration
```

## src/pages/ (19 files)
```
├── AILawyer.tsx                  # AI Lawyer chat page
├── ApplyLawyer.tsx               # Lawyer application form
├── Blog.tsx                      # Blog listing
├── Calculator.tsx                # Legal calculator
├── CaseSearch.tsx                # Case search page
├── DocumentsLibrary.tsx          # Documents library
├── Help.tsx                      # Help page
├── Home.tsx                      # Home page
├── Lawyers.tsx                   # Lawyers directory
├── Leads.tsx                     # Leads management
├── LegalActs.tsx                 # Legal acts page
├── Login.tsx                     # Login page
├── Messages.tsx                  # Messages page
├── Monitoring.tsx                # Monitoring page
├── NotFound.tsx                  # 404 page
├── Privacy.tsx                   # Privacy policy
├── Profile.tsx                   # User profile page
├── TaxpayerCheck.tsx             # Taxpayer check page
└── TestEditor.tsx                # Test editor page
```

## supabase/
```
supabase/
├── config.toml                   # Supabase project config
├── .temp/                        # Supabase CLI temp files
│   ├── cli-latest
│   ├── gotrue-version
│   ├── pooler-url
│   ├── postgres-version
│   ├── project-ref
│   ├── rest-version
│   ├── storage-migration
│   └── storage-version
├── functions/                    # Supabase Edge Functions (10 functions)
│   ├── _shared/                  # Shared utilities
│   │   └── cors.ts
│   ├── ai-lawyer/
│   │   ├── .func.yaml
│   │   └── index.ts
│   ├── auto-refresh-cases/
│   │   ├── .func.yaml
│   │   └── index.ts
│   ├── check-self-employed/
│   │   ├── .func.yaml
│   │   └── index.ts
│   ├── generate-sitemap/
│   │   ├── .env
│   │   ├── .func.yaml
│   │   └── index.ts
│   ├── google-photos/
│   │   ├── .func.yaml
│   │   └── index.ts
│   ├── parse-case/
│   │   ├── .func.yaml
│   │   ├── .gitignore
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── package-lock.json
│   ├── pravo-incremental-sync/
│   │   ├── .func.yaml
│   │   └── index.ts
│   ├── pravo-proxy/
│   │   ├── .func.yaml
│   │   └── index.ts
│   ├── pravo-sync/
│   │   ├── .func.yaml
│   │   └── index.ts
│   ├── send-report-email/
│   │   └── index.ts
│   ├── telegram-webhook/
│   │   ├── .func.yaml
│   │   └── index.ts
│   └── yookassa/
│       ├── .func.yaml
│       └── index.ts
├── migrations/                   # Supabase migrations (46 files)
│   ├── 20240801110000_existing.sql
│   ├── 20241101_add_lawyers_management.sql
│   ├── 20241201_fix_lawyer_applications_rls.sql
│   ├── 20250825160513_existing.sql
│   ├── 20250826000000_existing.sql
│   ├── 20250826000001_existing.sql
│   ├── 20250827214000_existing.sql
│   ├── 20250909100000_existing.sql
│   ├── 20250910100000_existing.sql
│   ├── 20250910100001_existing.sql
│   ├── 20250911090000_existing.sql
│   ├── 20250911100000_existing.sql
│   ├── 20250927120000_existing.sql
│   ├── 20250927130000_existing.sql
│   ├── 20250929180000_existing.sql
│   ├── 20250929190000_existing.sql
│   ├── 20250930100000_existing.sql
│   ├── 20250930110000_existing.sql
│   ├── 20250930120000_existing.sql
│   ├── 20250930130000_existing.sql
│   ├── 20250930140000_existing.sql
│   ├── 20250930150000_existing.sql
│   ├── 20250930160000_existing.sql
│   ├── 20250930170000_existing.sql
│   ├── 20250930180000_existing.sql
│   ├── 20251004000000_existing.sql
│   ├── 20251006140556_existing.sql
│   ├── 20251006141620_existing.sql
│   ├── 20251006141806_existing.sql
│   ├── 20251006142307_existing.sql
│   ├── 20251006144152_existing.sql
│   ├── 20251006151000_existing.sql
│   ├── 20251006160000_existing.sql
│   ├── 20251006170000_existing.sql
│   ├── 20251006180000_existing.sql
│   ├── 20251006190000_existing.sql
│   ├── 20251006200000_existing.sql
│   ├── 20251006210000_existing.sql
│   ├── 20251006220000_existing.sql
│   ├── 20251006230000_existing.sql
│   ├── 20251006230001_existing.sql
│   ├── 20251006230002_existing.sql
│   ├── 20251006230003_existing.sql
│   ├── 20251006230004_existing.sql
│   ├── 20251006230005_existing.sql
│   ├── 20251006230006_existing.sql
│   ├── 20251012231317_existing.sql
│   ├── 20251013000000_fix-cases-rls.sql
│   ├── 20260320180200_fix-users-table-permissions.sql
│   ├── 20260325000000_add-user-id-to-case-comments.sql
│   ├── 20260325010000_force_refresh_case_comments.sql
│   ├── 20260326000002_create_lawyer_applications.sql
│   ├── 20260326000004_fix_lawyers_table.sql
│   ├── 20260326000005_seed_lawyers_data.sql
│   ├── 20260326000006_create_lawyer_applications.sql
│   ├── 20260326000007_add_lawyer_id_to_profiles.sql
│   ├── 20260503000000_add_lawyer_fields.sql
│   └── 20261001_fix_case_shares_rls.sql
├── *.sql                         # Standalone migration scripts (~40 files)
│   ├── add-avatar-url-column.sql
│   ├── add-blog-post-slug.sql
│   ├── add-comment-to-cases.sql
│   ├── add-lawyer-avatar-url.sql
│   ├── add-lawyer-id-to-leads.sql
│   ├── add-profile-columns.sql
│   ├── add-role-column.sql
│   ├── add-subscription-tier-column.sql
│   ├── ai-lawyer-messages.sql
│   ├── apply-lawyers-setup.sql
│   ├── avatars-bucket-setup.sql
│   ├── blog-categories.sql
│   ├── blog-comments.sql
│   ├── create-blog-comments-view.sql
│   ├── create-chats-table.sql
│   ├── create-courts-table.sql
│   ├── create-lawyers-table.sql
│   ├── create-pravo-tables.sql
│   ├── create-public-cases.sql
│   ├── document-templates.sql
│   ├── documents-bucket-setup.sql
│   ├── documents-templates-public.sql
│   ├── enable-pg-cron-for-auto-refresh.sql
│   ├── external-links-ads-settings.sql
│   ├── FIX-CASES-COMMENTS.sql
│   ├── fix-document-templates-rls.sql
│   ├── fix-page-seo-rls.sql
│   ├── fix-users-table-permissions.sql
│   ├── fixed-set-admin-role.sql
│   ├── force-fix-document-templates-rls.sql
│   ├── lawyers-rls.sql
│   ├── notification-settings.sql
│   ├── rating-system.sql
│   ├── rewards-system.sql
│   ├── schema-leads.sql
│   ├── set-admin-role.sql
│   ├── setup-cases-cron.sql
│   ├── site-ads-settings.sql
│   ├── site-settings.sql
│   ├── telegram-bot.sql
│   ├── ULTIMATE-DOC-TEMPLATES-RLS-FIX.sql
│   ├── ULTIMATE-RLS-FIX.sql
│   ├── update-citizenship-template-url.sql
│   └── yookassa-payments.sql
```

## public/
```
public/
├── 404.html
├── favicon.ico / favicon-16x16.png / favicon-32x32.png
├── android-chrome-192x192.png
├── android-chrome-512x512.png
├── apple-touch-icon.png
├── pravo-docs.json / pravo-docs-minimal.json
├── robots.txt
└── site.webmanifest
```

## scripts/
```
scripts/
├── auto-refresh.js
└── incremental-pravo-sync.cjs
```

## plans/
```
plans/
├── admin-settings-expansion.md
└── lawyer-management-system.md
```

## dist/ (build output)
```
dist/
├── 404.html
├── assets/                       # JS/CSS assets (Vite output)
├── favicon.ico / favicon-16x16.png / favicon-32x32.png
├── android-chrome-192x192.png / android-chrome-512x512.png
├── apple-touch-icon.png
├── index.html
├── manifest.webmanifest
├── pravo-docs-minimal.json / pravo-docs.json
├── robots.txt
├── registerSW.js                 # Service worker
├── sitemap.xml
├── site.webmanifest
└── sw.js                         # Service worker
```

## Key Technologies
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Styling**: TailwindCSS
- **Routing**: React Router
- **Deployment**: Vercel/Ren

## Key Database Tables (via migrations)
- `users` / `profiles` - User accounts & profiles
- `lawyers` - Public lawyer directory
- `lawyer_applications` - Lawyer application form submissions
- `cases` - Legal case data
- `cases_comments` - Case comments
- `blog_posts` - Blog content
- `blog_comments` - Blog comments
- `chats` - Chat records
- `document_templates` - Document templates
- `courts` - Court data
- `leads` - Lawyer leads
- `settings` - Site settings
- `notifications` - User notifications

## Key Edge Functions
- `ai-lawyer` - AI-powered legal chat
- `auto-refresh-cases` - Periodic case data refresh
- `check-self-employed` - Self-employed status check
- `generate-sitemap` - Dynamic sitemap generation
- `parse-case` - Parse HTML case data
- `pravo-sync` / `pravo-incremental-sync` / `pravo-proxy` - Legal acts data sync
- `telegram-webhook` - Telegram notifications
- `yookassa` - Payment processing (YooMoney)
- `send-report-email` - Email reports
- `google-photos` - Google Photos integration
- `check-self-employed` - Self-employed verification
