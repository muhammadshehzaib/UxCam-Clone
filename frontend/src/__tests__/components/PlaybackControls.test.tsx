import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlaybackControls from '@/components/replay/PlaybackControls';

const defaultProps = {
  isPlaying: false,
  currentTimeMs: 0,
  durationMs: 120000,
  speed: 1,
  onPlay: jest.fn(),
  onPause: jest.fn(),
  onSeek: jest.fn(),
  onSetSpeed: jest.fn(),
};

describe('PlaybackControls', () => {
  it('shows Play button when not playing', () => {
    render(<PlaybackControls {...defaultProps} />);
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
    expect(screen.queryByLabelText('Pause')).not.toBeInTheDocument();
  });

  it('shows Pause button when playing', () => {
    render(<PlaybackControls {...defaultProps} isPlaying={true} />);
    expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    expect(screen.queryByLabelText('Play')).not.toBeInTheDocument();
  });

  it('calls onPlay when Play is clicked', async () => {
    const onPlay = jest.fn();
    render(<PlaybackControls {...defaultProps} onPlay={onPlay} />);
    await userEvent.click(screen.getByLabelText('Play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('calls onPause when Pause is clicked', async () => {
    const onPause = jest.fn();
    render(<PlaybackControls {...defaultProps} isPlaying={true} onPause={onPause} />);
    await userEvent.click(screen.getByLabelText('Pause'));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('calls onSetSpeed with correct value when speed button clicked', async () => {
    const onSetSpeed = jest.fn();
    render(<PlaybackControls {...defaultProps} onSetSpeed={onSetSpeed} />);
    await userEvent.click(screen.getByText('2×'));
    expect(onSetSpeed).toHaveBeenCalledWith(2);
  });

  it('calls onSeek(0) when restart button is clicked', async () => {
    const onSeek = jest.fn();
    render(<PlaybackControls {...defaultProps} onSeek={onSeek} />);
    await userEvent.click(screen.getByLabelText('Restart'));
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  it('displays current time and total duration', () => {
    render(<PlaybackControls {...defaultProps} currentTimeMs={30000} durationMs={120000} />);
    expect(screen.getByText('00:30 / 02:00')).toBeInTheDocument();
  });

  it('highlights the active speed button', () => {
    render(<PlaybackControls {...defaultProps} speed={2} />);
    const btn = screen.getByText('2×');
    expect(btn.className).toContain('bg-brand-600');
  });
});
