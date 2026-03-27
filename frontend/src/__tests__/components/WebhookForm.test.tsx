import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WebhookForm from '@/components/settings/WebhookForm';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
const mockCreate = jest.fn();
jest.mock('@/lib/api', () => ({ createWebhook: (...a: unknown[]) => mockCreate(...a) }));

describe('WebhookForm', () => {
  beforeEach(() => mockCreate.mockClear());

  it('renders name input, url input, and event checkboxes', () => {
    render(<WebhookForm projectId="p1" />);
    expect(screen.getByTestId('webhook-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('webhook-url-input')).toBeInTheDocument();
    expect(screen.getByTestId('webhook-event-crash.new')).toBeInTheDocument();
    expect(screen.getByTestId('webhook-event-rage_click.session')).toBeInTheDocument();
  });

  it('shows error when name is missing', async () => {
    render(<WebhookForm projectId="p1" />);
    await userEvent.click(screen.getByTestId('webhook-save-button'));
    expect(screen.getByTestId('webhook-error')).toHaveTextContent(/name/i);
  });

  it('shows error when url is missing', async () => {
    render(<WebhookForm projectId="p1" />);
    await userEvent.type(screen.getByTestId('webhook-name-input'), 'Slack');
    await userEvent.click(screen.getByTestId('webhook-save-button'));
    expect(screen.getByTestId('webhook-error')).toHaveTextContent(/url/i);
  });

  it('shows error when no events selected', async () => {
    render(<WebhookForm projectId="p1" />);
    await userEvent.type(screen.getByTestId('webhook-name-input'), 'Slack');
    await userEvent.type(screen.getByTestId('webhook-url-input'), 'https://example.com');
    await userEvent.click(screen.getByTestId('webhook-save-button'));
    expect(screen.getByTestId('webhook-error')).toHaveTextContent(/event/i);
  });

  it('calls createWebhook with correct args on submit', async () => {
    mockCreate.mockResolvedValue({ id: 'w1', name: 'Slack', url: '', events: [], secret: null, enabled: true, created_at: '', project_id: 'p1' });
    render(<WebhookForm projectId="p1" />);
    await userEvent.type(screen.getByTestId('webhook-name-input'), 'Slack');
    await userEvent.type(screen.getByTestId('webhook-url-input'), 'https://hooks.slack.com/test');
    await userEvent.click(screen.getByTestId('webhook-event-crash.new'));
    await userEvent.click(screen.getByTestId('webhook-save-button'));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith('Slack', 'https://hooks.slack.com/test', ['crash.new'], undefined);
    });
  });

  it('disables save button while loading', async () => {
    let resolve!: (v: unknown) => void;
    mockCreate.mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<WebhookForm projectId="p1" />);
    await userEvent.type(screen.getByTestId('webhook-name-input'), 'Slack');
    await userEvent.type(screen.getByTestId('webhook-url-input'), 'https://example.com');
    await userEvent.click(screen.getByTestId('webhook-event-crash.new'));
    await userEvent.click(screen.getByTestId('webhook-save-button'));
    expect(screen.getByTestId('webhook-save-button')).toBeDisabled();
    resolve({});
  });
});
