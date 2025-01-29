#!/bin/bash

# Clean up everything
docker compose down --rmi all
adb kill-server

# Start containers
docker compose up -d

# Wait for Android emulator to boot
echo "Waiting for Android emulator to boot..."
sleep 120

# Verify ADB connection
adb devices

# Run automation
npm run start:mobile