'use client';

import { useState } from 'react';
import { updateSessionNote, updateSessionTags } from '@/lib/api';
import { TAG_OPTIONS } from '@/types';

interface SessionNoteEditorProps {
  sessionId:    string;
  initialNote?: string;
  initialTags?: string[];
}

export default function SessionNoteEditor({
  sessionId,
  initialNote = '',
  initialTags = [],
}: SessionNoteEditorProps) {
  const [note,        setNote]        = useState(initialNote);
  const [activeTags,  setActiveTags]  = useState<string[]>(initialTags);
  const [noteSaving,  setNoteSaving]  = useState(false);
  const [noteSaved,   setNoteSaved]   = useState(false);
  const [noteError,   setNoteError]   = useState<string | null>(null);

  async function handleSaveNote() {
    setNoteSaving(true);
    setNoteError(null);
    try {
      await updateSessionNote(sessionId, note);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch {
      setNoteError('Failed to save note');
    } finally {
      setNoteSaving(false);
    }
  }

  async function toggleTag(tagId: string) {
    const next = activeTags.includes(tagId)
      ? activeTags.filter((t) => t !== tagId)
      : [...activeTags, tagId];
    setActiveTags(next);
    try {
      await updateSessionTags(sessionId, next);
    } catch {
      // Revert on failure
      setActiveTags(activeTags);
    }
  }

  return (
    <div className="border-t border-slate-200 pt-4 mt-4 space-y-4">
      {/* Tags */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tags</p>
        <div className="flex flex-wrap gap-1.5">
          {TAG_OPTIONS.map((tag) => {
            const active = activeTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? 'text-white border-transparent'
                    : 'text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
                style={active ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                data-testid={`tag-button-${tag.id}`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Note */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Note</p>
        <textarea
          value={note}
          onChange={(e) => { setNote(e.target.value); setNoteSaved(false); }}
          placeholder="Add a note about this session…"
          rows={3}
          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 placeholder-slate-400"
          data-testid="note-textarea"
        />
        <div className="flex items-center justify-between mt-1.5">
          {noteError ? (
            <p className="text-xs text-red-500" data-testid="note-error">{noteError}</p>
          ) : noteSaved ? (
            <p className="text-xs text-emerald-600" data-testid="note-saved">Saved</p>
          ) : (
            <span />
          )}
          <button
            onClick={handleSaveNote}
            disabled={noteSaving}
            className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
            data-testid="save-note-button"
          >
            {noteSaving ? 'Saving…' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
}
