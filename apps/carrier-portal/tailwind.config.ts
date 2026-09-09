import type { Config } from 'tailwindcss';
import hapcargoPreset from '@hapcargo/config/tailwind';

export default {
  presets: [hapcargoPreset],
  content: ['./src/**/*.{ts,tsx}'],
} satisfies Config;
