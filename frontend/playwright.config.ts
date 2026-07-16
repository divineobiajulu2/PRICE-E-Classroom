import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120000,
  expect: { timeout: 5000 },
  use: {
    baseURL: 'http://localhost:3001',
    actionTimeout: 10000,
    trace: 'on-first-retry',
    headless: true,
  },
});
