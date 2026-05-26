-- ============================================================
-- Migration 002: Core FarmLink Schema
-- ============================================================

-- --------------------------------------------------------
-- Profiles table (extends Supabase auth.users)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  picture_url TEXT,
  language TEXT DEFAULT 'th',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: users can only see their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
-- Service role can insert (for bot-driven registration)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (TRUE);

-- --------------------------------------------------------
-- Farms table — core farm entity with PostGIS polygon
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  line_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  crop_type TEXT NOT NULL DEFAULT 'rice',
  province TEXT,
  -- PostGIS geometry: SRID 4326 = WGS84 (standard lat/lng)
  polygon GEOMETRY(Polygon, 4326),
  area_rai NUMERIC(10, 2),
  area_sqm NUMERIC(12, 2),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for fast geographic queries
CREATE INDEX IF NOT EXISTS farms_polygon_idx
  ON public.farms USING GIST (polygon);

-- Index for LINE user lookups (most common query path)
CREATE INDEX IF NOT EXISTS farms_line_user_id_idx
  ON public.farms (line_user_id);

-- RLS
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can CRUD their farms"
  ON public.farms FOR ALL
  USING (auth.uid() = owner_id);
CREATE POLICY "Service role full access"
  ON public.farms FOR ALL
  USING (TRUE);

-- --------------------------------------------------------
-- Field observations — offline-first scouting data
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.field_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  line_user_id TEXT NOT NULL,
  -- GPS point of observation
  location GEOMETRY(Point, 4326) NOT NULL,
  observation_type TEXT NOT NULL,
  severity TEXT,
  description TEXT,
  image_urls TEXT[] DEFAULT '{}',
  voice_note_url TEXT,
  labels TEXT[] DEFAULT '{}',
  ai_verified BOOLEAN DEFAULT FALSE,
  farmer_verified BOOLEAN DEFAULT FALSE,
  -- Client-side timestamp (preserves offline timestamps)
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS observations_farm_id_idx
  ON public.field_observations (farm_id);
CREATE INDEX IF NOT EXISTS observations_location_idx
  ON public.field_observations USING GIST (location);
CREATE INDEX IF NOT EXISTS observations_type_idx
  ON public.field_observations (observation_type);

ALTER TABLE public.field_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm owners can access observations"
  ON public.field_observations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.farms
      WHERE farms.id = field_observations.farm_id
      AND farms.owner_id = auth.uid()
    )
  );
CREATE POLICY "Service role full access to observations"
  ON public.field_observations FOR ALL
  USING (TRUE);

-- --------------------------------------------------------
-- Satellite snapshots
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.satellite_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'sentinel-2',
  captured_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  cloud_cover_percent NUMERIC(5, 2) DEFAULT 0,

  -- NDVI metrics
  ndvi_mean NUMERIC(6, 4),
  ndvi_min NUMERIC(6, 4),
  ndvi_max NUMERIC(6, 4),
  ndvi_trend TEXT DEFAULT 'unknown',

  -- Stress indices (0-1)
  water_stress_index NUMERIC(6, 4),
  chlorophyll_index NUMERIC(6, 4),

  -- Image assets (S3 URLs)
  true_color_url TEXT,
  ndvi_overlay_url TEXT,
  false_color_url TEXT,
  raw_data_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS snapshots_farm_id_idx
  ON public.satellite_snapshots (farm_id);
CREATE INDEX IF NOT EXISTS snapshots_captured_at_idx
  ON public.satellite_snapshots (captured_at DESC);

ALTER TABLE public.satellite_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm owners can view snapshots"
  ON public.satellite_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.farms
      WHERE farms.id = satellite_snapshots.farm_id
      AND farms.owner_id = auth.uid()
    )
  );
CREATE POLICY "Service role full access to snapshots"
  ON public.satellite_snapshots FOR ALL
  USING (TRUE);

-- --------------------------------------------------------
-- Anomaly alerts
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anomaly_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID REFERENCES public.satellite_snapshots(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'watch',
  confidence NUMERIC(4, 3),
  affected_area_sqm NUMERIC(12, 2),
  -- Affected polygon/point within the farm
  location GEOMETRY(Geometry, 4326),
  description TEXT NOT NULL,
  recommendation TEXT,
  notified_at TIMESTAMPTZ,
  farmer_confirmed BOOLEAN,
  farmer_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS anomalies_farm_id_idx
  ON public.anomaly_alerts (farm_id);
CREATE INDEX IF NOT EXISTS anomalies_severity_idx
  ON public.anomaly_alerts (severity, created_at DESC);

ALTER TABLE public.anomaly_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm owners can view their anomalies"
  ON public.anomaly_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.farms
      WHERE farms.id = anomaly_alerts.farm_id
      AND farms.owner_id = auth.uid()
    )
  );
CREATE POLICY "Service role full access to anomalies"
  ON public.anomaly_alerts FOR ALL
  USING (TRUE);

-- --------------------------------------------------------
-- Harvest logs
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.harvest_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  harvest_date DATE NOT NULL,
  crop_type TEXT,
  estimated_yield_kg NUMERIC(10, 2),
  actual_yield_kg NUMERIC(10, 2),
  quality_notes TEXT,
  price_per_kg NUMERIC(8, 2),
  total_revenue NUMERIC(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS harvest_logs_farm_id_idx
  ON public.harvest_logs (farm_id);
CREATE INDEX IF NOT EXISTS harvest_logs_date_idx
  ON public.harvest_logs (harvest_date DESC);

ALTER TABLE public.harvest_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm owners can CRUD harvest logs"
  ON public.harvest_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.farms
      WHERE farms.id = harvest_logs.farm_id
      AND farms.owner_id = auth.uid()
    )
  );
CREATE POLICY "Service role full access to harvests"
  ON public.harvest_logs FOR ALL
  USING (TRUE);

-- --------------------------------------------------------
-- Bot session state (for LINE conversation flows)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_user_id TEXT UNIQUE NOT NULL,
  flow TEXT,           -- current flow: 'onboarding', 'survey', etc.
  step TEXT,           -- current step within the flow
  data JSONB DEFAULT '{}',  -- accumulated form data
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_line_user_id_idx
  ON public.bot_sessions (line_user_id);

-- Sessions accessible only by service role (bot backend)
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only"
  ON public.bot_sessions FOR ALL
  USING (TRUE);
