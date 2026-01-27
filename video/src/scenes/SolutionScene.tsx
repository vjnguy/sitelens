import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Scene, COLORS } from "../config";
import { Logo } from "../components/Logo";
import { AnimatedText, GradientText } from "../components/AnimatedText";

interface SceneProps {
  scene: Scene;
}

export const SolutionScene: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();

  // Converging lines animation
  const lineProgress = interpolate(frame, [0, 40], [0, 1], {
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
        gap: 50,
      }}
    >
      {/* Converging lines visual */}
      <svg
        width="800"
        height="200"
        viewBox="0 0 800 200"
        style={{ position: "absolute", top: 150, opacity: 0.3 }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={i * 200}
            y1={0}
            x2={400}
            y2={200}
            stroke={COLORS.primary}
            strokeWidth={2}
            strokeDasharray={400}
            strokeDashoffset={400 * (1 - lineProgress)}
          />
        ))}
      </svg>

      <Logo size={100} animate />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <AnimatedText delay={15} fontSize={56} fontWeight={600}>
          All your data in
        </AnimatedText>
        <GradientText delay={25} fontSize={72} fontWeight={700}>
          one place
        </GradientText>
      </div>

      <AnimatedText delay={40} fontSize={32} color={COLORS.textMuted}>
        Skip the council portal maze. Get answers instantly.
      </AnimatedText>
    </AbsoluteFill>
  );
};
