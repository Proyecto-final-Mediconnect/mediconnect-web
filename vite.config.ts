import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // `.env` no se versiona, así que en CI `VITE_API_BASE_URL` no existe y el
    // httpClient armaba URLs `undefined/...`. El base de los tests no apunta a
    // ningún servidor real (fetch está mockeado); solo tiene que ser una URL
    // absoluta válida para que los asserts puedan parsear el query string.
    env: { VITE_API_BASE_URL: 'http://localhost:3000' },
  },
});
