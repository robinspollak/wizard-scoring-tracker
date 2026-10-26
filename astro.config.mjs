// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  // Forms post back to their own page; the password gate covers abuse.
  security: { checkOrigin: true },
});
