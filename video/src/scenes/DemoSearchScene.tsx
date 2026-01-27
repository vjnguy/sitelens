import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Scene, COLORS, FPS, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "../config";
import { AppUI } from "../components/AppUI";

interface SceneProps {
  scene: Scene;
}

export const DemoSearchScene: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();

  // Typing animation - types the search query
  // Using a real Brisbane address in West End (flood-affected demo area)
  const searchQuery = "42 Vulture Street, West End";
  const typingStart = 20;
  const typingEnd = 80;
  const typingProgress = interpolate(
    frame,
    [typingStart, typingEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Show parcel highlight after typing completes
  const showParcel = frame > typingEnd + 20;

  // Scale animation for the whole UI
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
          searchQuery={searchQuery}
          typingProgress={typingProgress}
          highlightedParcel={showParcel}
          showLayersPanel={false}
          showPropertyPanel={false}
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
          Search any property instantly
        </span>
      </div>
    </AbsoluteFill>
  );
};
