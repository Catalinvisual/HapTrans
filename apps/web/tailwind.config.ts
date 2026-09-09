import type { Config } from 'tailwindcss';
import hapcargoPreset from '@hapcargo/config/tailwind';
import { join } from 'node:path';

export default {
  presets: [hapcargoPreset],
  content: [
    './src/**/*.{ts,tsx}',
    join(__dirname, '../../packages/ui/src/**/*.{ts,tsx}'),
    join(__dirname, '../../packages/ui/src/**/*.{ts,tsx}'),
  ],
} satisfies Config;
