import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './states';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No orders" description="Create your first order to get started." />);
    expect(screen.getByText('No orders')).toBeInTheDocument();
    expect(
      screen.getByText('Create your first order to get started.'),
    ).toBeInTheDocument();
  });

  it('renders an action node', () => {
    render(<EmptyState title="Empty" action={<button>Create</button>} />);
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('applies size class', () => {
    const { container } = render(<EmptyState title="Empty" size="lg" />);
    expect(container.firstChild as HTMLElement).toHaveClass('py-16');
  });
});
