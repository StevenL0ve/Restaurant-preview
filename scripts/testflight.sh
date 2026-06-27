#!/usr/bin/env bash
# CaseReady → TestFlight in one command. Run on a Mac with Xcode installed.
#
# Prereqs (one-time):
#   • Xcode from the App Store, opened once to accept the license
#   • Node 18+, CocoaPods (`sudo gem install cocoapods`), fastlane (`brew install fastlane`)
#   • An App Store Connect API key, with these env vars exported first
#     (see docs/TESTFLIGHT.md for how to create the key):
#       export APP_STORE_CONNECT_API_KEY_ID=XXXXXXXXXX
#       export APP_STORE_CONNECT_API_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
#       export APP_STORE_CONNECT_API_KEY_PATH=~/keys/AuthKey_XXXX.p8
#       export APPLE_TEAM_ID=XXXXXXXXXX   # your 10-char Developer Team ID (non-interactive signing)
#
# Then:  npm run testflight
set -euo pipefail
cd "$(dirname "$0")/.."

note() { printf "\n\033[1;36m▸ %s\033[0m\n" "$1"; }
fail() { printf "\n\033[1;31m✗ %s\033[0m\n" "$1"; exit 1; }

[ "$(uname)" = "Darwin" ] || fail "iOS builds must run on macOS (this is $(uname)). See docs/TESTFLIGHT.md for the cloud-CI path instead."
command -v node >/dev/null || fail "Node 18+ not found. Install from https://nodejs.org"
command -v pod  >/dev/null || fail "CocoaPods not found. Run: sudo gem install cocoapods"
command -v fastlane >/dev/null || fail "fastlane not found. Run: brew install fastlane"

[ -n "${APPLE_TEAM_ID:-}" ] || printf "\n\033[1;33m! APPLE_TEAM_ID is not set.\033[0m If signing fails the first time, export it\n  (your 10-char Developer Team ID) and re-run — or open ios/App in Xcode once\n  and pick your Team under Signing & Capabilities.\n"

note "Installing dependencies + building the web app…"
npm ci
npm run build

if [ ! -d ios ]; then
  note "Creating the native iOS project (first run only)…"
  npx cap add ios
  npx capacitor-assets generate --ios || true
fi

note "Syncing the web build into the iOS project…"
npx cap sync ios

note "Marking the app as exempt from export-compliance (standard HTTPS only)…"
PLIST=ios/App/App/Info.plist
/usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :ITSAppUsesNonExemptEncryption false" "$PLIST"

note "Building + uploading to TestFlight (this takes a few minutes)…"
fastlane ios beta

printf "\n\033[1;32m✅ Uploaded.\033[0m Open App Store Connect → your app → TestFlight.\n"
printf "   Processing takes a few minutes, then add yourself as an internal tester\n"
printf "   and accept the invite in the TestFlight app on your iPhone.\n"
