import React, { useState } from "react";
import { 
  Film, Plus, Sparkles, Trash2, Calendar, Clock, ArrowRight, Video, 
  Layers, Volume2, Wand2
} from "lucide-react";
import { RecapProject } from "../types";

interface DashboardProps {
  projects: RecapProject[];
  onSelectProject: (proj: RecapProject) => void;
  onOpenNewProject: () => void;
  onDeleteProject: (projId: string) => void;
}

export default function Dashboard({
  projects,
  onSelectProject,
  onOpenNewProject,
  onDeleteProject,
}: DashboardProps) {
  
  // Calculate total duration across all projects
  const totalClips = projects.reduce((acc, p) => acc + (p.clips?.length || 0), 0);
  const totalMinutes = Math.round(projects.reduce((acc, p) => acc + (p.duration || 0), 0) / 60 * 10) / 10;

  return (
    <div className="flex-1 bg-[#0a0a0a] text-[#E0E0E0] min-h-screen font-sans flex flex-col">
      {/* Dynamic Splash Hero and Stats Grid */}
      <div className="bg-gradient-to-b from-[#111] via-[#0a0a0a] to-[#0a0a0a] border-b border-[#222] px-6 py-12 sm:px-12 md:px-16 flex flex-col space-y-8 select-none">
        
        {/* Title Content Header */}
        <div className="max-w-4xl mx-auto w-full flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-[#e11d48] font-bold uppercase bg-rose-500/10 px-2 py-0.5 rounded">
                RecapPro Workspace
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span className="text-[10px] font-mono text-gray-500 font-bold">FFMPEG WORKER ACTIVE</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none">
              Movie Recap Studio
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-xl leading-relaxed">
              Auto-generate cinematic scripts and timeline storyboards using Gemini AI. Synthesize instant narrator voiceovers, align captions, and export viral movie recaps.
            </p>
          </div>

          <button
            onClick={onOpenNewProject}
            className="self-start md:self-center px-6 py-3 bg-rose-600 hover:bg-rose-700 hover:scale-105 active:scale-95 text-white rounded-xl text-xs font-bold font-sans flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-all cursor-pointer border border-rose-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Recap</span>
          </button>
        </div>

        {/* Studio Telemetry Stats Cards Grid */}
        <div className="max-w-4xl mx-auto w-full grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
          <div className="bg-[#111] p-5 border border-[#222] rounded-xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-rose-500/10 rounded-lg text-rose-500">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Edited Recaps</div>
              <div className="text-xl font-bold text-white mt-0.5">{projects.length}</div>
            </div>
          </div>

          <div className="bg-[#111] p-5 border border-[#222] rounded-xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-rose-500/10 rounded-lg text-rose-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Scenes</div>
              <div className="text-xl font-bold text-white mt-0.5">{totalClips}</div>
            </div>
          </div>

          <div className="bg-[#111] p-5 border border-[#222] rounded-xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Compiled Output</div>
              <div className="text-xl font-bold text-white mt-0.5">{totalMinutes}m</div>
            </div>
          </div>
        </div>

      </div>

      {/* RECAPS GRID INDEX & VIEWS LIST */}
      <div className="flex-1 p-6 sm:p-12 md:px-16 max-w-4xl mx-auto w-full space-y-6">
        <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider font-mono">
          Interactive Production Workspaces
        </h2>

        {projects.length === 0 ? (
          <div className="border border-dashed border-[#222] bg-[#111]/40 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-rose-950/20 text-rose-500 rounded-full">
              <Video className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-white">No Movie Recaps Generated Yet</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                Get started by clicking generated templates or start a blank recap by searching names!
              </p>
            </div>
            <button
              onClick={onOpenNewProject}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow transition cursor-pointer"
            >
              Start First Movie Recap
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                className="group relative bg-[#111] border border-[#222] hover:border-rose-500/50 hover:bg-rose-950/5 rounded-2xl p-5 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[160px]"
              >
                <div>
                  {/* Top indicators */}
                  <div className="flex items-center justify-between mb-3 text-2xs font-mono text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-650" />
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded font-bold uppercase">
                      {project.clips?.length || 0} Clips
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-white group-hover:text-rose-500 transition-colors leading-tight">
                    {project.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 italic">
                    Movie: {project.movieName}
                  </p>
                </div>

                {/* Footer specs / items */}
                <div className="flex items-center justify-between mt-5 pt-3 border-t border-[#222]">
                  <div className="flex items-center gap-3.5 text-[10px] text-gray-500 font-mono">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      <span>{project.duration}s</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="capitalize">{project.voiceStyle}</span>
                    </div>
                  </div>

                  {/* Delete / Open handles */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                      className="p-1.5 bg-[#0a0a0a] hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-[#222] hover:border-red-500/30 rounded-lg transition"
                      title="Delete recap project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-1.5 bg-rose-600/10 text-rose-500 rounded-lg border border-rose-500/20 group-hover:bg-rose-600 group-hover:text-white transition group-hover:scale-105">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
