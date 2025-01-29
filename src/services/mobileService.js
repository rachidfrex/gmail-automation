const { remote } = require('webdriverio');
const fs = require('fs').promises;
const chalk = require('chalk');
const path = require('path');
const { exec } = require('child_process');

function validateEnvironment() {
  const required = {
    ANDROID_HOME: process.env.ANDROID_HOME,
    ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please set them in your system environment variables:\n' +
      '1. Open Windows System Properties > Advanced > Environment Variables\n' +
      '2. Add ANDROID_HOME and ANDROID_SDK_ROOT pointing to your Android SDK location\n' +
      '   (typically C:\\Users\\<YourUsername>\\AppData\\Local\\Android\\Sdk)\n' +
      '3. Add %ANDROID_HOME%\\platform-tools to your Path variable'
    );
  }
}

const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Pixel_4_API_30',
  'appium:platformVersion': '11.0',
  'appium:appPackage': 'com.google.android.gm',
  'appium:appActivity': '.GmailActivity',
  'appium:noReset': false,
  'appium:autoGrantPermissions': true,
  'appium:newCommandTimeout': 90000,
  'appium:androidDeviceReadyTimeout': 90000,
  'appium:adbExecTimeout': 90000,
  'appium:intentAction': 'android.intent.action.MAIN',
  'appium:intentCategory': 'android.intent.category.LAUNCHER',
  'appium:dontStopAppOnReset': false,
  'appium:enforceAppInstall': true
};

const wdOpts = {
  hostname: 'localhost',
  port: 4723,
  logLevel: 'info',
  capabilities
};

async function setupMobileAutomation() {
  console.log(chalk.blue('🚀 Setting up mobile automation...'));
  try {
    validateEnvironment();
    
    const adbPath = path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe');
    
    // Helper function for adb commands
    const executeAdb = async (command) => {
      return new Promise((resolve, reject) => {
        exec(`"${adbPath}" ${command}`, (error, stdout, stderr) => {
          if (error) {
            console.error(chalk.red(`Error executing adb ${command}:`, error));
            reject(error);
            return;
          }
          resolve(stdout.trim());
        });
      });
    };

    // Ensure Gmail is ready
    await executeAdb('shell pm clear com.google.android.gm');
    await executeAdb('shell am force-stop com.google.android.gm');
    
    // Check emulator
    const devices = await executeAdb('devices');
    if (!devices.includes('emulator')) {
      throw new Error('No emulator found. Please start your Android emulator first.');
    }
    console.log(chalk.yellow('Connected devices:'), devices);
    
    // Create driver
    const driver = await remote(wdOpts);
    await driver.pause(5000);
    
    return driver;
  } catch (error) {
    console.error(chalk.red('Setup failed:', error.message));
    throw error;
  }
}

async function loginToGmail(driver, email, password) {
  console.log(chalk.blue('🔑 Logging into Gmail app...'));
  try {
    await driver.pause(5000);

    // Helper function to safely click elements
    const safeClick = async (selector, description) => {
      try {
        const element = await driver.$(selector);
        if (await element.isDisplayed()) {
          await element.click();
          console.log(chalk.green(`✅ Clicked ${description}`));
          return true;
        }
      } catch (e) {
        console.log(chalk.yellow(`${description} not found`));
      }
      return false;
    };

    // Try different selectors for initial setup
    const selectors = [
      'android=new UiSelector().text("Got it")',
      'android=new UiSelector().text("Skip")',
      'android=new UiSelector().text("Add an email address")',
      'android=new UiSelector().text("Add another account")',
      'android=new UiSelector().resourceId("com.google.android.gm:id/welcome_tour_got_it")',
      'android=new UiSelector().className("android.widget.Button")'
    ];

    for (const selector of selectors) {
      try {
        const element = await driver.$(selector);
        if (await element.isDisplayed()) {
          console.log(chalk.green(`Found element with selector: ${selector}`));
          await element.click();
          await driver.pause(2000);
        }
      } catch (e) {
        console.log(chalk.yellow(`Selector not found: ${selector}`));
      }
    }

    // Try to enter email
    try {
      const emailInput = await driver.$('android=new UiSelector().className("android.widget.EditText")');
      await emailInput.waitForDisplayed({ timeout: 10000 });
      await emailInput.setValue(email);
      console.log(chalk.green('✅ Entered email'));
      
      await safeClick('android=new UiSelector().text("Next")', 'Next button');
      await driver.pause(3000);
    } catch (e) {
      console.error(chalk.red('Failed to enter email:', e.message));
      throw e;
    }

    // Try to enter password
    try {
      const passwordInput = await driver.$('android=new UiSelector().password(true)');
      await passwordInput.waitForDisplayed({ timeout: 10000 });
      await passwordInput.setValue(password);
      console.log(chalk.green('✅ Entered password'));
      
      await safeClick('android=new UiSelector().text("Next")', 'Next button');
      await driver.pause(3000);
    } catch (e) {
      console.error(chalk.red('Failed to enter password:', e.message));
      throw e;
    }

    // Handle additional prompts
    const additionalButtons = [
      'android=new UiSelector().text("I agree")',
      'android=new UiSelector().text("Accept")',
      'android=new UiSelector().text("More")',
      'android=new UiSelector().text("Done")'
    ];

    for (const selector of additionalButtons) {
      await safeClick(selector, `Button ${selector}`);
      await driver.pause(2000);
    }

    console.log(chalk.green('✅ Login sequence completed!'));
  } catch (error) {
    console.error(chalk.red('❌ Login failed:', error.message));
    try {
      await driver.saveScreenshot('./error_screenshot.png');
      const source = await driver.getPageSource();
      await fs.writeFile('./error_page_source.xml', source);
      console.log(chalk.yellow('Debug info saved'));
    } catch (e) {
      console.log(chalk.red('Could not save debug info:', e.message));
    }
    throw error;
  }
}

async function sendEmail(driver, { to, subject, body }) {
  try {
    await driver.$('//android.widget.Button[@content-desc="Compose"]').click();
    await driver.$('//android.widget.EditText[@text="To"]').setValue(to);
    await driver.$('//android.widget.EditText[@text="Subject"]').setValue(subject);
    await driver.$('//android.widget.EditText[@text="Compose email"]').setValue(body);
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