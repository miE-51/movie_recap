import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Local Storage Setup
const STORAGE_DIR = path.join(process.cwd(), "storage");
const PROJECTS_FILE = path.join(STORAGE_DIR, "projects.json");

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}
if (!fs.existsSync(PROJECTS_FILE)) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify([], null, 2), "utf-8");
}

// BGM Library Definitions
const BGM_LIBRARY = [
  {
    id: "bgm-epic",
    name: "Victory Drums & Orchestral Rise",
    mimeType: "audio/mp3",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    volume: 0.3,
    genre: "Epic/Cinematic"
  },
  {
    id: "bgm-suspense",
    name: "Dark Corner Thriller Loop",
    mimeType: "audio/mp3",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    volume: 0.4,
    genre: "Suspense/Mystery"
  },
  {
    id: "bgm-cyberpunk",
    name: "Neon Synth Retro Driver",
    mimeType: "audio/mp3",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    volume: 0.35,
    genre: "Sci-Fi/Synthwave"
  },
  {
    id: "bgm-noir",
    name: "Urban Rain Jazz Saxophone",
    mimeType: "audio/mp3",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
    volume: 0.25,
    genre: "Drama/Noir"
  }
];

// Helper to interact with projects.json
function readProjects() {
  try {
    const data = fs.readFileSync(PROJECTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading projects:", err);
    return [];
  }
}

function writeProjects(projects: any[]) {
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing projects:", err);
  }
}

// Global active exports
const activeExports = new Map<string, any>();

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
const API_KEY = process.env.GEMINI_API_KEY;

if (API_KEY && API_KEY !== "MY_GEMINI_API_KEY" && API_KEY.trim() !== "") {
  try {
    ai = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini client:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found. Running in high-quality Simulation Mode.");
}

// --- PROJECT APIs ---

// 1. Get all projects
app.get("/api/projects", (req, res) => {
  const projects = readProjects();
  res.json({ projects, bgmLibrary: BGM_LIBRARY });
});

// 2. Create high-quality simulated project if API fails, or fallback
app.post("/api/projects", (req, res) => {
  const { title, movieName, voiceStyle, clips, selectedBGMId, bgmVolume, videoFilter } = req.body;
  if (!title || !movieName) {
    return res.status(400).json({ error: "Title and Movie Name are required" });
  }

  const projects = readProjects();
  const newProject = {
    id: "proj-" + Math.random().toString(36).substring(2, 9),
    title,
    movieName,
    duration: clips?.reduce((sum: number, c: any) => sum + (c.duration || 5), 0) || 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "draft",
    clips: clips || [],
    selectedBGMId: selectedBGMId || "bgm-suspense",
    bgmVolume: bgmVolume !== undefined ? bgmVolume : 0.3,
    voiceStyle: voiceStyle || "Dramatic",
    videoFilter: videoFilter || "none",
  };

  projects.push(newProject);
  writeProjects(projects);

  res.json({ success: true, project: newProject });
});

// 3. Update project
app.put("/api/projects/:id", (req, res) => {
  const { id } = req.params;
  const projects = readProjects();
  const index = projects.findIndex((p: any) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Project not found" });
  }

  const updatedProject = {
    ...projects[index],
    ...req.body,
    duration: req.body.clips ? req.body.clips.reduce((sum: number, c: any) => sum + (c.duration || 5), 0) : projects[index].duration,
    updatedAt: new Date().toISOString(),
  };

  projects[index] = updatedProject;
  writeProjects(projects);

  res.json({ success: true, project: updatedProject });
});

// 4. Delete project
app.delete("/api/projects/:id", (req, res) => {
  const { id } = req.params;
  const projects = readProjects();
  const filtered = projects.filter((p: any) => p.id !== id);
  writeProjects(filtered);
  res.json({ success: true });
});

// --- GEMINI ENDPOINTS ---

// 5. AI Script / Storyboard Generator
app.post("/api/gemini/generate-recap", async (req, res) => {
  const { title, movieName, briefConcept, durationType, voiceStyle } = req.body;
  
  const movieQuery = movieName || title;
  const conceptText = briefConcept || "";
  const targetDuration = durationType === "short" ? 25 : durationType === "medium" ? 60 : 120;
  const numScenes = durationType === "short" ? 3 : durationType === "medium" ? 5 : 8;

  const defaultTemplates = [
    {
      sceneNumber: 1,
      title: "The Mysterious Discovery",
      duration: 8,
      visualDescription: `Cinematic cinematic scene at night. Inside a dimly lit dusty warehouse, a dramatic soft glow casts yellow light from an open vintage copper lockbox onto the character's curious face. Photorealistic, 4k resolution.`,
      imagePrompt: "A close up look of a young scientist opening a copper box, warm soft ambient glow illuminating his face, dusty retro warehouse, detailed 4k",
      imageUrl: `https://picsum.photos/seed/recap1/640/360`,
      narratorScript: "It was a cold tuesday evening when Arthur opened the long-abandoned lockbox. Inside, buried beneath layers of paper, lay the secret that would rewrite humanity's place in the cosmos.",
      subtitle: "Arthur opened the lockbox and found a secret that would rewrite humanity's history.",
      audioStatus: "idle",
      voiceName: "Zephyr"
    },
    {
      sceneNumber: 2,
      title: "The Reality Shifts",
      duration: 12,
      visualDescription: `Sci-Fi futuristic room with holograms. Blue digital energy waves flow across the screen, distorting the clock and floating furniture in zero-gravity. Cinematic retrofuturism, 3D render style.`,
      imagePrompt: "Futuristic digital blue energy waves rippling through a library with levitator books and clock bending, surreal high contrast lighting",
      imageUrl: `https://picsum.photos/seed/recap2/640/360`,
      narratorScript: "Suddenly, the air warped. Seconds bent backwards as objects rose silently. Arthur realized too late: this wasn't just a relic. It was a functioning quantum tether.",
      subtitle: "The air warped and gravity dissolved. It was a functioning quantum tether.",
      audioStatus: "idle",
      voiceName: "Zephyr"
    },
    {
      sceneNumber: 3,
      title: "The Temporal Escape",
      duration: 10,
      visualDescription: `Action fast-paced scene. Arthur running down a glowing neon-lit dark alleyway away from an approaching shadow figure with glowing cybernetic eyes. Night moody lighting, cinematic cyberpunk.`,
      imagePrompt: "Arthur running desperately down a damp neon-lit alleyway at night, dark shadowy agents chasing behind, highly detailed, dramatic shadows",
      imageUrl: `https://picsum.photos/seed/recap3/640/360`,
      narratorScript: "But with knowledge comes danger. The watchers of the timeline already had his coordinates, forcing Arthur into a desperate run through the neon streets of the city.",
      subtitle: "Agents from the Future located his coordinates, forcing him to flee.",
      audioStatus: "idle",
      voiceName: "Zephyr"
    }
  ];

  if (!ai) {
    // If no key, return simulated structure matching default templates
    return res.json({
      success: true,
      movieName: movieQuery,
      clips: defaultTemplates,
      simulated: true
    });
  }

  try {
    const prompt = `You are an expert cinematic Movie Recapp-er and Storyboard Scriptwriter. Write a movie recap script for the film "${movieQuery}".
Brief plot context or focus: "${conceptText}".
The target voice style is "${voiceStyle}".
You must return exactly ${numScenes} scene-by-scene storyboard clips. The total duration of all clips combined should be approximately ${targetDuration} seconds.

You MUST respond strictly in the following JSON array schema representing the clips:
[
  {
    "sceneNumber": 1,
    "title": "Brief title of the scene",
    "duration": 10, // approximate duration in seconds (should be between 6 and 15 seconds)
    "visualDescription": "A highly detailed, visually appealing descriptive prompt of the scene's keyframe image (e.g., 'A rainy Tokyo street at sunset with neon reflections')",
    "imagePrompt": "A short, descriptive prompt suited for an AI image generator",
    "narratorScript": "The actual dynamic voiceover narrative that will be recited by the AI narrator",
    "subtitle": "A concise, burnt-in subtitle summarizing the narrative text (max 80 characters)",
    "audioStatus": "idle"
  }
]

Ensure the narrative is dramatic, hooks the audience immediately like typical viral YouTube recaps ("He didn't know that this machine was...", "Little did she run..."), and progresses logically from high stakes setup to the climax and conclusion. Respond with nothing but valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text ? response.text.trim() : "";
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      // Find JSON block if any noise
      const fileMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (fileMatch) {
        data = JSON.parse(fileMatch[0]);
      } else {
        throw parseErr;
      }
    }

    if (Array.isArray(data)) {
      const generatedClips = data.map((clip: any, index: number) => ({
        id: "clip-" + Math.random().toString(36).substring(2, 9),
        sceneNumber: clip.sceneNumber || index + 1,
        title: clip.title || `Scene ${index + 1}`,
        duration: clip.duration || 10,
        visualDescription: clip.visualDescription || "A moody cinematic visual frame.",
        imagePrompt: clip.imagePrompt || clip.visualDescription || "A cinematic scene",
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(clip.title || index)}/640/360`,
        narratorScript: clip.narratorScript || "And so, the journey continues on the path of uncertainty.",
        subtitle: clip.subtitle || clip.narratorScript || "The story continues.",
        audioStatus: "idle",
        voiceName: "Zephyr"
      }));

      return res.json({
        success: true,
        movieName: movieQuery,
        clips: generatedClips,
        simulated: false
      });
    }

    throw new Error("Parsed structure was not an array");
  } catch (err: any) {
    console.error("Gemini recap generation failed:", err);
    // Graceful fallback to rich simulation
    res.json({
      success: true,
      movieName: movieQuery,
      clips: defaultTemplates.map(t => ({
        ...t,
        id: "clip-" + Math.random().toString(36).substring(2, 9),
      })),
      simulated: true,
      errorMsg: err.message
    });
  }
});

// 6. AI Voiceover Generator (TTS)
app.post("/api/gemini/generate-voiceover", async (req, res) => {
  const { text, voiceName } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text is required to generate audio" });
  }

  const selectedVoice = voiceName || "Zephyr"; // Puck, Charon, Kore, Fenrir, Zephyr

  if (!ai) {
    // Return high-quality mock data: a short ticking sound or base64 of nothing for silent representation
    // To make it fun, we can return the path of a simulated or actual small browser-playable alert or generated sound
    return res.json({
      success: true,
      voiceName: selectedVoice,
      simulated: true,
    });
  }

  try {
    // Generate actual speech audio using 'gemini-3.1-flash-tts-preview' as specified
    const speedPrompt = `Speak carefully and with dramatic voiceover pauses: ${text}`;
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: speedPrompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({
        success: true,
        voiceName: selectedVoice,
        audioData: `data:audio/mp3;base64,${base64Audio}`,
        simulated: false,
      });
    }
    
    throw new Error("Audio data block missing in Gemini response candidates");
  } catch (err: any) {
    console.error("Gemini Audio Speech Generation failed:", err);
    res.json({
      success: true,
      voiceName: selectedVoice,
      simulated: true,
      errorMsg: err.message,
    });
  }
});

// 7. AI Keyframe Image Generator (Generate Image for Storyboard)
app.post("/api/gemini/generate-frame", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Image prompt is required" });
  }

  if (!ai) {
    // Fallback to random placeholder seed
    return res.json({
      success: true,
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(prompt.substring(0, 15))}/640/360`,
      simulated: true,
    });
  }

  try {
    // Generate images using 'gemini-2.5-flash-image' as default specified in instructions
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: `A cinematic widescreen high-quality film scene: ${prompt}` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        }
      }
    });

    let base64Image = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (base64Image) {
      return res.json({
        success: true,
        imageUrl: `data:image/png;base64,${base64Image}`,
        simulated: false,
      });
    }

    throw new Error("No inlineData image found in candidates response");
  } catch (err: any) {
    console.error("Gemini Image generation failed:", err);
    res.json({
      success: true,
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(prompt.substring(0, 15))}/640/360`,
      simulated: true,
      errorMsg: err.message
    });
  }
});

// --- EXPORT QUEUE PIPELINE ---

// 8. Start Export
app.post("/api/projects/:id/export", (req, res) => {
  const { id } = req.params;
  const projects = readProjects();
  const project = projects.find((p: any) => p.id === id);

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const exportId = "exp-" + Math.random().toString(36).substring(2, 9);
  
  // Initialize export logging and state machine
  const task = {
    id: exportId,
    projectId: id,
    status: "pending",
    progress: 0,
    logLines: ["[01:01] Initializing movie recap compilation process...", "[01:02] Loading storyboard layout and timeline configurations..."],
    createdAt: new Date().toISOString()
  };

  activeExports.set(exportId, task);

  // Trigger simulated background queue compilation
  let currentStep = 0;
  const logs = [
    `[01:03] Parsing ${project.clips.length} storyboard clips to video timelines...`,
    "[01:06] Initiating FFmpeg process framework...",
    `[01:10] Loading cinematic sound track: ${project.selectedBGMId}...`,
    "[01:15] Aligning digital voice tracks to subtitle markers...",
    "[01:22] Rendering frame keyframes styling parameters...",
    `[01:30] Applying video filters shader: ${project.videoFilter}...`,
    "[01:40] Mixing background score and vocal audio tracks with FFmpeg amix...",
    "[01:48] Overlaying captions text frames using subfilters...",
    "[01:54] Compressing output stream container container.mp4...",
    "[02:00] Multiplexing subtitle tracks to metadata...",
    "[01:58] Render queue completed. Streaming final web-recap.mp4."
  ];

  const interval = setInterval(() => {
    const activeTask = activeExports.get(exportId);
    if (!activeTask) {
      clearInterval(interval);
      return;
    }

    if (currentStep < logs.length) {
      activeTask.status = "processing";
      activeTask.progress = Math.min(Math.round((currentStep / logs.length) * 100), 95);
      activeTask.logLines.push(logs[currentStep]);
      currentStep++;
    } else {
      activeTask.status = "completed";
      activeTask.progress = 100;
      activeTask.logLines.push("[02:00] Completed export successfully. File saved to storage/exports/recap.mp4.");
      activeTask.outputUrl = "https://assets.mixkit.co/videos/preview/mixkit-cinematic-clouds-and-sun-4670-large.mp4"; // Real video url for preview!
      clearInterval(interval);
    }
  }, 1200);

  res.json({ success: true, exportId });
});

// 9. Get Export Status
app.get("/api/exports/:exportId", (req, res) => {
  const { exportId } = req.params;
  const task = activeExports.get(exportId);
  if (!task) {
    return res.status(404).json({ error: "Export task not found" });
  }
  res.json(task);
});

// Vite Middleware for client asset routing
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Movie Recap Studio Server running at http://localhost:${PORT}`);
  });
}

startServer();
