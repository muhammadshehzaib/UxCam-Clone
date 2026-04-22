'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus, Check, FolderOpen } from 'lucide-react';
import { getProjects, createProject, switchProject } from '@/lib/api';
import { setToken, getToken } from '@/lib/auth';
import { Project } from '@/types';

function getCurrentProjectId(): string {
  const token = getToken();
  if (!token) return '';
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return '';
    const payload = JSON.parse(atob(parts[1]));
    return payload.projectId ?? '';
  } catch {
    return '';
  }
}

export default function ProjectSwitcher() {
  const router = useRouter();

  const [projects,    setProjects]    = useState<Project[]>([]);
  const [currentId,   setCurrentId]   = useState<string>('');
  const [open,        setOpen]        = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentId(getCurrentProjectId());
    getProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentProject = projects.find((p) => p.id === currentId);

  async function handleSwitch(projectId: string) {
    if (projectId === currentId) { setOpen(false); return; }
    try {
      const { token } = await switchProject(projectId);
      setToken(token);
      setCurrentId(projectId);
      setOpen(false);
      router.push('/dashboard');
      router.refresh();
    } catch {
      // silently ignore — user can retry
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) { setError('Enter a project name'); return; }
    setSaving(true);
    setError(null);
    try {
      const { token, project } = await createProject(newName.trim());
      setToken(token);
      setProjects((prev) => [...prev, project]);
      setCurrentId(project.id);
      setNewName('');
      setCreating(false);
      setOpen(false);
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Failed to create project');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => { setOpen((v) => !v); setCreating(false); setError(null); }}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/5 transition-all duration-200"
        data-testid="project-trigger"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-slate-400">
            <FolderOpen size={12} />
          </div>
          <span className="truncate font-medium tracking-tight">
            {currentProject?.name ?? 'Loading…'}
          </span>
        </div>
        <ChevronDown size={14} className={`text-slate-500 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
          data-testid="project-dropdown"
        >
          {/* Project list */}
          <div className="p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSwitch(p.id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs rounded-xl transition-all duration-200 group ${
                  p.id === currentId 
                    ? 'bg-brand-500/10 text-brand-400' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
                data-testid={`project-option-${p.id}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full transition-all ${p.id === currentId ? 'bg-brand-500 scale-100' : 'bg-slate-700 scale-50 group-hover:scale-75'}`} />
                <span className="truncate font-medium">{p.name}</span>
                {p.id === currentId && <Check size={12} className="ml-auto text-brand-500" />}
              </button>
            ))}
          </div>

          {/* New project handler */}
          <div className="p-1.5 border-t border-white/5 bg-white/[0.02]">
            {creating ? (
              <form onSubmit={handleCreate} className="p-2 space-y-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Project name"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-white/10 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50 transition-all"
                />
                {error && <p className="text-[10px] text-red-400 font-medium px-1 px-1">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-1.5 text-xs brand-gradient text-white font-bold rounded-lg shadow-bloom hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {saving ? '…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCreating(false); setError(null); setNewName(''); }}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-all group"
                data-testid="new-project-button"
              >
                <div className="w-5 h-5 rounded-md border border-dashed border-slate-700 flex items-center justify-center text-slate-500 group-hover:border-slate-500 group-hover:text-slate-300">
                  <Plus size={12} />
                </div>
                New Project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
