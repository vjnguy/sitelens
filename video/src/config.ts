// Video configuration and scene definitions
export const FPS = 30;

// Mapbox configuration
export const MAPBOX_TOKEN = "pk.eyJ1IjoidmpuZ3V5ZW4iLCJhIjoiY21rb203MjgyMDdnZzNlcW43M25ldm95bCJ9.y3DO9bv7xkLlJczUCxW_9Q";

// Demo property location - West End, Brisbane (real flood-affected area)
// Real coordinates from Brisbane Council cadastral and flood overlay data
// This location has confirmed Overland Flow flood overlay and Traditional Building Character
export const DEFAULT_MAP_CENTER: [number, number] = [153.010429, -27.481821];
export const DEFAULT_MAP_ZOOM = 17;

// Brisbane Council ArcGIS service URLs for tile overlays
export const BCC_ARCGIS = 'https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services';

// Flood overlay service URL (Brisbane River flood planning area)
export const BRISBANE_FLOOD_SERVICE = `${BCC_ARCGIS}/Flood_overlay_Brisbane_River_flood_planning_area/FeatureServer/0`;

// Property boundaries service URL
export const BRISBANE_CADASTRE_SERVICE = `${BCC_ARCGIS}/property_boundaries_parcel/FeatureServer/0`;

// Scene definitions with voiceover scripts
// Audio duration is estimated at ~150 words per minute (2.5 words/second)
// Scene duration = audio duration + 1.5s buffer (so voiceover ends before transition)

export interface Scene {
  id: string;
  name: string;
  script: string;
  durationFrames: number; // Total scene duration in frames
  audioEndFrame: number; // When voiceover should end (before scene ends)
}

// Calculate frames from seconds
const sec = (s: number) => Math.round(s * FPS);

// Estimate audio duration from script (words / 2.5 words per second)
const estimateAudioDuration = (script: string) => {
  const words = script.split(/\s+/).length;
  return words / 2.5;
};

// Create scene with proper buffer
const createScene = (id: string, name: string, script: string, extraBuffer = 1.5): Scene => {
  const audioDuration = estimateAudioDuration(script);
  const totalDuration = audioDuration + extraBuffer;
  return {
    id,
    name,
    script,
    durationFrames: sec(totalDuration),
    audioEndFrame: sec(audioDuration),
  };
};

export const SCENES: Scene[] = [
  createScene(
    "intro",
    "Introduction",
    "Siteora. Property intelligence in seconds.",
    2
  ),
  createScene(
    "problem",
    "The Problem",
    "Tired of navigating multiple council portals just to find basic property information? Searching for flood maps, zoning data, and planning overlays across different websites?",
    1.5
  ),
  createScene(
    "solution",
    "The Solution",
    "Siteora brings all the data together in one place. Skip the council portal maze and get answers instantly.",
    1.5
  ),
  createScene(
    "demo-search",
    "Demo: Search",
    "Simply search any address or lot plan number. We'll instantly pull up the property on an interactive map.",
    2
  ),
  createScene(
    "demo-layers",
    "Demo: Layers",
    "Toggle through 40 plus government data layers. Flood zones, bushfire prone areas, heritage overlays, and more. All in real time.",
    2
  ),
  createScene(
    "demo-analysis",
    "Demo: AI Analysis",
    "Our AI analyzes constraints and development potential automatically. Get hazard assessments, zoning rules, and recommended next steps.",
    2
  ),
  createScene(
    "coverage",
    "Coverage",
    "Currently live across Queensland with Brisbane, Logan, and Ipswich council data. New South Wales coming soon.",
    2
  ),
  createScene(
    "cta",
    "Call to Action",
    "Try Siteora free today. No signup required.",
    2.5
  ),
];

// Calculate total video duration
export const TOTAL_FRAMES = SCENES.reduce((sum, scene) => sum + scene.durationFrames, 0);
export const TOTAL_DURATION = TOTAL_FRAMES / FPS;

// Get frame offset for a scene
export const getSceneStartFrame = (sceneIndex: number): number => {
  return SCENES.slice(0, sceneIndex).reduce((sum, scene) => sum + scene.durationFrames, 0);
};

// Colors matching Siteora brand
export const COLORS = {
  background: "#0a0a0f",
  surface: "#18181b",
  border: "rgba(255, 255, 255, 0.1)",
  primary: "#f97316", // Orange
  primaryLight: "#fb923c",
  text: "#ffffff",
  textMuted: "#a1a1aa",
  success: "#22c55e",
  danger: "#ef4444",
};
