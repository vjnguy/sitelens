/**
 * Accurate representation of the Siteora app UI based on actual code
 * This matches the real app/page.tsx layout
 *
 * Updated to use real Brisbane cadastral and flood data
 */

import { useCallback, useEffect, useState } from "react";
import { interpolate, useCurrentFrame, delayRender, continueRender, Img } from "remotion";
import { COLORS, MAPBOX_TOKEN, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "../config";

// Real property boundary polygon - West End, Brisbane
// Fetched from Brisbane Council ArcGIS property_boundaries_parcel service
// This is a real lot in the flood-affected West End area
export const SAMPLE_PROPERTY_BOUNDARY: [number, number][] = [
  [153.010224, -27.482626],
  [153.010327, -27.482089],
  [153.010413, -27.481640],
  [153.010499, -27.481192],
  [153.010600, -27.481207],
  [153.010497, -27.481745],
  [153.010411, -27.482193],
  [153.010224, -27.482626],
];

// Brisbane Overland Flow Flood Overlay - Real data from Brisbane Council
// Fetched from Flood_overlay_Overland_flow FeatureServer
// Covers the West End / South Brisbane area
export const FLOOD_ZONE_POLYGON: [number, number][] = [
  [153.015334, -27.473398],
  [153.014961, -27.480346],
  [153.014525, -27.483558],
  [153.014566, -27.484820],
  [153.011773, -27.486301],
  [153.007826, -27.487101],
  [153.011482, -27.480206],
  [153.015334, -27.473398],
];

// Secondary flood overlay - smaller section for visual variety
export const CREEK_FLOOD_POLYGON: [number, number][] = [
  [153.009500, -27.481000],
  [153.011000, -27.480500],
  [153.011500, -27.482000],
  [153.010500, -27.483500],
  [153.009000, -27.483000],
  [153.009500, -27.481000],
];

// Traditional Building Character Overlay - Real heritage data from Brisbane Council
// Fetched from Traditional_building_character_overlay FeatureServer
export const HERITAGE_OVERLAY_POLYGON: [number, number][] = [
  [153.010241, -27.482537],
  [153.009726, -27.482368],
  [153.009827, -27.481830],
  [153.009928, -27.481292],
  [153.010203, -27.481056],
  [153.010482, -27.481282],
  [153.010396, -27.481730],
  [153.010241, -27.482537],
];

interface GeoJSONOverlay {
  type: "property" | "flood" | "bushfire" | "heritage" | "creekflood";
  coordinates: [number, number][];
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
}

interface AppUIProps {
  showLayersPanel?: boolean;
  showPropertyPanel?: boolean;
  showMeasurement?: boolean;
  searchQuery?: string;
  typingProgress?: number; // 0-1 for typing animation
  activeOverlays?: string[];
  propertyData?: {
    address: string;
    lotPlan: string;
    constraints: Array<{
      type: string;
      severity: "high" | "medium" | "low";
      description: string;
    }>;
    zoning?: string;
    maxHeight?: string;
  };
  mapCenter?: [number, number];
  mapZoom?: number;
  highlightedParcel?: boolean;
  children?: React.ReactNode;
  // Mapbox settings
  mapboxToken?: string;
  mapStyle?: "satellite" | "dark" | "streets";
  useRealMap?: boolean;
  // GeoJSON overlays for real boundaries
  geoJsonOverlays?: GeoJSONOverlay[];
}

// Left sidebar icon button
const IconButton: React.FC<{
  active?: boolean;
  icon: React.ReactNode;
  color?: string;
}> = ({ active, icon, color }) => (
  <div
    style={{
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: active ? (color || COLORS.primary) : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    }}
  >
    {icon}
  </div>
);

// SVG Icons matching lucide-react
const DatabaseIcon = ({ color = "white", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
);

const LayersIcon = ({ color = "white", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 12-8.58 3.9a2 2 0 0 1-1.66 0L3 12" />
    <path d="m22 17-8.58 3.9a2 2 0 0 1-1.66 0L3 17" />
  </svg>
);

const RulerIcon = ({ color = "white", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
    <path d="m14.5 12.5 2-2" />
    <path d="m11.5 9.5 2-2" />
    <path d="m8.5 6.5 2-2" />
    <path d="m17.5 15.5 2-2" />
  </svg>
);

const PencilIcon = ({ color = "white", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

const MousePointerIcon = ({ color = "white", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m4 4 7.07 17 2.51-7.39L21 11.07z" />
  </svg>
);

const SearchIcon = ({ color = "#71717a", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const MapPinIcon = ({ color = COLORS.primary, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="white" strokeWidth="1.5">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" fill="white" />
  </svg>
);

// Build Mapbox Static URL - plain satellite, no polygon overlays
const buildMapUrl = (
  center: [number, number],
  zoom: number,
  style: string,
  token: string,
  _overlays?: GeoJSONOverlay[] // Not used - keeping for interface compatibility
): string => {
  const styleId = style === "satellite" ? "satellite-streets-v12" :
                  style === "dark" ? "dark-v11" : "streets-v12";

  // Just return plain satellite map without any overlays
  return `https://api.mapbox.com/styles/v1/mapbox/${styleId}/static/${center[0]},${center[1]},${zoom},0/1280x1024?access_token=${token}`;
};

export const AppUI: React.FC<AppUIProps> = ({
  showLayersPanel = false,
  showPropertyPanel = false,
  showMeasurement = false,
  searchQuery = "",
  typingProgress = 1,
  activeOverlays = [],
  propertyData,
  mapCenter = [153.028, -27.468],
  mapZoom = 16,
  highlightedParcel = false,
  children,
  mapboxToken,
  mapStyle = "satellite",
  useRealMap = true,
  geoJsonOverlays = [],
}) => {
  const frame = useCurrentFrame();

  // Animated typing
  const displayQuery = searchQuery.slice(0, Math.floor(searchQuery.length * typingProgress));
  const cursorBlink = Math.floor(frame / 15) % 2 === 0;

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: COLORS.background,
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* App Header */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          backgroundColor: `${COLORS.background}f0`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${COLORS.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 16,
          zIndex: 50,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>Siteora</span>
        </div>

        {/* Search Bar */}
        <div
          style={{
            flex: 1,
            maxWidth: 600,
            height: 40,
            backgroundColor: COLORS.surface,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: 10,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <SearchIcon />
          <span style={{ color: displayQuery ? COLORS.text : COLORS.textMuted, fontSize: 14, flex: 1 }}>
            {displayQuery || "Search address or Lot/Plan..."}
            {typingProgress < 1 && cursorBlink && (
              <span style={{ color: COLORS.primary }}>|</span>
            )}
          </span>
        </div>

        {/* Right side - Saved, User */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 14,
              color: COLORS.textMuted,
            }}
          >
            Saved
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: `${COLORS.primary}30`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Map Background */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#1a1a2e",
        }}
      >
        {/* Real Mapbox Static Map or fallback grid */}
        {useRealMap && (mapboxToken || MAPBOX_TOKEN) ? (
          <Img
            src={buildMapUrl(
              mapCenter,
              mapZoom,
              mapStyle,
              mapboxToken || MAPBOX_TOKEN,
              geoJsonOverlays
            )}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          /* Fallback grid pattern when no token */
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
            }}
          />
        )}

        {/* No polygon overlays - just plain satellite map */}
        {/* Map pin for highlighted parcel */}
        {highlightedParcel && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "45%",
              transform: "translate(-50%, -100%)",
            }}
          >
            <MapPinIcon size={40} />
          </div>
        )}

        {children}
      </div>

      {/* LEFT SIDEBAR */}
      <div
        style={{
          position: "absolute",
          top: 72,
          left: 16,
          display: "flex",
          gap: 8,
          zIndex: 30,
        }}
      >
        {/* Icon bar */}
        <div
          style={{
            backgroundColor: `${COLORS.background}f0`,
            backdropFilter: "blur(12px)",
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <IconButton
            active={showPropertyPanel}
            color="#3b82f6"
            icon={<DatabaseIcon color="white" />}
          />
          <IconButton
            active={showLayersPanel}
            icon={<LayersIcon color={showLayersPanel ? "white" : COLORS.textMuted} />}
          />
        </div>

        {/* Layers Panel */}
        {showLayersPanel && (
          <div
            style={{
              width: 320,
              height: 600,
              backgroundColor: `${COLORS.background}f8`,
              backdropFilter: "blur(12px)",
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 16px 12px",
                borderBottom: `1px solid ${COLORS.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.text }}>Data Layers</span>
              <span style={{ fontSize: 12, color: COLORS.textMuted }}>40+ layers</span>
            </div>

            <div style={{ padding: 12 }}>
              {/* Layer categories - Brisbane Council layers */}
              {[
                { name: "Flood Hazards", layers: ["Overland Flow", "Creek/Waterway Flood", "Brisbane River"] },
                { name: "Character", layers: ["Traditional Building", "Heritage Places", "Demolition Control"] },
                { name: "Planning", layers: ["Zoning", "Building Heights", "Setbacks"] },
              ].map((category, ci) => (
                <div key={category.name} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: COLORS.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    {category.name}
                  </div>
                  {category.layers.map((layer, li) => {
                    // Map layer names to overlay IDs
                    const layerIdMap: Record<string, string> = {
                      "Overland Flow": "flood",
                      "Creek/Waterway Flood": "creekflood",
                      "Traditional Building": "heritage",
                    };
                    const layerId = layerIdMap[layer] || layer.toLowerCase().replace(/[\s\/]/g, "");
                    const isActive = activeOverlays.includes(layerId);
                    return (
                      <div
                        key={layer}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          marginBottom: 4,
                          borderRadius: 8,
                          backgroundColor: isActive ? `${COLORS.primary}15` : "transparent",
                          border: `1px solid ${isActive ? `${COLORS.primary}30` : "transparent"}`,
                        }}
                      >
                        <span style={{ fontSize: 14, color: COLORS.text }}>{layer}</span>
                        <div
                          style={{
                            width: 36,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: isActive ? COLORS.primary : "#3f3f46",
                            padding: 2,
                          }}
                        >
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              backgroundColor: "white",
                              transform: `translateX(${isActive ? 16 : 0}px)`,
                              transition: "transform 0.2s",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Property Panel */}
        {showPropertyPanel && propertyData && (
          <div
            style={{
              width: 380,
              height: 700,
              backgroundColor: `${COLORS.background}f8`,
              backdropFilter: "blur(12px)",
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px",
                borderBottom: `1px solid ${COLORS.border}`,
                background: `linear-gradient(135deg, #3b82f620, transparent)`,
              }}
            >
              <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, marginBottom: 4 }}>
                PROPERTY INTELLIGENCE
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.text }}>
                {propertyData.address}
              </div>
              <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
                {propertyData.lotPlan}
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {/* Constraints */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.textMuted,
                    marginBottom: 12,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Site Constraints
                </div>
                {propertyData.constraints.map((constraint, i) => {
                  const colors = {
                    high: { bg: "#ef444420", border: "#ef444440", text: "#ef4444" },
                    medium: { bg: "#f59e0b20", border: "#f59e0b40", text: "#f59e0b" },
                    low: { bg: "#22c55e20", border: "#22c55e40", text: "#22c55e" },
                  };
                  const c = colors[constraint.severity];
                  return (
                    <div
                      key={i}
                      style={{
                        padding: 12,
                        marginBottom: 8,
                        borderRadius: 8,
                        backgroundColor: c.bg,
                        border: `1px solid ${c.border}`,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>
                        {constraint.type}
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                        {constraint.description}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Zoning info */}
              {propertyData.zoning && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: COLORS.surface,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>Zoning</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, marginTop: 4 }}>
                    {propertyData.zoning}
                  </div>
                </div>
              )}

              {propertyData.maxHeight && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: COLORS.surface,
                  }}
                >
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>Max Height</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, marginTop: 4 }}>
                    {propertyData.maxHeight}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      <div
        style={{
          position: "absolute",
          top: 72,
          right: 16,
          zIndex: 30,
        }}
      >
        <div
          style={{
            backgroundColor: `${COLORS.background}f0`,
            backdropFilter: "blur(12px)",
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <IconButton icon={<MousePointerIcon color={COLORS.textMuted} />} />
          <IconButton
            active={showMeasurement}
            icon={<RulerIcon color={showMeasurement ? "white" : COLORS.textMuted} />}
          />
          <IconButton icon={<PencilIcon color={COLORS.textMuted} />} />
        </div>
      </div>

      {/* BOTTOM TOOLBAR */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
        }}
      >
        <div
          style={{
            backgroundColor: `${COLORS.background}f0`,
            backdropFilter: "blur(12px)",
            borderRadius: 16,
            border: `1px solid ${COLORS.border}`,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 8,
              backgroundColor: COLORS.surface,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" fill={COLORS.textMuted} />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span style={{ fontSize: 12, color: COLORS.text }}>Satellite</span>
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: COLORS.border }} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>Tools</span>
          </div>
        </div>
      </div>

      {/* Coordinates */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 16,
          zIndex: 10,
        }}
      >
        <div
          style={{
            backgroundColor: `${COLORS.background}cc`,
            backdropFilter: "blur(8px)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 11,
            fontFamily: "monospace",
            color: COLORS.textMuted,
          }}
        >
          {mapCenter[1].toFixed(4)}, {mapCenter[0].toFixed(4)} | Z{mapZoom.toFixed(1)}
        </div>
      </div>

      {/* Zoom controls */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          zIndex: 10,
        }}
      >
        {["+", "−"].map((label) => (
          <div
            key={label}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: COLORS.text,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};
