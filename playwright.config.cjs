const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', timeout: 45000, workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit', isMobile: true, hasTouch: true } },
  ],
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
