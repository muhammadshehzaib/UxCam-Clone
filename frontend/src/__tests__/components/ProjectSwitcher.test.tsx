import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectSwitcher from '@/components/layout/ProjectSwitcher';
import { Project } from '@/types';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockPush    = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockGetProjects   = jest.fn();
const mockCreateProject = jest.fn();
const mockSwitchProject = jest.fn();
jest.mock('@/lib/api', () => ({
  getProjects:   () => mockGetProjects(),
  createProject: (name: string) => mockCreateProject(name),
  switchProject: (id: string)   => mockSwitchProject(id),
}));

const mockSetToken  = jest.fn();
const mockGetToken  = jest.fn();
jest.mock('@/lib/auth', () => ({
  setToken: (t: string) => mockSetToken(t),
  getToken: ()           => mockGetToken(),
}));

const PROJECT_A: Project = { id: 'p1', name: 'My App',    api_key: 'k1', role: 'admin', created_at: '' };
const PROJECT_B: Project = { id: 'p2', name: 'Other App', api_key: 'k2', role: 'admin', created_at: '' };

// Simulate JWT with projectId p1
const FAKE_JWT = `header.${btoa(JSON.stringify({ projectId: 'p1', sub: 'u1', email: 'a@b.com' }))}.sig`;

beforeEach(() => {
  mockGetToken.mockReturnValue(FAKE_JWT);
  mockGetProjects.mockResolvedValue([PROJECT_A, PROJECT_B]);
  mockPush.mockClear();
  mockRefresh.mockClear();
  mockSetToken.mockClear();
  mockSwitchProject.mockClear();
  mockCreateProject.mockClear();
});

describe('ProjectSwitcher', () => {
  it('renders the current project name', async () => {
    render(<ProjectSwitcher />);
    await waitFor(() => expect(screen.getByText('My App')).toBeInTheDocument());
  });

  it('renders trigger button', () => {
    render(<ProjectSwitcher />);
    expect(screen.getByTestId('project-switcher-trigger')).toBeInTheDocument();
  });

  it('dropdown is hidden by default', () => {
    render(<ProjectSwitcher />);
    expect(screen.queryByTestId('project-dropdown')).not.toBeInTheDocument();
  });

  it('opens dropdown on trigger click', async () => {
    render(<ProjectSwitcher />);
    await waitFor(() => {}); // let projects load
    await userEvent.click(screen.getByTestId('project-switcher-trigger'));
    expect(screen.getByTestId('project-dropdown')).toBeInTheDocument();
  });

  it('shows all user projects in dropdown', async () => {
    render(<ProjectSwitcher />);
    await waitFor(() => {}); // wait for projects to load
    await userEvent.click(screen.getByTestId('project-switcher-trigger'));
    expect(screen.getByTestId('project-option-p1')).toBeInTheDocument();
    expect(screen.getByTestId('project-option-p2')).toBeInTheDocument();
  });

  it('calls switchProject when a different project is clicked', async () => {
    mockSwitchProject.mockResolvedValue({ token: 'new-jwt', project: PROJECT_B });
    render(<ProjectSwitcher />);
    await waitFor(() => {});
    await userEvent.click(screen.getByTestId('project-switcher-trigger'));
    await userEvent.click(screen.getByTestId('project-option-p2'));
    expect(mockSwitchProject).toHaveBeenCalledWith('p2');
  });

  it('stores new token after switching project', async () => {
    mockSwitchProject.mockResolvedValue({ token: 'new-jwt', project: PROJECT_B });
    render(<ProjectSwitcher />);
    await waitFor(() => {});
    await userEvent.click(screen.getByTestId('project-switcher-trigger'));
    await userEvent.click(screen.getByTestId('project-option-p2'));
    await waitFor(() => expect(mockSetToken).toHaveBeenCalledWith('new-jwt'));
  });

  it('navigates to /dashboard after switching', async () => {
    mockSwitchProject.mockResolvedValue({ token: 'new-jwt', project: PROJECT_B });
    render(<ProjectSwitcher />);
    await waitFor(() => {});
    await userEvent.click(screen.getByTestId('project-switcher-trigger'));
    await userEvent.click(screen.getByTestId('project-option-p2'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });

  it('does not call switchProject when clicking the active project', async () => {
    render(<ProjectSwitcher />);
    await waitFor(() => {});
    await userEvent.click(screen.getByTestId('project-switcher-trigger'));
    await userEvent.click(screen.getByTestId('project-option-p1')); // already active
    expect(mockSwitchProject).not.toHaveBeenCalled();
  });

  it('shows New Project button in dropdown', async () => {
    render(<ProjectSwitcher />);
    await userEvent.click(screen.getByTestId('project-switcher-trigger'));
    expect(screen.getByTestId('new-project-button')).toBeInTheDocument();
  });

  it('shows inline form when New Project is clicked', async () => {
    render(<ProjectSwitcher />);
    await userEvent.click(screen.getByTestId('project-switcher-trigger'));
    await userEvent.click(screen.getByTestId('new-project-button'));
    expect(screen.getByTestId('new-project-input')).toBeInTheDocument();
    expect(screen.getByTestId('create-project-submit')).toBeInTheDocument();
  });

  it('shows error when creating project with empty name', async () => {
    render(<ProjectSwitcher />);
    await userEvent.click(screen.getByTestId('project-switcher-trigger'));
    await userEvent.click(screen.getByTestId('new-project-button'));
    await userEvent.click(screen.getByTestId('create-project-submit'));
    expect(screen.getByTestId('new-project-error')).toBeInTheDocument();
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it('calls createProject and stores token on success', async () => {
    mockCreateProject.mockResolvedValue({ token: 'proj-jwt', project: { ...PROJECT_A, id: 'p3', name: 'Brand New' } });
    render(<ProjectSwitcher />);
    await userEvent.click(screen.getByTestId('project-switcher-trigger'));
    await userEvent.click(screen.getByTestId('new-project-button'));
    await userEvent.type(screen.getByTestId('new-project-input'), 'Brand New');
    await userEvent.click(screen.getByTestId('create-project-submit'));
    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith('Brand New');
      expect(mockSetToken).toHaveBeenCalledWith('proj-jwt');
    });
  });

  it('navigates to /dashboard after creating a project', async () => {
    mockCreateProject.mockResolvedValue({ token: 'proj-jwt', project: { ...PROJECT_A, id: 'p3', name: 'New' } });
    render(<ProjectSwitcher />);
    await userEvent.click(screen.getByTestId('project-switcher-trigger'));
    await userEvent.click(screen.getByTestId('new-project-button'));
    await userEvent.type(screen.getByTestId('new-project-input'), 'New');
    await userEvent.click(screen.getByTestId('create-project-submit'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });
});
