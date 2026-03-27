'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { toggleBookmark } from '@/lib/api';

interface BookmarkButtonProps {
  sessionId:    string;
  bookmarked:   boolean;
  size?:        number;
  className?:   string;
}

export default function BookmarkButton({
  sessionId,
  bookmarked:   initialBookmarked,
  size = 14,
  className = '',
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading,    setLoading]    = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const optimistic = !bookmarked;
    setBookmarked(optimistic); // optimistic update
    setLoading(true);
    try {
      const result = await toggleBookmark(sessionId);
      setBookmarked(result.bookmarked);
    } catch {
      setBookmarked(!optimistic); // revert on failure
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark session'}
      className={`p-1.5 transition-colors disabled:opacity-40 ${
        bookmarked
          ? 'text-amber-500 hover:text-amber-600'
          : 'text-slate-400 hover:text-amber-500'
      } ${className}`}
      data-testid="bookmark-button"
    >
      <Bookmark
        size={size}
        fill={bookmarked ? 'currentColor' : 'none'}
        data-testid={bookmarked ? 'bookmark-filled' : 'bookmark-outline'}
      />
    </button>
  );
}
