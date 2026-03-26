import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import HeatmapCanvas from '@/components/heatmaps/HeatmapCanvas';
import { HeatmapPoint } from '@/types';

// Mock canvas context
const mockGradient = { addColorStop: jest.fn() };
const mockCtx = {
  clearRect: jest.fn(),
  createRadialGradient: jest.fn().mockReturnValue(mockGradient),
  fillStyle: '' as unknown,
  globalCompositeOperation: '' as unknown,
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  getImageData: jest.fn().mockReturnValue({
    data: new Uint8ClampedArray(4 * 10 * 10),
  }),
  putImageData: jest.fn(),
};

// Offscreen canvas mock
const mockOffscreenCtx = { ...mockCtx };

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockCtx);

  const originalCreate = document.createElement.bind(document);
  jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      const el = originalCreate('canvas');
      el.getContext = jest.fn().mockReturnValue(mockOffscreenCtx);
      return el;
    }
    return originalCreate(tag);
  });
});

afterEach(() => {
  jest.clearAllMocks();
  mockCtx.createRadialGradient.mockReturnValue(mockGradient);
  mockCtx.getImageData.mockReturnValue({
    data: new Uint8ClampedArray(4 * 10 * 10),
  });
});

const POINTS: HeatmapPoint[] = [
  { x: 0.5, y: 0.3, count: 10 },
  { x: 0.2, y: 0.8, count: 5  },
  { x: 0.9, y: 0.1, count: 2  },
];

describe('HeatmapCanvas', () => {
  it('renders a canvas element when points are provided', () => {
    const { container } = render(
      <HeatmapCanvas points={POINTS} width={390} height={720} />
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('sets correct width and height on the canvas', () => {
    const { container } = render(
      <HeatmapCanvas points={POINTS} width={390} height={720} />
    );
    const canvas = container.querySelector('canvas')!;
    expect(canvas.width).toBe(390);
    expect(canvas.height).toBe(720);
  });

  it('shows empty state message when no points', () => {
    render(<HeatmapCanvas points={[]} width={390} height={720} />);
    expect(screen.getByText('No click data for this screen')).toBeInTheDocument();
  });

  it('does not render canvas element when no points', () => {
    const { container } = render(
      <HeatmapCanvas points={[]} width={390} height={720} />
    );
    expect(container.querySelector('canvas')).not.toBeInTheDocument();
  });

  it('draws one radial gradient per point', () => {
    render(<HeatmapCanvas points={POINTS} width={390} height={720} />);
    // Each point gets a gradient on the offscreen canvas
    expect(mockOffscreenCtx.createRadialGradient).toHaveBeenCalledTimes(POINTS.length);
  });

  it('calls addColorStop twice per point (center + edge)', () => {
    render(<HeatmapCanvas points={POINTS} width={390} height={720} />);
    expect(mockGradient.addColorStop).toHaveBeenCalledTimes(POINTS.length * 2);
  });

  it('maps click coordinates to canvas pixel space', () => {
    const singlePoint: HeatmapPoint[] = [{ x: 0.5, y: 0.5, count: 1 }];
    render(<HeatmapCanvas points={singlePoint} width={400} height={800} />);

    // x=0.5 * 400=200, y=0.5 * 800=400
    expect(mockOffscreenCtx.createRadialGradient).toHaveBeenCalledWith(
      200, 400, 0,
      200, 400, expect.any(Number)
    );
  });

  it('clears the canvas before drawing', () => {
    render(<HeatmapCanvas points={POINTS} width={390} height={720} />);
    expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 390, 720);
  });

  it('calls putImageData to apply color mapping', () => {
    render(<HeatmapCanvas points={POINTS} width={390} height={720} />);
    expect(mockCtx.putImageData).toHaveBeenCalledTimes(1);
  });

  it('uses screen composite operation for heat blending', () => {
    render(<HeatmapCanvas points={POINTS} width={390} height={720} />);
    expect(mockOffscreenCtx.globalCompositeOperation).toBe('screen');
  });

  it('higher count point gets higher gradient opacity', () => {
    render(<HeatmapCanvas points={POINTS} width={390} height={720} />);

    // First call is the highest count point (10), last is lowest (2)
    const firstCall = mockOffscreenCtx.createRadialGradient.mock.calls[0];
    const lastCall = mockOffscreenCtx.createRadialGradient.mock.calls[2];

    // Both are called with same center coords structure — opacity differs via addColorStop
    // The first addColorStop for each point contains the intensity value
    const firstStopArg = mockGradient.addColorStop.mock.calls[0][1] as string;
    const thirdStopArg = mockGradient.addColorStop.mock.calls[4][1] as string;

    // Extract opacity from rgba string
    const opacityOf = (rgba: string) => parseFloat(rgba.match(/[\d.]+\)$/)![0]);
    expect(opacityOf(firstStopArg)).toBeGreaterThan(opacityOf(thirdStopArg));

    // Suppress unused var warning
    void firstCall; void lastCall;
  });
});
