import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InviteForm from '@/components/settings/InviteForm';
import { PendingInvite } from '@/types';

const mockPush    = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, refresh: mockRefresh }) }));

const mockCreateInvite = jest.fn();
jest.mock('@/lib/api', () => ({ createInvite: (...a: unknown[]) => mockCreateInvite(...a) }));

const MOCK_INVITE: PendingInvite = {
  id: 'inv-1', email: 'bob@x.com', role: 'viewer',
  expires_at: '2099-01-01T00:00:00Z', created_at: '', invite_url: 'http://localhost:3000/invite?token=abc',
};

describe('InviteForm', () => {
  beforeEach(() => { mockCreateInvite.mockClear(); mockRefresh.mockClear(); });

  it('renders email input and role selector', () => {
    render(<InviteForm projectId="p1" />);
    expect(screen.getByTestId('invite-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('invite-role-select')).toBeInTheDocument();
  });

  it('role selector has Admin and Viewer options', () => {
    render(<InviteForm projectId="p1" />);
    const select = screen.getByTestId('invite-role-select');
    expect(select).toHaveTextContent('Viewer');
    expect(select).toHaveTextContent('Admin');
  });

  it('shows error when email is empty on submit', async () => {
    render(<InviteForm projectId="p1" />);
    await userEvent.click(screen.getByTestId('invite-submit-button'));
    expect(screen.getByTestId('invite-error')).toHaveTextContent(/email/i);
    expect(mockCreateInvite).not.toHaveBeenCalled();
  });

  it('shows error when email format is invalid', async () => {
    render(<InviteForm projectId="p1" />);
    await userEvent.type(screen.getByTestId('invite-email-input'), 'not-an-email');
    await userEvent.click(screen.getByTestId('invite-submit-button'));
    expect(screen.getByTestId('invite-error')).toBeInTheDocument();
  });

  it('calls createInvite with correct email and role', async () => {
    mockCreateInvite.mockResolvedValue(MOCK_INVITE);
    render(<InviteForm projectId="p1" />);
    await userEvent.type(screen.getByTestId('invite-email-input'), 'bob@x.com');
    await userEvent.click(screen.getByTestId('invite-submit-button'));
    await waitFor(() => expect(mockCreateInvite).toHaveBeenCalledWith('p1', 'bob@x.com', 'viewer'));
  });

  it('shows invite URL after successful creation', async () => {
    mockCreateInvite.mockResolvedValue(MOCK_INVITE);
    render(<InviteForm projectId="p1" />);
    await userEvent.type(screen.getByTestId('invite-email-input'), 'bob@x.com');
    await userEvent.click(screen.getByTestId('invite-submit-button'));
    await waitFor(() => expect(screen.getByTestId('invite-success')).toBeInTheDocument());
    expect(screen.getByTestId('invite-url')).toHaveTextContent('abc');
  });

  it('shows Copy button next to invite URL', async () => {
    mockCreateInvite.mockResolvedValue(MOCK_INVITE);
    render(<InviteForm projectId="p1" />);
    await userEvent.type(screen.getByTestId('invite-email-input'), 'bob@x.com');
    await userEvent.click(screen.getByTestId('invite-submit-button'));
    await waitFor(() => expect(screen.getByTestId('copy-invite-url')).toBeInTheDocument());
  });

  it('shows error message when API fails', async () => {
    mockCreateInvite.mockRejectedValue(new Error('User is already a member'));
    render(<InviteForm projectId="p1" />);
    await userEvent.type(screen.getByTestId('invite-email-input'), 'bob@x.com');
    await userEvent.click(screen.getByTestId('invite-submit-button'));
    await waitFor(() => expect(screen.getByTestId('invite-error')).toHaveTextContent('already a member'));
  });

  it('disables submit button while loading', async () => {
    let resolve!: (v: PendingInvite) => void;
    mockCreateInvite.mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<InviteForm projectId="p1" />);
    await userEvent.type(screen.getByTestId('invite-email-input'), 'bob@x.com');
    await userEvent.click(screen.getByTestId('invite-submit-button'));
    expect(screen.getByTestId('invite-submit-button')).toBeDisabled();
    resolve(MOCK_INVITE);
  });
});
