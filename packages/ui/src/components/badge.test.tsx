import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toHaveClass('bg-primary');
  });

  it('applies success variant', () => {
    render(<Badge variant="success">OK</Badge>);
    expect(screen.getByText('OK')).toHaveClass('bg-success/15');
  });

  it('merges custom className', () => {
    render(<Badge className="mt-4">New</Badge>);
    expect(screen.getByText('New')).toHaveClass('mt-4');
  });
});
