export interface RecapClip {
  id: string;
  sceneNumber: number;
  title: string;
  duration: number; // in seconds
  visualDescription: string;
  imagePrompt: string;
  imageUrl: string;
  narratorScript: string;
  subtitle: string;
  audioUrl?: string; // Generated TTS voiceover URL
  audioStatus: "idle" | "generating" | "completed" | "error";
  voiceName: string; // prebuilt voice used
}

export interface BGMTrack {
  id: string;
  name: string;
  mimeType: string;
  audioUrl: string;
  volume: number; // 0 to 1
  genre: string;
}

export interface RecapProject {
  id: string;
  title: string;
  movieName: string;
  duration: number; // total duration in seconds
  createdAt: string;
  updatedAt: string;
  status: "draft" | "completed";
  clips: RecapClip[];
  selectedBGMId: string;
  bgmVolume: number;
  voiceStyle: string; // Calm, Dramatic, Enthusiastic, Suspenseful
  videoFilter: string; // none, vintage, cinematic, noir, warm, cool
}

export interface ExportTask {
  id: string;
  projectId: string;
  status: "pending" | "processing" | "rendering" | "completed" | "failed";
  progress: number; // 0 to 100
  logLines: string[];
  outputUrl?: string; // Rendered output mockup video
  createdAt: string;
}
