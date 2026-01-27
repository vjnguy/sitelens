import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Scene, COLORS } from "../config";
import { Logo } from "../components/Logo";
import { GradientText, AnimatedText } from "../components/AnimatedText";

interface SceneProps {
  scene: Scene;
}

export const CTAScene: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();

  // Pulsing glow
  const glowScale = 1 + Math.sin(frame * 0.1) * 0.1;
  const glowOpacity = 0.3 + Math.sin(frame * 0.1) * 0.1;

  // Button animation
  const buttonOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const buttonScale = interpolate(frame, [30, 50], [0.9, 1], {
    extrapolateLeft: "clamp",
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
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}30 0%, transparent 60%)`,
          opacity: glowOpacity,
          transform: `scale(${glowScale})`,
          filter: "blur(100px)",
        }}
      />

      {/* Logo */}
      <Logo size={100} animate />

      {/* Main text */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <AnimatedText delay={10} fontSize={64} fontWeight={700}>
          Try Siteora
        </AnimatedText>
        <GradientText delay={20} fontSize={72} fontWeight={700}>
          free today
        </GradientText>
      </div>

      {/* Subtext */}
      <AnimatedText delay={35} fontSize={28} color={COLORS.textMuted}>
        No signup required
      </AnimatedText>

      {/* CTA Button */}
      <div
        style={{
          marginTop: 20,
          opacity: buttonOpacity,
          transform: `scale(${buttonScale})`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 48px",
            borderRadius: 16,
            background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)`,
            boxShadow: `0 20px 40px -10px ${COLORS.primary}60`,
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 600, color: "white" }}>
            Launch App
          </span>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Website URL */}
      <AnimatedText delay={50} fontSize={22} color={COLORS.textMuted}>
        siteora.com
      </AnimatedText>
    </AbsoluteFill>
  );
};
