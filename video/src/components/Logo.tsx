import { interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../config";

interface LogoProps {
  size?: number;
  showText?: boolean;
  animate?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 80,
  showText = true,
  animate = true,
}) => {
  const frame = useCurrentFrame();

  const scale = animate
    ? interpolate(frame, [0, 15], [0.8, 1], { extrapolateRight: "clamp" })
    : 1;

  const opacity = animate
    ? interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" })
    : 1;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size * 0.2,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.2,
          background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* MapPin icon */}
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <span
          style={{
            fontSize: size * 0.6,
            fontWeight: 600,
            color: COLORS.text,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Siteora
        </span>
      )}
    </div>
  );
};
