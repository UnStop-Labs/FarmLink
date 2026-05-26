-- ============================================================
-- Migration 003: Utility Functions & Triggers
-- ============================================================

-- --------------------------------------------------------
-- Auto-update updated_at timestamps
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_farms_updated_at
  BEFORE UPDATE ON public.farms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_sessions_updated_at
  BEFORE UPDATE ON public.bot_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------
-- Auto-calculate farm area from polygon
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_farm_area()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.polygon IS NOT NULL THEN
    -- ST_Area on geography type gives area in square meters
    NEW.area_sqm := ST_Area(NEW.polygon::geography);
    -- 1 rai = 1600 m²
    NEW.area_rai := NEW.area_sqm / 1600.0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calc_farm_area
  BEFORE INSERT OR UPDATE OF polygon ON public.farms
  FOR EACH ROW EXECUTE FUNCTION calculate_farm_area();

-- --------------------------------------------------------
-- Get farms within a bounding box (for map viewport queries)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION get_farms_in_bbox(
  min_lng FLOAT,
  min_lat FLOAT,
  max_lng FLOAT,
  max_lat FLOAT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  crop_type TEXT,
  polygon GEOMETRY,
  ndvi_mean NUMERIC,
  area_rai NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    f.crop_type,
    f.polygon,
    ss.ndvi_mean,
    f.area_rai
  FROM public.farms f
  LEFT JOIN LATERAL (
    SELECT ndvi_mean
    FROM public.satellite_snapshots
    WHERE farm_id = f.id
    ORDER BY captured_at DESC
    LIMIT 1
  ) ss ON TRUE
  WHERE f.is_active = TRUE
  AND ST_Intersects(
    f.polygon,
    ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------
-- Get farm health summary (used by LINE bot)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION get_farm_health_summary(p_farm_id UUID)
RETURNS TABLE (
  farm_name TEXT,
  crop_type TEXT,
  area_rai NUMERIC,
  latest_ndvi NUMERIC,
  ndvi_trend TEXT,
  active_anomalies BIGINT,
  last_observation_at TIMESTAMPTZ,
  last_snapshot_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.name AS farm_name,
    f.crop_type,
    f.area_rai,
    ss.ndvi_mean AS latest_ndvi,
    ss.ndvi_trend,
    (
      SELECT COUNT(*) FROM public.anomaly_alerts
      WHERE farm_id = p_farm_id
      AND farmer_confirmed IS NULL
      AND created_at > NOW() - INTERVAL '7 days'
    ) AS active_anomalies,
    (
      SELECT MAX(observed_at) FROM public.field_observations
      WHERE farm_id = p_farm_id
    ) AS last_observation_at,
    ss.captured_at AS last_snapshot_at
  FROM public.farms f
  LEFT JOIN LATERAL (
    SELECT ndvi_mean, ndvi_trend, captured_at
    FROM public.satellite_snapshots
    WHERE farm_id = f.id
    ORDER BY captured_at DESC
    LIMIT 1
  ) ss ON TRUE
  WHERE f.id = p_farm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------
-- Expire old bot sessions
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION expire_bot_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.bot_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
