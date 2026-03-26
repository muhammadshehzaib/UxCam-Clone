import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SegmentBuilder from '@/components/segments/SegmentBuilder';

const mockCreateSegment = jest.fn();
jest.mock('@/lib/api', () => ({
  createSegment: (name: string, filters: unknown) => mockCreateSegment(name, filters),
}));

describe('SegmentBuilder', () => {
  beforeEach(() => mockCreateSegment.mockClear());

  it('renders name input and all filter controls', () => {
    render(<SegmentBuilder onCreated={jest.fn()} />);
    expect(screen.getByTestId('segment-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('segment-device-select')).toBeInTheDocument();
    expect(screen.getByTestId('segment-os-select')).toBeInTheDocument();
    expect(screen.getByTestId('segment-browser-select')).toBeInTheDocument();
    expect(screen.getByTestId('segment-duration-input')).toBeInTheDocument();
    expect(screen.getByTestId('segment-rage-click-checkbox')).toBeInTheDocument();
  });

  it('shows error when name is empty on save', async () => {
    render(<SegmentBuilder onCreated={jest.fn()} />);
    await userEvent.selectOptions(screen.getByTestId('segment-device-select'), 'mobile');
    await userEvent.click(screen.getByTestId('segment-save-button'));
    expect(screen.getByTestId('segment-builder-error')).toHaveTextContent(/name/i);
    expect(mockCreateSegment).not.toHaveBeenCalled();
  });

  it('shows error when no filters selected', async () => {
    render(<SegmentBuilder onCreated={jest.fn()} />);
    await userEvent.type(screen.getByTestId('segment-name-input'), 'Test');
    await userEvent.click(screen.getByTestId('segment-save-button'));
    expect(screen.getByTestId('segment-builder-error')).toHaveTextContent(/filter/i);
    expect(mockCreateSegment).not.toHaveBeenCalled();
  });

  it('device dropdown has correct options', () => {
    render(<SegmentBuilder onCreated={jest.fn()} />);
    const select = screen.getByTestId('segment-device-select');
    expect(select).toHaveTextContent('mobile');
    expect(select).toHaveTextContent('tablet');
    expect(select).toHaveTextContent('desktop');
  });

  it('OS dropdown has correct options', () => {
    render(<SegmentBuilder onCreated={jest.fn()} />);
    const select = screen.getByTestId('segment-os-select');
    expect(select).toHaveTextContent('iOS');
    expect(select).toHaveTextContent('Android');
    expect(select).toHaveTextContent('macOS');
  });

  it('browser dropdown has correct options', () => {
    render(<SegmentBuilder onCreated={jest.fn()} />);
    const select = screen.getByTestId('segment-browser-select');
    expect(select).toHaveTextContent('Chrome');
    expect(select).toHaveTextContent('Firefox');
    expect(select).toHaveTextContent('Safari');
  });

  it('rage click toggle is a checkbox', () => {
    render(<SegmentBuilder onCreated={jest.fn()} />);
    expect(screen.getByTestId('segment-rage-click-checkbox')).toHaveAttribute('type', 'checkbox');
  });

  it('calls createSegment with correct name and filters on save', async () => {
    mockCreateSegment.mockResolvedValue({ id: 'new', name: 'Test', filters: {}, project_id: 'p1', created_at: '' });
    render(<SegmentBuilder onCreated={jest.fn()} />);
    await userEvent.type(screen.getByTestId('segment-name-input'), 'Mobile iOS');
    await userEvent.selectOptions(screen.getByTestId('segment-device-select'), 'mobile');
    await userEvent.selectOptions(screen.getByTestId('segment-os-select'), 'iOS');
    await userEvent.click(screen.getByTestId('segment-save-button'));
    await waitFor(() => {
      expect(mockCreateSegment).toHaveBeenCalledWith('Mobile iOS', { device: 'mobile', os: 'iOS' });
    });
  });

  it('includes rageClick: true in filters when checkbox is checked', async () => {
    mockCreateSegment.mockResolvedValue({ id: 'new', name: 'Rage', filters: {}, project_id: 'p1', created_at: '' });
    render(<SegmentBuilder onCreated={jest.fn()} />);
    await userEvent.type(screen.getByTestId('segment-name-input'), 'Rage sessions');
    await userEvent.click(screen.getByTestId('segment-rage-click-checkbox'));
    await userEvent.click(screen.getByTestId('segment-save-button'));
    await waitFor(() => {
      const filters = mockCreateSegment.mock.calls[0][1];
      expect(filters.rageClick).toBe(true);
    });
  });

  it('clears form after successful save', async () => {
    mockCreateSegment.mockResolvedValue({ id: 'new', name: 'Test', filters: {}, project_id: 'p1', created_at: '' });
    const onCreated = jest.fn();
    render(<SegmentBuilder onCreated={onCreated} />);
    await userEvent.type(screen.getByTestId('segment-name-input'), 'Mobile iOS');
    await userEvent.selectOptions(screen.getByTestId('segment-device-select'), 'mobile');
    await userEvent.click(screen.getByTestId('segment-save-button'));
    await waitFor(() => {
      expect(screen.getByTestId('segment-name-input')).toHaveValue('');
    });
  });

  it('shows error message when API call fails', async () => {
    mockCreateSegment.mockRejectedValue(new Error('Server error'));
    render(<SegmentBuilder onCreated={jest.fn()} />);
    await userEvent.type(screen.getByTestId('segment-name-input'), 'Test');
    await userEvent.selectOptions(screen.getByTestId('segment-device-select'), 'mobile');
    await userEvent.click(screen.getByTestId('segment-save-button'));
    await waitFor(() => {
      expect(screen.getByTestId('segment-builder-error')).toHaveTextContent('Server error');
    });
  });

  it('disables save button while saving', async () => {
    let resolve!: () => void;
    mockCreateSegment.mockImplementation(() => new Promise((r) => { resolve = () => r({ id: 'x', name: 'x', filters: {}, project_id: 'p', created_at: '' }); }));
    render(<SegmentBuilder onCreated={jest.fn()} />);
    await userEvent.type(screen.getByTestId('segment-name-input'), 'Test');
    await userEvent.selectOptions(screen.getByTestId('segment-device-select'), 'mobile');
    await userEvent.click(screen.getByTestId('segment-save-button'));
    expect(screen.getByTestId('segment-save-button')).toBeDisabled();
    resolve();
  });

  it('calls onCreated callback after successful save', async () => {
    mockCreateSegment.mockResolvedValue({ id: 'new', name: 'Test', filters: {}, project_id: 'p1', created_at: '' });
    const onCreated = jest.fn();
    render(<SegmentBuilder onCreated={onCreated} />);
    await userEvent.type(screen.getByTestId('segment-name-input'), 'Test');
    await userEvent.selectOptions(screen.getByTestId('segment-device-select'), 'mobile');
    await userEvent.click(screen.getByTestId('segment-save-button'));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });
});
