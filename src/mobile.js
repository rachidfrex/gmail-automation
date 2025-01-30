
const { getUserInput } = require('./config/readline');
const { setupMobileAutomation, loginToGmail, sendEmail } = require('./services/mobileService');
const chalk = require('chalk');

async function automateMobileGmail(config) {
  let driver;

  try {
    driver = await setupMobileAutomation();
    await loginToGmail(driver, config.email, config.password);

    // Read email data and send emails
    const emailsData = require('../emailCompose.json');
    for (const recipient of emailsData.recipients) {
      console.log(chalk.blue(`📧 Sending email to: ${recipient.email}`));
      await sendEmail(driver, {
        to: recipient.email,
        subject: recipient.subject,
        body: recipient.body
      });
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch (error) {
    console.error(chalk.red('❌ Error:', error));
  } finally {
    if (driver) {
      await driver.deleteSession();
    }
  }
}

(async () => {
  try {
    const config = await getUserInput();
    console.log(chalk.blue('\n🚀 Starting Mobile Gmail automation...'));
    await automateMobileGmail(config);
  } catch (error) {
    console.error(chalk.red('❌ Fatal error:', error));
  }
})();