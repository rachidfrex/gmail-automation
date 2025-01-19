FROM ubuntu:20.04

# Prevent interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/London

# Install Node.js 18.x and other dependencies
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y \
    nodejs \
    wget \
    unzip \
    openjdk-8-jdk \
    android-tools-adb \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Verify Node.js and npm versions
RUN node --version && npm --version

# Install Android SDK
ENV ANDROID_HOME=/usr/local/android-sdk
RUN mkdir -p $ANDROID_HOME && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-6858069_latest.zip && \
    unzip -q commandlinetools-linux-*_latest.zip -d $ANDROID_HOME && \
    rm commandlinetools-linux-*_latest.zip

# Set up Android SDK tools
RUN mkdir -p $ANDROID_HOME/cmdline-tools/latest && \
    mv $ANDROID_HOME/cmdline-tools/* $ANDROID_HOME/cmdline-tools/latest/ 2>/dev/null || true && \
    yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses

# Install Android platform and system image
RUN $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
    "platform-tools" \
    "platforms;android-30" \
    "system-images;android-30;google_apis;x86_64"

# Install Appium and verify installation
RUN npm install -g appium@2.0.0 && \
    appium --version

WORKDIR /app
COPY . .

CMD ["npm", "start"]
