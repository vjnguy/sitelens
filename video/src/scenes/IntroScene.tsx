import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Scene, COLORS } from "../config";
import { Logo } from "../components/Logo";
import { GradientText } from "../components/AnimatedText";

interface SceneProps {
  scene: Scene;
}

export const IntroScene: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();

  // Glow animation
  const glowOpacity = interpolate(frame, [0, 30, 60], [0, 0.3, 0.5], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}40 0%, transparent 70%)`,
          opacity: glowOpacity,
          filter: "blur(80px)",
        }}
      />

      {/* Logo */}
      <Logo size={120} animate />

      {/* Tagline */}
      <GradientText delay={20} fontSize={56} fontWeight={500}>
        Property intelligence in seconds
      </GradientText>
    </AbsoluteFill>
  );
};
