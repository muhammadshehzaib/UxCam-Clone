import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApiKeyCard from '@/components/settings/ApiKeyCard';

const mockRegenerate = jest.fn();
jest.mock('@/lib/api', () => ({ regenerateApiKey: (id: string) => mockRegenerate(id) }));

const INITIAL_KEY = 'proj_abc123def456789012345678901234';

describe('ApiKeyCard', () => {
  beforeEach(() => mockRegenerate.mockClear());

  it('renders key in masked format by default', () => {
    render(<ApiKeyCard projectId="p1" initialKey={INITIAL_KEY} />);
    const display = screen.getByTestId('api-key-display');
    expect(display.textContent).not.toBe(INITIAL_KEY);
    expect(display.textContent).toContain('proj_abc123def4');
  });

  it('reveal button shows full key', async () => {
    render(<ApiKeyCard projectId="p1" initialKey={INITIAL_KEY} />);
    await userEvent.click(screen.getByTestId('reveal-key-button'));
    expect(screen.getByTestId('api-key-display')).toHaveTextContent(INITIAL_KEY);
  });

  it('second click hides key again', async () => {
    render(<ApiKeyCard projectId="p1" initialKey={INITIAL_KEY} />);
    await userEvent.click(screen.getByTestId('reveal-key-button'));
    await userEvent.click(screen.getByTestId('reveal-key-button'));
    expect(screen.getByTestId('api-key-display').textContent).not.toBe(INITIAL_KEY);
  });

  it('copy button is present', () => {
    render(<ApiKeyCard projectId="p1" initialKey={INITIAL_KEY} />);
    expect(screen.getByTestId('copy-key-button')).toBeInTheDocument();
  });

  it('regenerate trigger shows confirmation warning', async () => {
    render(<ApiKeyCard projectId="p1" initialKey={INITIAL_KEY} />);
    await userEvent.click(screen.getByTestId('regenerate-trigger'));
    expect(screen.getByTestId('confirm-regenerate')).toBeInTheDocument();
  });

  it('confirming regenerate calls regenerateApiKey with projectId', async () => {
    mockRegenerate.mockResolvedValue('proj_newkey12345678901234567890123');
    render(<ApiKeyCard projectId="p1" initialKey={INITIAL_KEY} />);
    await userEvent.click(screen.getByTestId('regenerate-trigger'));
    await userEvent.click(screen.getByTestId('confirm-regenerate-button'));
    await waitFor(() => expect(mockRegenerate).toHaveBeenCalledWith('p1'));
  });

  it('shows new key after successful regeneration', async () => {
    const newKey = 'proj_newkey12345678901234567890123';
    mockRegenerate.mockResolvedValue(newKey);
    render(<ApiKeyCard projectId="p1" initialKey={INITIAL_KEY} />);
    await userEvent.click(screen.getByTestId('regenerate-trigger'));
    await userEvent.click(screen.getByTestId('confirm-regenerate-button'));
    await waitFor(() => {
      expect(screen.getByTestId('api-key-display')).toHaveTextContent(newKey);
    });
  });
});
