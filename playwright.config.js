// Minimal config for the dashboard button audits.
// BASE_URL env var overrides the target (defaults to the local dev server,
// which serves the same files Vercel deploys).
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: /.*button-audit\.spec\.js/,
  timeout: 300000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5500',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
