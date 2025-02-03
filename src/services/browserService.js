const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const randomUseragent = require('random-useragent');
chromium.use(stealth); 

async function setupBrowser(headless = true) {
  const userAgent = randomUseragent.getRandom();
  const browser = await chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const context = await browser.newContext({
    userAgent,
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    hasTouch: false
  });

  const page = await context.newPage();
  
  // Add human-like behaviors
  await page.setDefaultTimeout(30000);
  await page.setDefaultNavigationTimeout(30000);

  return { browser, context, page };
}

async function login(page, email, password) {
  try {
    await page.goto('https://gmail.com', { waitUntil: 'networkidle' });
    
    // Add random delays between actions
    const randomDelay = () => page.waitForTimeout(2000 + Math.random() * 3000);

    // Email input
    await page.fill('input[type="email"]', email);
    await randomDelay();
    await page.click('button:has-text("Next")');
    
    // Password input
    await page.waitForSelector('input[type="password"]', { state: 'visible' });
    await randomDelay();
    await page.fill('input[type="password"]', password);
    await randomDelay();
    await page.click('button:has-text("Next")');

    // Wait for Gmail to load
    await page.waitForSelector('div[role="main"]', { timeout: 60000 });
    
    // Save authentication state
    await page.context().storageState({ path: 'auth_state.json' });
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}

module.exports = { setupBrowser, login };
