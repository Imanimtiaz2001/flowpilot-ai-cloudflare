import { defineConfig } from 'vitest/config';
import agents from 'agents/vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
export default defineConfig({ plugins: [agents(), react(), cloudflare()], test: { environment: 'node' } });
