import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

export default defineConfig(async () => {
  const { cloudflare } = await import('@cloudflare/vite-plugin');
  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: { host: '127.0.0.1' },
    plugins: [vinext(), cloudflare({
      viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
      config: { main: 'vinext/server/fetch-handler', compatibility_flags: ['nodejs_compat'] },
    })],
  };
});
