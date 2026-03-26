import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FunnelBuilder from '@/components/funnels/FunnelBuilder';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockCreateFunnel = jest.fn();
jest.mock('@/lib/api', () => ({
  createFunnel: (...args: unknown[]) => mockCreateFunnel(...args),
}));

const CREATED_FUNNEL = {
  id: 'new-funnel-id',
  name: 'My Funnel',
  steps: [],
  project_id: 'p1',
  created_at: '',
};

describe('FunnelBuilder', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockCreateFunnel.mockClear();
  });

  it('renders name input and 2 step inputs by default', () => {
    render(<FunnelBuilder screenNames={[]} />);
    expect(screen.getByTestId('funnel-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('step-input-0')).toBeInTheDocument();
    expect(screen.getByTestId('step-input-1')).toBeInTheDocument();
    expect(screen.queryByTestId('step-input-2')).not.toBeInTheDocument();
  });

  it('renders Add Step button', () => {
    render(<FunnelBuilder screenNames={[]} />);
    expect(screen.getByTestId('add-step-button')).toBeInTheDocument();
  });

  it('adds a new step when Add Step is clicked', async () => {
    render(<FunnelBuilder screenNames={[]} />);
    await userEvent.click(screen.getByTestId('add-step-button'));
    expect(screen.getByTestId('step-input-2')).toBeInTheDocument();
  });

  it('remove button is disabled when only 2 steps remain', () => {
    render(<FunnelBuilder screenNames={[]} />);
    expect(screen.getByTestId('remove-step-0')).toBeDisabled();
    expect(screen.getByTestId('remove-step-1')).toBeDisabled();
  });

  it('removes a step when remove button is clicked (with 3+ steps)', async () => {
    render(<FunnelBuilder screenNames={[]} />);
    await userEvent.click(screen.getByTestId('add-step-button'));
    expect(screen.getByTestId('step-input-2')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('remove-step-2'));
    expect(screen.queryByTestId('step-input-2')).not.toBeInTheDocument();
  });

  it('shows error when saving without a name', async () => {
    render(<FunnelBuilder screenNames={[]} />);
    await userEvent.type(screen.getByTestId('step-input-0'), '/home');
    await userEvent.type(screen.getByTestId('step-input-1'), '/signup');
    await userEvent.click(screen.getByTestId('save-funnel-button'));
    expect(screen.getByTestId('builder-error')).toHaveTextContent(/name/i);
    expect(mockCreateFunnel).not.toHaveBeenCalled();
  });

  it('shows error when a step has empty screen', async () => {
    render(<FunnelBuilder screenNames={[]} />);
    await userEvent.type(screen.getByTestId('funnel-name-input'), 'My Funnel');
    await userEvent.type(screen.getByTestId('step-input-0'), '/home');
    // step-input-1 left empty
    await userEvent.click(screen.getByTestId('save-funnel-button'));
    expect(screen.getByTestId('builder-error')).toHaveTextContent(/screen/i);
    expect(mockCreateFunnel).not.toHaveBeenCalled();
  });

  it('calls createFunnel with correct name and steps', async () => {
    mockCreateFunnel.mockResolvedValue(CREATED_FUNNEL);
    render(<FunnelBuilder screenNames={[]} />);

    await userEvent.type(screen.getByTestId('funnel-name-input'), 'My Funnel');
    await userEvent.type(screen.getByTestId('step-input-0'), '/home');
    await userEvent.type(screen.getByTestId('step-input-1'), '/checkout');
    await userEvent.click(screen.getByTestId('save-funnel-button'));

    await waitFor(() => {
      expect(mockCreateFunnel).toHaveBeenCalledWith('My Funnel', [
        { screen: '/home' },
        { screen: '/checkout' },
      ]);
    });
  });

  it('navigates to funnel detail page after successful save', async () => {
    mockCreateFunnel.mockResolvedValue(CREATED_FUNNEL);
    render(<FunnelBuilder screenNames={[]} />);

    await userEvent.type(screen.getByTestId('funnel-name-input'), 'My Funnel');
    await userEvent.type(screen.getByTestId('step-input-0'), '/home');
    await userEvent.type(screen.getByTestId('step-input-1'), '/checkout');
    await userEvent.click(screen.getByTestId('save-funnel-button'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/funnels/new-funnel-id');
    });
  });

  it('shows error message when createFunnel API call fails', async () => {
    mockCreateFunnel.mockRejectedValue(new Error('Network error'));
    render(<FunnelBuilder screenNames={[]} />);

    await userEvent.type(screen.getByTestId('funnel-name-input'), 'My Funnel');
    await userEvent.type(screen.getByTestId('step-input-0'), '/home');
    await userEvent.type(screen.getByTestId('step-input-1'), '/checkout');
    await userEvent.click(screen.getByTestId('save-funnel-button'));

    await waitFor(() => {
      expect(screen.getByTestId('builder-error')).toHaveTextContent(/Failed to save/i);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders dropdowns when screenNames are provided', () => {
    render(<FunnelBuilder screenNames={['/home', '/checkout', '/success']} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
    expect(screen.getAllByRole('option', { name: '/home' })).toHaveLength(2);
  });

  it('renders text inputs when screenNames is empty', () => {
    render(<FunnelBuilder screenNames={[]} />);
    expect(screen.getByTestId('step-input-0').tagName).toBe('INPUT');
    expect(screen.getByTestId('step-input-1').tagName).toBe('INPUT');
  });

  it('hides Add Step button when 10 steps reached', async () => {
    render(<FunnelBuilder screenNames={[]} />);
    // Add 8 more steps (2 already exist → total 10)
    for (let i = 0; i < 8; i++) {
      await userEvent.click(screen.getByTestId('add-step-button'));
    }
    expect(screen.queryByTestId('add-step-button')).not.toBeInTheDocument();
  });
});
