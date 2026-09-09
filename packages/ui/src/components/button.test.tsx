import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders children and default variant styles', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary');
  });

  it('applies outline variant', () => {
    render(<Button variant="outline">Cancel</Button>);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('border-input');
  });

  it('accepts size variants', () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('h-8');
  });

  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Click' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a spinner and disables the button while loading', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('renders as a child element when asChild is set', () => {
    render(
      <Button asChild>
        <a href="/orders">Link</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link.closest('a')).toHaveClass('bg-primary');
    expect(link.tagName).toBe('A');
  });
});
