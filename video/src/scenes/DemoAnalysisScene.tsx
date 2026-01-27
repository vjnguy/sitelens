import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Scene, COLORS, FPS, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "../config";
import { AppUI } from "../components/AppUI";

interface SceneProps {
  scene: Scene;
}

export const DemoAnalysisScene: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();

  // Property data for West End - real Brisbane Council constraints
  const propertyData = {
    address: "42 Vulture Street, West End",
    lotPlan: "Lot 1 on BSP131324",
    constraints: [
      {
        type: "Overland Flow Flood",
        severity: "medium" as const,
        description: "Within overland flow path - flood assessment required",
      },
      {
        type: "Creek/Waterway Flood",
        severity: "medium" as const,
        description: "Adjacent to flood planning area",
      },
      {
        type: "Traditional Character",
        severity: "low" as const,
        description: "Traditional Building Character Overlay - demolition controls apply",
      },
    ],
    zoning: "Mixed Use - West End",
    maxHeight: "15m (4-5 storeys)",
  };

  // Animate constraints appearing one by one
  const constraintTimings = [20, 50, 80];

  // Build animated property data
  const animatedPropertyData = {
    ...propertyData,
    constraints: propertyData.constraints.filter(
      (_, i) => frame >= constraintTimings[i]
    ),
    zoning: frame >= 100 ? propertyData.zoning : undefined,
    maxHeight: frame >= 115 ? propertyData.maxHeight : undefined,
  };

  // Scale and opacity animation for entry
  const scale = interpolate(frame, [0, 15], [1.02, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          width: "100%",
          height: "100%",
        }}
      >
        <AppUI
          searchQuery="42 Vulture Street, West End"
          typingProgress={1}
          highlightedParcel={true}
          showLayersPanel={false}
          showPropertyPanel={true}
          propertyData={animatedPropertyData}
          activeOverlays={["flood", "creekflood", "heritage"]}
          mapCenter={DEFAULT_MAP_CENTER}
          mapZoom={DEFAULT_MAP_ZOOM}
          mapStyle="satellite"
        />
      </div>

      {/* Scene label */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "12px 24px",
          borderRadius: 12,
          backgroundColor: `${COLORS.background}ee`,
          border: `1px solid ${COLORS.primary}40`,
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 600, color: COLORS.primary }}>
          AI-powered property analysis
        </span>
      </div>

      {/* AI Analysis indicator */}
      {frame > 10 && (
        <div
          style={{
            position: "absolute",
            bottom: 120,
            right: 100,
            padding: "12px 20px",
            borderRadius: 12,
            background: `linear-gradient(135deg, #a855f720, #ec489920)`,
            border: `1px solid #a855f750`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: interpolate(frame, [10, 25], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: `linear-gradient(135deg, #a855f7, #ec4899)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            ✨
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>
              Analyzing constraints...
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>
              AI scanning 40+ data sources
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {frame > 15 && frame < 130 && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            right: 100,
            width: 200,
            height: 4,
            borderRadius: 2,
            backgroundColor: `${COLORS.primary}30`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${interpolate(frame, [15, 130], [0, 100], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}%`,
              height: "100%",
              borderRadius: 2,
              background: `linear-gradient(90deg, ${COLORS.primary}, #a855f7)`,
            }}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};
