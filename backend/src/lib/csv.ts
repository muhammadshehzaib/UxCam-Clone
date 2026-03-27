/**
 * Minimal CSV serialiser — no external dependencies.
 * Handles commas, double-quotes, and newlines in values.
 */
export function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  function escape(value: unknown): string {
    if (value == null) return '';
    const s = String(value);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const lines: string[] = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];

  return lines.join('\n');
}
