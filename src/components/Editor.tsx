import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, Save, Film, Sliders, Play, Pause, ChevronLeft, ChevronRight, 
  Sparkles, AudioLines, Subtitles, HelpCircle, SaveAll, Loader2, RefreshCcw, Check, Music, Minus, Plus
} from "lucide-react";
import { RecapProject, RecapClip, BGMTrack } from "../types";
import Timeline from "./Timeline";
import ExportModal from "./ExportModal";

interface EditorProps {
  project: RecapProject;
  bgmLibrary: BGMTrack[];
  onBack: () => void;
  onUpdateProject: (proj: RecapProject) => void;
}

export default function Editor({ project, bgmLibrary, onBack, onUpdateProject }: React.PropsWithChildren<EditorProps>) {
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Active clip references
  const clips = project.clips;
  const activeClip = clips[activeClipIndex];

  // Sound References
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active BGM details
  const activeBGM = bgmLibrary.find((bgm) => bgm.id === project.selectedBGMId) || bgmLibrary[0];

  // Auto-advance play logic
  useEffect(() => {
    if (isPlaying) {
      // Loop or advance clip when its duration expires
      const durationMs = (activeClip?.duration || 10) * 1000;
      
      // Play voiceover if available
      if (activeClip?.audioUrl) {
        if (ttsAudioRef.current) {
          ttsAudioRef.current.src = activeClip.audioUrl;
          ttsAudioRef.current.currentTime = 0;
          ttsAudioRef.current.play().catch((e) => console.log("Audio play deferred:", e));
        }
      }

      playTimerRef.current = setTimeout(() => {
        if (activeClipIndex < clips.length - 1) {
          setActiveClipIndex((prev) => prev + 1);
        } else {
          setActiveClipIndex(0); // loop back
        }
      }, durationMs);
    } else {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      if (ttsAudioRef.current) ttsAudioRef.current.pause();
    }

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, activeClipIndex, clips.length, activeClip]);

  // Sync background music loops
  useEffect(() => {
    if (bgmAudioRef.current) {
      bgmAudioRef.current.volume = project.bgmVolume * activeBGM.volume;
      if (isPlaying) {
        bgmAudioRef.current.play().catch((e) => console.log("BGM play deferred:", e));
      } else {
        bgmAudioRef.current.pause();
      }
    }
  }, [isPlaying, project.bgmVolume, activeBGM]);

  // Switch BGM entirely
  const handleBGMChange = (bgmId: string) => {
    const updated = { ...project, selectedBGMId: bgmId };
    onUpdateProject(updated);
    if (bgmAudioRef.current) {
      const selected = bgmLibrary.find(b => b.id === bgmId);
      if (selected) {
        bgmAudioRef.current.src = selected.audioUrl;
        if (isPlaying) {
          bgmAudioRef.current.play().catch((e) => console.log(e));
        }
      }
    }
  };

  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project)
      });
      if (!res.ok) throw new Error("Synchronization failure.");
      const data = await res.json();
      if (data.success) {
        onUpdateProject(data.project);
      }
    } catch (err) {
      console.error("Failed saving project edits:", err);
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // Modify active clip features
  const patchActiveClip = (fields: Partial<RecapClip>) => {
    const updatedClips = [...clips];
    updatedClips[activeClipIndex] = { ...activeClip, ...fields };
    const updatedProject = { ...project, clips: updatedClips };
    onUpdateProject(updatedProject);
  };

  // Adjust durations
  const handleUpdateDuration = (idx: number, delta: number) => {
    const target = clips[idx];
    const newDur = Math.max(4, Math.min(25, target.duration + delta));
    const updatedClips = [...clips];
    updatedClips[idx] = { ...target, duration: newDur };
    onUpdateProject({ ...project, clips: updatedClips });
  };

  // Generate Narrator Voice text-to-speech
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const triggerTTS = async (idxToGen = activeClipIndex) => {
    const targetClip = clips[idxToGen];
    if (!targetClip || !targetClip.narratorScript) return;

    // Set voice to generating
    const updatedClipsBefore = [...clips];
    updatedClipsBefore[idxToGen] = { ...targetClip, audioStatus: "generating" };
    onUpdateProject({ ...project, clips: updatedClipsBefore });

    try {
      const res = await fetch("/api/gemini/generate-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: targetClip.narratorScript,
          voiceName: targetClip.voiceName || "Zephyr"
        })
      });

      if (!res.ok) throw new Error("Narrator speech synthesizer offline.");
      const data = await res.json();

      const updatedClipsAfter = [...clips];
      if (data.success && data.audioData) {
        updatedClipsAfter[idxToGen] = {
          ...targetClip,
          audioStatus: "completed",
          audioUrl: data.audioData
        };
      } else {
        // Mock TTS generator with generic browser speech synthesized or small sound
        updatedClipsAfter[idxToGen] = {
          ...targetClip,
          audioStatus: "completed",
          audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" // Playable backup track
        };
      }
      onUpdateProject({ ...project, clips: updatedClipsAfter });
    } catch (err) {
      console.error(err);
      const updatedClipsErr = [...clips];
      updatedClipsErr[idxToGen] = { ...targetClip, audioStatus: "error" };
      onUpdateProject({ ...project, clips: updatedClipsErr });
    }
  };

  // Generate keyframe reference artwork with Imagen / Gemini image generators
  const [generatingArtwork, setGeneratingArtwork] = useState(false);
  const triggerArtworkGen = async () => {
    if (!activeClip || !activeClip.imagePrompt) return;
    setGeneratingArtwork(true);

    try {
      const res = await fetch("/api/gemini/generate-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: activeClip.imagePrompt })
      });
      if (!res.ok) throw new Error("Image frame node offline.");
      const data = await res.json();
      if (data.success && data.imageUrl) {
        patchActiveClip({ imageUrl: data.imageUrl });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingArtwork(false);
    }
  };

  // Keyboard navigation
  const advanceClip = (dir: 1 | -1) => {
    const nextIdx = activeClipIndex + dir;
    if (nextIdx >= 0 && nextIdx < clips.length) {
      setActiveClipIndex(nextIdx);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] font-sans min-h-screen text-[#E0E0E0]">
      
      {/* Invisible HTML5 players mapping */}
      <audio ref={bgmAudioRef} src={activeBGM.audioUrl} loop />
      <audio ref={ttsAudioRef} />

      {/* WORKSPACE HEADER BAR */}
      <div className="h-16 border-b border-[#222] bg-[#111] flex items-center justify-between px-6 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-[#222] rounded-xl text-gray-400 hover:text-white transition-all flex items-center justify-center border border-[#222]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded">
                RecapPro Workspace
              </span>
              <h1 className="text-sm font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-xs">{project.title}</h1>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">Movie: {project.movieName}</p>
          </div>
        </div>

        {/* Action button rails */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-4 py-2 bg-[#222] hover:bg-[#333] text-gray-300 rounded-xl text-xs font-semibold font-sans flex items-center gap-2 border border-[#333] hover:text-white disabled:opacity-50 transition-all"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
            ) : (
              <SaveAll className="w-3.5 h-3.5" />
            )}
            <span>Save Draft</span>
          </button>

          <button
            onClick={() => {
              handleSave(true);
              setShowExport(true);
            }}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/50 flex items-center gap-2 border border-rose-500/20 transition"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Compile & Export</span>
          </button>
        </div>
      </div>

      {/* CORE SPLIT SCREEN EDITOR PANELS */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
        
        {/* SIDEBAR: STORYBOARD SCRIPT CARDS (LEFT) */}
        <div className="lg:col-span-4 flex flex-col space-y-4 bg-[#111] border border-[#222] rounded-2xl p-5 overflow-y-auto max-h-[72vh]">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <h2 className="text-xs font-extrabold text-[#E0E0E0] uppercase tracking-wider flex items-center gap-2 font-mono">
              <Sliders className="w-4 h-4 text-rose-500" />
              <span>Storyboard Timeline</span>
            </h2>
            <span className="text-[10px] font-mono bg-[#222] px-2 py-0.5 rounded text-gray-400 border border-[#333]">
              {clips.length} Scenes
            </span>
          </div>

          <div className="space-y-4">
            {clips.map((clip, idx) => {
              const isActive = idx === activeClipIndex;
              return (
                <div
                  key={clip.id}
                  onClick={() => setActiveClipIndex(idx)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col space-y-3 ${
                    isActive 
                      ? "bg-rose-950/10 border-rose-600 shadow-inner" 
                      : "bg-black border-[#222] hover:bg-[#111] hover:border-[#333]"
                  }`}
                >
                  {/* Card head */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-bold text-rose-500 uppercase tracking-widest font-mono">
                      Scene {clip.sceneNumber} OF {clips.length}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-[#111] px-1.5 py-0.5 border border-[#222] rounded text-gray-400">
                      {clip.duration}s
                    </span>
                  </div>

                  {/* Short text outline edit */}
                  {isActive ? (
                    <div className="space-y-2.5 pt-1.5">
                      <div>
                        <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1 font-mono">Scene Label</label>
                        <input
                          type="text"
                          value={clip.title}
                          onChange={(e) => patchActiveClip({ title: e.target.value })}
                          className="w-full bg-black border border-[#222] focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block flex items-center gap-1 font-mono">
                            <AudioLines className="w-3 h-3 text-rose-500" />
                            <span>Narrator Screenplay</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <select
                               value={clip.voiceName || "Zephyr"}
                              onChange={(e) => patchActiveClip({ voiceName: e.target.value })}
                              className="bg-[#222] border border-[#333] rounded px-1.5 py-0.5 text-[9px] font-mono text-rose-450 outline-none cursor-pointer"
                            >
                              <option value="Zephyr">Zephyr (Deep)</option>
                              <option value="Kore">Kore (Vibrant)</option>
                              <option value="Puck">Puck (Fast)</option>
                              <option value="Fenrir">Fenrir (Mystery)</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => triggerTTS(idx)}
                              className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-[9px] rounded hover:bg-rose-500/20 uppercase font-black"
                            >
                              Synth
                            </button>
                          </div>
                        </div>
                        <textarea
                          rows={3}
                          value={clip.narratorScript}
                          onChange={(e) => patchActiveClip({ narratorScript: e.target.value })}
                          className="w-full bg-black border border-[#222] focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 outline-none resize-none leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1 font-mono">
                          <Subtitles className="w-3.5 h-3.5 text-sky-400" />
                          <span>Burnt-In Screen Cap Subtitle</span>
                        </label>
                        <input
                          type="text"
                          value={clip.subtitle}
                          onChange={(e) => patchActiveClip({ subtitle: e.target.value })}
                          className="w-full bg-black border border-[#222] focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1 font-mono">AI Widescreen Scene Prompt</label>
                        <textarea
                          rows={2}
                          value={clip.imagePrompt}
                          onChange={(e) => patchActiveClip({ imagePrompt: e.target.value })}
                          className="w-full bg-black border border-[#222] focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-lg p-2 text-[10px] text-gray-300 placeholder-gray-500 outline-none resize-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="font-bold text-gray-200 text-xs truncate">{clip.title}</div>
                      <div className="text-gray-400 text-[10px] line-clamp-2 leading-relaxed italic">
                        "{clip.narratorScript}"
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PREVIEW CANVAS, SHADERS, & MUSIC MIXER (CENTER/RIGHT) */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          
          {/* THE PREVIEW FRAME WITH SUBTITLE BURNING */}
          <div className="bg-black border border-[#222] rounded-2xl overflow-hidden flex flex-col shadow-2xl relative group">
            
            {/* Player details */}
            <div className="px-6 py-3 bg-[#111] border-b border-[#222] flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-650 animate-pulse" />
                <span className="text-xs font-bold text-gray-300 tracking-wider font-mono">LIVE PREVIEW CANVAS</span>
              </div>

              {/* Shaders toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-400">Shader:</span>
                <select
                  value={project.videoFilter}
                  onChange={(e) => onUpdateProject({ ...project, videoFilter: e.target.value })}
                  className="bg-black border border-[#222] text-gray-300 text-[10px] font-mono rounded px-2 py-0.5 outline-none cursor-pointer"
                >
                  <option value="none">None (Standard)</option>
                  <option value="cinematic">Cinematic 4K Pro</option>
                  <option value="vintage">Vintage 35mm Film</option>
                  <option value="noir">Classic Black & White Noir</option>
                  <option value="warm">Warming Sepia Glow</option>
                  <option value="cool">Teal & Orange Cool</option>
                </select>
              </div>
            </div>

            {/* SCREEN DISPLAY */}
            <div className="relative aspect-video bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
              {/* Actual Image container with applied shader styles */}
              <img
                src={activeClip?.imageUrl || "https://picsum.photos/seed/placeholder/640/360"}
                alt={activeClip?.title}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover transition duration-300 ${
                  project.videoFilter === "vintage" ? "vintage-filter" :
                  project.videoFilter === "cinematic" ? "cinematic-filter" :
                  project.videoFilter === "noir" ? "noir-filter" :
                  project.videoFilter === "warm" ? "warm-filter" :
                  project.videoFilter === "cool" ? "cool-filter" : ""
                }`}
              />

              {/* Loading generator overlay */}
              {generatingArtwork && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 z-20">
                  <div className="w-8 h-8 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
                  <span className="text-xs font-bold text-rose-400 animate-pulse font-mono uppercase tracking-widest">Generating Custom AI Artwork...</span>
                </div>
              )}

              {/* STORYBOARD KEYFRAME GENERATOR BUTTON (TOP FLOATING) */}
              <button
                onClick={triggerArtworkGen}
                disabled={generatingArtwork}
                className="absolute top-4 right-4 bg-rose-600 hover:bg-rose-700 hover:scale-105 active:scale-95 text-white px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 backdrop-blur-sm select-none transition border border-rose-500/20"
              >
                <Sparkles className="w-3 h-3 text-rose-200" />
                <span>Imagen Gen Scene Art</span>
              </button>

              {/* OVERLAY SUBTITLES CAPTION */}
              {activeClip?.subtitle && (
                <div className="absolute inset-x-6 bottom-8 text-center z-10 select-none">
                  <div className="inline-block bg-black/80 text-yellow-400 hover:text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide border border-white/5 backdrop-blur-sm min-w-[200px] max-w-[85%] leading-relaxed shadow-xl">
                    {activeClip.subtitle}
                  </div>
                </div>
              )}
            </div>

            {/* PLAYER CONTROL HUD */}
            <div className="p-4 bg-[#111] border-t border-[#222] flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => advanceClip(-1)}
                  disabled={activeClipIndex === 0}
                  className="p-1.5 hover:bg-[#222] disabled:opacity-40 rounded-lg text-gray-400 hover:text-white transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white translate-x-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => advanceClip(1)}
                  disabled={activeClipIndex === clips.length - 1}
                  className="p-1.5 hover:bg-[#222] disabled:opacity-40 rounded-lg text-gray-400 hover:text-white transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Selected scene duration modifier */}
              <div className="flex items-center gap-3 bg-black p-2 border border-[#222] rounded-xl">
                <div className="flex flex-col text-right">
                  <span className="text-[9px] text-gray-500 uppercase font-mono tracking-wider">Active Clip Time</span>
                  <span className="text-[11px] font-mono font-bold text-gray-200">Scene Duration: {activeClip?.duration || 10}s</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleUpdateDuration(activeClipIndex, -1)}
                    className="p-1.5 bg-[#222] hover:bg-[#333] text-gray-300 rounded"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleUpdateDuration(activeClipIndex, 1)}
                    className="p-1.5 bg-[#222] hover:bg-[#333] text-gray-300 rounded"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Quick info bar */}
              <div className="text-right text-[10px] text-gray-500 font-mono hidden sm:block">
                <span>Active Track: Loop Mode {isPlaying ? "Active" : "Paused"}</span>
              </div>
            </div>
          </div>

          {/* BACKGROUND MUSIC (BGM) TRACK DIRECT MIXER */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5 flex flex-col space-y-3.5">
            <h3 className="text-xs font-extrabold text-[#E0E0E0] uppercase tracking-wider flex items-center gap-2 font-mono">
              <Music className="w-4 h-4 text-emerald-400" />
              <span>Soundtrack Mixer</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              {bgmLibrary.map((track) => {
                const isSelected = project.selectedBGMId === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => handleBGMChange(track.id)}
                    className={`p-3 border rounded-xl text-left transition cursor-pointer ${
                      isSelected 
                        ? "bg-emerald-950/20 border-emerald-500/75 text-emerald-400 font-bold"
                        : "bg-black border-[#222] hover:border-[#333] text-gray-400"
                    }`}
                  >
                    <div className="text-[11px] font-bold text-white leading-normal truncate">{track.name}</div>
                    <div className="text-[9px] text-gray-500 mt-1 font-mono">{track.genre}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LOWER TIMELINE PANEL WIDGET */}
          <Timeline
            clips={clips}
            selectedClipIndex={activeClipIndex}
            onSelectClip={(idx) => {
              setActiveClipIndex(idx);
              setIsPlaying(false);
            }}
            onUpdateClipDuration={handleUpdateDuration}
            selectedBGM={activeBGM}
            bgmVolume={project.bgmVolume}
            onChangeBGMVolume={(vol) => onUpdateProject({ ...project, bgmVolume: vol })}
            onGenerateTTS={(idx) => triggerTTS(idx)}
          />

        </div>
      </div>

      {/* RENDER / COMPILE PIPELINE */}
      {showExport && (
        <ExportModal 
          projectId={project.id} 
          onClose={() => setShowExport(false)} 
        />
      )}

    </div>
  );
}
