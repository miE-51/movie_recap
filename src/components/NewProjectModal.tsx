import React, { useState } from "react";
import { X, Sparkles, Film, Clock, Mic, MessageSquare, AlertCircle } from "lucide-react";
import { RecapProject } from "../types";

interface NewProjectModalProps {
  onClose: () => void;
  onCreated: (project: RecapProject) => void;
}

const INSPIRED_PROMPTS = [
  {
    movie: "Interstellar",
    concept: "Focus on the dramatic father-daughter time dilation and the library scene climax."
  },
  {
    movie: "Inception",
    concept: "Describe the layers of dreams, shifting gravity, and whether the top keeps spinning."
  },
  {
    movie: "The Matrix",
    concept: "Dramatic breakdown of Neo realizing the world is a simulation and stopping bullets."
  },
  {
    movie: "Parasite",
    concept: "Explain the dark class comedy and the shocking basement discovery twist."
  }
];

export default function NewProjectModal({ onClose, onCreated }: NewProjectModalProps) {
  const [movieName, setMovieName] = useState("");
  const [title, setTitle] = useState("");
  const [briefConcept, setBriefConcept] = useState("");
  const [durationType, setDurationType] = useState<"short" | "medium" | "long">("medium");
  const [voiceStyle, setVoiceStyle] = useState("Dramatic");
  const [selectedBGM, setSelectedBGM] = useState("bgm-suspense");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = (movie: string, concept: string) => {
    setMovieName(movie);
    setTitle(`${movie} - AI Cinematic Recap`);
    setBriefConcept(concept);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieName.trim()) {
      setError("Please specify a film or movie name.");
      return;
    }

    const projectTitle = title.trim() || `${movieName} Epic Recap`;
    setLoading(true);
    setError(null);

    try {
      // 1. Generate Storyboard + Script with Gemini Server API
      const response = await fetch("/api/gemini/generate-recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectTitle,
          movieName,
          briefConcept,
          durationType,
          voiceStyle
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate script breakdown. Please try again.");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Script generation failed");
      }

      // 2. Submit new project to persistence API
      const createResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectTitle,
          movieName,
          voiceStyle,
          clips: data.clips,
          selectedBGMId: selectedBGM,
          bgmVolume: 0.3,
          videoFilter: "none"
        })
      });

      const createData = await createResponse.json();
      if (!createData.success) {
        throw new Error(createData.error || "Failed to persist new project");
      }

      onCreated(createData.project);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong creating the script.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="new-project-backdrop" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div id="new-project-card" className="bg-[#0a0a0a] border border-[#222] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#222] flex items-center justify-between bg-[#111]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Create AI Movie Recap</h2>
              <p className="text-xs text-gray-400">Harness Gemini to draft timelines, narrator scripts, and visual prompts</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[#222] rounded-lg text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleGenerate} className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-950/30 border border-red-900/50 rounded-xl text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Quick Inspirations */}
          {!movieName && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest block font-mono">Quick Inspiration Templates</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INSPIRED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.movie}
                    type="button"
                    onClick={() => handleSuggest(prompt.movie, prompt.concept)}
                    className="p-3 bg-[#111] border border-[#222] hover:border-rose-500/50 hover:bg-rose-500/5 hover:text-rose-400 rounded-xl text-left transition text-xs space-y-1 block group"
                  >
                    <div className="font-bold text-white group-hover:text-rose-500 transition-colors">{prompt.movie}</div>
                    <div className="text-gray-400 line-clamp-1">{prompt.concept}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Film Specifications */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">Film / Movie Name *</label>
                <div className="relative">
                  <Film className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Interstellar, Shutter Island..."
                    value={movieName}
                    onChange={(e) => {
                      setMovieName(e.target.value);
                      if (!title) setTitle(`${e.target.value} AI Recap`);
                    }}
                    className="w-full bg-[#111] border border-[#222] focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">Recap Project Title</label>
                <input
                  type="text"
                  placeholder="e.g. Interstellar Widescreen Recap"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-650 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">Custom Storyboard Concept or Target Focus (Optional)</label>
              <textarea
                rows={2}
                placeholder="Suggest specific clips, custom voiceover twists (e.g. 'explain it as if explaining to a 5 year old', 'focus heavily on the shocking plot twist ending')."
                value={briefConcept}
                onChange={(e) => setBriefConcept(e.target.value)}
                className="w-full bg-[#111] border border-[#222] focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-xl p-3 text-xs text-white placeholder-gray-600 outline-none transition resize-none"
              />
            </div>

            {/* Tuning sliders / selections */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#111] p-4 border border-[#222] rounded-xl">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-mono">
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                  <span>Target Length</span>
                </div>
                <div className="space-y-1">
                  {[
                    { val: "short", label: "Short (~30s)" },
                    { val: "medium", label: "Medium (~1m)" },
                    { val: "long", label: "Cinematic (~2m)" }
                  ].map((x) => (
                    <label key={x.val} className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="durationType"
                        checked={durationType === x.val}
                        onChange={() => setDurationType(x.val as any)}
                        className="text-rose-600 focus:ring-0 bg-[#0a0a0a] border-gray-700 checked:bg-rose-600 checked:border-rose-600"
                      />
                      <span className={durationType === x.val ? "text-rose-400 font-medium" : "text-gray-400"}>
                        {x.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-mono">
                  <Mic className="w-3.5 h-3.5 text-rose-500" />
                  <span>Narrative Mood</span>
                </div>
                <div className="space-y-1">
                  {["Dramatic", "Suspenseful", "Enthusiastic", "Calm"].map((x) => (
                    <label key={x} className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="voiceStyle"
                        checked={voiceStyle === x}
                        onChange={() => setVoiceStyle(x)}
                        className="text-rose-600 focus:ring-0 bg-[#0a0a0a] border-gray-700 checked:bg-rose-600 checked:border-rose-600"
                      />
                      <span className={voiceStyle === x ? "text-rose-400 font-medium" : "text-gray-400"}>
                        {x} Narration
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-mono">
                  <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                  <span>BGM Preset</span>
                </div>
                <div className="space-y-1">
                  {[
                    { id: "bgm-suspense", name: "Dark Suspense Theme" },
                    { id: "bgm-epic", name: "Epic Victory Drums" },
                    { id: "bgm-cyberpunk", name: "Cyberpunk Electro" },
                    { id: "bgm-noir", name: "Jazz Sax Noir" }
                  ].map((bg) => (
                    <label key={bg.id} className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="bgm"
                        checked={selectedBGM === bg.id}
                        onChange={() => setSelectedBGM(bg.id)}
                        className="text-rose-600 focus:ring-0 bg-[#0a0a0a] border-gray-700 checked:bg-rose-600 checked:border-rose-600"
                      />
                      <span className={selectedBGM === bg.id ? "text-rose-400 font-medium" : "text-gray-400"}>
                        {bg.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#222] flex items-center justify-end gap-3 bg-[#111] -mx-6 -mb-6 p-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] text-gray-300 rounded-xl text-xs font-semibold transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="relative px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-950/50 disabled:opacity-50 transition group overflow-hidden border border-rose-500/20"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Gemini Writing Script...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-rose-200 group-hover:scale-110 transition-transform" />
                  <span>Generate Recap Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
