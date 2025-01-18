const { chromium, devices } = require('@playwright/test');
const chalk = require('chalk');

async function setupBrowser(isMobile = false) {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext(
    isMobile 
      ? { ...devices['iPhone 12'] }
      : {
          viewport: { width: 1280, height: 720 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
        }
  );

  const page = await context.newPage();
  return { browser, context, page };
}

async function login(page, email, password) {
  console.log(chalk.blue('🔑 Logging in...'));
  await page.goto('https://gmail.com');
  await page.fill('input[type="email"]', email);
  await page.click('button:has-text("Next")');
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Next")');
  
  await page.waitForURL('https://mail.google.com/**');
  console.log(chalk.green('✅ Successfully logged in!'));
}

module.exports = {
  setupBrowser,
  login
};
