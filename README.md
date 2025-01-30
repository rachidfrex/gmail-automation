# Gmail Automation Project## OverviewThis project provides automation for Gmail operations using both web browser (Playwright) and mobile (Appium) automation. It supports automated email management through both desktop browsers and Android emulators.## Features- 🔐 Automated Gmail login- 📧 Batch email sending- 📱 Mobile Gmail app automation- 📨 Email reading and marking as read- 📸 Automated screenshot capture for debugging- 🔄 Cross-platform support (Windows/Linux)## Prerequisites### Windows Setup
1. Install Node.js (v16+)
2. Install Android Studio
3. Set up Android environment variables:
   ```bash
   ANDROID_HOME=C:\Users\<YourUsername>\AppData\Local\Android\Sdk
   ANDROID_SDK_ROOT=C:\Users\<YourUsername>\AppData\Local\Android\Sdk
   Path=%ANDROID_HOME%\platform-tools
   ```
4. Create an Android Virtual Device (AVD) using Android Studio
   - Recommended: Pixel 4 API 30

### Linux (Ubuntu) Setup
1. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. Install Android SDK:
   ```bash
   sudo apt-get install android-sdk
   sudo apt-get install android-tools-adb
   ```

3. Set environment variables (add to ~/.bashrc):
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export ANDROID_SDK_ROOT=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

4. Install Appium:
   ```bash
   npm install -g appium
   ```

## Project Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gmail-automation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create configuration file:
   Create `emailCompose.json` in project root:
   ```json
   {
     "recipients": [
       {
         "email": "recipient@example.com",
         "subject": "Test Subject",
         "body": "Test Body"
       }
     ]
   }
   ```

## Usage

### Desktop Browser Automation
