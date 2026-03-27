import { toCsv } from '../../lib/csv';

describe('toCsv', () => {
  it('returns header row as first line', () => {
    const csv = toCsv(['id', 'name'], []);
    expect(csv.split('\n')[0]).toBe('id,name');
  });

  it('returns one data row per object', () => {
    const csv = toCsv(['id', 'name'], [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it('escapes values containing commas with double quotes', () => {
    const csv = toCsv(['v'], [{ v: 'hello, world' }]);
    expect(csv).toContain('"hello, world"');
  });

  it('escapes double-quote characters by doubling them', () => {
    const csv = toCsv(['v'], [{ v: 'say "hi"' }]);
    expect(csv).toContain('"say ""hi"""');
  });

  it('converts null and undefined to empty strings', () => {
    const csv = toCsv(['a', 'b'], [{ a: null, b: undefined }]);
    expect(csv.split('\n')[1]).toBe(',');
  });

  it('handles empty rows array — returns header only', () => {
    const csv = toCsv(['id'], []);
    expect(csv).toBe('id');
  });

  it('escapes values containing newlines', () => {
    const csv = toCsv(['v'], [{ v: 'line1\nline2' }]);
    expect(csv).toContain('"line1');
  });

  it('does not quote plain values without special characters', () => {
    const csv = toCsv(['id', 'name'], [{ id: '123', name: 'Alice' }]);
    expect(csv.split('\n')[1]).toBe('123,Alice');
  });
});
