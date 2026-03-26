import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '@/app/(auth)/login/LoginForm';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockPush    = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter:       () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockAuthLogin    = jest.fn();
const mockAuthRegister = jest.fn();
jest.mock('@/lib/api', () => ({
  authLogin:    (...args: unknown[]) => mockAuthLogin(...args),
  authRegister: (...args: unknown[]) => mockAuthRegister(...args),
}));

const mockSetToken = jest.fn();
jest.mock('@/lib/auth', () => ({
  setToken: (...args: unknown[]) => mockSetToken(...args),
}));

const MOCK_RESULT = {
  token: 'jwt.token.here',
  user: { id: 'u1', email: 'a@b.com', name: null, projectId: 'p1' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

async function fillAndSubmit(email: string, password: string) {
  await userEvent.type(screen.getByTestId('email-input'), email);
  await userEvent.type(screen.getByTestId('password-input'), password);
  await userEvent.click(screen.getByTestId('submit-button'));
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LoginForm', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockAuthLogin.mockClear();
    mockAuthRegister.mockClear();
    mockSetToken.mockClear();
  });

  it('renders email and password inputs', () => {
    render(<LoginForm />);
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
  });

  it('renders Sign In submit button', () => {
    render(<LoginForm />);
    expect(screen.getByTestId('submit-button')).toHaveTextContent('Sign In');
  });

  it('password input is type=password by default', () => {
    render(<LoginForm />);
    expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'password');
  });

  it('toggle button reveals password as plain text', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByTestId('toggle-password'));
    expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'text');
  });

  it('toggle button hides password again on second click', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByTestId('toggle-password'));
    await userEvent.click(screen.getByTestId('toggle-password'));
    expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'password');
  });

  it('shows error when submitting with empty email', async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByTestId('password-input'), 'password123');
    await userEvent.click(screen.getByTestId('submit-button'));
    expect(screen.getByTestId('form-error')).toHaveTextContent(/email/i);
    expect(mockAuthLogin).not.toHaveBeenCalled();
  });

  it('shows error when submitting with invalid email', async () => {
    render(<LoginForm />);
    await fillAndSubmit('not-an-email', 'password123');
    expect(screen.getByTestId('form-error')).toHaveTextContent(/valid email/i);
    expect(mockAuthLogin).not.toHaveBeenCalled();
  });

  it('shows error when password is shorter than 8 chars', async () => {
    render(<LoginForm />);
    await fillAndSubmit('a@b.com', 'short');
    expect(screen.getByTestId('form-error')).toHaveTextContent(/8 characters/i);
    expect(mockAuthLogin).not.toHaveBeenCalled();
  });

  it('calls authLogin with correct email and password', async () => {
    mockAuthLogin.mockResolvedValue(MOCK_RESULT);
    render(<LoginForm />);
    await fillAndSubmit('a@b.com', 'password123');
    await waitFor(() => {
      expect(mockAuthLogin).toHaveBeenCalledWith('a@b.com', 'password123');
    });
  });

  it('stores token in cookie via setToken after successful login', async () => {
    mockAuthLogin.mockResolvedValue(MOCK_RESULT);
    render(<LoginForm />);
    await fillAndSubmit('a@b.com', 'password123');
    await waitFor(() => expect(mockSetToken).toHaveBeenCalledWith('jwt.token.here'));
  });

  it('redirects to /dashboard after successful login', async () => {
    mockAuthLogin.mockResolvedValue(MOCK_RESULT);
    render(<LoginForm />);
    await fillAndSubmit('a@b.com', 'password123');
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });

  it('displays API error message when login fails', async () => {
    mockAuthLogin.mockRejectedValue(new Error('Invalid email or password'));
    render(<LoginForm />);
    await fillAndSubmit('a@b.com', 'password123');
    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toHaveTextContent('Invalid email or password');
    });
  });

  it('disables submit button while loading', async () => {
    let resolve!: (v: unknown) => void;
    mockAuthLogin.mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<LoginForm />);
    await fillAndSubmit('a@b.com', 'password123');
    expect(screen.getByTestId('submit-button')).toBeDisabled();
    resolve(MOCK_RESULT);
  });

  it('shows register link and switches to register mode on click', async () => {
    render(<LoginForm />);
    expect(screen.getByTestId('switch-to-register')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('switch-to-register'));
    expect(screen.getByTestId('submit-button')).toHaveTextContent('Create Account');
    expect(screen.getByTestId('project-name-input')).toBeInTheDocument();
  });

  it('shows sign in link when in register mode', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByTestId('switch-to-register'));
    expect(screen.getByTestId('switch-to-login')).toBeInTheDocument();
  });

  it('register mode requires project name — shows error if empty', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByTestId('switch-to-register'));
    await fillAndSubmit('a@b.com', 'password123');
    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toHaveTextContent(/project name/i);
    });
    expect(mockAuthRegister).not.toHaveBeenCalled();
  });

  it('calls authRegister with correct args in register mode', async () => {
    mockAuthRegister.mockResolvedValue(MOCK_RESULT);
    render(<LoginForm />);
    await userEvent.click(screen.getByTestId('switch-to-register'));
    await userEvent.type(screen.getByTestId('email-input'),        'a@b.com');
    await userEvent.type(screen.getByTestId('password-input'),     'password123');
    await userEvent.type(screen.getByTestId('project-name-input'), 'My App');
    await userEvent.click(screen.getByTestId('submit-button'));
    await waitFor(() => {
      expect(mockAuthRegister).toHaveBeenCalledWith('a@b.com', 'password123', 'My App', undefined);
    });
  });
});
