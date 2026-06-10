---

## Internal Development Notes

*Record your notes here for this session.*

### Yandex Maps API Removal - COMPLETED

All Yandex Maps API support has been removed:

- Removed `/api/yandex/search` and `/api/yandex/suggest` proxy routes from server/server.js
- Removed `yandexMaps` export from src/lib/supabase.ts
- Removed `yandex_rating` field from src/types.ts and src/lib/supabase.ts interfaces
- Removed `yandex_rating` column from database migrations
- Removed Yandex Maps API calls and UI from src/pages/Lawyers.tsx
- Removed Yandex Maps links from src/components/CaseCard.tsx
- Removed Yandex domains from trusted script hosts in src/components/AdBanner.tsx
- Removed Yandex proxy block from server/nginx_extra.txt

### State Management Changes

The following state variables related to Yandex Maps have been removed from Lawyers.tsx:
- `yandexRatingLoading`, `fetchYandexRating` function
- Simplified `handleShowExtraData` to not fetch Yandex data