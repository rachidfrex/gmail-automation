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

    // Get and log page source for debugging
    const initialSource = await driver.getPageSource();
    await fs.writeFile('initial_source.xml', initialSource);
    console.log(chalk.yellow('Initial page source saved to initial_source.xml'));

    // Try multiple selector strategies for the "Got it" button
    const gotItSelectors = [
      'android=new UiSelector().resourceId("welcome_tour_got_it")',
      'android=new UiSelector().resourceId("com.google.android.gm:id/welcome_tour_got_it")',
      'android=new UiSelector().text("GOT IT")',
      'android=new UiSelector().text("Got it")',
      'android=new UiSelector().textContains("Got")',
      '//android.widget.Button[@resource-id="com.google.android.gm:id/welcome_tour_got_it"]',
      '//android.widget.Button[contains(@text, "Got")]'
    ];

    // Try each selector with verification
    for (const selector of gotItSelectors) {
      try {
        console.log(chalk.blue(`Trying selector: ${selector}`));
        const element = await driver.$(selector);
        if (await element.isDisplayed()) {
          console.log(chalk.green(`Found "Got it" button with selector: ${selector}`));
          await element.click();
          await driver.pause(3000);
          
          // Take screenshot after clicking
          await driver.saveScreenshot('./after_got_it_click.png');
          console.log(chalk.green('Screenshot saved after clicking "Got it"'));
          
          // Get new page source after clicking
          const afterClickSource = await driver.getPageSource();
          await fs.writeFile('after_got_it_source.xml', afterClickSource);
          console.log(chalk.yellow('Page source after "Got it" saved'));
          
          break;
        }
      } catch (e) {
        console.log(chalk.yellow(`Selector ${selector} failed:`, e.message));
      }
    }

    // Try to find the Add Account button with multiple strategies
    const addAccountSelectors = [
      'android=new UiSelector().resourceId("add_account_button")',
      'android=new UiSelector().resourceId("com.google.android.gm:id/setup_addresses_add_another")',
      'android=new UiSelector().text("Add an email address")',
      'android=new UiSelector().text("Add another account")',
      'android=new UiSelector().textContains("Add")',
      '//android.widget.Button[contains(@text, "Add")]',
      '//android.widget.TextView[contains(@text, "Add")]'
    ];

    for (const selector of addAccountSelectors) {
      try {
        console.log(chalk.blue(`Trying Add Account selector: ${selector}`));
        const element = await driver.$(selector);
        if (await element.isDisplayed()) {
          console.log(chalk.green(`Found Add Account button with selector: ${selector}`));
          await element.click();
          await driver.pause(3000);
          
          await driver.saveScreenshot('./after_add_account_click.png');
          const newSource = await driver.getPageSource();
          await fs.writeFile('after_add_account_source.xml', newSource);
          break;
        }
      } catch (e) {
        console.log(chalk.yellow(`Add Account selector ${selector} failed:`, e.message));
      }
    }

    // Handle email input with retry
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(chalk.blue('Attempting to enter email...'));
        
        // Try different email input selectors
        const emailSelectors = [
          'android=new UiSelector().className("android.widget.EditText")',
          'android=new UiSelector().resourceId("identifierId")',
          'android=new UiSelector().text("Enter your email")'
        ];

        for (const selector of emailSelectors) {
          try {
            const emailInput = await driver.$(selector);
            if (await emailInput.isDisplayed()) {
              await emailInput.setValue(email);
              console.log(chalk.green('✅ Entered email'));
              
              // Try to find and click Next button
              const nextButton = await driver.$('android=new UiSelector().text("Next")');
              if (await nextButton.isDisplayed()) {
                await nextButton.click();
                console.log(chalk.green('✅ Clicked Next'));
                await driver.pause(3000);
                break;
              }
            }
          } catch (e) {
            console.log(chalk.yellow(`Email selector ${selector} failed`));
          }
        }
        
        break; // Break if successful
      } catch (e) {
        console.log(chalk.yellow(`Email entry attempt ${attempt + 1} failed`));
        await driver.pause(2000);
      }
    }

    // Rest of the login logic...
    // ...existing code...

  } catch (error) {
    console.error(chalk.red('❌ Login failed:', error.message));
    try {
      // Save final state for debugging
      await driver.saveScreenshot('./error_state.png');
      const finalSource = await driver.getPageSource();
      await fs.writeFile('error_state_source.xml', finalSource);
      console.log(chalk.yellow('Error state info saved to error_state.png and error_state_source.xml'));
      
      // Get current activity
      const currentActivity = await driver.getCurrentActivity();
      console.log(chalk.yellow('Current activity at error:', currentActivity));
      
      // Get current package
      const currentPackage = await driver.getCurrentPackage();
      console.log(chalk.yellow('Current package at error:', currentPackage));
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