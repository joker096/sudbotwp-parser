-- Migration: Fix RLS for lawyer_applications table ONLY (lawyers policies skipped)
-- Fixes 406 error for /apply-lawyer incognito
-- Date: 2024-12-01

-- 1. Ensure lawyer_applications table exists
CREATE TABLE
