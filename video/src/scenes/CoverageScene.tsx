import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Scene, COLORS } from "../config";
import { AnimatedText } from "../components/AnimatedText";

interface SceneProps {
  scene: Scene;
}

const regions = [
  { name: "Brisbane", status: "BETA", active: true, delay: 20 },
  { name: "Logan", status: "BETA", active: true, delay: 35 },
  { name: "Ipswich", status: "SOON", active: false, delay: 50 },
];

export const CoverageScene: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();

  // Australia map animation
  const mapOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const qldHighlight = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 80,
      }}
    >
      {/* Left side - Map of Australia */}
      <div
        style={{
          width: 600,
          height: 600,
          position: "relative",
          opacity: mapOpacity,
        }}
      >
        {/* Simplified Australia outline */}
        <svg width="600" height="600" viewBox="0 0 600 600">
          {/* Australia outline (simplified) */}
          <path
            d="M150,150 L250,100 L400,120 L500,180 L520,280 L480,400 L400,480 L300,500 L200,450 L120,350 L100,250 Z"
            fill="none"
            stroke={COLORS.border}
            strokeWidth="2"
          />

          {/* QLD region highlighted */}
          <path
            d="M350,120 L450,150 L480,250 L450,350 L380,380 L320,350 L310,250 L330,180 Z"
            fill={COLORS.primary}
            fillOpacity={qldHighlight * 0.3}
            stroke={COLORS.primary}
            strokeWidth={qldHighlight * 3}
          />

          {/* NSW region (coming soon) */}
          <path
            d="M320,350 L380,380 L400,450 L350,480 L280,450 L270,380 Z"
            fill="transparent"
            stroke={COLORS.textMuted}
            strokeWidth="2"
            strokeDasharray="8,4"
            opacity={interpolate(frame, [60, 75], [0, 0.5], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />

          {/* QLD label */}
          <text
            x="380"
            y="260"
            fill={COLORS.primary}
            fontSize="24"
            fontWeight="bold"
            opacity={qldHighlight}
          >
            QLD
          </text>

          {/* NSW label */}
          <text
            x="320"
            y="420"
            fill={COLORS.textMuted}
            fontSize="18"
            opacity={interpolate(frame, [60, 75], [0, 0.6], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            NSW
          </text>

          {/* Pulsing dot on Brisbane */}
          <circle
            cx="420"
            cy="320"
            r={8 + Math.sin(frame * 0.2) * 3}
            fill={COLORS.primary}
            opacity={qldHighlight}
          />
        </svg>
      </div>

      {/* Right side - Coverage details */}
      <div style={{ width: 450 }}>
        <AnimatedText delay={5} fontSize={48} fontWeight={700}>
          Coverage
        </AnimatedText>

        <div style={{ marginTop: 16, marginBottom: 40 }}>
          <AnimatedText delay={10} fontSize={20} color={COLORS.textMuted}>
            State-wide hazard and planning data
          </AnimatedText>
        </div>

        {/* Queensland section */}
        <div
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            border: `1px solid ${COLORS.border}`,
            padding: 24,
            marginBottom: 20,
            opacity: interpolate(frame, [15, 25], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 24 }}>🗺️</span>
            <span style={{ fontSize: 22, fontWeight: 600, color: COLORS.text }}>
              Queensland
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {regions.map((region) => {
              const regionOpacity = interpolate(
                frame,
                [region.delay, region.delay + 10],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );

              return (
                <div
                  key={region.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    borderRadius: 20,
                    backgroundColor: region.active ? `${COLORS.primary}20` : "#27272a",
                    border: `1px solid ${region.active ? `${COLORS.primary}40` : COLORS.border}`,
                    opacity: regionOpacity,
                  }}
                >
                  <span
                    style={{
                      color: region.active ? COLORS.primary : COLORS.textMuted,
                      fontSize: 15,
                    }}
                  >
                    {region.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 4,
                      backgroundColor: region.active ? `${COLORS.primary}30` : "#3f3f46",
                      color: region.active ? COLORS.primary : COLORS.textMuted,
                      fontWeight: 600,
                    }}
                  >
                    {region.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* NSW Coming Soon */}
        <div
          style={{
            backgroundColor: `${COLORS.surface}80`,
            borderRadius: 16,
            border: `1px solid ${COLORS.border}`,
            padding: 20,
            opacity: interpolate(frame, [55, 70], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20, opacity: 0.6 }}>🗺️</span>
              <span style={{ fontSize: 18, color: COLORS.textMuted }}>New South Wales</span>
            </div>
            <span
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 6,
                backgroundColor: "#27272a",
                color: COLORS.textMuted,
              }}
            >
              COMING SOON
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
