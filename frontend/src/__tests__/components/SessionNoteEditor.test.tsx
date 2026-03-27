import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionNoteEditor from '@/components/replay/SessionNoteEditor';

const mockUpdateNote = jest.fn();
const mockUpdateTags = jest.fn();
jest.mock('@/lib/api', () => ({
  updateSessionNote: (...a: unknown[]) => mockUpdateNote(...a),
  updateSessionTags: (...a: unknown[]) => mockUpdateTags(...a),
}));

const SESSION_ID = 'sess-123';

describe('SessionNoteEditor', () => {
  beforeEach(() => {
    mockUpdateNote.mockClear().mockResolvedValue(undefined);
    mockUpdateTags.mockClear().mockResolvedValue(undefined);
  });

  it('renders textarea with existing note text', () => {
    render(<SessionNoteEditor sessionId={SESSION_ID} initialNote="existing note" initialTags={[]} />);
    expect(screen.getByTestId('note-textarea')).toHaveValue('existing note');
  });

  it('renders empty textarea when no initial note', () => {
    render(<SessionNoteEditor sessionId={SESSION_ID} />);
    expect(screen.getByTestId('note-textarea')).toHaveValue('');
  });

  it('renders active tag with correct label', () => {
    render(<SessionNoteEditor sessionId={SESSION_ID} initialTags={['bug']} />);
    expect(screen.getByTestId('tag-button-bug')).toBeInTheDocument();
  });

  it('renders all 5 tag buttons', () => {
    render(<SessionNoteEditor sessionId={SESSION_ID} />);
    expect(screen.getByTestId('tag-button-bug')).toBeInTheDocument();
    expect(screen.getByTestId('tag-button-important')).toBeInTheDocument();
    expect(screen.getByTestId('tag-button-reviewed')).toBeInTheDocument();
    expect(screen.getByTestId('tag-button-followup')).toBeInTheDocument();
    expect(screen.getByTestId('tag-button-ux-issue')).toBeInTheDocument();
  });

  it('clicking an inactive tag calls updateSessionTags with it added', async () => {
    render(<SessionNoteEditor sessionId={SESSION_ID} initialTags={[]} />);
    await userEvent.click(screen.getByTestId('tag-button-bug'));
    await waitFor(() => expect(mockUpdateTags).toHaveBeenCalledWith(SESSION_ID, ['bug']));
  });

  it('clicking an active tag calls updateSessionTags with it removed', async () => {
    render(<SessionNoteEditor sessionId={SESSION_ID} initialTags={['bug', 'reviewed']} />);
    await userEvent.click(screen.getByTestId('tag-button-bug'));
    await waitFor(() => expect(mockUpdateTags).toHaveBeenCalledWith(SESSION_ID, ['reviewed']));
  });

  it('Save Note button calls updateSessionNote with textarea content', async () => {
    render(<SessionNoteEditor sessionId={SESSION_ID} initialNote="" />);
    await userEvent.type(screen.getByTestId('note-textarea'), 'new note');
    await userEvent.click(screen.getByTestId('save-note-button'));
    await waitFor(() => expect(mockUpdateNote).toHaveBeenCalledWith(SESSION_ID, 'new note'));
  });

  it('shows Saved indicator after successful save', async () => {
    render(<SessionNoteEditor sessionId={SESSION_ID} />);
    await userEvent.click(screen.getByTestId('save-note-button'));
    await waitFor(() => expect(screen.getByTestId('note-saved')).toBeInTheDocument());
  });

  it('shows error message when note API call fails', async () => {
    mockUpdateNote.mockRejectedValue(new Error('Network error'));
    render(<SessionNoteEditor sessionId={SESSION_ID} />);
    await userEvent.click(screen.getByTestId('save-note-button'));
    await waitFor(() => expect(screen.getByTestId('note-error')).toBeInTheDocument());
  });
});
