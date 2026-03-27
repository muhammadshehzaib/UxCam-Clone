import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import RetentionCards from '@/components/retention/RetentionCards';
import { RetentionSummary } from '@/types';

const SUMMARY: RetentionSummary = {
  total_users: 1250,
  d1_pct:      42.3,
  d7_pct:      28.1,
  d30_pct:     15.4,
};

const ZERO_SUMMARY: RetentionSummary = {
  total_users: 0,
  d1_pct:      0,
  d7_pct:      0,
  d30_pct:     0,
};

describe('RetentionCards', () => {
  it('renders D1, D7, D30 cards when users exist', () => {
    render(<RetentionCards summary={SUMMARY} />);
    expect(screen.getByTestId('retention-card-d1')).toBeInTheDocument();
    expect(screen.getByTestId('retention-card-d7')).toBeInTheDocument();
    expect(screen.getByTestId('retention-card-d30')).toBeInTheDocument();
  });

  it('displays correct D1 percentage', () => {
    render(<RetentionCards summary={SUMMARY} />);
    expect(screen.getByTestId('retention-card-d1')).toHaveTextContent('42.3%');
  });

  it('displays correct D7 percentage', () => {
    render(<RetentionCards summary={SUMMARY} />);
    expect(screen.getByTestId('retention-card-d7')).toHaveTextContent('28.1%');
  });

  it('displays correct D30 percentage', () => {
    render(<RetentionCards summary={SUMMARY} />);
    expect(screen.getByTestId('retention-card-d30')).toHaveTextContent('15.4%');
  });

  it('shows total user count in D1 card', () => {
    render(<RetentionCards summary={SUMMARY} />);
    expect(screen.getByTestId('retention-card-d1')).toHaveTextContent('1,250');
  });

  it('shows 0.0% when pct is zero', () => {
    render(<RetentionCards summary={{ ...SUMMARY, d7_pct: 0 }} />);
    expect(screen.getByTestId('retention-card-d7')).toHaveTextContent('0.0%');
  });

  it('shows empty state when total_users is 0', () => {
    render(<RetentionCards summary={ZERO_SUMMARY} />);
    expect(screen.getByTestId('retention-cards-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('retention-card-d1')).not.toBeInTheDocument();
  });

  it('D1 card uses green colour class', () => {
    render(<RetentionCards summary={SUMMARY} />);
    const d1Card = screen.getByTestId('retention-card-d1');
    expect(d1Card.innerHTML).toContain('emerald');
  });
});
