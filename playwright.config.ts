import { defineConfig, devices } from '@playwright/test'

const PORT = 3100

// Forzamos modo demo (sin Supabase) para que el smoke sea determinista y no
// dependa de credenciales reales. Next no sobreescribe variables ya presentes
// en el entorno, así que estos placeholders ganan sobre .env.local.
// 'your-supabase-project-url' lo reconocen como demo tanto el cliente
// (src/lib/supabase/client.ts) como el proxy (src/lib/supabase/middleware.ts).
const DEMO_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'your-supabase-project-url',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your-anon-key',
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}/auth/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: DEMO_ENV,
  },
})
