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
    const payload = JSON.parse(atob(token.split('.')[1]));
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
    <div ref={containerRef} className="relative px-3 py-3 border-b border-slate-700">
      <button
        onClick={() => { setOpen((v) => !v); setCreating(false); setError(null); }}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-800 transition-colors"
        data-testid="project-switcher-trigger"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen size={14} className="text-slate-400 flex-shrink-0" />
          <span className="truncate font-medium">
            {currentProject?.name ?? 'Loading…'}
          </span>
        </div>
        <ChevronDown size={13} className={`text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-3 right-3 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
          data-testid="project-dropdown"
        >
          {/* Project list */}
          <ul className="py-1 max-h-48 overflow-y-auto">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => handleSwitch(p.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                  data-testid={`project-option-${p.id}`}
                >
                  <Check
                    size={13}
                    className={p.id === currentId ? 'text-brand-400' : 'invisible'}
                  />
                  <span className="truncate">{p.name}</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Divider + New project */}
          <div className="border-t border-slate-700 py-1">
            {creating ? (
              <form onSubmit={handleCreate} className="px-3 py-2 space-y-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Project name"
                  className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  data-testid="new-project-input"
                />
                {error && <p className="text-xs text-red-400" data-testid="new-project-error">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-1 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
                    data-testid="create-project-submit"
                  >
                    {saving ? '…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCreating(false); setError(null); setNewName(''); }}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
                data-testid="new-project-button"
              >
                <Plus size={13} />
                New Project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
