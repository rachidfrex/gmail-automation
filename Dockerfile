FROM ubuntu:20.04

# Prevent interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/London

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    openjdk-8-jdk \
    nodejs \
    npm \
    android-tools-adb \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Install Android SDK
ENV ANDROID_HOME /usr/local/android-sdk
RUN wget https://dl.google.com/android/repository/commandlinetools-linux-6858069_latest.zip \
    && unzip commandlinetools-linux-*_latest.zip -d $ANDROID_HOME \
    && rm commandlinetools-linux-*_latest.zip

# Accept licenses automatically
RUN mkdir -p $ANDROID_HOME/cmdline-tools/latest \
    && mv $ANDROID_HOME/cmdline-tools/* $ANDROID_HOME/cmdline-tools/latest/ 2>/dev/null || true \
    && yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses

# Install Android platform and system image
RUN $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
    "platform-tools" \
    "platforms;android-30" \
    "system-images;android-30;google_apis;x86_64"

# Install Appium
RUN npm install -g appium

WORKDIR /app
COPY . .

CMD ["npm", "start"]
