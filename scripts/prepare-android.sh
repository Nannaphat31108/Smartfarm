#!/usr/bin/env bash
# Applies Smart Farm branding and settings to the generated android/ project.
# Usage: scripts/prepare-android.sh [versionCode] [versionName]
set -euo pipefail
cd "$(dirname "$0")/.."
RES=android/app/src/main/res
MANIFEST=android/app/src/main/AndroidManifest.xml
GRADLE=android/app/build.gradle

# icons, adaptive-icon background colour, splash screen
find "$RES" -name 'splash.png' -delete
cp -r resources/android/res/. "$RES/"

# allow plain http to the ESP32 boards on the local network
if ! grep -q usesCleartextTraffic "$MANIFEST"; then
  sed -i 's/<application/<application android:usesCleartextTraffic="true"/' "$MANIFEST"
fi

# version
if [ -n "${1:-}" ]; then sed -i "s/versionCode [0-9]*/versionCode $1/" "$GRADLE"; fi
if [ -n "${2:-}" ]; then sed -i "s/versionName \"[^\"]*\"/versionName \"$2\"/" "$GRADLE"; fi

# fixed debug key so new APKs install over old ones without uninstalling
mkdir -p "$HOME/.android"
cp resources/android/debug.keystore "$HOME/.android/debug.keystore"
echo "android/ prepared"
