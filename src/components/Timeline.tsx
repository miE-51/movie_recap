import React from "react";
import { Film, Mic, Music, AlignLeft, Clock, Plus, Minus, CheckCircle, Disc, AlertCircle } from "lucide-react";
import { RecapClip, BGMTrack } from "../types";

interface TimelineProps {
  clips: RecapClip[];
  selectedClipIndex: number;
  onSelectClip: (idx: number) => void;
  onUpdateClipDuration: (idx: number, delta: number) => void;
  selectedBGM: BGMTrack | undefined;
  bgmVolume: number;
  onChangeBGMVolume: (vol: number) => void;
  onGenerateTTS: (idx: number) => void;
}

export default function Timeline({
  clips,
  selectedClipIndex,
  onSelectClip,
  onUpdateClipDuration,
  selectedBGM,
  bgmVolume,
  onChangeBGMVolume,
  onGenerateTTS
}: TimelineProps) {
  
  // Compute cumulative times to show timeline markers (e.g. 0s, 10s, 20s...)
  let cumulativeTime = 0;
  const timeMarkers: number[] = [0];
  const clipTimeSegments = clips.map((clip) => {
    const start = cumulativeTime;
    cumulativeTime += clip.duration;
    timeMarkers.push(cumulativeTime);
    return { start, end: cumulativeTime, duration: clip.duration };
  });

  const totalDuration = cumulativeTime;

  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl p-5 flex flex-col space-y-4 shadow-xl">
      {/* Timeline Controls & Key Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-rose-500" />
          <span className="text-xs font-bold text-gray-200 uppercase tracking-widest font-mono">Multi-Track Editor</span>
          <span className="text-[10px] font-mono bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded font-bold uppercase">
            {totalDuration}s Total Length
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-rose-650 rounded" />
            <span>Video Track</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded" />
            <span>Voice Track</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded" />
            <span>Sound Score</span>
          </div>
        </div>
      </div>

      {/* RULER / TIMECODE MARKERS */}
      <div className="relative h-5 border-b border-[#222] font-mono text-[9px] text-gray-600">
        <div className="absolute inset-0 flex select-none">
          {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map((_, idx) => {
            const timeVal = idx * 5;
            if (timeVal > totalDuration) return null;
            const pct = (timeVal / totalDuration) * 100;
            return (
              <div 
                key={idx} 
                className="absolute border-l border-[#222] h-2.5 pt-3 pl-1 -translate-x-1/2"
                style={{ left: `${pct}%` }}
              >
                {timeVal}s
              </div>
            );
          })}
        </div>
      </div>

      {/* TIMELINE TRACKS container */}
      <div className="space-y-3.5 pt-1.5">
        
        {/* TRACK 1: VIDEO CLIPS TRACK */}
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-2 flex items-center gap-2 text-gray-500">
            <Film className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-2xs font-bold tracking-wider uppercase font-mono">Video 1</span>
          </div>
          
          <div className="col-span-10 flex gap-1 bg-black p-1 border border-[#222] rounded-lg min-h-[50px] overflow-hidden">
            {clips.map((clip, idx) => {
              const selected = idx === selectedClipIndex;
              const widthPct = (clip.duration / totalDuration) * 100;
              return (
                <div
                  key={clip.id}
                  onClick={() => onSelectClip(idx)}
                  className={`relative cursor-pointer flex flex-col justify-between p-2 rounded-md transition duration-200 group border h-11 ${
                    selected 
                      ? "bg-rose-950/20 border-rose-500 text-rose-300 shadow-lg shadow-rose-950/20" 
                      : "bg-[#111] border-[#222] hover:border-[#333] text-gray-400"
                  }`}
                  style={{ width: `${widthPct}%`, minWidth: "90px" }}
                >
                  <div className="flex items-center justify-between text-2xs truncate font-medium">
                    <span className="font-bold">S{clip.sceneNumber}: {clip.title}</span>
                    <span className="font-mono text-[9px] text-gray-500">{clip.duration}s</span>
                  </div>

                  {/* Sizing trimmer indicators inside */}
                  <div className="flex items-center justify-between mt-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      title="Shrink clip"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateClipDuration(idx, -1);
                      }}
                      className="p-0.5 bg-[#222] text-gray-400 hover:text-white rounded transition"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      title="Extend clip"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateClipDuration(idx, 1);
                      }}
                      className="p-0.5 bg-[#222] text-gray-400 hover:text-white rounded transition"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TRACK 2: AI NARRATION VOICE TRACK */}
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-2 flex items-center gap-2 text-gray-500">
            <Mic className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-2xs font-bold tracking-wider uppercase font-mono">Narration</span>
          </div>

          <div className="col-span-10 flex gap-1 bg-black p-1 border border-[#222] rounded-lg min-h-[46px]">
            {clips.map((clip, idx) => {
              const widthPct = (clip.duration / totalDuration) * 100;
              return (
                <div
                  key={clip.id}
                  onClick={() => onSelectClip(idx)}
                  className={`h-9 rounded-md border flex items-center justify-between p-2 cursor-pointer transition ${
                    clip.audioStatus === "completed"
                      ? "bg-amber-950/20 border-amber-500/50 text-amber-200"
                      : clip.audioStatus === "generating"
                      ? "bg-[#111] border-yellow-500/70 text-yellow-300 shadow-inner"
                      : "bg-[#0a0a0a] border-[#222] text-gray-600 hover:border-[#333]"
                  }`}
                  style={{ width: `${widthPct}%`, minWidth: "90px" }}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {clip.audioStatus === "completed" ? (
                      <CheckCircle className="w-3 h-3 text-amber-400 shrink-0" />
                    ) : clip.audioStatus === "generating" ? (
                      <Disc className="w-3 h-3 text-yellow-500 shrink-0 animate-spin" />
                    ) : (
                      <Mic className="w-3 h-3 text-gray-600 shrink-0" />
                    )}
                    <span className="text-[10px] truncate font-sans font-medium">
                      {clip.audioStatus === "completed" 
                        ? `${clip.voiceName}` 
                        : clip.audioStatus === "generating" 
                        ? "Synthesizing" 
                        : "Click Synth"}
                    </span>
                  </div>

                  {clip.audioStatus === "idle" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGenerateTTS(idx);
                      }}
                      className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 font-bold border border-yellow-500/30 rounded text-[9px] font-mono transition uppercase shrink-0"
                    >
                      TTS
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* TRACK 3: BGM AUDIO track */}
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-2 flex items-center gap-4 text-gray-500">
            <div className="flex items-center gap-2">
              <Music className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-2xs font-bold tracking-wider uppercase font-mono">BGM Senders</span>
            </div>
          </div>

          <div className="col-span-10 flex bg-black border border-[#222] rounded-lg p-2 items-center justify-between h-10">
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-2xs text-emerald-400 font-mono font-bold truncate">
                {selectedBGM ? selectedBGM.name : "No Background Track Selected"}
              </span>
              <span className="text-[10px] text-gray-600">
                ({selectedBGM ? selectedBGM.genre : "N/A"})
              </span>
            </div>

            {/* Volume Mixer Controls */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-600 font-mono">Volume</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={bgmVolume}
                onChange={(e) => onChangeBGMVolume(parseFloat(e.target.value))}
                className="w-24 h-1 bg-[#222] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-[10px] text-gray-400 font-mono font-bold w-6 text-right">
                {Math.round(bgmVolume * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* TRACK 4: BURNED INTERACTIVE SUBTITLES TRACK */}
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-2 flex items-center gap-2 text-gray-500">
            <AlignLeft className="w-3.5 h-3.5 text-sky-450" />
            <span className="text-2xs font-bold tracking-wider uppercase font-mono">Subtitles</span>
          </div>

          <div className="col-span-10 flex gap-1 bg-black p-1 border border-[#222] rounded-lg min-h-[30px] select-none">
            {clips.map((clip, idx) => {
              const widthPct = (clip.duration / totalDuration) * 100;
              return (
                <div
                  key={clip.id}
                  onClick={() => onSelectClip(idx)}
                  className={`h-6 rounded border flex items-center p-2 cursor-pointer transition text-[9px] font-sans truncate ${
                    idx === selectedClipIndex
                      ? "bg-rose-950/20 border-rose-500/40 text-rose-300"
                      : "bg-[#111] border-[#222] text-gray-550 hover:border-[#333]"
                  }`}
                  style={{ width: `${widthPct}%`, minWidth: "90px" }}
                >
                  "{clip.subtitle || "Empty subtitle caption"}"
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
