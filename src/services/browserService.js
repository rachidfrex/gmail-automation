const { chromium, devices } = require('@playwright/test');
const chalk = require('chalk');

const setupBrowser = async (isMobile = false) => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      '--disable-features=IsolateOrigins',
      '--disable-features=site-per-process'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
    permissions: ['geolocation'],
    geolocation: { latitude: 51.5074, longitude: -0.1278 },
    colorScheme: 'light',
    userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.99 Mobile Safari/537.36'
  });

  // Enhanced stealth scripts
  await context.addInitScript(() => {
    // Pass WebDriver check
    delete Object.getPrototypeOf(navigator).webdriver;
    
    // Pass Chrome check
    window.chrome = {
      runtime: {},
      loadTimes: () => {},
      csi: () => {},
      app: {},
      webstore: {},
    };
    
    // Pass Permissions check
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
    
    // Pass Plugins check
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5].map(() => ({
        0: {
          type: "application/x-google-chrome-pdf",
          suffixes: "pdf",
          description: "Portable Document Format",
          enabledPlugin: true,
        },
        description: "Portable Document Format",
        filename: "internal-pdf-viewer",
        length: 1,
        name: "Chrome PDF Plugin"
      }))
    });

    // Pass Languages check
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });
  });

  const page = await context.newPage();
  return { browser, context, page };
};

async function login(page, email, password) {
  console.log(chalk.blue('🔑 Logging in...'));
  await page.goto('https://accounts.google.com/signin/v2/identifier?service=mail', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Enhanced login process with additional waits
  try {
    await page.fill('input[type="email"]', email);
    await page.waitForTimeout(2000);
    await page.press('input[type="email"]', 'Enter');
    
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.fill('input[type="password"]', password);
    await page.waitForTimeout(2000);
    await page.press('input[type="password"]', 'Enter');
    
    await page.waitForTimeout(5000);

    // Handle the "Use web version" prompt
    try {
      await page.waitForSelector('div.NPT0hc a[data-onclick="xpag-decline+240"]', { timeout: 10000 });
      await page.click('div.NPT0hc a[data-onclick="xpag-decline+240"]');
      console.log(chalk.blue('📱 Clicked "Use web version"'));
      await page.waitForTimeout(3000);
    } catch (promptError) {
      console.log(chalk.yellow('ℹ️ No app prompt found, continuing...'));
    }

    await page.waitForURL('https://mail.google.com/**', { timeout: 60000 });
    console.log(chalk.green('✅ Successfully logged in!'));
  } catch (error) {
    console.error(chalk.red('❌ Login failed:', error.message));
    throw error;
  }
}

module.exports = {
  setupBrowser,
  login
};
