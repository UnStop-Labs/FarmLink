"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useFarmStore } from "../../store/farm.store";
import type { CachedFarm } from "../../lib/db/schema";

// ============================================================
// FarmMap — MapLibre GL JS interactive map
//
// Renders:
//   - Satellite/street basemap
//   - Farm boundary polygons (color-coded by NDVI health)
//   - Scouting observation pins
//   - NDVI overlay layer
//   - User GPS position
//   - Polygon drawing mode for boundary setup
// ============================================================

interface FarmMapProps {
  farms: CachedFarm[];
  onFarmClick?: (farmId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  drawingMode?: boolean;
  onBoundaryComplete?: (polygon: [number, number][]) => void;
  ndviOverlayUrl?: string;
  scoutingPins?: Array<{ lat: number; lng: number; type: string; id: string }>;
}

export default function FarmMap({
  farms,
  onFarmClick,
  onMapClick,
  drawingMode = false,
  onBoundaryComplete,
  ndviOverlayUrl,
  scoutingPins = [],
}: FarmMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const { mapCenter, mapZoom, setMapView } = useFarmStore();

  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let map: unknown;

    const initMap = async () => {
      // Dynamic import — MapLibre is client-side only
      const maplibre = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");

      const mapStyle = process.env.NEXT_PUBLIC_MAP_STYLE
        ?? "https://demotiles.maplibre.org/style.json";

      map = new maplibre.Map({
        container: mapContainerRef.current!,
        style: mapStyle,
        center: mapCenter,
        zoom: mapZoom,
        attributionControl: true,
      });

      mapRef.current = map;

      const m = map as { on: (...args: unknown[]) => void; addSource: (...args: unknown[]) => void; addLayer: (...args: unknown[]) => void; getSource: (id: string) => unknown; setData?: (...args: unknown[]) => void; flyTo: (...args: unknown[]) => void; remove: () => void };

      m.on("load", () => {
        setMapLoaded(true);
        addFarmLayers(m);
        addScoutingLayer(m);
        if (ndviOverlayUrl) addNdviOverlay(m, ndviOverlayUrl);
      });

      m.on("click", (e: { lngLat: { lng: number; lat: number } }) => {
        if (drawingMode) {
          handleDrawClick(e.lngLat.lng, e.lngLat.lat);
        } else {
          onMapClick?.(e.lngLat.lat, e.lngLat.lng);
        }
      });

      m.on("moveend", () => {
        const center = (m as unknown as { getCenter: () => { lng: number; lat: number }; getZoom: () => number }).getCenter();
        const zoom = (m as unknown as { getZoom: () => number }).getZoom();
        setMapView([center.lng, center.lat], zoom);
      });
    };

    initMap();

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update farms layer when farms change
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    updateFarmsData(mapRef.current, farms);
  }, [farms, mapLoaded]);

  // Update scouting pins
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    updateScoutingData(mapRef.current, scoutingPins);
  }, [scoutingPins, mapLoaded]);

  function addFarmLayers(map: unknown) {
    const m = map as { addSource: (id: string, config: unknown) => void; addLayer: (config: unknown) => void };

    // GeoJSON source for farm polygons
    m.addSource("farms", {
      type: "geojson",
      data: farmsToGeoJSON(farms),
    });

    // Fill layer — color based on NDVI health
    m.addLayer({
      id: "farm-fills",
      type: "fill",
      source: "farms",
      paint: {
        "fill-color": [
          "interpolate", ["linear"],
          ["coalesce", ["get", "ndvi"], 0],
          0, "#C62828",    // 0 = red (stressed)
          0.2, "#F9A825",  // 0.2 = amber
          0.4, "#2D7A35",  // 0.4 = green (healthy)
          0.7, "#1B5E20",  // 0.7+ = deep green
        ],
        "fill-opacity": 0.35,
      },
    });

    // Outline layer
    m.addLayer({
      id: "farm-outlines",
      type: "line",
      source: "farms",
      paint: {
        "line-color": "#2D7A35",
        "line-width": 2,
      },
    });

    // Label layer
    m.addLayer({
      id: "farm-labels",
      type: "symbol",
      source: "farms",
      layout: {
        "text-field": ["get", "name"],
        "text-size": 12,
        "text-anchor": "center",
      },
      paint: {
        "text-color": "#1a1a1a",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
  }

  function addScoutingLayer(map: unknown) {
    const m = map as { addSource: (id: string, config: unknown) => void; addLayer: (config: unknown) => void };

    m.addSource("scouting-pins", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    m.addLayer({
      id: "scouting-circles",
      type: "circle",
      source: "scouting-pins",
      paint: {
        "circle-radius": 8,
        "circle-color": [
          "match", ["get", "type"],
          "disease", "#EF4444",
          "pest", "#F97316",
          "irrigation", "#3B82F6",
          "nutrient_deficiency", "#A855F7",
          "#6B7280", // default gray
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
  }

  function addNdviOverlay(map: unknown, imageUrl: string) {
    // TODO: Add NDVI raster overlay as image source
    // Requires known bounding box of the farm
  }

  function updateFarmsData(map: unknown, farmsData: CachedFarm[]) {
    const source = (map as { getSource: (id: string) => unknown }).getSource("farms");
    if (source) {
      (source as { setData: (data: unknown) => void }).setData(farmsToGeoJSON(farmsData));
    }
  }

  function updateScoutingData(map: unknown, pins: typeof scoutingPins) {
    const source = (map as { getSource: (id: string) => unknown }).getSource("scouting-pins");
    if (source) {
      (source as { setData: (data: unknown) => void }).setData({
        type: "FeatureCollection",
        features: pins.map((pin) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
          properties: { type: pin.type, id: pin.id },
        })),
      });
    }
  }

  function handleDrawClick(lng: number, lat: number) {
    const newPoints: [number, number][] = [...drawnPoints, [lng, lat]];
    setDrawnPoints(newPoints);

    // Draw the polygon on the map
    if (mapRef.current && newPoints.length >= 3) {
      const source = (mapRef.current as { getSource: (id: string) => unknown }).getSource("drawing");
      if (source) {
        const ring = [...newPoints, newPoints[0]]; // close the ring
        (source as { setData: (data: unknown) => void }).setData({
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [ring] },
            properties: {},
          }],
        });
      }
    }
  }

  const completeDrawing = useCallback(() => {
    if (drawnPoints.length >= 3) {
      onBoundaryComplete?.(drawnPoints);
      setDrawnPoints([]);
    }
  }, [drawnPoints, onBoundaryComplete]);

  const clearDrawing = useCallback(() => {
    setDrawnPoints([]);
  }, []);

  // Fly to user GPS position
  const flyToUser = useCallback(async () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setUserPosition([lng, lat]);
      (mapRef.current as { flyTo: (opts: unknown) => void }).flyTo({
        center: [lng, lat],
        zoom: 16,
        speed: 1.5,
      });
    });
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* GPS button */}
      <button
        onClick={flyToUser}
        className="absolute bottom-24 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-xl z-10"
        aria-label="ไปที่ตำแหน่งปัจจุบัน"
      >
        📍
      </button>

      {/* Drawing mode controls */}
      {drawingMode && (
        <div className="absolute bottom-24 left-4 bg-white rounded-xl shadow-lg p-3 z-10">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            📐 วาดขอบเขตไร่
          </p>
          <p className="text-xs text-gray-500 mb-3">
            แตะแผนที่เพื่อเพิ่มจุด ({drawnPoints.length} จุด)
          </p>
          <div className="flex gap-2">
            <button
              onClick={completeDrawing}
              disabled={drawnPoints.length < 3}
              className="flex-1 bg-green-600 text-white text-sm py-2 rounded-lg disabled:opacity-40"
            >
              ✅ บันทึก
            </button>
            <button
              onClick={clearDrawing}
              className="flex-1 bg-gray-100 text-gray-700 text-sm py-2 rounded-lg"
            >
              ↩️ ล้าง
            </button>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      <OfflineBadge />
    </div>
  );
}

function OfflineBadge() {
  const { isOnline } = useFarmStore();
  if (isOnline) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full z-10">
      📴 ออฟไลน์ — ข้อมูลจะซิงค์เมื่อมีอินเทอร์เน็ต
    </div>
  );
}

function farmsToGeoJSON(farms: CachedFarm[]) {
  return {
    type: "FeatureCollection",
    features: farms
      .filter((f) => f.polygon)
      .map((f) => ({
        type: "Feature",
        geometry: f.polygon,
        properties: {
          id: f.id,
          name: f.name,
          crop_type: f.crop_type,
        },
      })),
  };
}
