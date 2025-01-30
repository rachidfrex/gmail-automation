# Gmail Automation Project

## Overview
An advanced automation tool for Gmail that supports both web browser (Playwright) and mobile (Appium) automation. This project enables automated email management through desktop browsers and Android emulators, perfect for batch operations and testing.

## Features
- 🔐 Secure Gmail authentication
- 📧 Automated email composition and sending
- 📱 Mobile Gmail app automation via Appium
- 📨 Batch email operations
- 📬 Email reading and status management
- 🔄 Smart retry mechanisms
- 🎭 Browser fingerprint randomization
- 📸 Automated error tracking with screenshots
- 🛡️ Stealth mode to avoid detection

## Prerequisites

### Windows Setup
1. Install Node.js (v16 or higher)
2. Install Android Studio and SDK:
   - Download from: https://developer.android.com/studio
   - Install Android SDK Platform 30 (Android 11.0)
   - Install Android SDK Build-Tools
   - Install Intel HAXM for emulator acceleration

3. Set environment variables:
   ```bash
   ANDROID_HOME=C:\Users\<YourUsername>\AppData\Local\Android\Sdk
   ANDROID_SDK_ROOT=C:\Users\<YourUsername>\AppData\Local\Android\Sdk
   Path=%ANDROID_HOME%\platform-tools
   ```

4. Create Android Virtual Device (AVD):
   - Open Android Studio → Tools → AVD Manager
   - Create new Virtual Device (Pixel 4 API 30 recommended)
   - Install Google Play Services

5. Install Docker Desktop for Windows

### Ubuntu Setup
1. Install Node.js and npm:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. Install Android SDK and tools:
   ```bash
   sudo apt-get update
   sudo apt-get install android-sdk android-tools-adb
   sudo apt-get install openjdk-8-jdk
   ```

3. Setup environment variables (add to ~/.bashrc):
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export ANDROID_SDK_ROOT=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

4. Install Docker:
   ```bash
   sudo apt-get install docker.io
   sudo systemctl start docker
   sudo systemctl enable docker
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

3. Configure email settings:
   Create `emailCompose.json`:
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
To run the desktop browser automation:
```bash
npm run start
```

The automation will prompt you for:
- Gmail email
- Password
- Number of emails to process

### Mobile Automation
1. Start the Appium server:
```bash
appium
```

2. Launch Android emulator from Android Studio:
   - Open Android Studio
   - Go to Device Manager
   - Start your virtual device (wait until fully booted)

3. Run the mobile automation:
```bash
npm run start:mobile
```

### Email Configuration
Configure recipients and email content in `emailCompose.json`:
```json
{
  "recipients": [
    {
      "email": "recipient1@example.com",
      "subject": "Test Subject 1",
      "body": "Test Body 1"
    },
    {
      "email": "recipient2@example.com",
      "subject": "Test Subject 2",
      "body": "Test Body 2"
    }
    // Add as many recipients as needed
  ]
}
```

## Project Structure
```
gmail-automation/
├── src/
│   ├── services/
│   │   ├── browserService.js    # Browser automation setup
│   │   ├── emailService.js      # Email operations
│   │   └── mobileService.js     # Mobile automation
│   ├── config/
│   │   └── readline.js          # User input handling
│   ├── index.js                 # Desktop entry point
│   └── mobile.js                # Mobile entry point
├── Dockerfile                   # Container configuration
├── docker-compose.yml          # Services orchestration
├── start.sh                    # Startup script
└── emailCompose.json           # Email templates
```

## Features in Detail

### Browser Automation
- Stealth mode to avoid detection
- Random user agent rotation
- Human-like typing and clicking patterns
- Automatic error recovery
- Screenshot capture for debugging

### Mobile Automation
- Android emulator support
- Native Gmail app automation
- Touch gesture simulation
- Robust error handling

### Email Operations
- Batch email sending
- Email reading and marking
- Attachment handling
- Template support
- Rate limiting to avoid blocks

## Security Notes
- Credentials are never stored permanently
- All sessions are destroyed after use
- Uses secure connection handling
- Implements anti-detection measures

## Troubleshooting

### Common Issues
1. **Emulator won't start**
   ```bash
   adb kill-server
   adb start-server
   ```

2. **Docker connection issues**
   ```bash
   docker-compose down
   docker system prune
   docker-compose up -d
   ```

3. **Permission errors (Linux)**
   ```bash
   sudo chmod +x start.sh
   sudo chown -R $USER:$USER ~/.android
   ```

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT License - feel free to use for personal or commercial projects.
