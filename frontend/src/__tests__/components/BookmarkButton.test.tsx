import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookmarkButton from '@/components/sessions/BookmarkButton';

const mockToggle = jest.fn();
jest.mock('@/lib/api', () => ({ toggleBookmark: (id: string) => mockToggle(id) }));

describe('BookmarkButton', () => {
  beforeEach(() => mockToggle.mockClear());

  it('renders outline bookmark when bookmarked = false', () => {
    render(<BookmarkButton sessionId="s1" bookmarked={false} />);
    expect(screen.getByTestId('bookmark-outline')).toBeInTheDocument();
  });

  it('renders filled bookmark when bookmarked = true', () => {
    render(<BookmarkButton sessionId="s1" bookmarked={true} />);
    expect(screen.getByTestId('bookmark-filled')).toBeInTheDocument();
  });

  it('calls toggleBookmark with session id on click', async () => {
    mockToggle.mockResolvedValue({ bookmarked: true });
    render(<BookmarkButton sessionId="s1" bookmarked={false} />);
    await userEvent.click(screen.getByTestId('bookmark-button'));
    expect(mockToggle).toHaveBeenCalledWith('s1');
  });

  it('optimistically shows filled state before API response', async () => {
    let resolve!: (v: { bookmarked: boolean }) => void;
    mockToggle.mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<BookmarkButton sessionId="s1" bookmarked={false} />);
    await userEvent.click(screen.getByTestId('bookmark-button'));
    expect(screen.getByTestId('bookmark-filled')).toBeInTheDocument();
    resolve({ bookmarked: true });
  });

  it('reverts to original state if API call fails', async () => {
    mockToggle.mockRejectedValue(new Error('Network error'));
    render(<BookmarkButton sessionId="s1" bookmarked={false} />);
    await userEvent.click(screen.getByTestId('bookmark-button'));
    await waitFor(() => {
      expect(screen.getByTestId('bookmark-outline')).toBeInTheDocument();
    });
  });

  it('stops propagation so parent link is not triggered', async () => {
    mockToggle.mockResolvedValue({ bookmarked: true });
    const parentClick = jest.fn();
    render(
      <div onClick={parentClick}>
        <BookmarkButton sessionId="s1" bookmarked={false} />
      </div>
    );
    await userEvent.click(screen.getByTestId('bookmark-button'));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
