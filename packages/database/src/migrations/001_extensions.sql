-- ============================================================
-- Migration 001: Enable required PostgreSQL extensions
-- Run this first in your Supabase SQL editor
-- ============================================================

-- PostGIS: spatial data types and functions
CREATE EXTENSION IF NOT EXISTS postgis;

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm: fuzzy text search (for farm name search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent: handle Thai/Latin character search
CREATE EXTENSION IF NOT EXISTS unaccent;
