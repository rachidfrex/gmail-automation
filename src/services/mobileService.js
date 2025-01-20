
const { remote } = require('webdriverio');
const fs = require('fs').promises;
const chalk = require('chalk');

const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Pixel_4',
  'appium:udid': 'emulator-5554',  // Add this line
  'appium:appPackage': 'com.google.android.gm',
  'appium:appActivity': 'com.google.android.gm.ConversationListActivityGmail',
  'appium:noReset': false,
  'appium:newCommandTimeout': 60000
};

const wdOpts = {
  hostname: 'localhost',
  port: 4723,
  path: '/wd/hub',
  logLevel: 'info',
  capabilities
};
async function setupMobileAutomation() {
  console.log(chalk.blue('🚀 Setting up mobile automation...'));
  const driver = await remote(wdOpts);
  return driver;
}

async function loginToGmail(driver, email, password) {
  console.log(chalk.blue('🔑 Logging into Gmail app...'));
  try {
    // Click "Add an account" button
    await driver.$('//android.widget.Button[@text="Add an account"]').click();
    
    // Select Google account type
    await driver.$('//android.widget.TextView[@text="Google"]').click();
    
    // Enter email
    await driver.$('//android.widget.EditText').setValue(email);
    await driver.$('//android.widget.Button[@text="Next"]').click();
    
    // Enter password
    await driver.$('//android.widget.EditText[@password="true"]').setValue(password);
    await driver.$('//android.widget.Button[@text="Next"]').click();
    
    // Accept terms if shown
    try {
      await driver.$('//android.widget.Button[@text="I agree"]').click();
    } catch (e) {
      console.log(chalk.yellow('No terms prompt shown'));
    }
    
    console.log(chalk.green('✅ Successfully logged in!'));
  } catch (error) {
    console.error(chalk.red('❌ Login failed:', error.message));
    throw error;
  }
}

async function sendEmail(driver, { to, subject, body }) {
  try {
    // Click compose button
    await driver.$('//android.widget.Button[@content-desc="Compose"]').click();
    
    // Fill recipient
    await driver.$('//android.widget.EditText[@text="To"]').setValue(to);
    
    // Fill subject
    await driver.$('//android.widget.EditText[@text="Subject"]').setValue(subject);
    
    // Fill body
    await driver.$('//android.widget.EditText[@text="Compose email"]').setValue(body);
    
    // Send email
    await driver.$('//android.widget.Button[@content-desc="Send"]').click();
    
    console.log(chalk.green('✅ Email sent successfully'));
  } catch (error) {
    console.error(chalk.red('❌ Error sending email:', error));
    throw error;
  }
}

module.exports = {
  setupMobileAutomation,
  loginToGmail,
  sendEmail
};