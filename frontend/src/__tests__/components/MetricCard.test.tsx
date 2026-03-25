import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import MetricCard from '@/components/dashboard/MetricCard';

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Total Users" value={1240} />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1240')).toBeInTheDocument();
  });

  it('renders sub text when provided', () => {
    render(<MetricCard label="Top Event" value={500} sub="button_click" />);
    expect(screen.getByText('button_click')).toBeInTheDocument();
  });

  it('renders without sub text when not provided', () => {
    const { container } = render(<MetricCard label="Sessions" value="—" />);
    expect(container.querySelectorAll('p')).toHaveLength(2); // label + value only
  });

  it('renders string values', () => {
    render(<MetricCard label="Duration" value="2m 30s" />);
    expect(screen.getByText('2m 30s')).toBeInTheDocument();
  });
});
