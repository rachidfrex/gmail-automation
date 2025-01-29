FROM fedora:latest

<<<<<<< HEAD
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
=======
# Install required packages
RUN dnf update -y && dnf install -y \
    curl \
    wget \
    unzip \
    java-1.8.0-openjdk \
    android-tools \
>>>>>>> 5baeb722355e4be35867ae3075b0e4307db43c51
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

<<<<<<< HEAD
# Install Android SDK
ENV ANDROID_HOME /usr/local/android-sdk
RUN wget https://dl.google.com/android/repository/commandlinetools-linux-6858069_latest.zip \
    && unzip commandlinetools-linux-*_latest.zip -d $ANDROID_HOME \
    && rm commandlinetools-linux-*_latest.zip

# Accept licenses automatically
RUN mkdir -p $ANDROID_HOME/cmdline-tools/latest \
    && mv $ANDROID_HOME/cmdline-tools/* $ANDROID_HOME/cmdline-tools/latest/ 2>/dev/null || true \
    && yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
=======
# Set up Java environment correctly for Fedora
RUN dnf install -y java-1.8.0-openjdk-devel && \
    alternatives --set java java-1.8.0-openjdk.x86_64

ENV JAVA_HOME=/usr/lib/jvm/java-1.8.0
ENV PATH=$JAVA_HOME/bin:$PATH

# Verify Java installation and environment
RUN java -version && \
    echo $JAVA_HOME && \
    ls -la $JAVA_HOME

# Install Node.js using NodeSource repository
RUN curl -fsSL https://rpm.nodesource.com/setup_18.x | bash - && \
    dnf install -y nodejs

WORKDIR /app
COPY package*.json ./
RUN npm install

# Set up Android SDK
ENV ANDROID_HOME=/usr/local/android-sdk
ENV ANDROID_SDK_ROOT=$ANDROID_HOME
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Install Android SDK tools with proper permissions
RUN mkdir -p $ANDROID_HOME/cmdline-tools && \
    cd $ANDROID_HOME && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-8512546_latest.zip && \
    unzip -q commandlinetools-linux-*_latest.zip && \
    rm commandlinetools-linux-*_latest.zip && \
    mkdir -p $ANDROID_HOME/cmdline-tools/latest && \
    mv $ANDROID_HOME/cmdline-tools/bin $ANDROID_HOME/cmdline-tools/latest/ && \
    mv $ANDROID_HOME/cmdline-tools/lib $ANDROID_HOME/cmdline-tools/latest/ && \
    mv $ANDROID_HOME/cmdline-tools/source.properties $ANDROID_HOME/cmdline-tools/latest/ && \
    mv $ANDROID_HOME/cmdline-tools/NOTICE.txt $ANDROID_HOME/cmdline-tools/latest/ && \
    chmod -R 755 $ANDROID_HOME
>>>>>>> 5baeb722355e4be35867ae3075b0e4307db43c51

# Accept licenses and install SDK components
RUN yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --sdk_root=$ANDROID_HOME --licenses && \
    $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --sdk_root=$ANDROID_HOME \
    "platform-tools" \
    "platforms;android-30" \
    "system-images;android-30;google_apis;x86_64"

<<<<<<< HEAD
# Install Appium
RUN npm install -g appium
=======
# Install Appium and UiAutomator2 driver globally
RUN npm install -g appium@2.4.1 && \
    appium driver install uiautomator2@2.34.1
>>>>>>> 5baeb722355e4be35867ae3075b0e4307db43c51

COPY . .

# Start Appium server and application
CMD ["sh", "-c", "appium --allow-insecure chromedriver_autodownload & npm start"]