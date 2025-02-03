const { remote } = require('webdriverio');
const fs = require('fs').promises;
const chalk = require('chalk');
const path = require('path');
const { exec } = require('child_process');

// Define output directories with proper error handling
const OUTPUT_DIR = {
  screenshots: path.join(__dirname, '..', '..', 'output', 'screenshots'),
  logs: path.join(__dirname, '..', '..', 'output', 'logs')
};

// Ensure output directories exist
async function ensureDirectories() {
  for (const dir of Object.values(OUTPUT_DIR)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

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
      '1. Open terminal and add to your ~/.bashrc or ~/.zshrc:\n' +
      '   export ANDROID_HOME=$HOME/Android/Sdk\n' +
      '   export ANDROID_SDK_ROOT=$HOME/Android/Sdk\n' +
      '2. Add $ANDROID_HOME/platform-tools to your PATH\n' +
      '3. Reload your shell or run: source ~/.bashrc (or ~/.zshrc)'
    );
  }
}

// Update capabilities with safe chromedriver path
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
  'appium:enforceAppInstall': true,
  'appium:chromedriverExecutableDir': process.env.ANDROID_HOME ? 
    path.join(process.env.ANDROID_HOME, 'chromedriver') : 
    path.join(process.env.HOME, 'Android', 'Sdk', 'chromedriver'),
  'appium:autoWebviewTimeout': 15000,
  'appium:webviewDevtoolsPort': 9222
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
    await ensureDirectories();
    
    // const adbPath = path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe');
    const adbPath = 'adb';
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

// Add new helper function for WebView context switching
async function switchToWebContext(driver) {
  const contexts = await driver.getContexts();
  const webContext = contexts.find(c => c.includes('WEBVIEW'));
  
  if (webContext) {
    await driver.switchContext(webContext);
    console.log(chalk.green(`Switched to WEBVIEW context: ${webContext}`));
    return true;
  }
  return false;
}

// Replace existing clickNextButton function
async function clickNextButton(driver) {
  console.log(chalk.blue('Looking for Next button...'));

  // Attempt WebView handling first
  if (await switchToWebContext(driver)) {
    try {
      const webSelectors = [
        '#identifierNext',
        'button[data-primary-action="true"]',
        'button:contains("Next")'
      ];

      for (const selector of webSelectors) {
        try {
          const btn = await driver.$(selector);
          await btn.waitForExist({ timeout: 5000 });
          await btn.click();
          console.log(chalk.green(`✅ Clicked web Next button via: ${selector}`));
          return true;
        } catch (e) {
          console.log(chalk.yellow(`Web selector failed: ${selector}`));
        }
      }
    } finally {
      await driver.switchContext('NATIVE_APP');
    }
  }

  // Native fallback with precise bounds
  const nativeSelector = 'android=new UiSelector().className("android.widget.Button").bounds(783,1293,1025,1425)';
  try {
    const btn = await driver.$(nativeSelector);
    await btn.click();
    console.log(chalk.green('✅ Clicked native Next button'));
    return true;
  } catch (e) {
    console.log(chalk.red('Native Next button click failed'));
    await logDebugInfo(driver);
    return false;
  }
}

// Add debug helper
async function logDebugInfo(driver) {
  try {
    const contexts = await driver.getContexts();
    console.log(chalk.yellow('Available contexts:', contexts));
    const currentContext = await driver.getContext();
    console.log(chalk.yellow('Current context:', currentContext));
    const source = await driver.getPageSource();
    console.log(chalk.yellow('Current page source:', source));
  } catch (e) {
    console.log(chalk.red('Failed to log debug info:', e.message));
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
      await driver.pause(3000);

      // Look for the email input field with different strategies
      const emailSelectors = [
        'android=new UiSelector().resourceId("identifierId")',
        'android=new UiSelector().className("android.widget.EditText").instance(0)',
        'android=new UiSelector().className("android.widget.EditText").text("")'
      ];

      let emailInput = null;
      for (const selector of emailSelectors) {
        try {
          emailInput = await driver.$(selector);
          if (await emailInput.isDisplayed()) {
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

      await emailInput.clearValue();
      await emailInput.setValue(email);
      console.log(chalk.green('✅ Entered email'));
      await driver.pause(2000);

      // Click NEXT button with precise bounds
      const nextButtonSelector = 'android=new UiSelector().className("android.widget.Button").bounds(783,1983,1025,2115)';
      try {
        const nextButton = await driver.$(nextButtonSelector);
        await nextButton.click();
        console.log(chalk.green('✅ Clicked Next button'));
      } catch (e) {
        console.log(chalk.yellow('Failed to click Next with bounds, trying coordinates'));
        await driver.touchAction([
          { action: 'tap', x: 904, y: 2049 }  // Center of the NEXT button
        ]);
      }
      await driver.pause(3000);

      // ...rest of existing code...
    } catch (error) {
      console.error(chalk.red('Failed during email entry:', error.message));
      await logDebugInfo(driver);
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