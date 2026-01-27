import { interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../config";

interface AnimatedTextProps {
  children: React.ReactNode;
  delay?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  style?: React.CSSProperties;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  children,
  delay = 0,
  fontSize = 48,
  color = COLORS.text,
  fontWeight = 400,
  style = {},
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame, [delay, delay + 15], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        color,
        fontFamily: "Inter, system-ui, sans-serif",
        opacity,
        transform: `translateY(${translateY}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface GradientTextProps {
  children: React.ReactNode;
  delay?: number;
  fontSize?: number;
  fontWeight?: number;
}

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  delay = 0,
  fontSize = 72,
  fontWeight = 700,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [delay, delay + 20], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        fontFamily: "Inter, system-ui, sans-serif",
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 50%, #fbbf24 100%)`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {children}
    </div>
  );
};
