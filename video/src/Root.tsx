import { Composition } from "remotion";
import { SiteoraDemo } from "./SiteoraDemo";

// Video configuration
// 30 fps, total duration calculated from scenes
const FPS = 30;
const DURATION_SECONDS = 45;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SiteoraDemo"
        component={SiteoraDemo}
        durationInFrames={FPS * DURATION_SECONDS}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
