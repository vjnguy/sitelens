import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Scene, COLORS, FPS, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "../config";
import { AppUI } from "../components/AppUI";

interface SceneProps {
  scene: Scene;
}

export const DemoLayersScene: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();

  // Timing for layer activations - controls when toggles animate in sidebar
  const layerTimings = {
    overlandFlood: 30,  // Overland flow flood overlay at frame 30
    creekFlood: 60,     // Secondary flood area at frame 60
    heritage: 90,       // Traditional Building Character at frame 90
  };

  // Build active overlays array based on frame (for sidebar toggle state only)
  const activeOverlays: string[] = [];
  if (frame >= layerTimings.overlandFlood) activeOverlays.push("flood");
  if (frame >= layerTimings.creekFlood) activeOverlays.push("creekflood");
  if (frame >= layerTimings.heritage) activeOverlays.push("heritage");

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
          showLayersPanel={true}
          showPropertyPanel={false}
          activeOverlays={activeOverlays}
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
          40+ government data layers at your fingertips
        </span>
      </div>

      {/* Layer activation indicators - Brisbane specific layers */}
      {Object.entries(layerTimings).map(([layer, startFrame], index) => {
        const layerOpacity = interpolate(
          frame,
          [startFrame, startFrame + 10],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        // Brisbane Council layer colors matching real overlay styles
        const colors: Record<string, string> = {
          overlandFlood: "#08306b", // Overland flow flood - dark blue
          creekFlood: "#2171b5",    // Creek/Waterway flood - medium blue
          heritage: "#7c3aed",      // Character overlay - purple
        };

        // Actual Brisbane layer names
        const labels: Record<string, string> = {
          overlandFlood: "Overland Flow Flood",
          creekFlood: "Creek/Waterway Flood",
          heritage: "Traditional Character",
        };

        if (frame < startFrame) return null;

        return (
          <div
            key={layer}
            style={{
              position: "absolute",
              bottom: 120 + index * 50,
              right: 100,
              padding: "10px 16px",
              borderRadius: 8,
              backgroundColor: `${colors[layer]}20`,
              border: `1px solid ${colors[layer]}60`,
              opacity: layerOpacity,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: colors[layer],
              }}
            />
            <span style={{ fontSize: 14, color: colors[layer], fontWeight: 600 }}>
              {labels[layer]} activated
            </span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
