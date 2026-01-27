/**
 * ElevenLabs Voiceover Generator
 *
 * This script generates voiceover audio files for each scene using ElevenLabs API.
 *
 * Setup:
 * 1. Get an API key from https://elevenlabs.io
 * 2. Set ELEVENLABS_API_KEY environment variable
 * 3. Run: npx ts-node scripts/generate-voiceover.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Scene scripts - same as in config.ts
const SCENES = [
  {
    id: "intro",
    script: "Siteora. Property intelligence in seconds.",
  },
  {
    id: "problem",
    script: "Tired of navigating multiple council portals just to find basic property information? Searching for flood maps, zoning data, and planning overlays across different websites?",
  },
  {
    id: "solution",
    script: "Siteora brings all the data together in one place. Skip the council portal maze and get answers instantly.",
  },
  {
    id: "demo-search",
    script: "Simply search any address or lot plan number. We'll instantly pull up the property on an interactive map.",
  },
  {
    id: "demo-layers",
    script: "Toggle through 40 plus government data layers. Flood zones, bushfire prone areas, heritage overlays, and more. All in real time.",
  },
  {
    id: "demo-analysis",
    script: "Our AI analyzes constraints and development potential automatically. Get hazard assessments, zoning rules, and recommended next steps.",
  },
  {
    id: "coverage",
    script: "Currently live across Queensland with Brisbane, Logan, and Ipswich council data. New South Wales coming soon.",
  },
  {
    id: "cta",
    script: "Try Siteora free today. No signup required.",
  },
];

// ElevenLabs configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel - professional female voice
// Other good voices:
// "EXAVITQu4vr4xnSDxMaL" - Bella (female)
// "ErXwobaYiN019PkySvjV" - Antoni (male)
// "VR6AewLTigWG4xSOukaG" - Arnold (male, deeper)

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio');

async function generateVoiceover(sceneId: string, text: string): Promise<void> {
  if (!ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY not set');
    console.log('\nTo generate voiceovers:');
    console.log('1. Sign up at https://elevenlabs.io');
    console.log('2. Get your API key from Settings > API');
    console.log('3. Run: ELEVENLABS_API_KEY=your_key npx ts-node scripts/generate-voiceover.ts');
    process.exit(1);
  }

  console.log(`🎙️ Generating voiceover for: ${sceneId}`);
  console.log(`   "${text.substring(0, 50)}..."`);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.85,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const outputPath = path.join(OUTPUT_DIR, `${sceneId}.mp3`);

    fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
    console.log(`   ✅ Saved to ${outputPath}`);

  } catch (error) {
    console.error(`   ❌ Failed: ${error}`);
    throw error;
  }
}

async function main() {
  console.log('🎬 Siteora Demo Video - Voiceover Generator\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate voiceovers for each scene
  for (const scene of SCENES) {
    await generateVoiceover(scene.id, scene.script);
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✨ All voiceovers generated!');
  console.log(`   Output directory: ${OUTPUT_DIR}`);
  console.log('\nNext step: Run "npm start" to preview the video in Remotion Studio');
}

main().catch(console.error);
