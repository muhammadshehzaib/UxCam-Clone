import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HeatmapViewer from '@/components/heatmaps/HeatmapViewer';

const mockGetHeatmap = jest.fn().mockResolvedValue([]);
jest.mock('@/lib/api', () => ({ getHeatmap: (...a: unknown[]) => mockGetHeatmap(...a) }));
jest.mock('@/components/heatmaps/HeatmapCanvas', () => () => null);
jest.mock('@/components/heatmaps/ScreenPicker', () => () => null);

const SCREENS = ['/home', '/checkout'];

describe('HeatmapViewer — device filter', () => {
  beforeEach(() => mockGetHeatmap.mockClear().mockResolvedValue([]));

  it('renders All, Mobile, Tablet, Desktop buttons', () => {
    render(<HeatmapViewer screens={SCREENS} initialScreen="/home" />);
    expect(screen.getByTestId('device-filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('device-filter-mobile')).toBeInTheDocument();
    expect(screen.getByTestId('device-filter-tablet')).toBeInTheDocument();
    expect(screen.getByTestId('device-filter-desktop')).toBeInTheDocument();
  });

  it('"All" button is selected by default', () => {
    render(<HeatmapViewer screens={SCREENS} initialScreen="/home" />);
    expect(screen.getByTestId('device-filter-all').className).toContain('bg-brand-600');
  });

  it('clicking Mobile button selects it', async () => {
    render(<HeatmapViewer screens={SCREENS} initialScreen="/home" />);
    await userEvent.click(screen.getByTestId('device-filter-mobile'));
    expect(screen.getByTestId('device-filter-mobile').className).toContain('bg-brand-600');
    expect(screen.getByTestId('device-filter-all').className).not.toContain('bg-brand-600');
  });

  it('device change triggers new heatmap fetch', async () => {
    render(<HeatmapViewer screens={SCREENS} initialScreen="/home" />);
    const initialCallCount = mockGetHeatmap.mock.calls.length;
    await userEvent.click(screen.getByTestId('device-filter-mobile'));
    // Wait for the useEffect to fire
    await new Promise(r => setTimeout(r, 0));
    expect(mockGetHeatmap.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('heatmap fetch is called with device argument when device selected', async () => {
    render(<HeatmapViewer screens={SCREENS} initialScreen="/home" />);
    await userEvent.click(screen.getByTestId('device-filter-desktop'));
    await new Promise(r => setTimeout(r, 0));
    const lastCall = mockGetHeatmap.mock.calls[mockGetHeatmap.mock.calls.length - 1];
    expect(lastCall[2]).toBe('desktop');
  });

  it('initialDevice prop pre-selects a device button', () => {
    render(<HeatmapViewer screens={SCREENS} initialScreen="/home" initialDevice="mobile" />);
    expect(screen.getByTestId('device-filter-mobile').className).toContain('bg-brand-600');
  });
});
