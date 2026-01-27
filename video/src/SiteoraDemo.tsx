import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { SCENES, getSceneStartFrame, COLORS } from "./config";
import { IntroScene } from "./scenes/IntroScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { SolutionScene } from "./scenes/SolutionScene";
import { DemoSearchScene } from "./scenes/DemoSearchScene";
import { DemoLayersScene } from "./scenes/DemoLayersScene";
import { DemoAnalysisScene } from "./scenes/DemoAnalysisScene";
import { CoverageScene } from "./scenes/CoverageScene";
import { CTAScene } from "./scenes/CTAScene";

export const SiteoraDemo: React.FC = () => {
  const sceneComponents = [
    IntroScene,
    ProblemScene,
    SolutionScene,
    DemoSearchScene,
    DemoLayersScene,
    DemoAnalysisScene,
    CoverageScene,
    CTAScene,
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Render each scene as a sequence */}
      {SCENES.map((scene, index) => {
        const SceneComponent = sceneComponents[index];
        const startFrame = getSceneStartFrame(index);

        return (
          <Sequence
            key={scene.id}
            from={startFrame}
            durationInFrames={scene.durationFrames}
            name={scene.name}
          >
            <SceneComponent scene={scene} />
            {/* Audio for each scene - uncomment when audio files are generated */}
            {/* <Audio src={staticFile(`audio/${scene.id}.mp3`)} /> */}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
