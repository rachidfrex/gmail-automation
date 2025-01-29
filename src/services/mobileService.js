const { remote } = require('webdriverio');
const fs = require('fs').promises;
const chalk = require('chalk');
const path = require('path');

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
  'appium:appActivity': 'com.google.android.gm.ConversationListActivityGmail',
  'appium:noReset': false,
  'appium:autoGrantPermissions': true,
  'appium:newCommandTimeout': 120,
  'appium:androidDeviceReadyTimeout': 60000
};

const wdOpts = {
  hostname: process.env.APPIUM_HOST || 'localhost',
  port: 4723,
  logLevel: 'info',
  capabilities
};

async function setupMobileAutomation() {
  console.log(chalk.blue('🚀 Setting up mobile automation...'));
  try {
    // Validate environment first
    validateEnvironment();

    // Verify Android SDK is accessible
    const adbPath = path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe');
    
    // Check if emulator is running
    const { exec } = require('child_process');
    await new Promise((resolve, reject) => {
      exec(`"${adbPath}" devices`, (error, stdout, stderr) => {
        if (error) {
          console.error(chalk.red('Error checking devices:', error));
          reject(error);
          return;
        }
        if (!stdout.includes('emulator')) {
          reject(new Error('No emulator found. Please start your Android emulator first.'));
          return;
        }
        console.log(chalk.yellow('Connected devices:'), stdout);
        resolve();
      });
    });

    const driver = await remote(wdOpts);
    return driver;
  } catch (error) {
    console.error(chalk.red('Setup failed:', error.message));
    throw error;
  }
}

async function loginToGmail(driver, email, password) {
  console.log(chalk.blue('🔑 Logging into Gmail app...'));
  try {
    // Wait for app to load and get page source for debugging
    await driver.pause(5000);
    const source = await driver.getPageSource();
    console.log(chalk.yellow('Current page source:', source));

    // Try different selectors for the initial setup buttons
    const initialSelectors = [
      'new UiSelector().text("Skip")',
      'new UiSelector().text("Got it")',
      'new UiSelector().resourceId("com.google.android.gm:id/welcome_tour_got_it")',
      'new UiSelector().text("Add an email address")',
      'new UiSelector().resourceId("com.google.android.gm:id/setup_addresses_add_another")',
      'new UiSelector().resourceId("com.google.android.gm:id/action_done")'
    ];

    // Try each selector
    for (const selector of initialSelectors) {
      try {
        const element = await driver.$(`android=${selector}`);
        if (await element.isDisplayed()) {
          console.log(chalk.green(`✅ Found and clicking element with selector: ${selector}`));
          await element.click();
          await driver.pause(2000);
        }
      } catch (e) {
        console.log(chalk.yellow(`Selector not found: ${selector}`));
      }
    }

    // Try to find Google account setup
    try {
      const googleAccount = await driver.$('android=new UiSelector().resourceId("com.google.android.gm:id/account_setup_label")');
      if (await googleAccount.isDisplayed()) {
        await googleAccount.click();
        console.log(chalk.green('✅ Selected Google account setup'));
      }
    } catch (e) {
      console.log(chalk.yellow('Google account setup not found, continuing...'));
    }

    // Email input using resource ID
    try {
      const emailInput = await driver.$('android=new UiSelector().resourceId("identifierId")');
      await emailInput.setValue(email);
      console.log(chalk.green('✅ Entered email'));
      
      const nextButton = await driver.$('android=new UiSelector().resourceId("identifierNext")');
      await nextButton.click();
    } catch (e) {
      console.log(chalk.yellow('Could not find email input, trying alternative selector...'));
      // Try alternative email input
      const altEmailInput = await driver.$('android=new UiSelector().className("android.widget.EditText")');
      await altEmailInput.setValue(email);
      
      const altNextButton = await driver.$('android=new UiSelector().text("Next").className("android.widget.Button")');
      await altNextButton.click();
    }

    await driver.pause(3000);

    // Password input using resource ID
    try {
      const passwordInput = await driver.$('android=new UiSelector().resourceId("password")');
      await passwordInput.setValue(password);
      console.log(chalk.green('✅ Entered password'));
      
      const nextButton = await driver.$('android=new UiSelector().resourceId("passwordNext")');
      await nextButton.click();
    } catch (e) {
      console.log(chalk.yellow('Could not find password input, trying alternative selector...'));
      // Try alternative password input
      const altPasswordInput = await driver.$('android=new UiSelector().password(true)');
      await altPasswordInput.setValue(password);
      
      const altNextButton = await driver.$('android=new UiSelector().text("Next").className("android.widget.Button")');
      await altNextButton.click();
    }

    // Handle additional prompts
    const additionalButtons = [
      'new UiSelector().text("I agree")',
      'new UiSelector().text("Accept")',
      'new UiSelector().text("More")',
      'new UiSelector().text("OK")'
    ];

    for (const selector of additionalButtons) {
      try {
        const element = await driver.$(`android=${selector}`);
        if (await element.isDisplayed()) {
          await element.click();
          console.log(chalk.green(`✅ Clicked additional button: ${selector}`));
          await driver.pause(2000);
        }
      } catch (e) {
        continue;
      }
    }

    console.log(chalk.green('✅ Login sequence completed!'));
    await driver.pause(5000);
    
  } catch (error) {
    console.error(chalk.red('❌ Login failed:', error.message));
    // Take screenshot on failure
    try {
      await driver.saveScreenshot('./error_screenshot.png');
      console.log(chalk.yellow('Screenshot saved as error_screenshot.png'));
    } catch (e) {
      console.log(chalk.red('Could not save screenshot:', e.message));
    }
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