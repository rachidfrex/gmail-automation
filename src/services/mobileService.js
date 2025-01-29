const { remote } = require('webdriverio');
const fs = require('fs').promises;
const chalk = require('chalk');
const path = require('path');
const { exec } = require('child_process');

const OUTPUT_DIR = {
  screenshots: path.join(__dirname, '../../output/screenshots'),
  logs: path.join(__dirname, '../../output/logs')
};

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
  // Helper functions
  async function logClickableElements(driver) {
    const source = await driver.getPageSource();
    console.log(chalk.yellow('Current page elements:', source));
  }

  async function clickButton(driver, options) {
    const { text, resourceId, className, description } = options;
    const selectors = [
      text && `android=new UiSelector().text("${text}")`,
      resourceId && `android=new UiSelector().resourceId("${resourceId}")`,
      className && `android=new UiSelector().className("${className}")`,
      description && `android=new UiSelector().description("${description}")`,
      text && `android=new UiSelector().textContains("${text}")`,
      text && `android=new UiSelector().className("android.widget.Button").text("${text}")`,
      text && `android=new UiSelector().className("android.widget.Button").textContains("${text}")`,
    ].filter(Boolean);

    console.log(chalk.blue(`Trying to click button with options:`, options));

    for (const selector of selectors) {
      try {
        const element = await driver.$(selector);
        if (await element.isDisplayed()) {
          console.log(chalk.green(`Found clickable element with selector: ${selector}`));
          await element.click();
          console.log(chalk.green(`✅ Successfully clicked: ${selector}`));
          return true;
        }
      } catch (e) {
        console.log(chalk.yellow(`Selector failed: ${selector}`));
      }
    }
    return false;
  }

  async function clickNextButton(driver) {
    console.log(chalk.blue('Looking for Next button...'));
    
    // Get screen dimensions for relative positioning
    const { width, height } = await driver.getWindowRect();
    
    const strategies = [
      // Strategy 1: Try standard button selectors
      async () => {
        const buttonSelectors = [
          'android=new UiSelector().className("android.widget.Button").text("NEXT")',
          'android=new UiSelector().className("android.widget.Button").textMatches("(?i)next")',
          'android=new UiSelector().resourceId("identifierNext")',
          'android=new UiSelector().className("android.widget.Button").clickable(true).instance(2)'
        ];
        
        for (const selector of buttonSelectors) {
          try {
            const button = await driver.$(selector);
            if (await button.isDisplayed()) {
              await button.click();
              return true;
            }
          } catch (e) {
            console.log(chalk.yellow(`Standard selector failed: ${selector}`));
          }
        }
        return false;
      },
  
      // Strategy 2: Try relative position (bottom right corner)
      async () => {
        try {
          const x = Math.floor(width * 0.85); // 85% from left
          const y = Math.floor(height * 0.92); // 92% from top
          await driver.touchAction([
            { action: 'tap', x, y }
          ]);
          return true;
        } catch (e) {
          console.log(chalk.yellow('Position-based click failed'));
          return false;
        }
      },
  
      // Strategy 3: Try finding by surrounding elements
      async () => {
        try {
          const elements = await driver.$$('android.widget.Button');
          for (const element of elements) {
            const text = await element.getText();
            if (text === 'NEXT' || text === 'Next') {
              await element.click();
              return true;
            }
          }
          return false;
        } catch (e) {
          console.log(chalk.yellow('Element search failed'));
          return false;
        }
      }
    ];
  
    // Try each strategy
    for (const strategy of strategies) {
      try {
        if (await strategy()) {
          console.log(chalk.green('✅ Successfully clicked Next button'));
          return true;
        }
      } catch (e) {
        continue;
      }
    }
  
    console.log(chalk.red('❌ All Next button strategies failed'));
    return false;
  }

  console.log(chalk.blue('🔑 Logging into Gmail app...'));
  try {
    await driver.pause(5000);

    // Get current activity for debugging
    const currentActivity = await driver.getCurrentActivity();
    console.log(chalk.yellow('Current activity:', currentActivity));

    // Click "GOT IT" button
    const gotItSelector = 'android=new UiSelector().resourceId("com.google.android.gm:id/welcome_tour_got_it")';
    try {
      const gotItButton = await driver.$(gotItSelector);
      if (await gotItButton.isDisplayed()) {
        await gotItButton.click();
        console.log(chalk.green('✅ Clicked Got It button'));
        await driver.pause(3000);
      }
    } catch (e) {
      console.log(chalk.yellow('Got It button not found'));
    }

    // Click "Add an email address"
    const addEmailSelector = 'android=new UiSelector().resourceId("com.google.android.gm:id/setup_addresses_add_another")';
    try {
      const addEmailButton = await driver.$(addEmailSelector);
      if (await addEmailButton.isDisplayed()) {
        await addEmailButton.click();
        console.log(chalk.green('✅ Clicked Add email address'));
        await driver.pause(3000);
      }
    } catch (e) {
      console.log(chalk.yellow('Add email button not found'));
    }

    // Click Google account option
    const googleAccountSelectors = [
      'android=new UiSelector().resourceId("com.google.android.gm:id/account_setup_item").index(0)',
      'android=new UiSelector().text("Google")',
      'android=new UiSelector().resourceId("com.google.android.gm:id/account_setup_label").text("Google")'
    ];

    for (const selector of googleAccountSelectors) {
      try {
        console.log(chalk.blue(`Trying to find Google option with selector: ${selector}`));
        const googleOption = await driver.$(selector);
        if (await googleOption.isDisplayed()) {
          await googleOption.click();
          console.log(chalk.green('✅ Clicked Google account option'));
          await driver.pause(3000);
          break;
        }
      } catch (e) {
        console.log(chalk.yellow(`Google option not found with selector: ${selector}`));
      }
    }

    // Now we should be on the Google sign-in page
    // Wait for the web view to load
    await driver.pause(5000);

    // New email input handling
    try {
      console.log(chalk.blue('Attempting to enter email...'));
      
      // Wait for the WebView to load
      await driver.pause(5000);
  
      // Get current context
      const currentContext = await driver.getContext();
      console.log(chalk.yellow('Current context:', currentContext));
  
      // Try multiple selectors for email input
      const emailSelectors = [
        'android=new UiSelector().className("android.widget.EditText").instance(0)',
        'android=new UiSelector().resourceId("identifierId")',
        'android=new UiSelector().textContains("Enter")',
        'android=new UiSelector().className("android.widget.EditText").clickable(true)',
        'android=new UiSelector().resourceId("com.google.android.gm:id/setup_email")'
      ];
  
      let emailInput = null;
      for (const selector of emailSelectors) {
        try {
          const element = await driver.$(selector);
          if (await element.isDisplayed()) {
            emailInput = element;
            console.log(chalk.green(`Found email input with selector: ${selector}`));
            break;
          }
        } catch (e) {
          console.log(chalk.yellow(`Email selector failed: ${selector}`));
        }
      }
  
      if (!emailInput) {
        throw new Error('Could not find email input field');
      }
  
      // Clear existing text and enter email
      await emailInput.clearValue();
      await emailInput.setValue(email);
      console.log(chalk.green('✅ Entered email'));
      await driver.pause(2000);
  
      // Try to find Next button with multiple selectors
      const nextButtonSelectors = [
        'android=new UiSelector().text("Next")',
        'android=new UiSelector().className("android.widget.Button").text("Next")',
        'android=new UiSelector().resourceId("identifierNext")',
        'android=new UiSelector().className("android.widget.Button").clickable(true)'
      ];
  
      for (const selector of nextButtonSelectors) {
        try {
          const nextButton = await driver.$(selector);
          if (await nextButton.isDisplayed()) {
            await nextButton.click();
            console.log(chalk.green('✅ Clicked Next button'));
            await driver.pause(3000);
            break;
          }
        } catch (e) {
          console.log(chalk.yellow(`Next button selector failed: ${selector}`));
        }
      }
  
      // Save screenshot after email input
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await driver.saveScreenshot(path.join(OUTPUT_DIR.screenshots, `after_email_${timestamp}.png`));
      const source = await driver.getPageSource();
      await fs.writeFile(
        path.join(OUTPUT_DIR.logs, `page_source_${timestamp}.xml`),
        source
      );
  
    } catch (error) {
      console.error(chalk.red('Failed to enter email:', error.message));
      
      // Save error state
      const errorTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await driver.saveScreenshot(path.join(OUTPUT_DIR.screenshots, `error_${errorTimestamp}.png`));
      const errorSource = await driver.getPageSource();
      await fs.writeFile(
        path.join(OUTPUT_DIR.logs, `error_${errorTimestamp}.xml`),
        errorSource
      );
      
      throw error;
    }

    // Rest of the login logic...
    // New code: Handle Google account setup screen
    console.log(chalk.blue('Looking for Google account setup option...'));
    const googleSetupSelector = 'android=new UiSelector().resourceId("com.google.android.gm:id/account_setup_label").text("Google")';
    try {
      console.log(chalk.blue('Waiting for Google option...'));
      await driver.waitUntil(async () => {
        const element = await driver.$(googleSetupSelector);
        return element.isDisplayed();
      }, {
        timeout: 10000,
        timeoutMsg: 'Google account option not found after 10s'
      });

      const googleOption = await driver.$(googleSetupSelector);
      await googleOption.click();
      console.log(chalk.green('✅ Selected Google account'));
      await driver.pause(3000);

      // New code: Handle email input with improved verification
      console.log(chalk.blue('Looking for email input field...'));
      const emailFieldSelector = 'android=new UiSelector().className("android.widget.EditText")';
      await driver.waitUntil(async () => {
        const element = await driver.$(emailFieldSelector);
        return element.isDisplayed();
      }, {
        timeout: 10000,
        timeoutMsg: 'Email input not found after 10s'
      });

      const emailField = await driver.$(emailFieldSelector);
      await emailField.setValue(email);
      console.log(chalk.green(`✅ Entered email: ${email}`));
      
      // New code: Handle Next button with verification
      console.log(chalk.blue('Looking for Next button...'));
      const nextButtonSelector = 'android=new UiSelector().text("Next")';
      await driver.waitUntil(async () => {
        const element = await driver.$(nextButtonSelector);
        return element.isDisplayed();
      }, {
        timeout: 5000,
        timeoutMsg: 'Next button not found after 5s'
      });

      const nextButton = await driver.$(nextButtonSelector);
      await nextButton.click();
      console.log(chalk.green('✅ Clicked Next button'));
      await driver.pause(3000);

      // New code: Handle password input
      console.log(chalk.blue('Looking for password input...'));
      const passwordSelector = 'android=new UiSelector().password(true)';
      await driver.waitUntil(async () => {
        const element = await driver.$(passwordSelector);
        return element.isDisplayed();
      }, {
        timeout: 10000,
        timeoutMsg: 'Password input not found after 10s'
      });

      const passwordField = await driver.$(passwordSelector);
      await passwordField.setValue(password);
      console.log(chalk.green('✅ Entered password'));

      // Click Next after password
      const nextAfterPassword = await driver.$('android=new UiSelector().text("Next")');
      await nextAfterPassword.click();
      console.log(chalk.green('✅ Clicked Next after password'));
      await driver.pause(3000);

      // New code: Handle additional prompts (I agree, etc.)
      const finalPrompts = [
        'android=new UiSelector().text("I agree")',
        'android=new UiSelector().text("Accept")',
        'android=new UiSelector().text("Done")'
      ];

      for (const promptSelector of finalPrompts) {
        try {
          const prompt = await driver.$(promptSelector);
          if (await prompt.isDisplayed()) {
            await prompt.click();
            console.log(chalk.green(`✅ Handled prompt: ${promptSelector}`));
            await driver.pause(2000);
          }
        } catch (e) {
          console.log(chalk.yellow(`Prompt not found: ${promptSelector}`));
        }
      }

      console.log(chalk.green('✅ Login sequence completed successfully'));
    } catch (e) {
      console.error(chalk.red('Failed during Google account setup:', e.message));
      throw e;
    }

    // After entering email, try to click Next with improved logic
    try {
      // Log current screen state
      await logClickableElements(driver);

      // First, try to find and click the exact "Next" button
      const nextClicked = await clickButton(driver, {
        text: "Next",
        className: "android.widget.Button",
        description: "Next"
      });

      if (!nextClicked) {
        console.log(chalk.yellow('Could not find primary Next button, trying alternatives...'));
        
        // Try alternative buttons in order of priority
        const alternativeButtons = [
          { text: "Next", className: "android.widget.Button" },
          { text: "Continue", className: "android.widget.Button" },
          { resourceId: "identifierNext" },
          { resourceId: "next" },
          { text: "NEXT" }
        ];

        for (const buttonOptions of alternativeButtons) {
          if (await clickButton(driver, buttonOptions)) {
            console.log(chalk.green('✅ Clicked alternative Next button'));
            break;
          }
        }
      }

      // Wait after clicking
      await driver.pause(3000);

    } catch (error) {
      console.error(chalk.red('Failed to click Next:', error.message));
      // Save debug info
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await driver.saveScreenshot(path.join(OUTPUT_DIR.screenshots, `next_button_error_${timestamp}.png`));
      throw error;
    }

    // After entering email, use the new clickNextButton function
    await clickNextButton(driver);
    await driver.pause(3000);

  } catch (error) {
    console.error(chalk.red('❌ Login failed:', error.message));
    // Save final state for debugging
    try {
      await driver.saveScreenshot('./error_state.png');
      const finalSource = await driver.getPageSource();
      await fs.writeFile('error_state_source.xml', finalSource);
      console.log(chalk.yellow('Error state info saved to error_state.png and error_state_source.xml'));
      
      // Get current context
      const context = await driver.getContext();
      console.log(chalk.yellow('Current context:', context));
      
      // Get available contexts
      const contexts = await driver.getContexts();
      console.log(chalk.yellow('Available contexts:', contexts));
      
      // Get current activity
      const currentActivity = await driver.getCurrentActivity();
      console.log(chalk.yellow('Current activity at error:', currentActivity));
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