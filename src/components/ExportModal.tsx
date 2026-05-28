import React, { useEffect, useState, useRef } from "react";
import { X, CheckCircle, AlertTriangle, Disc, Terminal, Video, Download } from "lucide-react";
import { ExportTask } from "../types";

interface ExportModalProps {
  projectId: string;
  onClose: () => void;
}

export default function ExportModal({ projectId, onClose }: ExportModalProps) {
  const [task, setTask] = useState<ExportTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let pollInterval: NodeJS.Timeout;

    const startExport = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/export`, {
          method: "POST"
        });
        if (!res.ok) throw new Error("Could not initialize video render pipeline.");
        const data = await res.json();
        if (!data.success) throw new Error("Render pipeline rejected request.");

        // Poll task status
        const poll = async () => {
          try {
            const statusRes = await fetch(`/api/exports/${data.exportId}`);
            if (!statusRes.ok) return;
            const statusData = await statusRes.json();
            if (active) {
              setTask(statusData);
              if (statusData.status === "completed" || statusData.status === "failed") {
                clearInterval(pollInterval);
              }
            }
          } catch (pollErr) {
            console.error("Polling error:", pollErr);
          }
        };

        poll();
        pollInterval = setInterval(poll, 1000);
      } catch (err: any) {
        if (active) {
          setError(err.message || "Unknown rendering exception");
        }
      }
    };

    startExport();

    return () => {
      active = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [projectId]);

  // Scroll terminal logs to bottom on update
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [task?.logLines]);

  return (
    <div id="export-backdrop" className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div id="export-card" className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#222] flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
              <Video className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Movie Recap Export Panel</h2>
              <p className="text-xs text-gray-400">Rendering storyboard components, burning subtitles, and mixing audio</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[#222] rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Display Layout */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Diagnostic Log Term Terminal */}
          <div className="lg:col-span-3 flex flex-col bg-black border border-[#222] rounded-xl overflow-hidden min-h-[300px] max-h-[450px]">
            <div className="px-4 py-2 border-b border-[#222] bg-[#0a0a0a] flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-mono">
                <Terminal className="w-3.5 h-3.5" />
                <span>render-queue@ffmpeg-worker</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="w-2 h-2 rounded-full bg-green-500" />
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed text-gray-300 space-y-2 select-text bg-black">
              {error ? (
                <div className="text-red-400 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>CRITICAL ERROR: {error}</span>
                </div>
              ) : task ? (
                task.logLines.map((line, idx) => {
                  let colorClass = "text-gray-400";
                  if (line.includes("FFmpeg")) colorClass = "text-rose-400 font-medium";
                  if (line.includes("Completed")) colorClass = "text-green-400 font-semibold animate-pulse";
                  if (line.includes("applying") || line.includes("Applying")) colorClass = "text-yellow-400";
                  return (
                    <div key={idx} className={colorClass}>
                      {line}
                    </div>
                  );
                })
              ) : (
                <div className="text-gray-600 animate-pulse">Establishing worker queue handshake...</div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Render Summary & Preview Screen */}
          <div className="lg:col-span-2 flex flex-col justify-between space-y-6">
            {/* Status Card */}
            <div className="bg-black p-5 border border-[#222] rounded-xl flex flex-col items-center text-center">
              {task?.status === "completed" ? (
                <div className="p-3 bg-green-500/10 text-green-400 rounded-full mb-3">
                  <CheckCircle className="w-10 h-10" />
                </div>
              ) : (
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full mb-3 animate-spin">
                  <Disc className="w-10 h-10" />
                </div>
              )}

              <h3 className="font-bold text-sm text-white">
                {task?.status === "completed" 
                  ? "Recap Export Successful!" 
                  : `Exporting Video (${task?.progress || 0}%)`}
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[250px] leading-normal">
                {task?.status === "completed" 
                  ? "Your cinema edit file is fully formatted and mixed as a streamable mp4 file." 
                  : "Stitching frame references and synchronizing vocal waveform files with custom subtitles structure."}
              </p>

              {/* Progress Indicator */}
              <div className="w-full bg-[#0a0a0a] h-2 rounded-full mt-5 overflow-hidden border border-[#222]">
                <div 
                  className="bg-rose-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${task?.progress || 0}%` }}
                />
              </div>
            </div>

            {/* Video Preview Canvas Player */}
            {task?.status === "completed" && task.outputUrl && (
              <div className="border border-[#222] rounded-xl overflow-hidden bg-black flex flex-col shadow-inner">
                <div className="px-3.5 py-1.5 bg-[#111] border-b border-[#222] flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold text-gray-400">PREVIEW OUTPUT RECAPPING</span>
                  <span className="text-[10px] font-mono bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded uppercase font-bold">MP4 Widescreen</span>
                </div>
                
                {/* Simulated Final Video Stream */}
                <div className="relative aspect-video bg-gray-950 flex items-center justify-center">
                  <video 
                    src={task.outputUrl} 
                    className="w-full h-full object-cover" 
                    controls 
                    autoPlay 
                    loop
                    muted
                  />
                  <div className="absolute inset-x-4 bottom-10 text-center bg-black/80 px-3 py-1.5 rounded-lg border border-white/5 text-white text-xs backdrop-blur-sm shadow font-sans">
                    "And so, his discovery would overwrite all human history..."
                  </div>
                </div>

                <div className="p-3 bg-[#0a0a0a] flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-mono">Format: H.264 AAC Audio</span>
                  <a
                    href={task.outputUrl}
                    download="recap.mp4"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Recap</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-[#222] bg-[#0a0a0a]/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#222] hover:bg-[#333] border border-[#333] text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            {task?.status === "completed" ? "Close & View Workspace" : "Run in Background"}
          </button>
        </div>
      </div>
    </div>
  );
}
