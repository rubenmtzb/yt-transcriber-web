// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Where this is served from. Open Graph and canonical URLs have to be absolute -- a relative
  // og:image is simply dropped by every crawler that reads it -- and this is what Astro resolves
  // them against.
  site: 'https://yt.rubenitx.me',
  integrations: [react()]
});