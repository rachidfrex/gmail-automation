FROM fedora:latest

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
    # Playwright dependencies for Fedora
    nss \
    nspr \
    atk \
    at-spi2-atk \
    cups-libs \
    libdrm \
    libxkbcommon \
    libXcomposite \
    libXdamage \
    libXfixes \
    libXrandr \
    mesa-libgbm \
    alsa-lib \
    gtk3 \
    libnotify \
    xorg-x11-server-Xvfb \
    liberation-fonts \
    wqy-zenhei-fonts \
    && dnf clean all

# Install Android SDK
ENV ANDROID_HOME /usr/local/android-sdk
RUN wget https://dl.google.com/android/repository/commandlinetools-linux-6858069_latest.zip \
    && unzip commandlinetools-linux-*_latest.zip -d $ANDROID_HOME \
    && rm commandlinetools-linux-*_latest.zip

# Accept licenses automatically
RUN mkdir -p $ANDROID_HOME/cmdline-tools/latest \
    && mv $ANDROID_HOME/cmdline-tools/* $ANDROID_HOME/cmdline-tools/latest/ 2>/dev/null || true \
    && yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses

# Accept licenses and install SDK components
RUN yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --sdk_root=$ANDROID_HOME --licenses && \
    $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --sdk_root=$ANDROID_HOME \
    "platform-tools" \
    "platforms;android-30" \
    "system-images;android-30;google_apis;x86_64"

# Install Appium
RUN npm install -g appium

COPY . .

# Start Appium server and application
CMD ["sh", "-c", "appium --allow-insecure chromedriver_autodownload & npm start"]