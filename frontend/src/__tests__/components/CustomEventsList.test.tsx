import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomEventsList from '@/components/events/CustomEventsList';

const EVENTS = [
  { name: 'button_click', count: 100 },
  { name: 'form_submit',  count: 50  },
  { name: 'video_play',   count: 25  },
];

describe('CustomEventsList', () => {
  it('shows empty state when no events', () => {
    render(<CustomEventsList events={[]} selected={null} onSelect={jest.fn()} />);
    expect(screen.getByTestId('events-list-empty')).toBeInTheDocument();
  });

  it('renders a row for each event', () => {
    render(<CustomEventsList events={EVENTS} selected={null} onSelect={jest.fn()} />);
    expect(screen.getByTestId('event-row-button_click')).toBeInTheDocument();
    expect(screen.getByTestId('event-row-form_submit')).toBeInTheDocument();
  });

  it('displays event name and count', () => {
    render(<CustomEventsList events={EVENTS} selected={null} onSelect={jest.fn()} />);
    expect(screen.getByText('button_click')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('first row bar is 100% width', () => {
    render(<CustomEventsList events={EVENTS} selected={null} onSelect={jest.fn()} />);
    expect(screen.getByTestId('event-bar-button_click')).toHaveStyle({ width: '100%' });
  });

  it('subsequent bar widths are proportional', () => {
    render(<CustomEventsList events={EVENTS} selected={null} onSelect={jest.fn()} />);
    expect(screen.getByTestId('event-bar-form_submit')).toHaveStyle({ width: '50%' });
  });

  it('clicking a row calls onSelect with event name', async () => {
    const onSelect = jest.fn();
    render(<CustomEventsList events={EVENTS} selected={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByTestId('event-row-form_submit'));
    expect(onSelect).toHaveBeenCalledWith('form_submit');
  });
});
