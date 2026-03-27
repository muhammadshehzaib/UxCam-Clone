import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InviteAcceptClient from '@/app/(auth)/invite/InviteAcceptClient';
import { InviteInfo } from '@/types';

const mockPush    = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, refresh: mockRefresh }) }));

const mockAcceptInvite = jest.fn();
jest.mock('@/lib/api', () => ({ acceptInvite: (t: string) => mockAcceptInvite(t) }));

const mockSetToken = jest.fn();
jest.mock('@/lib/auth', () => ({ setToken: (t: string) => mockSetToken(t) }));

const INVITE_INFO: InviteInfo = {
  id: 'inv-1', project_name: 'My App', email: 'bob@x.com',
  role: 'viewer', invited_by: 'alice@x.com', expires_at: '2099-01-01T00:00:00Z',
};

describe('InviteAcceptClient', () => {
  beforeEach(() => { mockPush.mockClear(); mockAcceptInvite.mockClear(); mockSetToken.mockClear(); });

  it('shows project name from invite info', () => {
    render(<InviteAcceptClient token="tok" inviteInfo={INVITE_INFO} />);
    expect(screen.getByTestId('project-name')).toHaveTextContent('My App');
  });

  it('shows the invited_by email', () => {
    render(<InviteAcceptClient token="tok" inviteInfo={INVITE_INFO} />);
    expect(screen.getByText(/alice@x.com/)).toBeInTheDocument();
  });

  it('shows Accept button', () => {
    render(<InviteAcceptClient token="tok" inviteInfo={INVITE_INFO} />);
    expect(screen.getByTestId('accept-invite-button')).toBeInTheDocument();
  });

  it('calls acceptInvite on button click', async () => {
    mockAcceptInvite.mockResolvedValue({ token: 'new-jwt', projectId: 'p1' });
    render(<InviteAcceptClient token="tok-abc" inviteInfo={INVITE_INFO} />);
    await userEvent.click(screen.getByTestId('accept-invite-button'));
    await waitFor(() => expect(mockAcceptInvite).toHaveBeenCalledWith('tok-abc'));
  });

  it('stores new token and redirects to /dashboard after acceptance', async () => {
    mockAcceptInvite.mockResolvedValue({ token: 'new-jwt', projectId: 'p1' });
    render(<InviteAcceptClient token="tok" inviteInfo={INVITE_INFO} />);
    await userEvent.click(screen.getByTestId('accept-invite-button'));
    await waitFor(() => {
      expect(mockSetToken).toHaveBeenCalledWith('new-jwt');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows error message on API failure', async () => {
    mockAcceptInvite.mockRejectedValue(new Error('This invite has expired'));
    render(<InviteAcceptClient token="tok" inviteInfo={INVITE_INFO} />);
    await userEvent.click(screen.getByTestId('accept-invite-button'));
    await waitFor(() => expect(screen.getByTestId('accept-error')).toHaveTextContent('expired'));
  });

  it('shows expired error message when initialError is passed', () => {
    render(<InviteAcceptClient token="tok" inviteInfo={null} error="This invite has expired." />);
    expect(screen.getByTestId('invite-error-message')).toHaveTextContent('expired');
  });
});
