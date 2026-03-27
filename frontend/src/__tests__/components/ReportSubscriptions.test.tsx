import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportSubscriptions from '@/components/settings/ReportSubscriptions';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

// Mock fetch globally
global.fetch = jest.fn();

const REPORTS = [
  { id: 'r1', email: 'alice@x.com', frequency: 'weekly', enabled: true, last_sent_at: null },
];

beforeEach(() => (global.fetch as jest.Mock).mockClear());

describe('ReportSubscriptions', () => {
  it('renders email input and subscribe button', () => {
    render(<ReportSubscriptions projectId="p1" reports={[]} />);
    expect(screen.getByTestId('report-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('report-subscribe-button')).toBeInTheDocument();
  });

  it('shows error for empty email on submit', async () => {
    render(<ReportSubscriptions projectId="p1" reports={[]} />);
    await userEvent.click(screen.getByTestId('report-subscribe-button'));
    expect(screen.getByTestId('report-error')).toHaveTextContent(/email/i);
  });

  it('shows current subscriptions', () => {
    render(<ReportSubscriptions projectId="p1" reports={REPORTS} />);
    expect(screen.getByTestId('reports-list')).toBeInTheDocument();
    expect(screen.getByText('alice@x.com')).toBeInTheDocument();
  });

  it('calls subscribe API on form submit', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: {} }) });
    render(<ReportSubscriptions projectId="p1" reports={[]} />);
    await userEvent.type(screen.getByTestId('report-email-input'), 'bob@x.com');
    await userEvent.click(screen.getByTestId('report-subscribe-button'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reports'),
      expect.objectContaining({ method: 'POST' })
    ));
  });

  it('unsubscribe button calls DELETE API', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    render(<ReportSubscriptions projectId="p1" reports={REPORTS} />);
    await userEvent.click(screen.getByTestId('unsubscribe-r1'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reports/r1'),
      expect.objectContaining({ method: 'DELETE' })
    ));
  });
});
