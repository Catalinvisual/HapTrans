import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('humanizes a status key', () => {
    render(<StatusBadge status="on-time" />);
    expect(screen.getByText('On time')).toBeInTheDocument();
  });

  it('capitalizes a single word status', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('falls back to default styles for unknown statuses', () => {
    const { container } = render(<StatusBadge status="unknown-thing" />);
    const badge = container.querySelector('span.inline-flex');
    expect(badge).not.toBeNull();
    expect(badge).toHaveClass('bg-muted');
    expect(screen.getByText('Unknown thing')).toBeInTheDocument();
  });

  it('renders an icon when showIcon is true', () => {
    const { container } = render(<StatusBadge status="active" />);
    const icon = container.querySelector('span[aria-hidden="true"]');
    expect(icon).not.toBeNull();
  });

  it('omits the icon when showIcon is false', () => {
    const { container } = render(<StatusBadge status="active" showIcon={false} />);
    expect(container.querySelector('span[aria-hidden="true"]')).toBeNull();
  });
});
