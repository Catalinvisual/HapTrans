import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('merges class names and conflicts', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('filters falsy values', () => {
    expect(cn('px-4', false, null, undefined, 'py-2')).toBe('px-4 py-2');
  });

  it('handles conditional objects and nested arrays', () => {
    expect(cn({ 'bg-red-500': true, 'bg-blue-500': false }, ['block', 'w-full'])).toBe(
      'bg-red-500 block w-full',
    );
  });
});
