'use client';

import { useState, useEffect } from 'react';
import { formatDateTime, formatDate } from '@/lib/utils';

interface LocalDateProps {
  date: string | null | undefined;
  showTime?: boolean;
}

/**
 * Renders a date string in the user's local timezone.
 * Uses useEffect to avoid SSR hydration mismatches.
 */
export default function LocalDate({ date, showTime = true }: LocalDateProps) {
  const [formatted, setFormatted] = useState<string>('—');

  useEffect(() => {
    if (!date) {
      setFormatted('—');
      return;
    }
    
    setFormatted(showTime ? formatDateTime(date) : formatDate(date));
  }, [date, showTime]);

  // While rendering on server or before mount, show an empty span or placeholder
  // to prevent the jump from UTC to Local which causes hydration errors.
  return <span title={date ?? undefined}>{formatted}</span>;
}
