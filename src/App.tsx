import React, { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import Editor from "./components/Editor";
import NewProjectModal from "./components/NewProjectModal";
import { RecapProject, BGMTrack } from "./types";
import { Film } from "lucide-react";

export default function App() {
  const [projects, setProjects] = useState<RecapProject[]>([]);
  const [bgmLibrary, setBgmLibrary] = useState<BGMTrack[]>([]);
  const [selectedProject, setSelectedProject] = useState<RecapProject | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initial fetch of projects on load
  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setBgmLibrary(data.bgmLibrary || []);
      }
    } catch (err) {
      console.error("Failed fetching recaps from node database API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Update a single project locally & sync choice
  const handleUpdateProject = (updatedProject: RecapProject) => {
    // Update local state with modified project
    setProjects(projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    setSelectedProject(updatedProject);
    
    // Auto-save silently in the background
    fetch(`/api/projects/${updatedProject.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProject)
    }).catch((err) => console.log("Silent auto-save failed:", err));
  };

  // Delete project trigger
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this recap project? This action is permanent.")) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== projectId));
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
        }
      }
    } catch (err) {
      console.error("Failed deleting project", err);
    }
  };

  // Callback when new project is created
  const handleProjectCreated = (newProject: RecapProject) => {
    setProjects([newProject, ...projects]);
    setSelectedProject(newProject);
    setShowNewProjectModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center font-sans text-gray-400 space-y-4">
        <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 animate-pulse">
          <Film className="w-8 h-8 animate-spin" />
        </div>
        <p className="text-xs font-mono uppercase tracking-widest text-purple-400 font-bold animate-pulse">
          Opening Cabinets... Loading Movie Recap Studio
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 min-h-screen select-none font-sans overflow-x-hidden">
      {selectedProject ? (
        <Editor
          project={selectedProject}
          bgmLibrary={bgmLibrary}
          onBack={() => {
            setSelectedProject(null);
            fetchProjects(); // Refresh index list
          }}
          onUpdateProject={handleUpdateProject}
        />
      ) : (
        <Dashboard
          projects={projects}
          onSelectProject={(proj) => setSelectedProject(proj)}
          onOpenNewProject={() => setShowNewProjectModal(true)}
          onDeleteProject={handleDeleteProject}
        />
      )}

      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  );
}
