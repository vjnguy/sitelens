import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Scene, COLORS, FPS } from "../config";
import { AnimatedText } from "../components/AnimatedText";

interface SceneProps {
  scene: Scene;
}

// Council website mockup with skeleton UI
const BrowserWindow: React.FC<{
  title: string;
  url: string;
  delay: number;
  x: number;
  y: number;
  type: "map" | "form" | "table" | "search";
}> = ({ title, url, delay, x, y, type }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [delay, delay + 15], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Skeleton loading animation
  const shimmer = interpolate(frame % 60, [0, 60], [0, 100], {});

  const SkeletonBar: React.FC<{ width: string; height?: number; marginBottom?: number }> = ({
    width,
    height = 12,
    marginBottom = 8,
  }) => (
    <div
      style={{
        width,
        height,
        borderRadius: 4,
        backgroundColor: "#3f3f46",
        marginBottom,
        background: `linear-gradient(90deg, #3f3f46 0%, #52525b ${shimmer}%, #3f3f46 100%)`,
      }}
    />
  );

  const renderContent = () => {
    switch (type) {
      case "map":
        return (
          <div style={{ padding: 12, height: "100%" }}>
            {/* Search bar */}
            <SkeletonBar width="60%" height={28} marginBottom={12} />
            {/* Map area */}
            <div
              style={{
                width: "100%",
                height: 140,
                backgroundColor: "#27272a",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: 32, opacity: 0.3 }}>🗺️</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <SkeletonBar width="30%" height={24} />
              <SkeletonBar width="30%" height={24} />
              <SkeletonBar width="30%" height={24} />
            </div>
          </div>
        );
      case "form":
        return (
          <div style={{ padding: 16 }}>
            <SkeletonBar width="40%" height={20} marginBottom={16} />
            <SkeletonBar width="100%" height={32} marginBottom={12} />
            <SkeletonBar width="100%" height={32} marginBottom={12} />
            <SkeletonBar width="100%" height={32} marginBottom={16} />
            <div style={{ display: "flex", gap: 8 }}>
              <SkeletonBar width="80px" height={28} />
              <SkeletonBar width="80px" height={28} />
            </div>
          </div>
        );
      case "table":
        return (
          <div style={{ padding: 12 }}>
            <SkeletonBar width="50%" height={18} marginBottom={16} />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <SkeletonBar width="25%" height={14} marginBottom={0} />
                <SkeletonBar width="35%" height={14} marginBottom={0} />
                <SkeletonBar width="30%" height={14} marginBottom={0} />
              </div>
            ))}
          </div>
        );
      case "search":
        return (
          <div style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 4,
                  backgroundColor: "#3f3f46",
                }}
              />
              <SkeletonBar width="60%" height={20} marginBottom={0} />
            </div>
            <SkeletonBar width="100%" height={36} marginBottom={16} />
            <SkeletonBar width="80%" height={14} marginBottom={8} />
            <SkeletonBar width="90%" height={14} marginBottom={8} />
            <SkeletonBar width="70%" height={14} />
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 380,
        height: 280,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        opacity,
        transform: `scale(${scale})`,
        overflow: "hidden",
        boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
      }}
    >
      {/* Browser header */}
      <div
        style={{
          height: 36,
          backgroundColor: "#27272a",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 8,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ef4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#eab308" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22c55e" }} />
        </div>
        <div
          style={{
            flex: 1,
            backgroundColor: "#3f3f46",
            borderRadius: 4,
            padding: "3px 10px",
            fontSize: 11,
            color: COLORS.textMuted,
            marginLeft: 8,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {url}
        </div>
      </div>

      {/* Site header */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: `1px solid ${COLORS.border}`,
          backgroundColor: "#1f1f23",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{title}</div>
      </div>

      {/* Content area */}
      <div style={{ height: "calc(100% - 76px)", overflow: "hidden" }}>{renderContent()}</div>
    </div>
  );
};

export const ProblemScene: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();

  // Distribute windows evenly across the screen
  const windows = [
    { title: "Brisbane City Council", url: "cityplan.brisbane.qld.gov.au", x: 80, y: 80, type: "map" as const, delay: 5 },
    { title: "QLD Flood Check", url: "floodcheck.information.qld.gov.au", x: 520, y: 60, type: "search" as const, delay: 15 },
    { title: "QLD Globe", url: "qldglobe.information.qld.gov.au", x: 960, y: 100, type: "map" as const, delay: 25 },
    { title: "Heritage Register", url: "heritage.qld.gov.au/search", x: 1400, y: 80, type: "table" as const, delay: 35 },
    { title: "Planning Portal", url: "planning.dsdmip.qld.gov.au", x: 180, y: 420, type: "form" as const, delay: 20 },
    { title: "Logan City Council", url: "logan.qld.gov.au/planning", x: 620, y: 480, type: "table" as const, delay: 30 },
    { title: "Development.i", url: "developmenti.dsdmip.qld.gov.au", x: 1060, y: 440, type: "search" as const, delay: 40 },
    { title: "Ipswich Planning", url: "pdonline.ipswich.qld.gov.au", x: 1440, y: 500, type: "form" as const, delay: 45 },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
      }}
    >
      {/* Browser windows scattered around */}
      {windows.map((win) => (
        <BrowserWindow key={win.url} {...win} />
      ))}

      {/* Main text overlay in center */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          backgroundColor: `${COLORS.background}ee`,
          padding: "50px 80px",
          borderRadius: 20,
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
        }}
      >
        <AnimatedText delay={10} fontSize={56} fontWeight={600} color={COLORS.text}>
          Tired of navigating
        </AnimatedText>
        <AnimatedText delay={25} fontSize={56} fontWeight={600} color={COLORS.primary}>
          multiple council portals?
        </AnimatedText>
      </div>
    </AbsoluteFill>
  );
};
