import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DaysFilter from '@/components/ui/DaysFilter';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('next/link', () => {
  const Link = ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

describe('DaysFilter', () => {
  beforeEach(() => mockPush.mockClear());

  it('renders default 7d, 30d, 90d buttons', () => {
    render(<DaysFilter days={30} basePath="/flow" />);
    expect(screen.getByTestId('days-preset-7')).toBeInTheDocument();
    expect(screen.getByTestId('days-preset-30')).toBeInTheDocument();
    expect(screen.getByTestId('days-preset-90')).toBeInTheDocument();
  });

  it('active preset has highlighted styling', () => {
    render(<DaysFilter days={30} basePath="/flow" />);
    const active = screen.getByTestId('days-preset-30');
    expect(active.className).toContain('bg-brand-600');
  });

  it('inactive presets do not have highlighted styling', () => {
    render(<DaysFilter days={30} basePath="/flow" />);
    expect(screen.getByTestId('days-preset-7').className).not.toContain('bg-brand-600');
    expect(screen.getByTestId('days-preset-90').className).not.toContain('bg-brand-600');
  });

  it('preset links point to correct URL', () => {
    render(<DaysFilter days={30} basePath="/flow" />);
    expect(screen.getByTestId('days-preset-7')).toHaveAttribute('href', '/flow?days=7');
    expect(screen.getByTestId('days-preset-90')).toHaveAttribute('href', '/flow?days=90');
  });

  it('renders Custom button', () => {
    render(<DaysFilter days={30} basePath="/flow" />);
    expect(screen.getByTestId('days-custom-button')).toBeInTheDocument();
  });

  it('custom date inputs are hidden by default', () => {
    render(<DaysFilter days={30} basePath="/flow" />);
    expect(screen.queryByTestId('custom-date-inputs')).not.toBeInTheDocument();
  });

  it('clicking Custom reveals date inputs', async () => {
    render(<DaysFilter days={30} basePath="/flow" />);
    await userEvent.click(screen.getByTestId('days-custom-button'));
    expect(screen.getByTestId('custom-date-inputs')).toBeInTheDocument();
  });

  it('Apply button is disabled when date range is incomplete', async () => {
    render(<DaysFilter days={30} basePath="/flow" />);
    await userEvent.click(screen.getByTestId('days-custom-button'));
    expect(screen.getByTestId('custom-date-apply')).toBeDisabled();
  });

  it('Apply pushes URL with computed days', async () => {
    render(<DaysFilter days={30} basePath="/retention" />);
    await userEvent.click(screen.getByTestId('days-custom-button'));
    await userEvent.type(screen.getByTestId('custom-date-from'), '2024-01-01');
    await userEvent.type(screen.getByTestId('custom-date-to'),   '2024-01-31');
    await userEvent.click(screen.getByTestId('custom-date-apply'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/retention?days='));
  });

  it('renders custom presets when provided', () => {
    render(<DaysFilter days={60} basePath="/retention" presets={[30, 60, 90]} />);
    expect(screen.getByTestId('days-preset-30')).toBeInTheDocument();
    expect(screen.getByTestId('days-preset-60')).toBeInTheDocument();
  });
});
