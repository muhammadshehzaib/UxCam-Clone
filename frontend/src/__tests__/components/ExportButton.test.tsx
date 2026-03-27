import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportButton from '@/components/ui/ExportButton';

const mockDownloadCsv = jest.fn();
jest.mock('@/lib/api', () => ({
  downloadCsv: (path: string, filename: string) => mockDownloadCsv(path, filename),
}));

describe('ExportButton', () => {
  beforeEach(() => mockDownloadCsv.mockClear());

  it('renders the Export CSV button', () => {
    render(<ExportButton path="/sessions/export.csv" filename="sessions.csv" />);
    expect(screen.getByTestId('export-button')).toBeInTheDocument();
    expect(screen.getByTestId('export-button')).toHaveTextContent('Export CSV');
  });

  it('calls downloadCsv with correct path and filename on click', async () => {
    mockDownloadCsv.mockResolvedValue(undefined);
    render(<ExportButton path="/sessions/export.csv?device=mobile" filename="sessions.csv" />);
    await userEvent.click(screen.getByTestId('export-button'));
    await waitFor(() => {
      expect(mockDownloadCsv).toHaveBeenCalledWith(
        '/sessions/export.csv?device=mobile',
        'sessions.csv'
      );
    });
  });

  it('shows loading text while fetching', async () => {
    let resolve!: () => void;
    mockDownloadCsv.mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<ExportButton path="/sessions/export.csv" filename="sessions.csv" />);
    await userEvent.click(screen.getByTestId('export-button'));
    expect(screen.getByTestId('export-button')).toHaveTextContent('Exporting…');
    resolve();
  });

  it('disables button while loading', async () => {
    let resolve!: () => void;
    mockDownloadCsv.mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<ExportButton path="/sessions/export.csv" filename="sessions.csv" />);
    await userEvent.click(screen.getByTestId('export-button'));
    expect(screen.getByTestId('export-button')).toBeDisabled();
    resolve();
  });

  it('shows error message when download fails', async () => {
    mockDownloadCsv.mockRejectedValue(new Error('Server error'));
    render(<ExportButton path="/sessions/export.csv" filename="sessions.csv" />);
    await userEvent.click(screen.getByTestId('export-button'));
    await waitFor(() => expect(screen.getByTestId('export-error')).toBeInTheDocument());
  });

  it('re-enables button after failed export', async () => {
    mockDownloadCsv.mockRejectedValue(new Error('fail'));
    render(<ExportButton path="/sessions/export.csv" filename="sessions.csv" />);
    await userEvent.click(screen.getByTestId('export-button'));
    await waitFor(() => expect(screen.getByTestId('export-button')).not.toBeDisabled());
  });
});
