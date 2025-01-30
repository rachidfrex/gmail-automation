const { getUserInput } = require('./config/readline');
const { setupBrowser, login } = require('./services/browserService');
const { getLatestEmails, sendBatchEmails, markAsRead } = require('./services/emailService');
const chalk = require('chalk');

async function automateGmail(config) {
  let browser, context, page;

  try {
    ({ browser, context, page } = await setupBrowser(true));
    await login(page, config.email, config.password);
    await page.waitForTimeout(5000);

    // Get latest emails
    await getLatestEmails(page, config.numberOfEmails);
    
    // Send batch emails from emailCompose.json
    console.log(chalk.blue('\n📨 Starting batch email sending...'));
    await sendBatchEmails(page);
 
    // Mark emails as read
    console.log(chalk.blue('\n📨 Starting to mark emails as read...'));
    await markAsRead(page, config.numberOfEmails);

    await page.screenshot({ path: 'gmail_result.png', fullPage: true });
  } catch (error) {
    console.error(chalk.red('❌ Error:', error));
    if (page) await page.screenshot({ path: 'error.png' });
  } finally {
    if (page) await page.waitForTimeout(3000);
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

(async () => {
  try {
    const config = await getUserInput();
    console.log(chalk.blue('\n🚀 Starting Gmail automation...'));
    await automateGmail(config);
  } catch (error) {
    console.error(chalk.red('❌ Fatal error:', error));
  }
})();






